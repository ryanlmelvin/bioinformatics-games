/* The book shell shared by every page: the chapter bar, the chapter cover, sound, celebrations and
   the "keep going" links. It only watches the page (the level panel, the vocabulary row, the status
   line) and never touches a game's state, so the games play exactly as they do without it. */
(function(){
'use strict';
const BOOK=window.BOOK;if(!BOOK)return;
const here=document.currentScript.src,base=here.slice(0,here.lastIndexOf('/book/')+1);
const path=location.pathname;
let ch=null,side=false;
BOOK.chapters.forEach(c=>{
  if(path.includes('/'+c.dir+'/'))ch=c;
  if(c.side&&path.includes('/'+c.side.dir+'/')){ch=c;side=true;}
});
const home=!ch;
const G=side?ch.side:ch;                       // the game on this page, if any
const params=new URLSearchParams(location.search);
const calm=matchMedia('(prefers-reduced-motion:reduce)').matches;
const $=(s,r)=>(r||document).querySelector(s);
const el=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;};
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- sound: a few synthesised notes, no audio files ---------- */
let soundOn=store.get('book:sound',true),ac=null;
function ctx(){if(!ac){const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;ac=new A();}if(ac.state==='suspended')ac.resume();return ac;}
function note(f,t0,dur,vol,type,f2){
  const a=ctx();if(!a)return;const o=a.createOscillator(),g=a.createGain(),t=a.currentTime+t0;
  o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g).connect(a.destination);o.start(t);o.stop(t+dur+.02);
}
const SFX={
  tick(){note(520,0,.05,.035,'triangle',380);},
  // the sounds of each game's own controls
  clack(){note(210,0,.045,.07,'square',150);note(320,.012,.03,.035,'square',240);},
  chunk(){note(120,0,.2,.09,'sawtooth',55);note(240,.16,.05,.07,'square',160);},
  step(){note(250,0,.05,.05,'triangle',170);},
  flick(){note(900,0,.035,.03,'triangle',500);},
  bloop(){note(280,0,.13,.07,'sine',620);},
  pluck(){note(392,0,.3,.07,'triangle');note(784,0,.12,.025,'sine');},
  nA(){note(523.25,0,.16,.07,'sine');},nC(){note(659.25,0,.16,.07,'sine');},nG(){note(783.99,0,.16,.07,'sine');},nT(){note(880,0,.16,.07,'sine');},
  good(){note(523.25,0,.14,.07,'sine');note(783.99,.09,.22,.07,'sine');},
  warn(){note(196,0,.16,.06,'triangle',150);},
  term(){[523.25,659.25,783.99,1046.5].forEach((f,i)=>note(f,i*.075,.3,.06,'sine'));},
  level(){[392,523.25,659.25,783.99].forEach((f,i)=>note(f,i*.11,.26,.07,'triangle'));
    [523.25,659.25,783.99,1046.5].forEach(f=>note(f,.46,.9,.045,'sine'));}
};
const RANK={warn:1,good:2,term:3,level:4};   // anything unlisted is a click sound, rank 0
let pending=null,ptimer=0;
function play(name){                           // one sound per moment: the most important wins
  if(!soundOn)return;
  if(!pending||(RANK[name]||0)>=(RANK[pending]||0))pending=name;
  clearTimeout(ptimer);ptimer=setTimeout(()=>{const n=pending;pending=null;try{SFX[n]();}catch(e){}},RANK[name]?70:0);
}

