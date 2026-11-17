const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const engine=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const sandbox={module:{exports:{}}};vm.runInNewContext(engine,sandbox);
const E=sandbox.module.exports;
const plain=x=>JSON.parse(JSON.stringify(x));
const CODES=Array.from({length:500},(_,i)=>'CODE'+i);
const sorted=a=>[...a].sort().join(' ');
const each=(id,f)=>CODES.forEach(c=>f(E.makeLevel(c,id,0),c));
const N=E.N;

test('the arithmetic of one head: score, pull, weight and reading',()=>{
  assert.equal(E.same('GATA','GATT'),3);assert.equal(E.same('GATA','TATA'),3);assert.equal(E.same('GATA','CTCC'),0);
  const s=E.soft(['GATA','GATT','CCCC','GCCC'],'GATA');
  assert.deepEqual(plain(s.sc),[4,3,0,1]);assert.deepEqual(plain(s.pull),[16,8,1,2]);assert.equal(s.tot,27);
  assert.equal(E.softOut(['GATA','GATT','CCCC','GCCC'],'GATA',{GATA:1,GATT:1}),24/27);
  const h=E.headOut(['GATA','ACGT','CTCC','GATA'],4,{want:['GATA','CTCC']},{GATA:1,CTCC:-1});
  assert.deepEqual(plain(h.cords),[0,2,3]);assert(Math.abs(h.out-1/3)<1e-12);
  assert.deepEqual(plain(E.answers(['TATA','ACGT','TATA'],3,{want:['TATA'],dist:1})),[2]);
  assert.deepEqual(plain(E.tokens('ACGTGATACC')),['ACGT','GATA']);
});
test('level 1: each lit strand holds GATA once, at a plate boundary and at its own distance; no other word is shared',()=>each(1,(x,c)=>{
  const all=x.known.concat(x.unknown);assert.equal(all.length,7);
  assert.deepEqual(plain(x.known.map(k=>k.on)),[true,false,true,false,true]);assert.equal(x.unknown.filter(k=>k.on).length,1);
  all.forEach(k=>{assert.equal(k.seq.length,40);assert.equal(E.count4(k.seq,'GATA'),k.on?1:0,c);if(k.on){assert.equal(k.at%4,0);assert.equal(k.seq.indexOf('GATA'),k.at);assert(40-k.at>=12);}});
  assert.equal(new Set(all.filter(k=>k.on).map(k=>k.at)).size,4);
  const on=x.known.filter(k=>k.on).map(k=>E.kset(k.seq));assert.deepEqual(plain([...on[0]].filter(w=>on[1].has(w)&&on[2].has(w))),['GATA'],c);
}));
test('level 2: three rounds reach the gene on the short strand and never on the real one',()=>each(2,x=>{
  assert.equal(x.mini.at+3+x.rounds,x.mini.seq.length);assert.equal(E.count4(x.mini.seq,'GATA'),1);
  assert(x.big.at+3+x.rounds<x.big.seq.length);
}));
test('level 3: the boards are level 1 cut into plates, and no fixed place is right on every lit board',()=>each(3,(x,c)=>{
  const one=E.makeLevel(c,1,0);assert.equal(x.boards[0].labels.join(''),one.known[0].seq);
  assert.deepEqual(plain(x.boards.map(b=>b.on)),[true,false,true,true]);
  x.boards.forEach(b=>{if(b.on)assert.equal(b.labels[b.at],'GATA');else assert(!b.labels.includes('GATA'));});
  assert.equal(new Set(x.boards.filter(b=>b.on).map(b=>b.at)).size,3);
}));
test('level 4: the gene is on when GATA plates outnumber CTCC plates; only GATA +1 with CTCC -1 predicts every board',()=>each(4,x=>{
  const fits=(want,vals)=>x.boards.every(b=>(E.headOut(b.labels,N,{want},vals).out>0)===b.on);
  assert.deepEqual(plain(x.boards.map(b=>b.on)),[true,false,false,false,true,false]);
  assert(fits(['GATA','CTCC'],{GATA:1,CTCC:-1}));
  assert(!fits(['GATA'],{GATA:1}));assert(!fits(['GATA','CTCC'],{GATA:1,CTCC:0}));assert(!fits(['GATA','CTCC'],{GATA:1,CTCC:1}));
  assert.equal(new Set(x.boards.flatMap(b=>b.labels.filter(l=>l!=='GATA'&&l!=='CTCC'))).size,60-10);
}));
test('level 5: pulls add up to 32, 16 and 32, and the readings are 0.75, 0.5 and 0.5',()=>each(5,x=>{
  assert.deepEqual(['A','B','C'].map(k=>E.soft(x[k].labels,'GATA').tot),[32,16,32]);
  assert.deepEqual(['A','B','C'].map(k=>x[k].out),[.75,.5,.5]);
  assert(x.A.labels.includes('GATA')&&x.A.labels.includes('GATT'));assert(!x.B.labels.includes('GATA')&&x.B.labels.includes('GATT'));
  assert(x.C.labels.includes('GATA')&&!x.C.labels.includes('GATT'));
}));
test('level 6: A and B hold the same plates; no query without a distance predicts every board, and TATA at distance 1 does',()=>each(6,x=>{
  assert.equal(sorted(x.boards[0].labels),sorted(x.boards[1].labels));assert.deepEqual(plain(x.boards.map(b=>b.on)),[true,false,false,true,false]);
  const fits=(w,d)=>x.boards.every(b=>(E.answers(b.labels,N,{want:[w],dist:d}).length>0)===b.on);
  new Set(x.boards.flatMap(b=>b.labels)).forEach(w=>{assert(!fits(w,null));for(let d=1;d<=9;d++)assert.equal(fits(w,d),w==='TATA'&&d===1);});
}));
test('level 7: no single query predicts every board; TATA at distance 1 and GATA anywhere, both answered, does',()=>each(7,x=>{
  assert.deepEqual(plain(x.boards.map(b=>b.on)),[true,false,false,false,true]);
  const hit=(b,w,d)=>E.answers(b.labels,N,{want:[w],dist:d}).length>0;
  new Set(x.boards.flatMap(b=>b.labels)).forEach(w=>{for(const d of [null,1,2,3,4,5,6,7,8,9])assert(!x.boards.every(b=>hit(b,w,d)===b.on));});
  assert(x.boards.every(b=>(hit(b,'TATA',1)&&hit(b,'GATA',null))===b.on));assert(!x.boards.every(b=>(hit(b,'TATA',1)||hit(b,'GATA',null))===b.on));
}));
test('level 8: A and C hold the same plates; one round fails; two rounds work only at distance 1, with either partner asking',()=>each(8,x=>{
  assert.equal(sorted(x.boards[0].labels),sorted(x.boards[2].labels));assert.deepEqual(plain(x.boards.map(b=>b.on)),[true,false,false,false,true]);
  new Set(x.boards.flatMap(b=>b.labels)).forEach(w=>assert(!x.boards.every(b=>(E.answers(b.labels,N,{want:[w]}).length>0)===b.on)));
  const two=(who,want,d)=>x.boards.every(b=>(E.answers(E.round1(b.labels,{who,want,dist:d}).labels,N,{want:[who+'+']}).length>0)===b.on);
  assert(two('GATA','CAGC',1));assert(two('CAGC','GATA',1));
  for(const d of [null,2,3,4,5])assert(!two('GATA','CAGC',d));
}));
test('level 9: two boards repeat a run of three plates and cover a plate of the second copy; the third board has no clue',()=>each(9,x=>{
  x.boards.slice(0,2).forEach((b,i)=>{assert.equal(b.labels[b.src],b.labels[b.cover]);assert(b.cover-b.src>=4);
    assert.equal(b.labels[b.src-1],b.labels[b.cover-1]);assert.equal(b.labels.filter(l=>l===b.labels[b.cover]).length,2);assert.equal(b.cover-b.src>0&&i>=0,true);});
  const c=x.boards[2];assert.equal(c.src,null);assert.equal(new Set(c.labels).size,N);
}));
test('level 10: only the variant in the partner plate switches the gene off, and exactly twelve letters matter',()=>each(10,x=>{
  assert(E.runFull(x.labels).on);assert.deepEqual(plain(x.vars.map(v=>v.kind).sort()),['lone','partner','plain']);
  x.vars.forEach(v=>{assert.equal(x.labels.join('')[v.pos],v.ref);assert.notEqual(v.ref,v.alt);assert.equal(E.runFull(E.applyVar(x.labels,v)).on,v.kind!=='partner');});
  assert.equal(x.labels[x.lone],'GATA');assert.equal(x.labels[Math.floor(x.vars.find(v=>v.kind==='lone').pos/4)],'GATA');
  assert.deepEqual(plain(x.track),plain(E.scan(x.labels)));assert.equal(x.track.filter(n=>n===3).length,12);assert.equal(x.track.filter(n=>n===0).length,28);
  assert.equal(x.labels[N-1],'TATA');
}));
test('background plates never pass for a site',()=>CODES.slice(0,100).forEach(c=>{for(let id=3;id<=10;id++){if(id===5)continue;const x=E.makeLevel(c,id,0);
  (x.boards?x.boards.map(b=>b.labels):[x.labels]).flat().forEach(l=>{if(!E.SPECIAL.includes(l))assert(E.SPECIAL.every(s=>E.same(l,s)<=2),l);});}}));
