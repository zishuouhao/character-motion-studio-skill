function svgEl(tag,attrs={},parent){const el=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,v);if(parent)parent.appendChild(el);return el;}
let sceneSerial=0;
function buildRuntime(mount,onSelect=()=>{},options={}){
 const config=()=>options.config||cfg,prefix=options.manual?'capture-'+(++sceneSerial)+'-':'',maskID=prefix+'mouth-mask';
 const svg=svgEl('svg',{viewBox:'-65 -65 1130 1130',width:1000,height:1000,fill:'none',role:'img','aria-label':'可交互绿色角色'},mount);
 const defs=svgEl('defs',{},svg),mask=svgEl('mask',{id:maskID,maskUnits:'userSpaceOnUse',x:-200,y:-200,width:1400,height:1400},defs);
 svgEl('rect',{x:-200,y:-200,width:1400,height:1400,fill:'white'},mask);
 const cut=svgEl('path',{d:ASSETS.hole,fill:'black'},mask);
 const jump=svgEl('g',{'data-part':'jump'},svg),body=svgEl('g',{'data-part':'character'},jump),nodes={},wrappers={},ghosts={};
 const path=id=>{const wrap=svgEl('g',{},body),shape=svgEl('g',{},wrap),p=ASSETS.states.working.paths[id],el=svgEl('path',{...p,id:prefix+id,'data-part':id},shape);el.removeAttribute('tag');nodes[id]=el;wrappers[id]=wrap;ghosts[id]=shape;if(id==='body-main')el.setAttribute('mask','url(#'+maskID+')');el.addEventListener('pointerdown',()=>onSelect(id));};
 path('body-main');path('body-shadow');
 const mouth=svgEl('g',{'data-part':'mouth-rim'},body);mouth.innerHTML=ASSETS.mouth;
 path('face-main');path('eye-left');path('eye-right');
 const hand=svgEl('g',{'data-part':'hand-right'},body);hand.innerHTML=ASSETS.hand;
 const spinnerOpacity=svgEl('g',{},body),spinner=svgEl('g',{'data-part':'fx-spinner'},spinnerOpacity);spinner.innerHTML=ASSETS.spinner;
 const laptop=svgEl('g',{'data-part':'prop-laptop'},body);laptop.innerHTML=ASSETS.laptop;
 const airflow=svgEl('g',{'data-part':'fx-airflow'},body);airflow.innerHTML=ASSETS.air;
 const lines=Array.from(airflow.children);lines.forEach(p=>{p.setAttribute('pathLength',100);p.setAttribute('stroke-dasharray','30 70');});
 let active='working',target='working',blend=0,tx=null,handles=[],frame=0,previous=performance.now(),clock=0,breathPhase=0,spinPhase=0,flowPhase=0,pointer=[0,0],look=[0,0],runX=0,manualRun=0,winkAt=-9999,jumpAt=-9999,clickTimer=0,paused=false;
 function setSelected(id){for(const k of IDS)nodes[k].classList.toggle('path-selected',k===id);}
 function reset(name='working'){
  handles=[];tx=null;active=target=name;blend=name==='receiving'?1:0;clock=breathPhase=spinPhase=flowPhase=0;look=[0,0];winkAt=jumpAt=-9999;
  for(const id of IDS){nodes[id].setAttribute('d',ASSETS.states[name].paths[id].d);nodes[id].setAttribute('opacity',1);Array.from(ghosts[id].children).forEach(el=>{if(el!==nodes[id])el.remove();});}render(0);
 }
 function transition(name){
  if(name===target)return;if(!ASSETS.states[name])throw Error('未知状态');
  handles=[];target=name;
  const c=config(),ease=easing(c);tx={from:blend,to:name==='receiving'?1:0,start:clock,duration:c.duration,ease};
  for(const id of IDS){
   const el=nodes[id],to=ASSETS.states[name].paths[id].d,from=el.getAttribute('d'),method=c.methods[id]||'auto';
   // A sampled path is not textually identical to the source path at t=1.
   // Keep its final sampled geometry instead of snapping back to the source:
   // every shared part now travels continuously point-to-point, including
   // topology-mismatched bodies, with no end-frame discontinuity.
   const compatible=E.structureFingerprint(from)===E.structureFingerprint(to);
   if(method==='fade'){
    const existing=Array.from(ghosts[id].children),alphas=existing.map(e=>+(e.getAttribute('opacity')??1)),copy=el.cloneNode();copy.removeAttribute('id');copy.removeAttribute('class');copy.setAttribute('d',to);copy.setAttribute('opacity',0);ghosts[id].appendChild(copy);
    handles.push({tick:t=>{const k=Math.max(0,Math.min(1,ease(t)));existing.forEach((n,i)=>n.setAttribute('opacity',alphas[i]*(1-k)));copy.setAttribute('opacity',k);},finish:()=>{el.setAttribute('d',to);el.setAttribute('opacity',1);Array.from(ghosts[id].children).forEach(n=>{if(n!==el)n.remove();});}});
   }else{
    Array.from(ghosts[id].children).forEach(n=>{if(n!==el)n.remove();});el.setAttribute('opacity',1);
    const a=E.parsePath(from),b=E.parsePath(to);let interp;
    if(method==='auto'&&compatible&&a&&b){interp=t=>a.map((s,i)=>s.cmd+s.points.map((p,j)=>p.map((v,k)=>(v+(b[i].points[j][k]-v)*t).toFixed(3)).join(' ')).join(' ')).join(' ');}
    else{
     const f=flubber.interpolate(from,to,{maxSegmentLength:id.startsWith('eye')?1:2,string:false});
     const pathAt=t=>{const ring=f(Math.max(0,Math.min(1,t)));return 'M'+ring.map(p=>p.map(v=>v.toFixed(3)).join(',')).join('L')+'Z';};
     const endPath=pathAt(1);interp=pathAt;
     handles.push({tick:t=>el.setAttribute('d',t===0?from:t>=1?endPath:interp(ease(t))),finish:()=>el.setAttribute('d',endPath)});continue;
   }
    handles.push({tick:t=>el.setAttribute('d',t===0?from:t>=1?to:interp(ease(t))),finish:()=>el.setAttribute('d',to)});
   }
  }
 }
 function render(dt){
  const c=config();clock+=dt*1000;
  if(tx){const t=Math.min(1,(clock-tx.start)/tx.duration);blend=tx.from+(tx.to-tx.from)*tx.ease(t);handles.forEach(a=>a.tick(t));if(t===1){handles.forEach(a=>a.finish());handles=[];active=target;tx=null;}}
  // Effects and visibility must not inherit curve overshoot: their old
  // threshold switch could briefly reverse then snap on the final frame.
  const bounded=Math.max(0,Math.min(1,blend)),a=c.states.working,b=c.states.receiving,lerp=k=>a[k]+(b[k]-a[k])*bounded;
  breathPhase+=dt*2*Math.PI/lerp('period');
  let idleAmp=1;if(tx){const t=Math.min(1,(clock-tx.start)/tx.duration);idleAmp=1-.75*Math.sin(Math.PI*t);}
  const s=Math.sin(breathPhase)*lerp('breath')/100*idleAmp,ax=(c.anchor%3)*500,ay=Math.floor(c.anchor/3)*500;
  const phase=clock/1000*2*Math.PI/3, preset=c.idlePreset,px=preset==='sway'?Math.sin(phase)*3:preset==='shake'?Math.sin(phase*5)*2:0,py=preset==='bob'||preset==='float'?Math.sin(phase)*(preset==='float'?10:5):0,rot=preset==='sway'?Math.sin(phase)*2:preset==='shake'?Math.sin(phase*5)*1.2:0,scale=preset==='none'?0:(preset==='breathe'||preset==='breathe-y'?Math.sin(phase)*.018:s);
  const runTarget=manualRun||Math.abs(pointer[0])>.34?((manualRun||pointer[0])*18):0;runX+=(runTarget-runX)*(dt?1-Math.exp(-dt*8):0);const lean=runX*.16;
  body.setAttribute('transform',`translate(${px+runX} ${py}) translate(${ax} ${ay}) rotate(${rot+lean} ${ax} ${ay}) scale(${1-scale*.25} ${1+scale}) translate(${-ax} ${-ay})`);
  const jt=(clock-jumpAt)/(c.states[target].jumpDuration*1000),jy=jt>=0&&jt<1?-c.states[target].jumpHeight*Math.sin(Math.PI*jt):0;jump.setAttribute('transform',`translate(0 ${jy})`);
  cut.setAttribute('transform',`translate(389 567) scale(${Math.max(.00001,bounded)}) translate(-389 -567)`);
  const incoming=Math.max(0,bounded*2-1),outgoing=Math.max(0,1-bounded*2);
  mouth.setAttribute('opacity',incoming);hand.setAttribute('opacity',incoming);airflow.setAttribute('opacity',incoming);spinnerOpacity.setAttribute('opacity',outgoing);laptop.setAttribute('opacity',outgoing);
  spinPhase+=dt*a.special*150*(a.reverse?-1:1);spinner.setAttribute('transform',`rotate(${spinPhase%360} 747 255)`);
  flowPhase+=dt*b.special*85*(b.reverse?-1:1);lines.forEach((p,i)=>p.setAttribute('stroke-dashoffset',(i>=2?1:-1)*flowPhase+i*17));
  hand.setAttribute('transform',`rotate(${Math.sin(clock/1000*2*Math.PI/b.wavePeriod)*b.wave} 600 565)`);
  const smoothing=dt?1-Math.exp(-dt*10):0;look[0]+=(pointer[0]*lerp('gaze')-look[0])*smoothing;look[1]+=(pointer[1]*lerp('gaze')-look[1])*smoothing;
  const cc=c.states[target],bp=(clock/1000)%cc.blinkInterval,bl=cc.blink&&bp>cc.blinkInterval-cc.blinkDuration?Math.sin((bp-(cc.blinkInterval-cc.blinkDuration))/cc.blinkDuration*Math.PI):0;
  const wt=(clock-winkAt)/(cc.winkDuration*1000),wink=wt>=0&&wt<1?Math.sin(wt*Math.PI):0;
  for(const id of ['eye-left','eye-right']){const box=nodes[id].getBBox(),cx=box.x+box.width/2,cy=box.y+box.height/2,k=Math.max(.07,1-(id==='eye-left'?Math.max(bl,wink):bl)*.94);wrappers[id].setAttribute('transform',`translate(${look[0]} ${look[1]}) translate(${cx} ${cy}) scale(1 ${k}) translate(${-cx} ${-cy})`);}
 }
 function animate(now){const dt=Math.min(.05,(now-previous)/1000);previous=now;if(!paused)render(dt);frame=requestAnimationFrame(animate);}
 svg.addEventListener('pointermove',e=>{const r=svg.getBoundingClientRect();pointer=[Math.max(-1,Math.min(1,(e.clientX-r.left)/r.width*2-1)),Math.max(-1,Math.min(1,(e.clientY-r.top)/r.height*2-1))];});svg.addEventListener('pointerleave',()=>{pointer=[0,0];});
 svg.addEventListener('click',()=>{clearTimeout(clickTimer);clickTimer=setTimeout(()=>winkAt=clock,260);});svg.addEventListener('dblclick',()=>{clearTimeout(clickTimer);jumpAt=clock;});
 reset(options.initial||'working');if(!options.manual)frame=requestAnimationFrame(animate);
 return {transition,setSelected,reset,step:render,pause:v=>paused=v,move:v=>manualRun=v,wink:()=>winkAt=clock,jump:()=>jumpAt=clock,get:()=>({active,target,blend,clock,transitioning:!!tx,paused,manualRun}),destroy:()=>{cancelAnimationFrame(frame);clearTimeout(clickTimer);svg.remove();},svg,body,cut,nodes};
}
