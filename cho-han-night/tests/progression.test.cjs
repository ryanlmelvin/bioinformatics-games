const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function boot(search,saved){
  const elements=new Map(),events={},writes=[];
  const el=key=>{if(!elements.has(key))elements.set(key,{innerHTML:'',textContent:'',hidden:false,checked:false,disabled:false,value:'',dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},setAttribute(){},focus(){},click(){this.onclick&&this.onclick();}});return elements.get(key);};
  let storage=saved?JSON.stringify(saved):null;
  const context={document:{querySelector:el,addEventListener:(type,fn)=>events[type]=fn},window:{},
    location:{search:search||'?debug=1',pathname:'/cho-han-night/'},URLSearchParams,
    localStorage:{getItem:()=>storage,setItem:(k,v)=>{writes.push(v);storage=v;}},
    setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},matchMedia:()=>({matches:true})};
  vm.createContext(context);
  for(const [,code] of html.matchAll(/<script id="(?:engine|ui)">([\s\S]*?)<\/script>/g))vm.runInContext(code,context);
  return {api:context.window.__ch,context,el,writes,persisted:()=>JSON.parse(storage)};
}
const plain=x=>JSON.parse(JSON.stringify(x));
/* Each player plays one level by the rules, through the same actions the page's buttons send. */
const PLAY={
  1(ui){ui.api.act('pick','1');},
  2(ui){const a=ui.api;for(const c of [0,1])for(let i=0;i<20;i++){a.act('shake',String(c));const o=a.state().o;a.act('tally',c+o.seq[c][o.shown[c]]);}a.act('ans','02');a.act('ans','13');},
  3(ui){const a=ui.api;for(let i=0;i<12;i++){a.act('bead',String(i*8));a.act('lock');}a.act('skip');},
  4(ui){const a=ui.api;for(let i=0;i<4;i++)a.act('cup',String(i));a.act('cup','2');
    for(const id of ['s0','t1','t2','t3','pp','e0','e1','e2','e3','pe','pb'])a.cell(id,String(a.answers().want[id]));},
  5(ui){const a=ui.api;a.act('run','4');a.act('run','12');a.act('run','100');a.act('skip');},
  6(ui){const a=ui.api,c=a.state().cols;for(const [t,k] of [[0,0],[0,1],[1,0],[1,1],[2,0],[2,1]])a.cell('c'+t+k,String(c[t][k]));},
  7(ui){const a=ui.api,s=a.state(),bl=s.bl;a.cell('c00',String(bl.cols[0][0]));a.cell('c01',String(bl.cols[0][1]));
    for(let t=1;t<6;t++)for(const k of [0,1]){a.act('way',t+','+k+','+bl.from[t][k]);if(t<=2)a.cell('c'+t+k,String(bl.cols[t][k]));}
    const st=s.bs.story;for(let t=5;t>=0;t--)a.act('back',t+','+st[t]);},
  8(ui){const a=ui.api;a.act('gaps','2');for(let i=0;i<5;i++)a.act('member',String(i));const an=a.answers();
    for(const s of an.moves)for(let n=0;n<an.roomCounts[s];n++)a.act('mv',s+',1');
    for(const [x,n] of Object.entries(an.roomLetters))for(let i=0;i<n;i++)a.act('lt',x);a.act('pin');},
  9(ui){const a=ui.api;for(const i of [0,1]){a.act('which',String(i));for(const s of a.answers().best)a.act('step',s);a.act('step','E');}
    a.act('admit',String(a.answers().order.indexOf('relative')));},
  10(ui){const a=ui.api,k=a.state().P.k;for(let j=1;j<=k;j++)a.act('step','M'+j);a.act('step','E');a.act('skip');
    for(const x of 'ACDEFGHIKLMNPQRSTVWY')a.act('peb','L'+x);for(const s of a.answers().moves)a.act('peb','M'+s);a.act('skip');
    for(const s of a.answers().best)a.act('step',s);a.act('step','E');},
  11(ui){const a=ui.api;for(let i=0;i<7;i++)a.act('send',String(i));a.act('line','3');}
};

test('a fresh save plays every level in order and ends with every term earned',()=>{
  const ui=boot('?debug=1&seed=PROG');
  assert.equal(ui.api.state().L.id,1);assert.equal(ui.api.earned().length,0);
  const levels=ui.api.levels();assert.equal(levels.length,11);assert(ui.api.vocab().length<=21);
  for(let n=1;n<=11;n++){
    assert.equal(ui.api.state().L.id,n);PLAY[n](ui);
    assert(ui.api.state().done,'level '+n+' completes');
    if(n<11)ui.api.loadLevel(n+1);
  }
  assert.deepEqual(plain(ui.api.earned()).sort(),plain(ui.api.vocab().map(v=>v.id)).sort());
  assert.match(ui.el('#hstat').innerHTML,/14 of 14 terms/);
  const saved=ui.persisted();assert.equal(saved.unlocked,11);assert.equal(saved.badges.length,14);
  // the move log records each level's completion
  const done=ui.api.log().filter(e=>e.ev==='complete').map(e=>e.lvl);
  for(let n=1;n<=11;n++)assert(done.includes(n),'log has level '+n);
  // terms arrive at the levels the plan names
  const at=saved.earnedAt;
  assert.deepEqual([at.family,at.msa,at.hstate,at.hpath,at.trans,at.emit,at.hmm,at.forward,at.viterbi,at.phmm,at.match,at.insert,at.delete,at.pseudo],[1,1,3,3,4,4,4,6,7,8,8,8,8,10]);
});