test('the same code gives the same puzzle, and a new variant gives another',()=>{
  for(let id=1;id<=10;id++){assert.deepEqual(plain(E.makeLevel('SAME',id,0)),plain(E.makeLevel('SAME',id,0)));assert.notDeepEqual(plain(E.makeLevel('SAME',id,0)),plain(E.makeLevel('SAME',id,1)));}
});
test('every fallback pool key builds a puzzle, and a generator out of tries uses one',()=>{
  const makers={makeL1:E.makeL1,makeL5:E.makeL5,makeL10:E.makeL10};
  for(const [name,pool] of Object.entries(E.POOLS)){assert.equal(pool.length,4);E.TRIES.strict=true;try{pool.forEach(k=>assert(makers[name](k)));}finally{E.TRIES.strict=false;}}
  E.TRIES.limit=0;E.TRIES.fell=0;
  try{assert.equal(E.makeL1('OUT').known.length,5);assert.equal(E.makeL5('OUT').A.out,.75);assert.equal(E.makeL10('OUT').vars.length,3);assert.equal(E.TRIES.fell,3);}finally{E.TRIES.limit=null;E.TRIES.fell=0;}
});
test('the workbench cuts a strand into plates and shares the current',()=>{
  const r=E.benchReport('ttgg gata cagc gatt x','gata');assert.deepEqual(plain(r.labels),['TTGG','GATA','CAGC','GATT']);
  assert.deepEqual(plain(r.pull),[1,16,2,8]);assert.equal(r.tot,27);
});
