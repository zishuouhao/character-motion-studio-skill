function exportPlan(c,state){
 const x=c.export,d=c.duration/1000;
 if(x.mode==='static')return {initial:state,duration:0,events:[]};
 if(x.clip==='current')return {initial:state,duration:x.seconds,events:[]};
 const first=x.clip==='reverse'?'receiving':'working',second=first==='working'?'receiving':'working',events=[{at:x.hold,state:second}];
 let duration=x.hold*2+d;
 if(x.clip==='roundtrip'){events.push({at:x.hold*2+d,state:first});duration=x.hold*3+d*2;}
 return {initial:first,duration,events};
}
function makeCapture(c,state){
 const holder=document.createElement('div');holder.setAttribute('data-capture','true');holder.style.cssText='position:fixed;left:-12000px;top:0;width:1000px;height:1000px;pointer-events:none;';document.body.appendChild(holder);
 const plan=exportPlan(c,state),scene=buildRuntime(holder,()=>{},{manual:true,config:c,initial:plan.initial});let time=0,event=0;
 function advance(t){while(time<t-1e-8){if(event<plan.events.length&&plan.events[event].at<=time+1e-8){scene.transition(plan.events[event++].state);continue;}const next=Math.min(t,time+1/120,event<plan.events.length?plan.events[event].at:Infinity);scene.step(next-time);time=next;}
  while(event<plan.events.length&&plan.events[event].at<=time+1e-8)scene.transition(plan.events[event++].state);
 }
 return {scene,plan,advance,destroy:()=>{scene.destroy();holder.remove();}};
}
function snapshot(scene,c,size=1000,frameKey='single',includeBg=true){
 const clone=scene.svg.cloneNode(true);clone.setAttribute('xmlns','http://www.w3.org/2000/svg');clone.setAttribute('width',size);clone.setAttribute('height',size);clone.removeAttribute('role');clone.removeAttribute('aria-label');clone.querySelectorAll('[class]').forEach(n=>n.removeAttribute('class'));
 const ids=new Map();clone.querySelectorAll('[id]').forEach(n=>{const old=n.id,fresh=frameKey+'-'+old;ids.set(old,fresh);n.id=fresh;});
 clone.querySelectorAll('*').forEach(n=>{for(const a of [...n.attributes])if(a.value.includes('url(#'))n.setAttribute(a.name,a.value.replace(/url\(#([^)]*)\)/g,(m,id)=>'url(#'+(ids.get(id)||id)+')'));});
 if(includeBg&&c.alpha>0){const r=svgEl('rect',{x:-65,y:-65,width:1130,height:1130,fill:c.bg,opacity:c.alpha/100});clone.insertBefore(r,clone.firstChild);}
 return new XMLSerializer().serializeToString(clone);
}
async function drawSVG(text,canvas,c,opaque){
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,canvas.width,canvas.height);
 if(opaque){ctx.fillStyle=c.export.matte;ctx.fillRect(0,0,canvas.width,canvas.height);}
 const url=URL.createObjectURL(new Blob([text],{type:'image/svg+xml'}));
 try{const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('SVG 栅格化失败'));img.src=url;});ctx.drawImage(img,0,0,canvas.width,canvas.height);}finally{URL.revokeObjectURL(url);}
 return ctx;
}
const exportYield=()=>new Promise(r=>setTimeout(r,0));
function colorRGB(s){if(s==='white')return [1,1,1];if(s==='black')return [0,0,0];if(/^#[\da-f]{6}$/i.test(s))return [1,3,5].map(i=>parseInt(s.slice(i,i+2),16)/255);return [0,0,0];}
function captureAEFrame(scene,n){
 const paths=[...scene.svg.querySelectorAll('path')].filter(p=>!p.closest('defs'));
 const out=[];
 for(const el of paths){
  if(!el.__aeKey)el.__aeKey='layer-'+(++captureAEFrame.serial);
  let parent=el,opacity=1;while(parent&&parent!==scene.svg){opacity*=+(parent.getAttribute('opacity')??1);parent=parent.parentElement;}
  const length=el.getTotalLength(),matrix=el.getCTM(),closed=/[zZ]\s*$/.test(el.getAttribute('d'));
  const vertices=Array.from({length:n},(_,i)=>{const p=el.getPointAtLength(length*i/(closed?n:n-1)).matrixTransform(matrix);return [+p.x.toFixed(3),+p.y.toFixed(3)];});
  const part=el.getAttribute('data-part')||el.parentElement.getAttribute('data-part')||'decoration';
  const stroke=el.getAttribute('stroke'),fill=el.getAttribute('fill')||'none',scale=Math.hypot(matrix.a,matrix.b);
  const record={key:el.__aeKey,name:part+' / '+el.__aeKey,vertices,closed,opacity:opacity*100,fill,stroke,strokeWidth:+(el.getAttribute('stroke-width')||0)*scale};
  if(stroke){const dash=el.getAttribute('stroke-dasharray');if(dash){record.dash=length*.3*scale;record.gap=length*.7*scale;record.offset=+(el.getAttribute('stroke-dashoffset')||0)*length/100*scale;}}
  if(el.hasAttribute('mask')){const local=scene.cut.transform.baseVal.consolidate()?.matrix||new DOMMatrix(),mat=scene.body.getCTM().multiply(local),len=scene.cut.getTotalLength();record.mask=Array.from({length:n},(_,i)=>{const p=scene.cut.getPointAtLength(len*i/n).matrixTransform(mat);return [+p.x.toFixed(3),+p.y.toFixed(3)];});}
  out.push(record);
 }
 return out;
}
captureAEFrame.serial=0;
function aeScript(frames,c,plan,size,fps){
 const layers=new Map();frames.forEach((f,idx)=>f.forEach(p=>{if(!layers.has(p.key))layers.set(p.key,{...p,samples:[]});layers.get(p.key).samples[idx]=p;}));
 const data={width:size,height:size,fps,duration:Math.max(1/fps,frames.length/fps),background:c.bg,alpha:c.alpha,scale:size/1000,layers:[...layers.values()].map(l=>{const first=l.samples.find(Boolean);l.samples=Array.from({length:frames.length},(_,i)=>l.samples[i]||{...first,opacity:0});return l;})};
 return `/* Character Motion Studio — AE editable vector bake.
+Run via File > Scripts > Run Script File. Creates a new composition in the
+current project; does not overwrite or save your project. Save as .aep in AE.
+Sampled path vertices and opacity are editable; interactive state machines
+are not transferred. MIT export adapter. */
+(function(){app.beginUndoGroup('Character Motion Import');try{
+if(!app.project)app.newProject();var D=${JSON.stringify(data)},comp=app.project.items.addComp('Character Motion '+(new Date().getTime()),D.width,D.height,1,D.duration,D.fps);
+function rgb(s){if(s==='white')return [1,1,1];if(s==='black')return [0,0,0];return [parseInt(s.substr(1,2),16)/255,parseInt(s.substr(3,2),16)/255,parseInt(s.substr(5,2),16)/255];}
+function shp(points,closed){var s=new Shape(),v=[],z=[];for(var j=0;j<points.length;j++){v.push([points[j][0]*D.scale,points[j][1]*D.scale]);z.push([0,0]);}s.vertices=v;s.inTangents=z;s.outTangents=z;s.closed=closed;return s;}
+if(D.alpha>0){var bg=comp.layers.addSolid(rgb(D.background),'Background',D.width,D.height,1,D.duration);bg.property('ADBE Transform Group').property('ADBE Opacity').setValue(D.alpha);}
+for(var i=0;i<D.layers.length;i++){var L=D.layers[i],layer=comp.layers.addShape();layer.name=L.name;var tr=layer.property('ADBE Transform Group');tr.property('ADBE Position').setValue([0,0]);tr.property('ADBE Anchor Point').setValue([0,0]);var group=layer.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group');group.name=L.name;var contents=group.property('ADBE Vectors Group');var pp=contents.addProperty('ADBE Vector Shape - Group').property('ADBE Vector Shape');
+if(L.fill!=='none'){var f=contents.addProperty('ADBE Vector Graphic - Fill');f.property('ADBE Vector Fill Color').setValue(rgb(L.fill));}
+var sw=null,offset=null;if(L.stroke){var st=contents.addProperty('ADBE Vector Graphic - Stroke');st.property('ADBE Vector Stroke Color').setValue(rgb(L.stroke));st.property('ADBE Vector Stroke Line Cap').setValue(2);st.property('ADBE Vector Stroke Line Join').setValue(2);sw=st.property('ADBE Vector Stroke Width');if(L.dash!==undefined){var da=st.property('ADBE Vector Stroke Dashes');da.addProperty('ADBE Vector Stroke Dash 1').setValue(L.dash*D.scale);da.addProperty('ADBE Vector Stroke Gap 1').setValue(L.gap*D.scale);offset=da.property('ADBE Vector Stroke Offset')||da.addProperty('ADBE Vector Stroke Offset');}}
+var mp=null;if(L.mask){var mask=layer.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');mask.maskMode=MaskMode.SUBTRACT;mp=mask.property('ADBE Mask Shape');}
+/* Adding vector siblings invalidates indexed property handles. Reacquire. */
+contents=layer.property('ADBE Root Vectors Group').property(1).property('ADBE Vectors Group');pp=contents.property(1).property('ADBE Vector Shape');
+if(L.stroke){var st2=contents.property('ADBE Vector Graphic - Stroke');sw=st2.property('ADBE Vector Stroke Width');if(L.dash!==undefined)offset=st2.property('ADBE Vector Stroke Dashes').property('ADBE Vector Stroke Offset');}
+for(var k=0;k<L.samples.length;k++){var S=L.samples[k],t=k/D.fps;pp.setValueAtTime(t,shp(S.vertices,S.closed));tr.property('ADBE Opacity').setValueAtTime(t,S.opacity);if(sw)sw.setValueAtTime(t,S.strokeWidth*D.scale);if(offset)offset.setValueAtTime(t,S.offset*D.scale);if(mp)mp.setValueAtTime(t,shp(S.mask,true));}
+}comp.openInViewer();}catch(e){alert('Import failed: '+e.toString());}finally{app.endUndoGroup();}})();`.replace(/^\+/gm,'');
}
async function createExport(raw,state,onProgress=()=>{},signal={cancelled:false},forceFormat=null){
 const c=validConfig(raw),x=c.export,format=forceFormat||x.format,size=Math.round(1000*x.size),fps=x.fps,cap=makeCapture(c,state),duration=cap.plan.duration;
 const frameCount=x.mode==='static'?1:Math.max(2,Math.ceil(duration*fps)),canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 let media=null,source=null,gif=null,svgFrames=[],aeFrames=[];
 try{
  if(['mp4','webm'].includes(format)){
   if(!window.VideoEncoder)throw Error('当前浏览器没有视频编码能力，请在最新版 Chrome / Edge 中打开此 HTML；可先导出 GIF 或 SVG。');
   const M=window.MediaBunny,codec=format==='mp4'?'avc':'vp9',bitrate=mediaBitrate(c);
   if(!await M.canEncodeVideo(codec,{width:size,height:size,bitrate,framerate:fps}))throw Error('此浏览器不支持所选尺寸的 '+format.toUpperCase()+' 编码。请降低 Size 或换用 Chrome / Edge。');
   media=new M.Output({format:format==='mp4'?new M.Mp4OutputFormat({fastStart:'in-memory'}):new M.WebMOutputFormat(),target:new M.BufferTarget()});
   source=new M.CanvasSource(canvas,{codec,bitrate,hardwareAcceleration:'prefer-software'});media.addVideoTrack(source,{frameRate:fps});await media.start();
  }
  if(format==='gif')gif=Gifenc.GIFEncoder();
  for(let i=0;i<frameCount;i++){
   if(signal.cancelled)throw Error('已取消导出');
   cap.advance(i===frameCount-1?duration:i/fps);
   if(format==='jsx'){aeFrames.push(captureAEFrame(cap.scene,x.aeSamples));}
   else{
    const text=snapshot(cap.scene,c,size,'f'+i);
    if(format==='svg')svgFrames.push(text);
    else{
     const ctx=await drawSVG(text,canvas,c,['mp4','webm'].includes(format));
     if(source)await source.add(i/fps,1/fps);
     else if(gif){const rgba=ctx.getImageData(0,0,size,size).data,format='rgba4444',palette=Gifenc.quantize(rgba,({low:64,medium:128,high:256}[x.quality]),{format,oneBitAlpha:true}),indexed=Gifenc.applyPalette(rgba,palette,format),transparentIndex=palette.findIndex(p=>p[3]===0),delay=(Math.round((i+1)*100/fps)-Math.round(i*100/fps))*10;gif.writeFrame(indexed,size,size,{palette,delay,repeat:x.repeat?0:-1,dispose:2,transparent:transparentIndex>=0,transparentIndex:Math.max(0,transparentIndex)});}
     else if(format==='png'){const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));return {blob,name:'角色静态.png',frames:1,width:size,height:size};}
    }
   }
   onProgress(Math.round((i+1)/frameCount*94));if(i%3===0)await exportYield();
  }
  let blob;
  if(media){await media.finalize();blob=new Blob([media.target.buffer],{type:format==='mp4'?'video/mp4':'video/webm'});}
  else if(gif){gif.finish();blob=new Blob([gif.bytes()],{type:'image/gif'});}
  else if(format==='jsx')blob=new Blob([aeScript(aeFrames,c,cap.plan,size,fps)],{type:'text/plain'});
  else if(format==='svg'){
   if(x.mode==='static')blob=new Blob([svgFrames[0]],{type:'image/svg+xml'});
   else{
    const d=frameCount/fps,groups=svgFrames.map((s,i)=>{const start=i/frameCount,end=(i+1)/frameCount,values=i===0?'visible;hidden':i===frameCount-1?'hidden;visible':'hidden;visible;hidden',times=i===0?'0;'+end:i===frameCount-1?'0;'+start:'0;'+start+';'+end;return `<g visibility="hidden"><animate attributeName="visibility" values="${values}" keyTimes="${times}" dur="${d}s" repeatCount="${x.repeat?'indefinite':'1'}" fill="freeze" calcMode="discrete"/>${s}</g>`;}).join('');
    blob=new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><title>角色动画 · 逐帧矢量播放</title>${groups}</svg>`],{type:'image/svg+xml'});
   }
  }
  onProgress(100);return {blob,name:'角色'+(x.mode==='static'?'静态':'动画')+'.'+format,frames:frameCount,width:size,height:size,fps,duration:frameCount/fps};
 }catch(e){if(media&&media.state!=='finalized')await media.cancel().catch(()=>{});throw e;}finally{cap.destroy();}
}
function exportRivePack(c){
 const files={};
 for(const [name,svg]of Object.entries(ASSETS.originals))files[name+'.svg']=fflate.strToU8(svg);
 files['studio-settings.json']=fflate.strToU8(JSON.stringify(c,null,2));
 files['READ-ME.txt']=fflate.strToU8('Rive 准备素材包 / 非 .riv 工程\n\n两个带部件 ID 的原始矢量 SVG 可导入 Rive 后继续编辑外形。studio-settings.json 是本 HTML 编辑器的参数，不是 Rive 可导入的状态机。需在 Rive 中适配路径节点、建立动画和状态机。身体镂空保留原始复合路径，不用位图替代。\n共享路径：body-main、body-shadow、face-main、eye-left、eye-right。\n工作态：加载器 fx-spinner、电脑 prop-laptop。\n接受文档态：mouth-rim、hand-right、fx-airflow。\n');
 return new Blob([fflate.zipSync(files,{level:6})],{type:'application/zip'});
}