test('?level=N never reads or writes saved progress',()=>{
  const saved={seed:'KEEP',unlocked:3,badges:['family','msa'],earnedAt:{family:1,msa:1},variants:{},marks:{},picked:{},log:[]};
  for(let n=1;n<=11;n++){
    const ui=boot('?debug=1&level='+n+'&seed=KEEP',saved);
    assert.equal(ui.api.state().L.id,n);assert.equal(ui.api.earned().length,0);
    PLAY[n](ui);assert(ui.api.state().done);
    assert.equal(ui.writes.length,0);assert.deepEqual(ui.persisted(),saved);
  }
  const ui=boot('?level=4');assert.equal(ui.api,undefined);assert.match(ui.el('#title').textContent,/Level 4:/);assert.equal(ui.writes.length,0);
});

test('invalid level numbers fall back to saved progress',()=>{
  const saved={seed:'KEEP',unlocked:3,badges:[],earnedAt:{},variants:{},marks:{},picked:{},log:[]};
  for(const v of ['0','12','abc']){const ui=boot('?debug=1&level='+v,saved);assert.equal(ui.api.state().L.id,3);}
});

test('level 2: a wrong tally and a wrong estimate are refused',()=>{
  const ui=boot('?debug=1&level=2&seed=W2'),a=ui.api;
  a.act('tally','0C');assert.equal(a.state().o.tally[0].length,0);
  a.act('shake','0');const o=a.state().o,real=o.seq[0][o.shown[0]];a.act('tally','0'+(real==='C'?'H':'C'));
  assert.equal(o.tally[0].length,0);assert.equal(a.state().msg.kind,'warn');
});

test('level 5 is a wall: counting a 100-round night never finishes; only giving up ends the level',()=>{
  const ui=boot('?debug=1&level=5&seed=W5'),a=ui.api;
  a.act('run','100');assert.equal(a.state().w.on100,false,'cannot skip ahead');
  a.act('run','4');a.act('run','12');assert.equal(a.state().w.done12.count,4096);
  assert.equal(a.state().w.done12.total,(c=>c[0]+c[1])(ui.context.sumLedger(a.answers().night.calls).at(-1)));
  a.act('run','100');assert.equal(a.state().done,false);assert(a.state().w.count<2**100);
  a.act('skip');assert(a.state().done);
});

test('level 6: a wrong entry is refused and a later column cannot be filled first',()=>{
  const ui=boot('?debug=1&level=6&seed=W6'),a=ui.api,c=a.state().cols;
  a.cell('c10',String(c[1][0]));assert(!a.state().lg.ok.c10);
  a.cell('c00',String(c[0][0]+1));assert.equal(a.state().lg.bad,'c00');
});

test('level 7 trap: following the round-by-round likelier cups back is refused; the kept ways lead elsewhere',()=>{
  for(const seed of ['T1','T2','T3','T4','T5','T6','T7','T8']){
    const ui=boot('?debug=1&level=7&seed='+seed),a=ui.api,s=a.state(),bl=s.bl;
    a.cell('c00',String(bl.cols[0][0]));a.cell('c01',String(bl.cols[0][1]));
    a.act('way','1,0,'+(1-bl.from[1][0]));assert.equal(s.b.pick['1,0'],undefined,'smaller way refused');
    for(let t=1;t<6;t++)for(const k of [0,1]){a.act('way',t+','+k+','+bl.from[t][k]);if(t<=2)a.cell('c'+t+k,String(bl.cols[t][k]));}
    const L=ui.context.likelierCups(s.calls),st=s.bs.story;
    let refused=false;
    for(let t=5;t>=0;t--){a.act('back',t+','+L[t]);if(L[t]!==st[t]){refused=true;break;}}
    assert(refused&&!s.done,'likelier-cup story is not the kept-way story ('+seed+')');
    s.b.trail=[];for(let t=5;t>=0;t--)a.act('back',t+','+st[t]);assert(s.done);
  }
});

test('level 8: a room most members skip is not built, and a wrong tally is not pinned',()=>{
  const ui=boot('?debug=1&level=8&seed=W8'),a=ui.api;
  a.act('member','0');assert.equal(a.state().r.member,null);
  a.act('pin');assert.equal(a.state().done,false);
  a.act('gaps','2');a.act('pin');assert.equal(a.state().done,false);assert(a.state().r.bad.length>0);
});

test('levels 9 and 10: the stranger is not let in; the cousin scores zero until the pebbles',()=>{
  const ui=boot('?debug=1&level=9&seed=W9'),a=ui.api;
  for(const i of [0,1]){a.act('which',String(i));for(const s of a.answers().best)a.act('step',s);a.act('step','E');}
  const rel=a.answers().order.indexOf('relative');a.act('admit',String(1-rel));assert.equal(a.state().done,false);
  const s=a.state();assert(s.best[rel].prob>=100*s.best[1-rel].prob);
  const u=boot('?debug=1&level=10&seed=W9'),b=u.api,k=b.state().P.k;
  for(let j=1;j<=k;j++)b.act('step','M'+j);b.act('step','E');
  assert.equal(b.state().best0.prob,0);assert.equal(b.state().done,false);
  b.act('skip');b.act('skip');assert.equal(b.state().pb.spread,false,'every pebble must be placed by hand first');
});

test('level 11: a door line that lets a stranger in is refused',()=>{
  const ui=boot('?debug=1&level=11&seed=W11'),a=ui.api;
  for(let i=0;i<7;i++)a.act('send',String(i));
  for(const r of [0,1,2,4,5]){a.act('line',String(r));assert.equal(a.state().done,false);}
  a.act('line','3');assert(a.state().done);
});
