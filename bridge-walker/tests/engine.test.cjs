const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const engine=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const sandbox={module:{exports:{}}};vm.runInNewContext(engine,sandbox);
const {analyse,makeInstance,makePairs,eulerWalks,spellWalk,pairPositions,pairedGraph}=sandbox.module.exports;
const plain=x=>JSON.parse(JSON.stringify(x));
function verifyPuzzle(inst){
 assert.equal(inst.reads.length,15);
 assert.equal(new Set(inst.reads).size,15);
 // Independently enumerate all edge-covering routes, without an early cutoff.
 const paths=[];function search(v,ids){
  if(ids.length===15){paths.push(ids);return;}
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
 assert.equal(g.nodes.length,11);assert.equal(g.edges.length,10);
 assert(g.out.every(n=>n<=1)&&g.inn.every(n=>n<=1));
 const pairedWalks=eulerWalks(g);assert.equal(pairedWalks.length,1);
 const seqs=[0,1].map(j=>g.nodes[g.start].split('|')[j]+pairedWalks[0].map(id=>g.edges[id].read.split('|')[j].slice(-1)).join(''));
 assert.equal(seqs[0].slice(5),seqs[1].slice(0,-5));
 assert.equal(seqs[0]+seqs[1].slice(-5),inst.genome);
 for(const c of inst.candidates){
  const groups=c.walk.map(id=>inst.loopByEdge[id]).filter(Boolean);
  assert(['11112222','22221111'].includes(groups.join('')));
 }
}
test('1,000 seeded read-pair puzzles have exactly two walks and one paired reconstruction',()=>{
 const seen=new Set(),positions=new Set();
 for(let i=0;i<1000;i++){const inst=makePairs('PAIR-TEST|12|'+i);verifyPuzzle(inst);seen.add(inst.genome);positions.add(inst.candidates.findIndex(c=>c.text===inst.genome));}
 assert(seen.size>900);assert.equal(positions.size,2);
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
new vm.Script(html.match(/<script id="ui">([\s\S]*?)<\/script>/)[1]);