/* ---------- the bar across the top of every page ---------- */
const ICON={
  book:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 14c16-7 24 5 24 5v36s-8-10-24-5z" fill="#fdf8ec"/><path d="M56 14c-16-7-24 5-24 5v36s8-10 24-5z" fill="#f0e3c2"/><path d="M15 24c9 0 5 18 11 18M15 42c9 0 5-18 11-18" fill="none" stroke="#c2410c" stroke-width="2.6" stroke-linecap="round"/><path d="M39 27l9 7-8 9" fill="none" stroke="#1f8a9c" stroke-width="2"/><g fill="#1f8a9c"><circle cx="39" cy="27" r="3"/><circle cx="48" cy="34" r="3"/><circle cx="40" cy="43" r="3"/></g></svg>',
  on:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  off:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  doc:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 3v4h4M9 12h6M9 15.500h6M9 9h2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
};
window.BOOK.icon=ICON;
function bar(){
  const i=ch?BOOK.chapters.indexOf(ch):-1,prev=i>0?BOOK.chapters[i-1]:null,next=i>=0&&i<BOOK.chapters.length-1?BOOK.chapters[i+1]:null;
  const b=el('nav','bk-bar');b.setAttribute('aria-label','Book');
  b.innerHTML='<a class="bk-brand" href="'+base+'" title="Contents">'+ICON.book+'<span>'+BOOK.title+'</span></a>'+
    (ch?'<div class="bk-where"><span class="bk-chip">'+(side?'Side quest':'Chapter '+ch.n)+'</span><span class="bk-topic">'+(ch.short||ch.topic)+'</span></div>':'<div class="bk-where"></div>')+
    '<div class="bk-nav">'+
    (ch?(prev?'<a class="bk-step" href="'+base+prev.dir+'/" title="Chapter '+prev.n+': '+esc(prev.topic)+'" aria-label="Previous chapter">‹</a>':'<span class="bk-step off" aria-hidden="true">‹</span>')+
        '<a class="bk-toc" href="'+base+'#contents">Contents</a>'+
        (next?'<a class="bk-step" href="'+base+next.dir+'/" title="Chapter '+next.n+': '+esc(next.topic)+'" aria-label="Next chapter">›</a>':'<span class="bk-step off" aria-hidden="true">›</span>'):'')+
    '<button class="bk-sound" type="button"></button></div>';
  document.body.prepend(b);
  const sb=$('.bk-sound',b);
  const paint=()=>{sb.innerHTML=soundOn?ICON.on:ICON.off;sb.setAttribute('aria-label',soundOn?'Sound is on. Turn sound off':'Sound is off. Turn sound on');sb.title=soundOn?'Sound on':'Sound off';sb.setAttribute('aria-pressed',soundOn);};
  paint();sb.onclick=()=>{soundOn=!soundOn;store.set('book:sound',soundOn);paint();if(soundOn)SFX.good();};
}

