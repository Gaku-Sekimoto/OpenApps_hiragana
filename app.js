const rows = [
  { name: 'あ行', chars: ['あ','い','う','え','お'] },
  { name: 'か行', chars: ['か','き','く','け','こ'] },
  { name: 'さ行', chars: ['さ','し','す','せ','そ'] },
  { name: 'た行', chars: ['た','ち','つ','て','と'] },
  { name: 'な行', chars: ['な','に','ぬ','ね','の'] },
  { name: 'は行', chars: ['は','ひ','ふ','へ','ほ'] },
  { name: 'ま行', chars: ['ま','み','む','め','も'] },
  { name: 'や行', chars: ['や','ゆ','よ'] },
  { name: 'ら行', chars: ['ら','り','る','れ','ろ'] },
  { name: 'わ行', chars: ['わ','を','ん'] }
];

const strokeCounts = {あ:3,い:2,う:2,え:2,お:3,か:3,き:4,く:1,け:3,こ:2,さ:3,し:1,す:2,せ:3,そ:1,た:4,ち:2,つ:1,て:1,と:2,な:4,に:3,ぬ:2,ね:2,の:1,は:3,ひ:1,ふ:4,へ:1,ほ:4,ま:3,み:2,む:3,め:2,も:3,や:3,ゆ:2,よ:2,ら:2,り:2,る:1,れ:2,ろ:1,わ:2,を:3,ん:1};
const startPositions = [[28,20],[49,18],[34,45],[61,40]];
const state = { row:0, char:0, completed:{}, sound:true, drawing:false, points:0, hasDrawn:false };
const $ = id => document.getElementById(id);
const canvas = $('traceCanvas');
const ctx = canvas.getContext('2d');
let ratio = 1;

function key(row = state.row, char = state.char) { return `${row}-${char}`; }
function currentChar() { return rows[state.row].chars[state.char]; }

function renderTabs() {
  $('rowTabs').innerHTML = rows.map((row,i) => `<button class="row-tab ${i===state.row?'active':''}" data-row="${i}" type="button">${row.name}</button>`).join('');
  document.querySelectorAll('.row-tab').forEach(btn => btn.onclick = () => selectRow(+btn.dataset.row));
}

function renderProgress() {
  const row = rows[state.row];
  const done = row.chars.filter((_,i) => state.completed[key(state.row,i)]).length;
  $('challengeTitle').textContent = row.name;
  $('rowProgress').innerHTML = row.chars.map((_,i) => `<span class="progress-pill ${state.completed[key(state.row,i)]?'done':''}"></span>`).join('');
  $('progressText').textContent = `${done} / ${row.chars.length} もじ`;
  $('starCount').textContent = `★ ${done}`;
  $('rowProgress').setAttribute('aria-label', `${row.name}は${row.chars.length}文字中${done}文字できました`);
}

function renderCharacter() {
  const row = rows[state.row], char = currentChar();
  $('characterName').textContent = `「${char}」を なぞろう`;
  $('characterDots').innerHTML = row.chars.map((c,i) => `<button type="button" aria-label="${c}" data-char="${i}" class="char-dot ${i===state.char?'active':''} ${state.completed[key(state.row,i)]?'done':''}"></button>`).join('');
  document.querySelectorAll('.char-dot').forEach(btn => btn.onclick = () => selectChar(+btn.dataset.char));
  $('prevChar').disabled = state.char === 0;
  $('nextChar').disabled = state.char === row.chars.length - 1;
  $('successMessage').classList.remove('show');
  $('orderOverlay').innerHTML = '';
  state.hasDrawn = false; state.points = 0;
  resizeCanvas();
}

function selectRow(index) { state.row=index; state.char=0; renderTabs(); renderProgress(); renderCharacter(); }
function selectChar(index) { state.char=index; renderProgress(); renderCharacter(); }

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio);
  ctx.setTransform(ratio,0,0,ratio,0,0); drawGuide();
}

