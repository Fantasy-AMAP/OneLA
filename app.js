const $ = (selector) => document.querySelector(selector);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let previewsPaused = reducedMotion.matches;
const previews = [...document.querySelectorAll('video[data-auto]')];
const safePlay = (video) => video.play().catch(() => {});
function updatePreviews() {
  $('#motion-toggle').innerHTML = previewsPaused ? 'Play previews <span aria-hidden="true">▷</span>' : 'Pause previews <span aria-hidden="true">Ⅱ</span>';
  $('#motion-toggle').setAttribute('aria-pressed', String(previewsPaused));
  previews.forEach(video => {
    if (!previewsPaused && video.dataset.visible === 'true' && !document.hidden) safePlay(video);
    else video.pause();
  });
}
const videoObserver = new IntersectionObserver(entries => {
  entries.forEach(({ target, isIntersecting }) => { target.dataset.visible = String(isIntersecting); });
  updatePreviews();
}, { threshold: .2 });
previews.forEach(video => videoObserver.observe(video));
$('#motion-toggle').addEventListener('click', () => { previewsPaused = !previewsPaused; updatePreviews(); });
reducedMotion.addEventListener('change', event => { previewsPaused = event.matches; updatePreviews(); });
document.addEventListener('visibilitychange', () => { updatePreviews(); if (document.hidden) { stopAllTransferPairs(); $('#world-video').pause(); } });
updatePreviews();

