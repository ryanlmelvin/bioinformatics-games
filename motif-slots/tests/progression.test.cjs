const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function boot(search,saved){
  const elements=new Map(),writes=[];
  const el=key=>{if(!elements.has(key))elements.set(key,{innerHTML:'',textContent:'',hidden:false,checked:false,disabled:false,value:'',dataset:{},style:{setProperty(){}},
    classList:{add(){},remove(){},toggle(){}},setAttribute(k,v){this[k]=v;},focus(){},click(){this.onclick&&this.onclick();}});return elements.get(key);};
  let storage=saved===undefined?null:JSON.stringify(saved);
  const context={module:{exports:{}},document:{querySelector:el,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){}},window:{},
    location:{search,pathname:'/motif-slots/'},URLSearchParams,
    localStorage:{getItem:()=>storage,setItem:(k,v)=>{writes.push(v);storage=v;}},
    setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:()=>1,cancelAnimationFrame(){},performance:{now:()=>Date.now()},matchMedia:()=>({matches:true})};
  vm.createContext(context);
  for(const [,code] of html.matchAll(/<script id="(?:engine|ui)">([\s\S]*?)<\/script>/g))vm.runInContext(code,context);
  return {api:context.window.__ms,ctx:context.module.exports,el,writes,persisted:()=>JSON.parse(storage)};
}
/* Each solver plays one level the way a student would, through the same actions the page's buttons send. */
const SOLVE={
  1(u){const I=u.api.state().inst,A=u.api.act;A('cell',String(I.sites[0]));A('grip');I.sites.slice(1).forEach(p=>A('cell',String(p)));A('counted');A('sweep');A('pick',I.word);},
  2(u){const I=u.api.state().inst,A=u.api.act;A('sweep');I.compare.forEach((p,r)=>{const w=I.text.substr(p,5);for(let j=0;j<5;j++)if(w[j]!==I.word[j])A('mark',r+':'+j);});A('tol','1');A('sweep');A('pick',I.word);},
  3(u){const I=u.api.state().inst,A=u.api.act,need=u.ctx.revcomp(I.text.substr(I.handAt,5));[...need].forEach(c=>A('type',c));A('sweep');A('pick',I.rc);},
  4(u){const I=u.api.state().inst,A=u.api.act;A('cell','0:0');A('sweep');A('tol','2');A('count','strips');A('sweep');A('pick',I.word);},
  5(u){const c=u.api.state(),I=c.inst;for(let g=0;g<200&&!c.done;g++){const i=c.off.findIndex((o,r)=>o!==I.sites[r]);if(i<0)break;u.api.act('slide',i+':'+(I.sites[i]>c.off[i]?1:-1));}},
  6(u){const c=u.api.state(),H=c.inst,A=u.api.act;A('bot');u.api.skip();
    H.words.forEach(w=>{H.reels.forEach((r,i)=>A('cell',i+':'+u.ctx.closestPos(w,r)));u.el('#total').value=String(u.ctx.distToDna(w,H.reels));A('check');});
    A('better',H.totals[0]<H.totals[1]?H.words[0]:H.words[1]);A('dial');},
  7(u){const c=u.api.state(),I=c.inst,A=u.api.act,m4=u.ctx.motifsAt(I.dna.slice(0,4),I.sites,4),cnt=u.ctx.countsOf(m4);
    [0,1,2,3].forEach(r=>A('share',r+':'+cnt[r][I.handCol]));A('check');
    u.el('#pin').value=String(u.ctx.prob(I.dna[4].substr(I.sites[4],4),u.ctx.profileOf(m4,false)));A('checkprob');
    A('stop',String(I.sites[4]));A('top');for(let i=1;i<5;i++)A('stop',String(I.fromNo[i]));A('all');},
  8(u){const I=u.api.state().inst,A=u.api.act;for(let r=0;r<4;r++)for(let j=0;j<4;j++)A('plus',r+':'+j);for(let i=1;i<5;i++)A('stop',String(I.sites[i]));A('all');},
  9(u){const c=u.api.state(),A=u.api.act;A('lever');for(let g=0;g<50&&c.step==='restop';g++)A('restop');A('more');},
  10(u){const A=u.api.act;A('lift','0');A('best');A('lift','1');A('best');A('auto');},
  11(u){u.api.act('lever');}
};

