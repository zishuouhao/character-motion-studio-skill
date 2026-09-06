from pathlib import Path
import xml.etree.ElementTree as ET
import json,re
root=Path(__file__).resolve().parent.parent
work=root/'work'; out=root/'outputs';out.mkdir(exist_ok=True)
def read(name):return [dict(p.attrib) for p in ET.parse(work/'source'/name).getroot()]
w=read('工作总.svg');r=read('接受文档.svg');original_r=read('接受文档.svg')
outer,hole=re.findall(r'M[^M]+',r[0]['d']);r[0]['d']=outer
ids=['body-main','body-shadow','face-main','eye-left','eye-right'];states={}
for name,src,idx in [('working',w,[0,1,2,3,4]),('receiving',r,[0,1,3,4,5])]:states[name]={'paths':{key:{'tag':'path',**src[i]} for key,i in zip(ids,idx)}}
def markup(paths):return ''.join('<path '+' '.join(k+'="'+str(v)+'"' for k,v in p.items())+'/>' for p in paths)
def svg_named(src,order):
 content=''
 for name,idx in order:
  pp=[{**src[i],'id':name if len(idx)==1 else name+'-'+str(j+1)} for j,i in enumerate(idx)]
  content+=markup(pp) if len(idx)==1 else '<g id="'+name+'">'+markup(pp)+'</g>'
 return '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000" fill="none">'+content+'</svg>'
originals={'working':svg_named(w,list(zip(ids,[[0],[1],[2],[3],[4]]))+[('fx-spinner',list(range(5,13))),('prop-laptop',list(range(13,19)))]),'receiving':svg_named(original_r,[('body-main',[0]),('body-shadow',[1]),('mouth-rim',[2]),('face-main',[3]),('eye-left',[4]),('eye-right',[5]),('hand-right',[6]),('fx-airflow',list(range(7,12)))])}
data={'states':states,'hole':hole,'spinner':markup(w[5:13]),'laptop':markup(w[13:]),'mouth':markup([r[2]]),'hand':markup([r[6]]),'air':markup(r[7:]),'originals':originals}
engine=(work/'engine.js').read_text() if (work/'engine.js').exists() else Path('/Users/zishuouhao/.agents/skills/svg-character-animator/templates/preview/engine.jsx').read_text()
(work/'engine.js').write_text(engine)
licenses='\n\n'.join((work/n).read_text() for n in ['LICENSE-react','LICENSE-flubber','LICENSE-gifenc','LICENSE-fflate','LICENSE-mediabunny'])
parts=[(work/n).read_text() for n in ['react.js','react-dom.js','flubber.min.js','fflate.js']]
for name,key in [('gifenc.cjs','Gifenc'),('mediabunny.cjs','MediaBunny')]:parts.append('(function(){var module={exports:{}},exports=module.exports;\n'+(work/name).read_text()+'\nwindow.'+key+'=module.exports;})();')
scripts='/* THIRD PARTY LICENSES\n'+licenses+'\n*/\n'+'\n'.join(parts)+'\nwindow.ASSETS='+json.dumps(data,ensure_ascii=False)+';window.STATES_DATA=ASSETS.states;window.PREVIEW_CONFIG={title:"双状态实验室-v2"};\n'+engine+'\n'+'\n'.join((work/n).read_text() for n in ['config.js','runtime.js','exporters-v2.js','ui.js'])
extra_css='''<style>
.stats{display:flex;align-items:center}.stats span{min-width:92px;padding:0 22px;border-left:1px solid #ddd;display:flex;flex-direction:column}.stats strong{font-size:22px}.stats small{margin-top:4px}.stagehead .actions{justify-content:flex-end}.controls input.full{width:100%;padding:10px;border:1px solid #ddd;border-radius:7px}.pathrow span small{display:block}.primary{min-height:42px}.behaviorhead{margin-bottom:10px}.layout{grid-template-columns:minmax(560px,1fr) 400px}.stagearea{padding:18px 22px 16px;gap:12px}.checker{min-height:520px}.svgmount{inset:4px}.svgmount svg{max-width:820px;max-height:820px}.statebar button{min-width:180px;padding:14px}.stagearea>.actions button{min-width:112px}
@media(max-width:820px){.stats span{min-width:66px;padding:0 10px}.stats strong{font-size:17px}}
</style>'''
html=(work/'shell.html').read_text().replace('</head>',extra_css+'</head>').replace('<!--BUNDLE-->','<script>'+scripts.replace('</script','<\\/script')+'</script>')
(out/'角色动画实验室.html').write_text(html)
print('Built',len(html.encode()),'bytes')
