const {chromium}=require('playwright');const fs=require('fs'),assert=require('assert');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],requests=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message)});page.on('request',r=>{if(r.url().startsWith('http'))requests.push(r.url())});
await page.goto(require('url').pathToFileURL(require('path').resolve('outputs/角色动画实验室.html')).href);await page.waitForFunction(()=>window.__studio);await page.screenshot({path:'work/v2-overview.png'});
console.log('opened');
for(const mode of ['hold','linear','in','out','inout','inback','outback','inoutback','custom']){await page.getByLabel('曲线预设',{exact:true}).selectOption(mode);await page.evaluate(()=>__studio.runtime.reset('working'));await page.evaluate(()=>__studio.setState('receiving'));await page.waitForTimeout(1100);assert.equal((await page.evaluate(()=>__studio.runtime.get())).active,'receiving');}
await page.getByRole('button',{name:'Spring · 弹簧',exact:true}).click();
for(const mode of ['gentle','quick','bouncy','slow','custom']){await page.getByLabel('弹簧预设',{exact:true}).selectOption(mode);await page.evaluate(()=>__studio.runtime.reset('working'));await page.evaluate(()=>__studio.setState('receiving'));await page.waitForTimeout(1100);}
assert(await page.evaluate(()=>{const c=__studio.getConfig();c.spring={stiffness:180,damping:10,mass:1};return Math.max(...Array.from({length:101},(_,i)=>easing(c)(i/100)))>1.1;}));
console.log('all presets');
for(let i=0;i<14;i++){await page.evaluate(s=>__studio.setState(s),i%2?'receiving':'working');await page.waitForTimeout(60);}await page.waitForTimeout(1200);
await page.getByLabel('工作中 呼吸幅度',{exact:true}).fill('4');await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>__studio.getConfig().states.working.breath),4);assert.equal(await page.evaluate(()=>__studio.getConfig().states.receiving.breath),2);
await page.getByRole('button',{name:'恢复默认',exact:true}).click();await page.waitForTimeout(100);
const reports=[];
for(const format of ['png','svg','gif','mp4','webm','jsx','animated-svg']){
 console.log('exporting',format);
 const r=await page.evaluate(async(format)=>{const c=validConfig({});c.duration=400;c.export={...c.export,mode:['png','svg'].includes(format)?'static':'animated',format:format==='animated-svg'?'svg':format==='jsx'?'mp4':format,size:.25,fps:12,quality:'low',hold:.15};const r=await createExport(c,'receiving',()=>{},{cancelled:false},format==='jsx'?'jsx':null);const bytes=new Uint8Array(await r.blob.arrayBuffer());let b='';for(let i=0;i<bytes.length;i+=10000)b+=String.fromCharCode(...bytes.subarray(i,i+10000));return {b64:btoa(b),type:r.blob.type,frames:r.frames,bytes:bytes.length,duration:r.duration,width:r.width};},format);
 fs.writeFileSync('work/test-'+format+'.'+(format==='animated-svg'?'svg':format),Buffer.from(r.b64,'base64'));delete r.b64;reports.push({format,...r});
}
console.log(JSON.stringify(reports));
await page.locator('#export').scrollIntoViewIfNeeded();await page.screenshot({path:'work/v2-export-panel.png'});
await page.getByRole('button',{name:'导出 HTML',exact:true}).scrollIntoViewIfNeeded();const dP=page.waitForEvent('download');await page.getByRole('button',{name:'导出 HTML',exact:true}).click();const d=await dP;await d.saveAs('work/v2-exported.html');const p2=await browser.newPage();p2.on('pageerror',e=>errors.push(e.message));await p2.goto(require('url').pathToFileURL(require('path').resolve('work/v2-exported.html')).href);await p2.waitForFunction(()=>window.__studio);assert.equal(await p2.locator('.svgmount svg').count(),1);
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'work/v2-mobile.png'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);fs.writeFileSync('work/qa-v2.json',JSON.stringify({passed:true,reports,errors,requests},null,2));console.log('PASS');await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