test('a fresh save plays every level in order and ends with every term earned',()=>{
  const u=boot('?debug=1&seed=PROGRESS');
  assert.equal(u.api.levels().length,11);assert.equal(u.api.vocab().length,18);
  for(let id=1;id<=11;id++){
    assert.equal(u.api.state().L.id,id,'opens on level '+id);
    SOLVE[id](u);
    assert(u.api.state().done,'level '+id+' completes');
    assert(u.api.log().some(e=>e.ev==='complete'&&e.lvl===id),'move log records level '+id);
    assert.equal(u.persisted().unlocked,Math.min(id+1,11));assert.deepEqual(u.persisted().done,Array.from({length:id},(_,i)=>i+1));
    if(id<11)u.api.loadLevel(id+1);
  }
  assert.deepEqual(u.api.earned().slice().sort(),u.api.vocab().map(v=>v.id).sort());
  assert.match(u.el('#hmeta').textContent,/18 of 18 terms/);
  // every level but the last earns its own terms, so the last finds nothing left to grant
  const earnedAt=u.persisted().earnedAt;assert(Object.values(earnedAt).every(l=>l<=10));
});
test('jumping straight to the last level earns nothing; it names leftover terms only once every other level is finished',()=>{
  const u=boot('?debug=1&seed=JUMP');u.api.loadLevel(11);SOLVE[11](u);
  assert(u.api.state().done);assert.equal(u.api.earned().length,0);assert.deepEqual(u.persisted().done,[11]);
  assert.match(u.el('#panel').innerHTML,/18 vocabulary terms still hidden/);
  const all={seed:'JUMP',unlocked:11,done:[1,2,3,4,5,6,7,8,9,10],badges:['kmer'],earnedAt:{kmer:1},variants:{},log:[]};
  const v=boot('?debug=1',all);assert.equal(v.api.state().L.id,11);SOLVE[11](v);assert.equal(v.api.earned().length,18);
});
test('each level earns the terms its section names',()=>{
  const want={1:['kmer','freq'],2:['ham'],3:['rc','dnaa','ori'],4:['motif','mf'],5:['mm','cons','score'],6:['median'],7:['profile','pmp','greedy'],8:['pseudo'],9:['rand'],10:['gibbs']};
  const u=boot('?debug=1&seed=TERMS');
  for(let id=1;id<=10;id++){u.api.loadLevel(id);SOLVE[id](u);}
  const at=u.persisted().earnedAt;
  for(const [l,ids] of Object.entries(want))ids.forEach(id=>assert.equal(at[id],+l,id));
});
test('?level=N opens a practice session that never reads or writes saved progress',()=>{
  const saved={seed:'KEEP',unlocked:3,badges:['kmer','freq'],earnedAt:{kmer:1,freq:1},variants:{},log:[]};
  for(let n=1;n<=11;n++){
    const u=boot('?debug=1&level='+n+'&seed=PRACTICE',saved);
    assert.equal(u.api.state().L.id,n);
    assert.equal(u.api.saved().badges.length,0,'does not read saved badges');
    SOLVE[n](u);assert(u.api.state().done);
    assert.equal(u.writes.length,0,'level '+n+' wrote nothing');
    assert.deepEqual(u.persisted(),saved);
  }
});
test('the move log is downloadable data and records loads and moves',()=>{
  const u=boot('?debug=1&seed=LOG');SOLVE[1](u);
  const evs=u.api.log().map(e=>e.ev);
  for(const e of ['load','guess','counted','sweep','complete'])assert(evs.includes(e),e);
});