function drawGuide() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ctx.clearRect(0,0,w,h);
  const size = Math.min(w,h) * .72;
  ctx.save();
  ctx.font = `900 ${size}px "Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.lineWidth = Math.max(16, size*.105); ctx.lineJoin='round';
  ctx.strokeStyle='#eadfd4'; ctx.setLineDash([3,11]);
  ctx.strokeText(currentChar(),w/2,h/2+size*.03);
  ctx.fillStyle='rgba(255,255,255,.01)'; ctx.fillText(currentChar(),w/2,h/2+size*.03);
  ctx.restore();
}

function pointFromEvent(e) { const r=canvas.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; }
function beginDraw(e) {
  e.preventDefault(); state.drawing=true; state.hasDrawn=true; const p=pointFromEvent(e);
  ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineCap='round'; ctx.lineJoin='round'; ctx.lineWidth=Math.max(18,canvas.clientWidth*.052); ctx.strokeStyle='#ef8150';
  canvas.setPointerCapture?.(e.pointerId);
}
function moveDraw(e) { if(!state.drawing)return; e.preventDefault(); const p=pointFromEvent(e); ctx.lineTo(p.x,p.y); ctx.stroke(); state.points++; }
function endDraw(e) { if(!state.drawing)return; state.drawing=false; canvas.releasePointerCapture?.(e.pointerId); }

function clearDrawing(message='ゆびを はなさずに、ゆっくり なぞってみよう') { state.hasDrawn=false; state.points=0; $('successMessage').classList.remove('show'); $('hintText').textContent=message; drawGuide(); }

function showOrder() {
  const count=strokeCounts[currentChar()]||2;
  $('orderOverlay').innerHTML = startPositions.slice(0,count).map((p,i)=>`<span class="stroke-number" style="left:${p[0]}%;top:${p[1]}%;animation-delay:${i*.12}s">${i+1}</span>`).join('');
  $('hintText').textContent='1、2、3… の じゅんで かいてみよう';
  setTimeout(()=>{ $('orderOverlay').innerHTML=''; },3500);
}

function checkAnswer() {
  if(!state.hasDrawn || state.points < 8) {
    $('hintText').textContent='もうすこし！ てんせんを なぞってみよう';
    $('canvasWrap').animate([{transform:'translateX(-5px)'},{transform:'translateX(5px)'},{transform:'none'}],{duration:240});
    return;
  }
  state.completed[key()] = true; saveProgress(); renderProgress();
  $('successMessage').classList.add('show'); $('hintText').textContent='すごい！ きれいに かけたね';
  if(state.sound) playSuccessSound(); launchConfetti();
  setTimeout(()=>{ if(state.char < rows[state.row].chars.length-1) selectChar(state.char+1); },1800);
}

function playSuccessSound() {
  const AudioCtx=window.AudioContext||window.webkitAudioContext; if(!AudioCtx)return;
  const ac=new AudioCtx(), now=ac.currentTime;
  [523.25,659.25,783.99].forEach((freq,i)=>{ const o=ac.createOscillator(),g=ac.createGain(); o.type='sine'; o.frequency.value=freq; g.gain.setValueAtTime(0,now+i*.11); g.gain.linearRampToValueAtTime(.16,now+i*.11+.02); g.gain.exponentialRampToValueAtTime(.001,now+i*.11+.35); o.connect(g).connect(ac.destination); o.start(now+i*.11); o.stop(now+i*.11+.38); });
}

function launchConfetti() {
  const colors=['#f58b4c','#ffd95a','#64c9ad','#79a8e8','#ed78a1']; const host=$('confetti'); host.innerHTML='';
  for(let i=0;i<36;i++){ const piece=document.createElement('i'); piece.className='confetti-piece'; piece.style.left=`${28+Math.random()*44}%`; piece.style.background=colors[i%colors.length]; piece.style.setProperty('--drift',`${(Math.random()-.5)*320}px`); piece.style.setProperty('--duration',`${1.2+Math.random()*.9}s`); piece.style.animationDelay=`${Math.random()*.25}s`; host.appendChild(piece); }
  setTimeout(()=>host.innerHTML='',2400);
}

function saveProgress(){ try{localStorage.setItem('hiragana-suisui',JSON.stringify(state.completed));}catch(e){} }
function loadProgress(){ try{state.completed=JSON.parse(localStorage.getItem('hiragana-suisui'))||{};}catch(e){} }

canvas.addEventListener('pointerdown',beginDraw); canvas.addEventListener('pointermove',moveDraw); canvas.addEventListener('pointerup',endDraw); canvas.addEventListener('pointercancel',endDraw);
$('clearCanvas').onclick=()=>clearDrawing(); $('checkAnswer').onclick=checkAnswer; $('showOrder').onclick=showOrder;
$('prevChar').onclick=()=>selectChar(state.char-1); $('nextChar').onclick=()=>selectChar(state.char+1);
$('resetRow').onclick=()=>{ rows[state.row].chars.forEach((_,i)=>delete state.completed[key(state.row,i)]); saveProgress(); selectChar(0); };
$('soundButton').onclick=()=>{ state.sound=!state.sound; $('soundButton').classList.toggle('muted',!state.sound); $('soundButton').setAttribute('aria-pressed',String(state.sound)); $('soundButton').setAttribute('aria-label',state.sound?'音を消す':'音を出す'); };
window.addEventListener('resize',()=>{ clearTimeout(window.resizeTimer); window.resizeTimer=setTimeout(resizeCanvas,120); });
loadProgress(); renderTabs(); renderProgress(); renderCharacter();