const stages = [
  { input: 'Video frame pairs', inputDetail: 'Observed transitions across domains', center: 'Shared latent action', centerDetail: '32 coefficients · orthogonal dictionary', output: 'Predict the next frame', outputDetail: 'Current observation + transition embedding', chip: 'Reconstruction', image: 'game', description: 'Learn transition coefficients from ordered frame pairs without action labels. A shared orthonormal dictionary embeds these coefficients for next-frame reconstruction.' },
  { input: 'Native control commands', inputDetail: 'Game inputs · vehicle controls · robot actions', center: 'Lightweight command MLPs', centerDetail: 'Supervised mapping into the frozen LAM space', output: 'A common control interface', outputDetail: 'Domain-specific controls, shared coefficients', chip: 'Control alignment', image: 'robotics', description: 'Freeze the pretrained latent action model. Train lightweight, domain-specific MLPs on labeled trajectories to map native controls into the same latent action space.' },
  { input: 'Initial visual state + actions', inputDetail: 'Inferred transitions or mapped native controls', center: 'Shared video world model', centerDetail: 'Wan2.2-TI2V-5B + trainable action adapter', output: 'Video and action prediction', outputDetail: 'Context-dependent visual transitions', chip: 'World modeling', image: 'driving', description: 'Condition a shared video model on the initial observation and latent actions. Jointly predict video and realized-transition actions, with action targets supplied by the frozen latent action model.' }
];
function bindTabs(selector, onSelect) {
  const tabs = [...document.querySelectorAll(selector)];
  function select(tab, focus = false) {
    tabs.forEach(item => { item.setAttribute('aria-selected', String(item === tab)); item.tabIndex = item === tab ? 0 : -1; });
    if (focus) tab.focus();
    onSelect(tab);
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', event => {
      const key = event.key;
      if (!['ArrowRight','ArrowLeft','Home','End'].includes(key)) return;
      event.preventDefault();
      const next = key === 'Home' ? 0 : key === 'End' ? tabs.length - 1 : (index + (key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      select(tabs[next], true);
    });
  });
}
bindTabs('[data-step]', tab => {
  const index = Number(tab.dataset.step), stage = stages[index];
  $('#concept-panel').setAttribute('aria-labelledby', tab.id);
  $('#concept-panel').dataset.stage = String(index);
  for (const [id, value] of Object.entries({ 'input-title':stage.input, 'input-detail':stage.inputDetail, 'center-title':stage.center, 'center-detail':stage.centerDetail, 'output-title':stage.output, 'output-detail':stage.outputDetail, 'diagram-chip':stage.chip, 'step-description':stage.description })) $(`#${id}`).textContent = value;
  $('#diagram-image').src = `assets/${stage.image}.jpg`;
  $('#step-number').textContent = `0${index + 1} / 03`;
});
const worlds = {
  game: { index:'01', title:'Moving through\nvirtual worlds.', copy:'Character movement and changes in viewpoint in a game environment, conditioned through the latent action interface.', source:'Game environment', speed:'24 fps · original speed' },
  navigation: { index:'02', title:'Exploring\nreal spaces.', copy:'A generated camera trajectory through a real interior. The visual context changes while the latent action interface remains shared.', source:'Real-world navigation', speed:'16 fps · original speed' },
  driving: { index:'03', title:'Following\nthe road ahead.', copy:'A generated driving sequence in an urban scene, illustrating context-dependent visual transitions through the same action space.', source:'nuScenes driving', speed:'12 fps · original speed' },
  robotics: { index:'04', title:'Acting on\nthe physical world.', copy:'A selected robot-manipulation rollout illustrating the latent action interface.', source:'RT-1 manipulation', speed:'3 fps · original speed' }
};
bindTabs('[data-world]', tab => {
  const key = tab.dataset.world, data = worlds[key], video = $('#world-video');
  video.pause();
  video.poster = `assets/${key}.jpg`; video.src = `assets/${key}.mp4`; video.load();
  video.setAttribute('aria-label', `Selected generated ${key} rollout`);
  $('#world-panel').setAttribute('aria-labelledby', tab.id);
  $('#world-title').replaceChildren(...data.title.split('\n').flatMap((line, i) => i ? [document.createElement('br'), document.createTextNode(line)] : [document.createTextNode(line)]));
  $('#world-copy').textContent = data.copy; $('#world-source').textContent = data.source; $('#world-speed').textContent = data.speed; $('#world-index').textContent = `${data.index} / 04`;
});
const transferPlayers = [];
function stopAllTransferPairs(except) {
  transferPlayers.forEach(player => { if (player !== except) player.pause(); });
}
function waitReady(video) {
  if (video.readyState >= 3) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { cleanup(); reject(new Error('Video loading timed out')); }, 12000);
    const ready = () => { cleanup(); resolve(); };
    const fail = () => { cleanup(); reject(new Error('Video unavailable')); };
    const cleanup = () => { clearTimeout(timer); video.removeEventListener('canplay', ready); video.removeEventListener('error', fail); };
    video.addEventListener('canplay', ready); video.addEventListener('error', fail); video.load();
  });
}
document.querySelectorAll('[data-transfer]').forEach((card, index) => {
  const pair = [...card.querySelectorAll('video')];
  const button = card.querySelector('.pair-play');
  const seek = card.querySelector('.pair-seek');
  const time = card.querySelector('.pair-time');
  const status = card.querySelector('.pair-status');
  let request = 0, active = false, loading = false, ended = false;
  const duration = () => Math.min(...pair.map(video => Number.isFinite(video.duration) ? video.duration : Number(seek.max)));
  function paint() {
    button.innerHTML = active ? 'Pause pair <span aria-hidden="true">Ⅱ</span>' : loading ? 'Cancel <span aria-hidden="true">×</span>' : ended ? 'Replay pair <span aria-hidden="true">↻</span>' : 'Play pair <span aria-hidden="true">▷</span>';
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', `${active ? 'Pause' : loading ? 'Cancel loading' : ended ? 'Replay' : 'Play'} case ${index + 1} pair`);
  }
  function updateTime() {
    const position = Math.min(pair[0].currentTime, duration());
    seek.value = String(position);
    time.textContent = `${position.toFixed(1)} / ${duration().toFixed(1)}s`;
  }
  const player = { pause() { request++; active = false; loading = false; pair.forEach(video => video.pause()); status.textContent = ''; paint(); } };
  transferPlayers.push(player);
  button.addEventListener('click', async () => {
    if (active || loading) { player.pause(); return; }
    stopAllTransferPairs(player);
    const token = ++request;
    loading = true; status.textContent = 'Loading video pair…'; paint();
    try {
      await Promise.all(pair.map(waitReady));
      if (token !== request) return;
      seek.disabled = false; seek.max = String(duration());
      if (ended || pair.some(video => video.ended) || pair[0].currentTime >= duration() - .06) pair.forEach(video => { video.currentTime = 0; });
      else pair[1].currentTime = pair[0].currentTime;
      ended = false;
      await Promise.all(pair.map(video => video.play()));
      if (token !== request) { pair.forEach(video => video.pause()); return; }
      loading = false; active = true; status.textContent = ''; paint();
    } catch {
      if (token === request) { player.pause(); status.textContent = 'Unable to load this pair. Press Play pair to retry.'; }
    }
  });
  pair.forEach(video => video.addEventListener('ended', () => { player.pause(); ended = true; paint(); updateTime(); }));
  pair[0].addEventListener('timeupdate', () => {
    if (active && !pair[1].seeking && Math.abs(pair[0].currentTime - pair[1].currentTime) > .12) pair[1].currentTime = pair[0].currentTime;
    updateTime();
  });
  seek.addEventListener('input', () => {
    player.pause(); ended = false;
    pair.forEach(video => { video.currentTime = Number(seek.value); });
    paint(); updateTime();
  });
});
$('#copy-citation').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#bibtex').textContent); $('#copy-status').textContent = 'Copied'; }
  catch { const range = document.createRange(); range.selectNodeContents($('#bibtex')); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); $('#copy-status').textContent = 'Selected — press Ctrl/Cmd+C'; }
  setTimeout(() => { $('#copy-status').textContent = ''; }, 4000);
});
