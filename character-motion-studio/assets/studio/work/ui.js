function App() {
  const [config, setConfig] = React.useState(cfg);
  const [state, setState] = React.useState('working');
  const [notice, setNotice] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [mode, setMode] = React.useState('animated');
  const [format, setFormat] = React.useState('mp4');
  const [transparent, setTransparent] = React.useState(false);
  const [uploadedCount, setUploadedCount] = React.useState(2);
  const [paused, setPaused] = React.useState(false);
  const [auto, setAuto] = React.useState(false);
  const [direction, setDirection] = React.useState(0);
  const mount = React.useRef();
  const files = React.useRef();

  React.useEffect(() => {
    runtime = buildRuntime(mount.current);
    window.__studio = {
      runtime,
      getConfig: () => cfg,
      setState: s => { runtime.transition(s); setState(s); },
      export: createExport
    };
    return () => runtime.destroy();
  }, []);
  React.useEffect(() => {
    cfg = config;
    try { localStorage.setItem('two-state-svg-v2', JSON.stringify(config)); } catch {}
  }, [config]);
  React.useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4200);
    return () => clearTimeout(timer);
  }, [notice]);
  React.useEffect(() => {
    if (!auto) return;
    const timer = setInterval(() => setState(current => { const next = current === 'working' ? 'receiving' : 'working'; runtime.transition(next); return next; }), config.duration + 1600);
    return () => clearInterval(timer);
  }, [auto, config.duration]);

  const update = (key, value) => setConfig(c => ({ ...c, [key]: value }));
  const updateExport = (key, value) => setConfig(c => ({ ...c, export: { ...c.export, [key]: value } }));
  const updateState = (key, value) => setConfig(c => ({ ...c, states: { ...c.states, [state]: { ...c.states[state], [key]: value } } }));
  const go = next => { runtime.transition(next); setState(next); };
  const button = (text, click, active = false, extra = {}) => h('button', { type: 'button', onClick: click, className: active ? 'active' : '', ...extra }, text);
  const section = (id, title, ...children) => h('section', { id, className: 'section' }, h('h2', null, title), ...children);
  const select = (label, value, options, change, disabled = false) => h('div', { className: 'row' }, h('label', null, label), h('select', { 'aria-label': label, value, disabled, onChange: e => change(e.target.value) }, ...options.map(([v, t]) => h('option', { key: v, value: v }, t))));
  const number = (label, value, min, max, step, change, unit = '', disabled = false) => h('div', { className: 'row' }, h('label', null, label), h('input', { 'aria-label': label, type: 'number', min, max, step, value, disabled, onChange: e => { const n = +e.target.value; if (Number.isFinite(n)) change(Math.max(min, Math.min(max, n))); } }), h('small', null, unit));
  const rangeNumber = (label, key, min, max, step, unit = '', disabled = false) => {
    const value = config.states[state][key];
    return h('div', { className: 'row' }, h('label', null, label), h('input', { 'aria-label': label + '滑杆', type: 'range', min, max, step, value, disabled, onChange: e => updateState(key, +e.target.value) }), h('input', { 'aria-label': label, type: 'number', min, max, step, value, disabled, onChange: e => updateState(key, Math.max(min, Math.min(max, +e.target.value))) }), h('small', null, unit));
  };
  const checkbox = (label, key) => h('div', { className: 'row' }, h('label', null, label), h('input', { 'aria-label': label, type: 'checkbox', checked: !!config.states[state][key], onChange: e => updateState(key, e.target.checked) }));

  async function uploadSVGs(e) {
    const selected = [...e.target.files];
    e.target.value = '';
    if (selected.length < 2 || selected.length > 10) return setNotice('请选择一组 SVG：最少 2 个，最多 10 个');
    try {
      const chosen = [selected[0], selected[selected.length - 1]];
      const docs = await Promise.all(chosen.map(async file => new DOMParser().parseFromString(await file.text(), 'image/svg+xml')));
      const parts = doc => [...doc.querySelectorAll('path')].map(p => Object.fromEntries([...p.attributes].map(a => [a.name, a.value]))).filter(p => p.d);
      const [from, to] = docs.map(parts);
      if (from.length < IDS.length || to.length < IDS.length) throw Error('每个 SVG 至少需要 ' + IDS.length + ' 条 path');
      for (const [i, id] of IDS.entries()) {
        ASSETS.states.working.paths[id] = { ...from[i], tag: 'path' };
        ASSETS.states.receiving.paths[id] = { ...to[i], tag: 'path' };
      }
      setUploadedCount(selected.length);
      runtime.reset('working');
      setState('working');
      setNotice('已读取 ' + selected.length + ' 个 SVG；本案例播放器以首尾状态验证路径点过渡。');
    } catch (error) { setNotice(error.message || 'SVG 文件无法读取'); }
  }

  function makePlayerDocument() {
    const doc = document.documentElement.cloneNode(true);
    doc.querySelector('#root').innerHTML = '';
    doc.querySelectorAll('script[data-saved-config]').forEach(el => el.remove());
    const saved = document.createElement('script');
    saved.setAttribute('data-saved-config', 'true');
    saved.textContent = 'window.SAVED_CONFIG=' + JSON.stringify(config) + ';window.PLAYER_MODE=true;';
    const bodyEl = doc.querySelector('body');
    bodyEl.insertBefore(saved, bodyEl.firstChild);
    const style = document.createElement('style');
    style.textContent = 'header,.controls{display:none!important}.layout{display:block;max-width:900px;height:100vh}.stagearea{height:100vh;padding:24px}.checker{min-height:520px}.stagehead{display:none}.hint{font-size:13px}';
    doc.querySelector('head').appendChild(style);
    return '<!doctype html>' + doc.outerHTML;
  }
  function openPlayer() {
    const opened = window.open('about:blank', '_blank');
    if (!opened) setNotice('浏览器拦截了新窗口，请允许此文件打开新标签页。');
    else {
      opened.document.open();
      opened.document.write(makePlayerDocument());
      opened.document.close();
      setNotice('已在新标签页打开纯动画播放器。');
    }
  }
  function downloadPlayer() {
    downloadBlob('角色动画播放器.html', new Blob([makePlayerDocument()], { type: 'text/html' }));
  }
  async function exportFile() {
    setBusy(true);
    try {
      const c = validConfig(config);
      c.alpha = transparent ? 0 : config.alpha;
      c.export = { ...c.export, mode, format };
      const result = await createExport(c, state);
      downloadBlob(result.name, result.blob);
      setNotice('已导出 ' + result.name + ' · ' + result.width + '×' + result.height);
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }

  const curve = config.curve;
  const curveGraph = h('svg', { className: 'curve', viewBox: '0 0 300 220' },
    h('path', { d: 'M20 155 H280 M20 65 H280', stroke: '#d2d2d2', strokeDasharray: '4 5', fill: 'none' }),
    h('path', { d: `M20 155 C${20 + curve[0] * 260} ${155 - curve[1] * 90} ${20 + curve[2] * 260} ${155 - curve[3] * 90} 280 65`, stroke: '#222', strokeWidth: 2.5, fill: 'none' })
  );
  const curveFields = h('div', { className: 'bezierfields' }, ...['X₁', 'Y₁', 'X₂', 'Y₂'].map((label, i) => h('label', { key: label }, label, h('input', { type: 'number', step: .01, min: i % 2 ? -1 : 0, max: i % 2 ? 2 : 1, value: curve[i], onChange: e => { const next = [...curve]; next[i] = +e.target.value; setConfig(c => ({ ...c, curvePreset: 'custom', curve: next })); } }))));
  const motion = section('motion', '01 / 过渡与缓动', number('过渡时长', config.duration, 200, 4000, 50, v => update('duration', v), 'ms'), select('曲线预设', config.curvePreset, Object.entries(CURVES).map(([k, v]) => [k, v.label]), v => setConfig(c => ({ ...c, curvePreset: v, curve: CURVES[v].v || c.curve }))), curveGraph, curveFields);
  const layers = section('layers', '02 / 分层与过渡', ...IDS.map(id => h('div', { className: 'pathrow', key: id }, h('span', null, LABELS[id], h('small', null, id)), h('select', { 'aria-label': LABELS[id] + '过渡', value: config.methods[id] || 'auto', onChange: e => setConfig(c => ({ ...c, methods: { ...c.methods, [id]: e.target.value } })) }, h('option', { value: 'auto' }, '自动 · 路径点'), h('option', { value: 'morph' }, '强制路径点形变'), h('option', { value: 'fade' }, '交叉淡入淡出')))));
  const behavior = section('behavior', '03 / 当前状态行为', h('div', { className: 'behaviorhead' }, h('strong', null, STATE_LABELS[state]), button('展示此状态', () => go(state), true)), rangeNumber('呼吸幅度', 'breath', 0, 5, .1, '%'), rangeNumber('呼吸周期', 'period', 1, 8, .1, 's'), checkbox('自动眨眼', 'blink'), rangeNumber('眨眼间隔', 'blinkInterval', 1, 10, .1, 's'), rangeNumber('眨眼时长', 'blinkDuration', .1, .6, .01, 's'), rangeNumber('视线跟随幅度', 'gaze', 0, 15, 1), rangeNumber('挥手幅度', 'wave', 0, 20, 1, '°', state === 'working'), rangeNumber('挥手周期', 'wavePeriod', .3, 4, .1, 's', state === 'working'), rangeNumber(state === 'working' ? '加载器转速' : '气流速度', 'special', 0, 3, .1, '×'), checkbox(state === 'working' ? '反向旋转' : '反向气流', 'reverse'), rangeNumber('Wink 时长', 'winkDuration', .15, 1, .01, 's'), rangeNumber('跳跃高度', 'jumpHeight', 0, 160, 5, 'px'), rangeNumber('跳跃时长', 'jumpDuration', .3, 1.6, .02, 's'));
  const idle = section('idle', '04 / 待机动画', select('待机动画', config.idlePreset, [['authored', '文件自带（每状态）'], ['none', '无'], ['breathe', '呼吸'], ['breathe-y', '纵向呼吸'], ['sway', '摇摆'], ['bob', '上下浮动'], ['shake', '抖动'], ['float', '漂浮']], v => update('idlePreset', v)));
  const anchor = section('anchor', '05 / 锚点与画布', h('div', { className: 'grid9' }, ...['↖', '↑', '↗', '←', '·', '→', '↙', '↓', '↘'].map((v, i) => button(v, () => update('anchor', i), config.anchor === i))), h('p', null, '整体缩放、呼吸与摇摆围绕所选锚点运动。'));
  const setBackground = (bg, alpha) => setConfig(c => ({ ...c, bg, alpha }));
  const backgroundActions = h('div', { className: 'actions' }, button('透明', () => update('alpha', 0)), button('白色', () => setBackground('#ffffff', 100)), button('深色', () => setBackground('#242424', 100)));
  const background = section('background', '06 / 背景颜色', h('div', { className: 'row' }, h('label', null, '背景颜色'), h('input', { type: 'color', value: config.bg, onChange: e => update('bg', e.target.value) })), number('不透明度', config.alpha, 0, 100, 1, v => update('alpha', v), '%'), backgroundActions);
  const exp = config.export;
  const delivery = section('delivery', '07 / 文件交付', h('div', { className: 'segmented' }, button('Static · 静态', () => { setMode('static'); setFormat('png'); }, mode === 'static'), button('Animated · 动画', () => { setMode('animated'); setFormat('mp4'); }, mode === 'animated')), select('Format · 格式', format, mode === 'static' ? [['png', 'PNG · 图片'], ['svg', 'SVG · 矢量']] : [['mp4', 'MP4 · H.264'], ['gif', 'GIF · 动图'], ['webm', 'WebM · VP9'], ['svg', 'SVG · 动画']], setFormat), select('Size · 尺寸', exp.size, [.25, .5, 1, 1.5, 2].map(v => [v, v + '× · ' + v * 1000 + ' × ' + v * 1000]), v => updateExport('size', +v)), select('Quality · 质量', exp.quality, [['low', 'Low · 低'], ['medium', 'Medium · 中'], ['high', 'High · 高']], v => updateExport('quality', v)), select('Frame rate · 帧率', exp.fps, [12, 15, 24, 30, 60].map(v => [v, v + ' fps']), v => updateExport('fps', +v), mode === 'static'), mode === 'animated' ? select('导出片段', exp.clip, [['current', '当前状态待机'], ['forward', '工作中 → 接受文档'], ['reverse', '接受文档 → 工作中'], ['roundtrip', '往返']], v => updateExport('clip', v)) : null, h('div', { className: 'row' }, h('label', null, '透明背景'), h('input', { 'aria-label': '透明背景', type: 'checkbox', checked: transparent, onChange: e => setTransparent(e.target.checked) })), h('button', { className: 'primary full', onClick: exportFile, disabled: busy }, busy ? '正在导出…' : '导出 ' + format.toUpperCase()));
  const web = section('web', '08 / 导出网页动画', h('div', { className: 'actions' }, h('button', { className: 'primary', onClick: openPlayer }, '新标签页预览播放器'), button('下载播放器（.HTML）', downloadPlayer)), h('p', null, '新标签页只显示角色、状态切换与动作控制。'));

  const stats = h('div', { className: 'stats' }, h('span', null, h('strong', null, uploadedCount), h('small', null, '状态')), h('span', null, h('strong', null, IDS.length), h('small', null, '共享部件')), h('span', null, h('strong', null, 5), h('small', null, '装饰')));
  const toggleDirection = value => { const next = direction === value ? 0 : value; setDirection(next); runtime.move(next); };
  const stage = h('div', { className: 'stagearea' }, h('div', { className: 'stagehead' }, h('strong', null, 'LIVE PREVIEW'), button('+ 上传一组 SVG', () => files.current.click())), h('div', { className: 'checker' }, h('div', { className: 'canvasbg', style: { backgroundColor: config.bg, opacity: config.alpha / 100 } }), h('div', { className: 'svgmount', ref: mount })), h('div', { className: 'statebar' }, button('工作中', () => go('working'), state === 'working'), button('接受文档', () => go('receiving'), state === 'receiving')), h('div', { className: 'actions centered' }, button(paused ? '继续动画' : '暂停动画', () => { runtime.pause(!paused); setPaused(!paused); }), button(auto ? '停止轮播' : '自动轮播', () => setAuto(!auto)), button('Wink', () => runtime.wink()), button('跳跃', () => runtime.jump())), h('div', { className: 'actions centered' }, button('向左边', () => toggleDirection(-1), direction === -1), button('向右边', () => toggleDirection(1), direction === 1)), h('div', { className: 'hint' }, '单击状态按钮切换 · 单击角色 Wink · 双击跳跃'), h('input', { ref: files, type: 'file', accept: '.svg,image/svg+xml', multiple: true, hidden: true, onChange: uploadSVGs }));
  const controls = h('aside', { className: 'controls' }, h('nav', { className: 'nav' }, ...[['motion', '缓动'], ['layers', '分层'], ['behavior', '行为'], ['idle', '待机'], ['delivery', '导出']].map(([id, text]) => h('a', { key: id, href: '#' + id }, text))), motion, layers, behavior, idle, anchor, background, delivery, web);
  return h(React.Fragment, null, h('header', null, h('div', { className: 'brand' }, h('span', { className: 'dot' }), h('div', null, h('h1', null, '角色动画实验室'), h('small', null, 'Path-to-path motion studio'))), stats), h('main', { className: 'layout' }, stage, controls), notice ? h('div', { className: 'toast' }, notice) : null);
}
ReactDOM.createRoot(document.getElementById('root')).render(h(App));
