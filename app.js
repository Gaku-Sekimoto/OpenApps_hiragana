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
  { name: 'わ行', chars: ['わ','を','ん'] },
  { name: 'すうじ', chars: ['0','1','2','3','4','5','6','7','8','9'], unit: 'こ' }
];

const strokeColors = ['#f06b72','#38b86a','#46b9eb','#a678dd'];
const orderGuideOffsets = { '5': [{ x:0, y:11 }, { x:0, y:0 }] };
const state = { row:0, char:0, completed:{}, sound:true, drawing:false, points:0, hasDrawn:false };
const $ = id => document.getElementById(id);
const canvas = $('traceCanvas');
const ctx = canvas.getContext('2d');
let ratio = 1;

function key(row = state.row, char = state.char) { return `${row}-${char}`; }
function currentChar() { return rows[state.row].chars[state.char]; }
function currentStrokes() {
  const char = currentChar();
  return NUMBER_STROKES[char] || HIRAGANA_STROKES[char.codePointAt(0).toString(16).padStart(5,'0')] || [];
}

function renderTabs() {
  $('rowTabs').innerHTML = rows.map((row,i) => `<button class="row-tab ${i===state.row?'active':''}" data-row="${i}" type="button">${row.name}</button>`).join('');
  document.querySelectorAll('.row-tab').forEach(btn => btn.onclick = () => selectRow(+btn.dataset.row));
}

function renderProgress() {
  const row = rows[state.row];
  const unit = row.unit || 'もじ';
  const done = row.chars.filter((_,i) => state.completed[key(state.row,i)]).length;
  $('challengeTitle').textContent = row.name;
  $('rowProgress').innerHTML = row.chars.map((_,i) => `<span class="progress-pill ${state.completed[key(state.row,i)]?'done':''}"></span>`).join('');
  $('progressText').textContent = `${done} / ${row.chars.length} ${unit}`;
  $('starCount').textContent = `★ ${done}`;
  $('rowProgress').setAttribute('aria-label', `${row.name}は${row.chars.length}${unit}中${done}${unit}できました`);
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
  renderOrderGuide();
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
  const layout = getStrokeLayout();
  const paths = currentStrokes();
  ctx.save();
  ctx.translate(layout.x, layout.y); ctx.scale(layout.scale, layout.scale);
  ctx.lineCap='round'; ctx.lineJoin='round'; ctx.lineWidth=7;
  paths.forEach((path,i) => {
    ctx.strokeStyle = strokeColors[i % strokeColors.length] + '9e';
    ctx.stroke(new Path2D(path));
  });
  ctx.restore();
}

function getStrokeLayout() {
  const scale = Math.min(canvas.clientWidth,canvas.clientHeight) / 109 * .88;
  return { scale, x:(canvas.clientWidth-109*scale)/2, y:(canvas.clientHeight-109*scale)/2 };
}

function pointFromEvent(e) { const r=canvas.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; }
function beginDraw(e) {
  e.preventDefault(); state.drawing=true; state.hasDrawn=true; const p=pointFromEvent(e);
  ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineCap='round'; ctx.lineJoin='round'; ctx.lineWidth=Math.max(10,canvas.clientWidth*.032); ctx.strokeStyle='#eb6f3e';
  canvas.setPointerCapture?.(e.pointerId);
}
function moveDraw(e) { if(!state.drawing)return; e.preventDefault(); const p=pointFromEvent(e); ctx.lineTo(p.x,p.y); ctx.stroke(); state.points++; }
function endDraw(e) { if(!state.drawing)return; state.drawing=false; canvas.releasePointerCapture?.(e.pointerId); }

function clearDrawing(message='ゆびを はなさずに、ゆっくり なぞってみよう') { state.hasDrawn=false; state.points=0; $('successMessage').classList.remove('show'); $('hintText').textContent=message; drawGuide(); }

function renderOrderGuide(replay = false) {
  const paths = currentStrokes();
  const layout = getStrokeLayout(), w=canvas.clientWidth, h=canvas.clientHeight;
  $('orderOverlay').innerHTML=paths.map((d,i) => {
    const path=document.createElementNS('http://www.w3.org/2000/svg','path'); path.setAttribute('d',d);
    const total=path.getTotalLength(), start=path.getPointAtLength(0), ahead=path.getPointAtLength(Math.min(9,total));
    const angle=Math.atan2(ahead.y-start.y,ahead.x-start.x)*180/Math.PI;
    const offset=orderGuideOffsets[currentChar()]?.[i] || {x:0,y:0};
    const left=(layout.x+(start.x+offset.x)*layout.scale)/w*100, top=(layout.y+(start.y+offset.y)*layout.scale)/h*100;
    const color=strokeColors[i%strokeColors.length];
    return `<span class="stroke-guide" style="left:${left}%;top:${top}%;--stroke-color:${color};--arrow-angle:${angle}deg;animation-delay:${i*.12}s"><span class="stroke-number">${i+1}</span><span class="stroke-arrow">➜</span></span>`;
  }).join('');
  if (replay) {
    document.querySelectorAll('.stroke-guide').forEach((item,i) => {
      item.animate([{opacity:.15},{opacity:1},{opacity:.35},{opacity:1}], {duration:650,delay:i*90});
    });
  }
}

function showOrder() {
  renderOrderGuide(true);
  $('hintText').textContent='1、2、3… の じゅんで かいてみよう';
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