/* the wrong moves that matter */
test('level 1: clicking a window that is not the dialled word does not count it',()=>{
  const u=boot('?debug=1&level=1&seed=W1'),c=u.api.state(),I=c.inst;
  u.api.act('cell',String(I.sites[0]));u.api.act('grip');
  const bad=[...Array(76).keys()].find(p=>I.text.substr(p,5)!==I.word);
  u.api.act('cell',String(bad));assert.equal(c.found.length,1);assert.match(c.msg.text,/slips/);
});
test('level 2: counting exact copies finds no winner; the winner needs one wrong letter allowed',()=>{
  const u=boot('?debug=1&level=2&seed=W2'),c=u.api.state(),I=c.inst;
  u.api.act('sweep');assert(c.board[0].lit<=2);assert.notEqual(c.board[0].word,I.word);assert(!c.done);
  I.compare.forEach((p,r)=>{const w=I.text.substr(p,5);for(let j=0;j<5;j++)if(w[j]!==I.word[j])u.api.act('mark',r+':'+j);});
  u.api.act('tol','0');u.api.act('pick',I.word);assert(!c.done,'exact only: the word lights nothing');
});
test('level 3: a wrong partner letter is refused',()=>{
  const u=boot('?debug=1&level=3&seed=W3'),c=u.api.state(),I=c.inst,need=u.ctx.revcomp(I.text.substr(I.handAt,5));
  u.api.act('type',I.text[I.handAt+4]===need[0]?'A':I.text[I.handAt+4]);
  assert.equal(c.typed,'');assert.match(c.msg.text,/pair/);
});
test('level 4: the decoy wins the window count but lights at most three genes, and does not finish the level',()=>{
  const u=boot('?debug=1&level=4&seed=W4'),c=u.api.state(),I=c.inst;
  u.api.act('cell','0:0');u.api.act('sweep');
  assert.equal(c.dial,I.decoy);assert(!c.done);
  assert(LVlamps(c,u)<=3);
});
function LVlamps(c,u){return c.inst.strips.filter(s=>u.ctx.countD(s,c.dial,c.d)>0).length;}
test('level 6: the bot cannot finish; giving up is the way on',()=>{
  const u=boot('?debug=1&level=6&seed=W6'),c=u.api.state();
  u.api.act('bot');assert(c.bot.n>0&&c.bot.n<1e6);assert(!c.done);
  assert.match(u.el('#skip').textContent,/Stop the bot/);u.api.skip();assert.equal(c.step,'hand');
  // a window that is not the closest is refused
  const H=c.inst,w=H.words[0];
  H.reels.forEach((r,i)=>{const far=[0,1,2,3].find(j=>u.ctx.hamming(w,r.substr(j,3))>u.ctx.distToText(w,r));u.api.act('cell',i+':'+(far===undefined?u.ctx.closestPos(w,r):far));});
  u.el('#total').value='99';u.api.act('check');assert.equal(c.wi,0);
});
test('levels 7 and 8: the trip without extra counts throws out reel 2\'s site through a zero; with them it finds every site',()=>{
  const u=boot('?debug=1&seed=W78');u.api.loadLevel(7);SOLVE[7](u);const c7=u.api.state(),I=c7.inst;
  assert.deepEqual(JSON.parse(JSON.stringify(c7.trip)),JSON.parse(JSON.stringify(I.fromNo)));
  assert.notEqual(c7.trip[1],I.sites[1]);assert(u.ctx.scoreAt(I.dna,c7.off,4)>I.planted);
  // stopping reel 2 at its own site is refused on the trip without extra counts
  u.api.loadLevel(7);const c=u.api.state();c.step='top';u.api.act('top');u.api.act('stop',String(I.sites[1]));assert.equal(c.i,1);
  u.api.loadLevel(8);SOLVE[8](u);const c8=u.api.state();
  assert.deepEqual(JSON.parse(JSON.stringify(c8.off)),JSON.parse(JSON.stringify(I.sites)));
});
test('level 9: the first spin stalls above the best; level 10: every best re-stop at the stall changes nothing',()=>{
  const u=boot('?debug=1&level=9&seed=W9'),c=u.api.state();
  u.api.act('lever');for(let g=0;g<50&&c.step==='restop';g++)u.api.act('restop');
  assert(c.spins[0]>c.inst.planted);assert(!c.done);
  const v=boot('?debug=1&level=10&seed=W9'),d=v.api.state(),before=d.pos.slice();
  for(let i=0;i<6;i++){d.step='stall';v.api.act('lift',String(i));v.api.act('best');}
  assert.deepEqual(JSON.parse(JSON.stringify(d.pos)),JSON.parse(JSON.stringify(before)));
});
