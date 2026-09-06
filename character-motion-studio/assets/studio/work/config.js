const h=React.createElement,E=window.MorphEngine,IDS=Object.keys(ASSETS.states.working.paths);
const LABELS={'body-main':'身体主体','body-shadow':'身体阴影','face-main':'白色面部','eye-left':'左眼','eye-right':'右眼'};
const STATE_LABELS={working:'工作中',receiving:'接受文档'};
const CURVES={hold:{label:'Hold · 保持',v:[0,0,1,1]},linear:{label:'Linear · 匀速',v:[0,0,1,1]},in:{label:'Ease in · 渐入',v:[.42,0,1,1]},out:{label:'Ease out · 渐出',v:[0,0,.58,1]},inout:{label:'Ease in and out · 渐入渐出',v:[.42,0,.58,1]},inback:{label:'Ease in back · 先回拉',v:[.36,0,.66,-.56]},outback:{label:'Ease out back · 回弹收尾',v:[.34,1.56,.64,1]},inoutback:{label:'Ease in and out back · 双向回弹',v:[.68,-.6,.32,1.6]},custom:{label:'Custom bezier · 自定义贝塞尔',v:null}};
const SPRINGS={gentle:{label:'Gentle · 轻柔',stiffness:100,damping:18,mass:1},quick:{label:'Quick · 快速',stiffness:260,damping:27,mass:1},bouncy:{label:'Bouncy · 弹跳',stiffness:180,damping:10,mass:1},slow:{label:'Slow · 缓慢',stiffness:60,damping:14,mass:1.5},custom:{label:'Custom spring · 自定义弹簧'}};
const DEFAULTS={schemaVersion:2,duration:1000,easeMode:'curve',curvePreset:'inout',curve:[.42,0,.58,1],springPreset:'gentle',spring:{stiffness:100,damping:18,mass:1},bg:'#f5f5f5',alpha:100,anchor:7,idlePreset:'authored',methods:{},states:{working:{breath:1.5,period:3.4,blink:true,blinkInterval:4.3,blinkDuration:.24,gaze:0,wave:0,wavePeriod:1.4,special:1,reverse:false,winkDuration:.42,jumpHeight:125,jumpDuration:.72},receiving:{breath:2,period:2.8,blink:true,blinkInterval:4.3,blinkDuration:.24,gaze:0,wave:0,wavePeriod:1.4,special:1.2,reverse:false,winkDuration:.42,jumpHeight:125,jumpDuration:.72}},export:{mode:'animated',format:'mp4',size:1,quality:'high',fps:30,clip:'forward',seconds:3,hold:.7,repeat:false,matte:'#ffffff',aeSamples:112}};
function validConfig(raw){
 const c=JSON.parse(JSON.stringify(DEFAULTS));if(!raw||typeof raw!=='object')return c;
 const num=(v,lo,hi,d)=>v!==null&&v!==''&&Number.isFinite(+v)?Math.max(lo,Math.min(hi,+v)):d;
 c.duration=num(raw.duration,200,4000,c.duration);c.alpha=num(raw.alpha,0,100,c.alpha);c.anchor=Math.round(num(raw.anchor,0,8,c.anchor));
 if(/^#[\da-f]{6}$/i.test(raw.bg))c.bg=raw.bg;
 if(Array.isArray(raw.curve)&&raw.curve.length===4)c.curve=raw.curve.map((v,i)=>num(v,i%2?-1:0,i%2?2:1,c.curve[i]));
 if(raw.easeMode==='spring')c.easeMode='spring';
 if(['authored','none','breathe','breathe-y','sway','bob','shake','float'].includes(raw.idlePreset))c.idlePreset=raw.idlePreset;
 c.curvePreset=raw.curvePreset in CURVES?raw.curvePreset:(raw.curve?'custom':c.curvePreset);
 if(raw.springPreset in SPRINGS)c.springPreset=raw.springPreset;
 c.spring={stiffness:num(raw.spring?.stiffness,20,500,100),damping:num(raw.spring?.damping,1,60,18),mass:num(raw.spring?.mass,.2,5,1)};
 for(const id of IDS)if(['auto','morph','fade'].includes(raw.methods?.[id]))c.methods[id]=raw.methods[id];
 for(const state in c.states){let r=raw.states?.[state]||{},d=c.states[state];for(const [key,min,max]of [['breath',0,5],['period',1,8],['gaze',0,15],['wave',0,20],['wavePeriod',.3,4],['special',0,3],['blinkInterval',1,10],['blinkDuration',.1,.6],['winkDuration',.15,1],['jumpHeight',0,160],['jumpDuration',.3,1.6]])d[key]=num(r[key],min,max,d[key]);for(const key of ['blink','reverse'])if(typeof r[key]==='boolean')d[key]=r[key];}
 const r=raw.export||{},v=c.export;
 for(const [key,values]of Object.entries({mode:['static','animated'],format:['mp4','webm','gif','svg','png'],size:[.25,.5,1,1.5,2],quality:['low','medium','high'],fps:[12,15,24,30,60],clip:['current','forward','reverse','roundtrip']}))if(values.includes(r[key]))v[key]=r[key];
 v.aeSamples=[64,112,192].includes(r.aeSamples)?r.aeSamples:112;v.seconds=num(r.seconds,.5,10,3);v.hold=num(r.hold,0,3,.7);v.repeat=!!r.repeat;if(/^#[\da-f]{6}$/i.test(r.matte))v.matte=r.matte;
 if(v.mode==='static'&&!['svg','png'].includes(v.format))v.format='svg';if(v.mode==='animated'&&v.format==='png')v.format='mp4';
 return c;
}
function easing(c){
 if(c.easeMode==='curve')return c.curvePreset==='hold'?t=>t<1?0:1:E.cubicBezierEase(...c.curve);
 const {stiffness:k,damping:d,mass:m}=c.spring,w=Math.sqrt(k/m),z=d/(2*Math.sqrt(k*m));
 const response=t=>{if(z<1){const wd=w*Math.sqrt(1-z*z);return 1-Math.exp(-z*w*t)*(Math.cos(wd*t)+z/Math.sqrt(1-z*z)*Math.sin(wd*t));}if(Math.abs(z-1)<1e-6)return 1-Math.exp(-w*t)*(1+w*t);const q=Math.sqrt(z*z-1),r1=-w*(z-q),r2=-w*(z+q);return 1+(r2*Math.exp(r1*t)-r1*Math.exp(r2*t))/(r1-r2);};
 const end=response(c.duration/1000)||1;
 return t=>t<=0?0:t>=1?1:response(t*c.duration/1000)/end;
}
let loaded=window.SAVED_CONFIG;try{loaded=loaded||JSON.parse(localStorage.getItem('two-state-svg-v2'));}catch{}
let cfg=validConfig(loaded),runtime=null;
function downloadBlob(name,blob){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);}

function mediaBitrate(c){const x=c.export,size=Math.round(1000*x.size);return Math.round(Math.max(250000,size*size*x.fps*({low:.055,medium:.11,high:.2}[x.quality])));}