/* ---------- confetti in the chapter's colours ---------- */
function confetti(){
  if(calm)return;
  const c=el('canvas','bk-confetti');document.body.append(c);
  const d=Math.min(devicePixelRatio||1,2),W=c.width=innerWidth*d,H=c.height=innerHeight*d,x=c.getContext('2d');
  const cols=[G.hue||ch.hue,'#e9b949','#2e7d4f','#2b5fb3','#b83a4b','#fdf8ec'],L='ACGT';
  const P=Array.from({length:110},(_,i)=>({x:W*(.5+(Math.random()-.5)*.5),y:H*.28,vx:(Math.random()-.5)*16*d,vy:(-6-Math.random()*11)*d,
    r:Math.random()*6.3,vr:(Math.random()-.5)*.4,s:(5+Math.random()*7)*d,c:cols[i%cols.length],i,piece:!!G.burst&&i%2===0,ch:i%4===1?L[i%16>>2]:''}));
  const t0=performance.now();
  (function frame(t){
    const age=t-t0;x.clearRect(0,0,W,H);
    P.forEach(p=>{p.vy+=.34*d;p.vx*=.99;p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;
      x.save();x.translate(p.x,p.y);x.rotate(p.r);x.globalAlpha=Math.max(0,1-age/2400);x.fillStyle=p.c;
      if(p.piece)piece(x,G.burst,p.s*1.5,p.c,p.i);
      else if(p.ch){x.font='700 '+(p.s*2)+'px ui-monospace,Menlo,monospace';x.fillText(p.ch,0,0);}else x.fillRect(-p.s/2,-p.s/3,p.s,p.s*.66);
      x.restore();});
    if(age<2400)requestAnimationFrame(frame);else c.remove();
  })(t0);
}
/* one celebration piece per game, drawn around (0,0) at size s */
function piece(x,kind,s,col,i){
  const P2=Math.PI*2;x.lineWidth=Math.max(1,s*.12);
  if(kind==='coins'){x.scale(Math.abs(Math.cos(i+performance.now()/160))*.9+.1,1);x.fillStyle='#f2c037';x.strokeStyle='#a87412';x.beginPath();x.arc(0,0,s*.7,0,P2);x.fill();x.stroke();
    x.fillStyle='#a87412';x.font='700 '+s+'px ui-monospace,Menlo,monospace';x.textAlign='center';x.textBaseline='middle';x.fillText('ACGT'[i%4],0,s*.05);}
  else if(kind==='leaves'){x.fillStyle=i%3?'#6fae4e':'#3f8a3a';x.beginPath();x.moveTo(-s,0);x.quadraticCurveTo(0,-s*.8,s,0);x.quadraticCurveTo(0,s*.8,-s,0);x.fill();
    x.strokeStyle='#2c6328';x.beginPath();x.moveTo(-s,0);x.lineTo(s,0);x.stroke();}
  else if(kind==='tickets'){x.fillStyle=['#ffc21a','#fdf8ec','#e9b28a'][i%3];x.strokeStyle='#4a3a1c';x.beginPath();x.rect(-s,-s*.55,s*2,s*1.1);x.fill();x.stroke();
    x.setLineDash([s*.15,s*.15]);x.beginPath();x.moveTo(s*.4,-s*.55);x.lineTo(s*.4,s*.55);x.stroke();x.setLineDash([]);}
  else if(kind==='dice'){const h=s*.8;x.fillStyle='#fdf8ec';x.strokeStyle='#3a1f0c';x.beginPath();x.rect(-h,-h,h*2,h*2);x.fill();x.stroke();
    const one=i%4===0;x.fillStyle=one?'#d62839':'#1a1208';(one?[[0,0]]:[[-.45,-.45],[.45,.45],[.45,-.45],[-.45,.45]]).forEach(d=>{x.beginPath();x.arc(d[0]*h,d[1]*h,h*(one?.3:.2),0,P2);x.fill();});}
  else if(kind==='stars'){x.fillStyle=i%3?'#ffe9a0':'#ffd58a';x.beginPath();for(let k=0;k<10;k++){const r=k%2?s*.42:s,a=k*Math.PI/5;x.lineTo(Math.sin(a)*r,-Math.cos(a)*r);}x.closePath();x.fill();}
  else if(kind==='drops'){x.fillStyle=['#e2557f','#b9a6e6','#f2a43a','#8fb8ea'][i%4];x.beginPath();x.moveTo(0,-s);x.bezierCurveTo(s*.9,-s*.1,s*.8,s,0,s);x.bezierCurveTo(-s*.8,s,-s*.9,-s*.1,0,-s);x.fill();}
  else if(kind==='threads'){x.strokeStyle=['#2e7d4f','#b83a4b','#2b5fb3','#c9952a'][i%4];x.lineWidth=s*.28;x.lineCap='round';x.beginPath();x.moveTo(-s*1.4,0);x.bezierCurveTo(-s*.5,-s,s*.5,s,s*1.4,0);x.stroke();}
  else if(kind==='keys'){x.strokeStyle=x.fillStyle='#e6bd4f';x.lineWidth=s*.3;x.beginPath();x.arc(-s*.6,0,s*.45,0,P2);x.stroke();x.beginPath();x.moveTo(-s*.15,0);x.lineTo(s*1.1,0);x.moveTo(s*.7,0);x.lineTo(s*.7,s*.5);x.moveTo(s*1.1,0);x.lineTo(s*1.1,s*.5);x.stroke();}
}
let toastEl=null,toastT=0;
function toast(title,lines){
  if(!toastEl){toastEl=el('div','bk-toast');toastEl.setAttribute('aria-hidden','true');document.body.append(toastEl);}
  toastEl.innerHTML='<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.3 6.9.8-5.100 4.700 1.400 6.800L12 17.200 5.900 20.600l1.400-6.800L2.200 9.100l6.900-.8z" fill="currentColor"/></svg><div><b>'+esc(title)+'</b>'+
    (lines.length?'<span>'+lines.map(esc).join(' · ')+'</span>':'')+'</div>';
  toastEl.classList.remove('show');void toastEl.offsetWidth;toastEl.classList.add('show');
  clearTimeout(toastT);toastT=setTimeout(()=>toastEl.classList.remove('show'),3800);
}

