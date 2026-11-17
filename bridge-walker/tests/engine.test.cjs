const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const engine=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const sandbox={module:{exports:{}}};vm.runInNewContext(engine,sandbox);
const {analyse,makeInstance,makePairs,makeBalance,eulerWalks,spellWalk,pairPositions,pairedGraph,TRIES,POOLS}=sandbox.module.exports;
const plain=x=>JSON.parse(JSON.stringify(x));
function verifyPuzzle(inst){
 assert.equal(inst.reads.length,20);
 assert.equal(new Set(inst.reads).size,20);
 // Independently enumerate all edge-covering routes, without an early cutoff.
 const paths=[];function search(v,ids){
  if(ids.length===20){paths.push(ids);return;}
  for(const e of inst.edges)if(e.from===v&&!ids.includes(e.id))search(e.to,[...ids,e.id]);
 }search(inst.start,[]);
 assert.equal(paths.length,2);
 const strings=paths.map(ids=>inst.nodes[inst.start]+ids.map(id=>inst.reads[id][3]).join(''));
 assert.equal(new Set(strings).size,2);
 assert(strings.includes(inst.genome));
 assert.deepEqual([...inst.candidates.map(c=>c.text)].sort(),strings.sort());
 const composition=s=>Array.from({length:s.length-3},(_,i)=>s.slice(i,i+4)).sort();
 for(const s of strings)assert.deepEqual(composition(s),[...inst.reads].sort());
 const other=strings.find(s=>s!==inst.genome);
 assert(inst.pairs.some(p=>pairPositions(other,p,4,1).length));
 assert(inst.pairs.some(p=>!pairPositions(other,p,4,1).length));
 for(const p of inst.pairs)assert(pairPositions(inst.genome,p,4,1).includes(p.index));
 const g=inst.paired;
 assert.equal(g.nodes.length,16);assert.equal(g.edges.length,15);
 assert(g.out.every(n=>n<=1)&&g.inn.every(n=>n<=1));
 const pairedWalks=eulerWalks(g);assert.equal(pairedWalks.length,1);
 const seqs=[0,1].map(j=>g.nodes[g.start].split('|')[j]+pairedWalks[0].map(id=>g.edges[id].read.split('|')[j].slice(-1)).join(''));
 assert.equal(seqs[0].slice(5),seqs[1].slice(0,-5));
 assert.equal(seqs[0]+seqs[1].slice(-5),inst.genome);
 for(const c of inst.candidates){
  const groups=c.walk.map(id=>inst.loopByEdge[id]).filter(Boolean);
  assert(['111111222222','222222111111'].includes(groups.join('')));
 }
 // A pair fits both strings exactly when its two reads lie in one stretch: one pair per loop, two in the tail.
 const fitsBoth=p=>pairPositions(other,p,4,1).length>0;
 assert.deepEqual(plain(inst.pairs.filter(fitsBoth).map(p=>p.index)),[1,7,13,14]);
 inst.pairs.forEach(p=>assert.equal(inst.pairStretch[p.index]>=0,fitsBoth(p)));
 assert.deepEqual(plain([1,7,13,14].map(i=>inst.pairStretch[i])),[1,2,3,3]);
 // The bench offers those four and exactly one pair that decides, and never offers the deciding pair first.
 assert.equal(inst.bench.length,5);assert.equal(new Set(inst.bench).size,5);
 for(const i of [1,7,13,14])assert(inst.bench.includes(i));
 const deciders=inst.bench.filter(i=>!fitsBoth(inst.pairs[i]));
 assert.equal(deciders.length,1);assert.notEqual(inst.bench[0],deciders[0]);
 return {decider:deciders[0],slot:inst.bench.indexOf(deciders[0])};
}
test('1,000 seeded read-pair puzzles have exactly two walks and one paired reconstruction',()=>{
 const seen=new Set(),positions=new Set(),deciders=new Set(),slots=new Set();
 for(let i=0;i<1000;i++){
  const inst=makePairs('PAIR-TEST|12|'+i),bench=verifyPuzzle(inst);
  deciders.add(bench.decider);slots.add(bench.slot);seen.add(inst.genome);positions.add(inst.candidates.findIndex(c=>c.text===inst.genome));
 }
 assert(seen.size>900);assert.equal(positions.size,2);
 // The deciding pair is not predictable: any of the eleven can be offered, in any slot but the first.
 assert.equal(deciders.size,11);assert.deepEqual([...slots].sort(),[1,2,3,4]);
});
test('the hard-coded fallback genome satisfies the same invariants',()=>{
 const fallback=engine.match(/const PAIR_FALLBACK='([ACGT]+)'/)[1];
 const inst=analyse(fallback,4);
 assert.equal(inst.reads.length,20);assert.equal(new Set(inst.reads).size,20);assert.equal(inst.selfLoops,0);
 const walks=eulerWalks(inst,5);assert.equal(walks.length,2);
 const strings=plain(walks.map(w=>spellWalk(inst,w)));assert(strings.includes(fallback));assert.notEqual(strings[0],strings[1]);
 const pairs=Array.from({length:15},(_,i)=>({left:fallback.slice(i,i+4),right:fallback.slice(i+5,i+9),index:i}));
 const g=pairedGraph(pairs,4);assert.equal(g.nodes.length,16);assert(g.out.every(n=>n<=1)&&g.inn.every(n=>n<=1));
 const other=strings.find(s=>s!==fallback);
 assert.deepEqual(pairs.filter(p=>pairPositions(other,p,4,1).length).map(p=>p.index),[1,7,13,14]);
});
test('seed reproducibility and new puzzle variation',()=>{
 assert.deepEqual(plain(makePairs('CLASS|12|0')),plain(makePairs('CLASS|12|0')));
 assert.notEqual(makePairs('CLASS|12|0').genome,makePairs('CLASS|12|1').genome);
});
test('gap means unknown letters, not start-to-start distance',()=>{
 const pair={left:'AAGC',right:'AGCT'};
 assert.deepEqual(plain(pairPositions('AAGCGAGCT',pair,4,1)),[0]);
 assert.deepEqual(plain(pairPositions('AAGCAGCT',pair,4,1)),[]);
 assert.deepEqual(plain(pairPositions('AAGCTAGCT',pair,4,1)),[0]); // gap base is unknown
});
test('paired graph uses both prefixes and both suffixes',()=>{
 const g=pairedGraph([{left:'AAGC',right:'AGCT'},{left:'AGCG',right:'GCTA'}],4);
 assert.deepEqual(plain(g.nodes),['AAG|AGC','AGC|GCT','GCG|CTA']);
 assert.equal(g.edges[0].to,g.edges[1].from);
});
test('existing sequence generator still supplies valid Eulerian maps',()=>{
 for(const spec of [{k:3,n:8,minB:1,maxB:2},{k:3,n:24,minB:6},{k:4,n:12,minB:2}]){
  const inst=makeInstance('regression',spec);assert.equal(inst.reads.length,spec.n);
  assert.equal(spellWalk(inst,inst.edges.map(e=>e.id)),inst.genome);
 }
});
// Every spec the game passes to makeInstance, read from the level list.
const specs=[...html.matchAll(/\{id:\d+,mode:'\w+',k:(\d+),n:(\d+),minB:(\d+)(?:,maxB:(\d+))?/g)]
 .map(m=>m[4]===undefined?{k:+m[1],n:+m[2],minB:+m[3]}:{k:+m[1],n:+m[2],minB:+m[3],maxB:+m[4]});
function checkInstance(inst,spec){
 assert.equal(inst.reads.length,spec.n);assert.equal(inst.k,spec.k);
 assert.equal(inst.selfLoops,0);assert.notEqual(inst.start,inst.end);assert(inst.maxPar<=2);
 assert(inst.branching>=spec.minB);if(spec.maxB!==undefined)assert(inst.branching<=spec.maxB);
 assert.equal(spellWalk(inst,inst.edges.map(e=>e.id)),inst.genome);
}
function checkBalance(inst){
 const n=inst.nodes.length,diff=inst.out.map((o,v)=>o-inst.inn[v]);
 assert.equal(n,6);assert(inst.out.every((o,v)=>o>=1&&inst.inn[v]>=1));
 assert.equal(new Set(inst.edges.map(e=>e.from+'>'+e.to)).size,inst.edges.length);
 assert.equal(diff.reduce((s,d)=>s+Math.max(0,d),0),3);assert.equal(Math.max(...diff.map(Math.abs)),2);
 const reach=new Set([0]),q=[0];
 while(q.length){const v=q.pop();for(const e of inst.edges){const w=e.from===v?e.to:e.to===v?e.from:-1;if(w>=0&&!reach.has(w)){reach.add(w);q.push(w);}}}
 assert.equal(reach.size,n);
}
function withTries(opts,f){Object.assign(TRIES,opts);try{return f();}finally{TRIES.limit=null;TRIES.strict=false;}}
test('every fallback key generates directly, for every spec the game uses',()=>{
 assert.equal(specs.length,6);
 withTries({strict:true},()=>{
  for(const key of POOLS.makeInstance)for(const spec of specs)checkInstance(makeInstance(key,spec),spec);
  for(const key of POOLS.makeBalance)checkBalance(makeBalance(key));
 });
});
test('a generator that runs out of tries returns a valid puzzle from its pool',()=>{
 withTries({limit:0},()=>{
  for(let i=0;i<20;i++){
   for(const spec of specs)checkInstance(makeInstance('NO-TRIES|'+i,spec),spec);
   checkBalance(makeBalance('NO-TRIES|8|'+i));
   verifyPuzzle(makePairs('NO-TRIES|12|'+i));
  }
  const picked=new Set(Array.from({length:40},(_,i)=>makeBalance('NO-TRIES|'+i).edges.map(e=>e.from+'>'+e.to).join()));
  assert(picked.size>1);
 });
 assert.equal(TRIES.limit,null);assert.equal(TRIES.strict,false);
});
test('normally generated puzzles pass the same checks',()=>{
 for(const spec of specs)checkInstance(makeInstance('regression',spec),spec);
 checkBalance(makeBalance('regression'));
});
new vm.Script(html.match(/<script id="ui">([\s\S]*?)<\/script>/)[1]);