/* ---------- a game page ---------- */
function gamePage(){
  document.body.classList.add('bk-game','bk-g-'+G.dir);
  document.body.style.setProperty('--bk-hue',G.hue||ch.hue);
  document.title=G.game+' · '+(side?'Side quest':'Chapter '+ch.n)+' · '+BOOK.title;
  const wrap=$('.wrap')||$('main')||document.body;

  // the chapter line above the game's own header
  const head=$('header',wrap);
  if(head&&!side){const e=el('p','bk-eyebrow','<span>Chapter '+ch.n+'</span>'+esc(ch.topic));head.before(e);}

  // the chapter cover, once, for a reader who has not started this game
  // (the game has already saved a blank state by now, so "not started" means nothing unlocked and nothing earned)
  const saved=store.get(G.key,null),begun=!!saved&&((saved.unlocked||1)>1||(Array.isArray(saved.badges)&&saved.badges.length>0)||(Array.isArray(saved.log)&&saved.log.length>2));
  const fresh=!begun&&!store.get('book:seen:'+G.dir,false)&&!['level','seed','debug','code'].some(k=>params.has(k))&&!/level-\d+/.test(path);
  if(fresh){
    const o=el('div','bk-cover');o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-labelledby','bkCoverT');
    o.innerHTML='<div class="bk-cover-card"><img src="'+base+'book/art/'+G.dir+'.svg" alt=""><div class="bk-cover-body">'+
      '<p class="bk-eyebrow"><span>'+(side?'Side quest · Chapter '+ch.n:'Chapter '+ch.n)+'</span>'+esc(ch.topic)+'</p>'+
      '<h2 id="bkCoverT">'+esc(G.game)+'</h2><p class="bk-hook">'+esc(G.hook)+'</p>'+
      (G.levels?'<p class="bk-meta">'+G.levels+' levels · '+G.terms+' terms to earn · every level is open, and your progress link keeps what you earn</p>':'')+
      '<div class="bk-cover-go"><button type="button" class="bk-begin">Begin</button><a href="'+base+'">Back to the contents</a></div></div></div>';
    document.body.append(o);document.body.classList.add('bk-locked');
    const go=$('.bk-begin',o);go.focus();
    const close=()=>{store.set('book:seen:'+G.dir,true);o.classList.add('out');document.body.classList.remove('bk-locked');play('good');setTimeout(()=>o.remove(),calm?0:420);document.removeEventListener('keydown',key);};
    const key=e=>{if(e.key==='Escape'||e.key==='Enter'){e.preventDefault();close();}};
    go.onclick=close;document.addEventListener('keydown',key);
  }
  store.set('book:last',{dir:G.dir,t:Date.now()});

  // "Level 5: The tourist" becomes a small level tag and a title
  const title=$('#title');
  function dressTitle(){
    if(!title||title.querySelector('.bk-lv'))return '';
    const m=/^\s*(Level\s+\d+)\s*[:.]\s*(.+)$/s.exec(title.textContent);if(!m)return '';
    title.innerHTML='<span class="bk-lv">'+esc(m[1])+'</span>'+esc(m[2]);return m[1];
  }
  let lastLevel='';
  function onTitle(){
    const lv=dressTitle();if(!lv)return;       // '' when the change was our own
    if(lastLevel&&lv!==lastLevel&&!calm){wrap.classList.remove('bk-turn');void wrap.offsetWidth;wrap.classList.add('bk-turn');}
    lastLevel=lv;
  }
  if(title){onTitle();new MutationObserver(onTitle).observe(title,{childList:true,characterData:true,subtree:true});}

  // vocabulary: remember what has been earned, and mark the ones earned just now
  const badges=$('#badges'),freshUntil={};
  let known=null;
  function readTerms(){
    return [...badges.querySelectorAll('.badge.got')].map(b=>{const tip=b.querySelector('.tip'),name=(b.firstChild&&b.firstChild.nodeType===3?b.firstChild.textContent:b.textContent).trim();
      let def='';if(tip){const c=tip.cloneNode(true);const h=c.querySelector('b');if(h)h.remove();def=c.textContent.trim();}return {name,def,node:b};});
  }
  function onBadges(){
    const got=readTerms(),names=got.map(t=>t.name),now=Date.now();
    if(known){const add=names.filter(n=>!known.includes(n));
      if(add.length){add.forEach(n=>freshUntil[n]=now+2600);events.terms=events.terms.concat(add);flush();}}
    known=names;
    got.forEach(t=>{if(freshUntil[t.name]>now)t.node.classList.add('bk-fresh');});
    if(!params.has('level'))store.set('book:terms:'+G.dir,got.map(t=>({name:t.name,def:t.def})));
  }
  if(badges){onBadges();new MutationObserver(onBadges).observe(badges,{childList:true});}

  // level complete: the game draws its "Level n complete" panel
  const panel=$('#panel');let hadReveal=!!(panel&&panel.querySelector('.reveal'));
  const events={terms:[],level:''};let ft=0;
  function flush(){clearTimeout(ft);ft=setTimeout(()=>{
    if(events.level){play('level');confetti();toast(events.level,events.terms.map(t=>'+ '+t));}
    else if(events.terms.length){play('term');toast(events.terms.length>1?'New terms':'New term',events.terms);}
    events.terms=[];events.level='';},60);}
  if(panel)new MutationObserver(()=>{
    const r=panel.querySelector('.reveal'),has=!!r;
    if(has&&!hadReveal){const h=r.querySelector('h3');events.level=h?h.textContent.trim():'Level complete';flush();}
    hadReveal=has;
  }).observe(panel,{childList:true});

  // the status line: a soft note for a right step, a low one for a wrong step
  const status=$('#status');let lastStatus=status?status.textContent:'';
  if(status)new MutationObserver(()=>{
    const t=status.textContent;if(t===lastStatus)return;lastStatus=t;if(!t)return;
    if(status.classList.contains('good')){play('good');const st=$('.stage');if(st&&!calm){st.classList.remove('bk-yes');void st.offsetWidth;st.classList.add('bk-yes');}}else if(status.classList.contains('warn')||status.classList.contains('bad')){play('warn');
      if(!calm){status.classList.remove('bk-nudge');void status.offsetWidth;status.classList.add('bk-nudge');}}
  }).observe(status,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['class']});

  document.addEventListener('pointerdown',e=>{
    const t=e.target;if(!(t instanceof Element))return;
    if(t.closest('.bk-sound'))return;
    const own=(G.sfx||[]).find(x=>t.closest(x[0]));
    if(own)play(own[1]);else if(t.closest('button,[role=button],.stage svg,select,summary,[data-act]'))play('tick');
  },true);

  // Lockpick's keypad sings: one note per letter, typed or clicked
  if(G.keys)document.addEventListener('keydown',e=>{const n=!e.metaKey&&!e.ctrlKey&&!e.altKey&&!e.repeat&&G.keys[e.key.toLowerCase()];
    if(n&&!(e.target instanceof Element&&e.target.closest('input,textarea')))play(n);},true);

  // after the game: where the chapter goes next
  const foot=$('footer',wrap);
  const i=BOOK.chapters.indexOf(ch),next=BOOK.chapters[i+1];
  const after=el('section','bk-after');after.setAttribute('aria-labelledby','bkAfterT');
  let h='<h2 id="bkAfterT">'+(side?'Back to the chapter':'After you play')+'</h2><div class="bk-after-grid">';
  if(side)h+='<a class="bk-nextch" href="'+base+ch.dir+'/"><img src="'+base+'book/art/'+ch.dir+'.svg" alt=""><span><small>Chapter '+ch.n+' · '+esc(ch.topic)+'</small><b>'+esc(ch.game)+'</b></span></a>';
  else{
    h+='<div class="bk-docs">'+BOOK.resources.map(r=>'<a href="'+base+'materials/'+ch.slug+'-'+r[0]+'.docx">'+ICON.doc+'<span>'+r[1]+'<small>Word document</small></span></a>').join('')+'</div>';
    h+=next?'<a class="bk-nextch" href="'+base+next.dir+'/"><img src="'+base+'book/art/'+next.dir+'.svg" alt=""><span><small>Next · Chapter '+next.n+' · '+esc(next.short||next.topic)+'</small><b>'+esc(next.game)+' →</b></span></a>'
           :'<a class="bk-nextch" href="'+base+'#glossary"><img src="'+base+'book/art/'+ch.dir+'.svg" alt=""><span><small>The last chapter</small><b>See your whole glossary →</b></span></a>';
  }
  after.innerHTML=h+'</div>';
  if(foot)foot.before(after);else wrap.append(after);
}

function start(){bar();if(!home)gamePage();document.documentElement.classList.add('bk-ready');}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
