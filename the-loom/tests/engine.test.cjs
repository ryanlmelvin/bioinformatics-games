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

/* ---------- Rosalind sample datasets ---------- */
test('BA9G suffix array sample',()=>{
  assert.equal(E.suffixArray('AACGATAGCGGTAGA$').join(', '),'15, 14, 0, 1, 12, 6, 4, 2, 8, 13, 3, 7, 9, 10, 11, 5');
  assert.equal(E.suffixArray('panamabananas$').join(','),'13,5,3,1,7,9,11,6,4,2,8,10,0,12');
});
test('BA9I Burrows-Wheeler transform sample',()=>{
  assert.equal(E.bwt('GCGTGCCTGGTCA$'),'ACTGGCT$TGCGGC');
  assert.equal(E.bwt('panamabananas$'),'smnpbnnaaaaa$a');
});
test('BA9J inverse transform sample',()=>{assert.equal(E.inverseBwt('TTCCTAACG$A'),'TACATCACGT$');});
test('BA9K last-to-first sample',()=>{assert.equal(E.lastToFirst('T$GACCA')[3],1);});
test('BA9L BWMatching sample',()=>{
  assert.deepEqual(plain(E.bwMatching('TCCTCTATGAGATCCTATTCTATGAAACCTTCA$GACCAAAATTCTCCGGC',['CCT','CAC','GAG','CAG','ATC'])),[2,1,1,0,1]);
});
test('BA9M BetterBWMatching sample',()=>{
  assert.deepEqual(['ACC','CCG','CAG'].map(p=>E.betterBWMatching('GGCGCCGC$TAGTCACACACGCCGTA',p)),[1,2,1]);
});
test('BA9N multiple pattern matching sample (BWT, partial suffix array and threads)',()=>{
  assert.equal(E.multiplePatternMatching('AATCGGGTTCAATCGGGGT',['ATCG','GGGT']).join(' '),'1 4 11 15');
  for(const K of [1,2,3,5])assert.equal(E.multiplePatternMatching('AATCGGGTTCAATCGGGGT',['ATCG','GGGT'],K).join(' '),'1 4 11 15');
});
test('BA9O approximate matching sample, and seeds agree with brute force',()=>{
  assert.equal(E.approximateMatching('ACATGCTACTTT',['ATT','GCC','GCTA','TATT'],1).join(' '),'2 4 4 6 7 8 9');
  const rand=E.rng(7);
  for(let i=0;i<300;i++){
    const t=Array.from({length:30},()=>'ACGT'[Math.floor(rand()*4)]).join(''),p=Array.from({length:6},()=>'ACGT'[Math.floor(rand()*3)]).join('');
    for(const d of [0,1,2])assert.deepEqual(plain(E.approxOccurrences(t,p,d)),plain(E.approxBrute(t,p,d)));
  }
});
test('BA9Q partial suffix array sample',()=>{
  assert.deepEqual(plain(E.partialSuffixArray('PANAMABANANAS$',5)),[[1,5],[11,10],[12,0]]);
});

/* ---------- the generator must guarantee (brief 9.5) ---------- */
test('property 1: words for levels 2 to 7 come from the curated list of 6- and 7-letter words with a letter three times',()=>{
  for(const w of E.WORDS){
    assert.match(w,/^[a-z]{6,7}$/);
    assert(Object.values(E.kmerCounts(w,1)).some(c=>c>=3),w);
  }
  for(const code of CODES)for(const id of [2,4,5,6,7]){
    const x=E.makeLevel(code,id,0);
    assert(E.WORDS.includes(x.word),code+' '+id);
    if(id===2)assert.equal(x.word.length,7);
    if(id>=4&&id<=6)assert.equal(x.word.length,6);
  }
  // the puzzle code really chooses: several words appear
  assert(new Set(CODES.map(c=>E.makeLevel(c,4,0).word)).size>=8);
});
test('property 2: levels 2 and 7, the pattern occurs at least twice and at most four times',()=>{
  for(const code of CODES){
    const a=E.makeLevel(code,2,0),b=E.makeLevel(code,7,0);
    assert.equal(a.pattern.length,2);assert.equal(b.pattern.length,3);
    for(const x of [a,b]){const n=E.occurrences(x.word,x.pattern).length;assert(n>=2&&n<=4,code+' '+x.word+' '+x.pattern);}
    // level 2: the matches sit in one band of neighbouring rows
    const rows=a.rows.map((r,i)=>r.text.startsWith(a.pattern)?i:-1).filter(i=>i>=0);
    assert.equal(rows[rows.length-1]-rows[0]+1,rows.length);
    // level 7: the band the fingers close on has exactly that many rows
    assert.equal(E.bandSteps(b.L,b.pattern).count,E.occurrences(b.word,b.pattern).length);
    assert.equal(E.bandSteps(b.L,b.more[0]).count,E.occurrences(b.word,b.more[0]).length);
    assert(E.bandSteps(b.L,b.more[0]).count>=1);assert.equal(E.bandSteps(b.L,b.more[1]).count,0);
  }
});
test('property 3: level 6, unweaving returns the original word, for every word in the list',()=>{
  for(const w of E.WORDS){
    const t=w+'$',L=E.bwt(t);assert.equal(E.unweave(L).text,t);
    assert.equal(E.unweave(L).rows.length,t.length);
    // the threads drawn by the no-crossing rule are exactly the last-to-first mapping
    const F=E.firstColumn(L),lf=E.lastToFirst(L),rf=E.ranks(F),rl=E.ranks(L);
    [...L].forEach((c,i)=>{assert.equal(F[lf[i]],c);assert.equal(rf[lf[i]],rl[i]);});
  }
  for(const code of CODES){const x=E.makeLevel(code,6,0);assert.notEqual(x.word,E.makeLevel(code,5,0).word);assert.equal(E.unweave(x.L).text,x.text);}
});
/* The properties each generated level must have. The property tests and the fallback tests share them. */
const check={
 1(x){
  assert.equal(x.short.text.length,40);assert.equal(x.long.text.length,200);
  assert.equal(x.short.reads.length,3);assert.equal(x.long.reads.length,10);
  for(const s of [x.short,x.long])s.reads.forEach(r=>assert.deepEqual(plain(E.occurrences(s.text,r.read)),[r.pos]));
  const total=x.long.reads.reduce((a,r)=>a+E.naiveScan(x.long.text,r.read).comps,0);assert(total>1000);
 },
 8(x){
  assert.equal(E.occurrences(x.body,x.first).length,2);
  assert.equal(x.reads.length,4);x.reads.forEach(r=>assert.equal(E.occurrences(x.body,r.read).length,1));
  const all=x.walks.flat();
  all.forEach(w=>{assert(w.steps<=3);assert.equal(x.text.slice(w.pos).slice(0,1),x.text[x.sa[w.path[0]]]);});
  // each walk ends at the right place in the text
  [x.first,...x.reads.map(r=>r.read)].forEach((p,i)=>assert.deepEqual(x.walks[i].map(w=>w.pos).sort((a,b)=>a-b),E.occurrences(x.body,p)));
  assert(all.some(w=>w.steps===3));
  Object.values(x.labels).forEach(p=>assert.equal(p%4,0));
 },
 9(x){
  assert.equal(x.L.length,32);
  const b=E.bandSteps(x.L,x.pattern);assert.deepEqual(plain(b.band),plain(x.band));
  assert(x.top%4>=2&&(x.bottom+1)%4>=2);
  const fromBoard=i=>x.boards[i-i%4][x.sym]+E.countAbove(x.L.slice(i-i%4),x.sym,i%4);
  assert.equal(fromBoard(x.top),x.above);assert.equal(fromBoard(x.bottom+1),x.upto);
  assert.equal(E.betterBWMatching(x.L,x.pattern),x.band[1]-x.band[0]+1);
 },
 10(x){
  assert.equal(E.occurrences(x.text,x.read).length,0);
  assert.deepEqual(plain(E.approxBrute(x.text,x.read,1)),[x.at]);
  assert.equal(E.mismatches(x.text.slice(x.at,x.at+8),x.read),1);
  assert(x.halves.some(h=>x.text.slice(x.at+h.off,x.at+h.off+4)===h.piece));
  // the decoy: some exact hit of a half lies where the whole read has two or more mismatches
  assert(x.hits.some(h=>h.start!==x.at&&E.mismatches(x.text.slice(h.start,h.start+8),x.read)>=2));
  assert.deepEqual(plain(E.approxOccurrences(x.text,x.read,1)),[x.at]);
 },
 11(x){
  const cover=x.reads.filter(r=>r.start<=x.v&&x.v<r.start+10);assert(cover.length>=4);
  cover.forEach(r=>assert.equal(r.read[x.v-r.start],x.alt));
  const at=x.reads.filter(r=>r.start<=x.err&&x.err<r.start+10),bad=at.filter(r=>r.read[x.err-r.start]!==x.ref[x.err]);
  assert.equal(bad.length,1);assert(at.length>=3);
  x.reads.forEach(r=>assert.deepEqual(plain(E.approxOccurrences(x.ref,r.read,1)),[r.start]));
 }
};
function withTries(opts,f){Object.assign(E.TRIES,opts);try{return f();}finally{E.TRIES.limit=null;E.TRIES.strict=false;}}

test('property 4: level 8, with every fourth position labelled, every match is placed in at most three steps',()=>{
  for(const code of CODES){
    check[8](E.makeLevel(code,8,0));
  }
});
test('property 5: level 10, the read occurs nowhere exactly, once with one mismatch, and one half matches exactly there',()=>{
  for(const code of CODES){
    check[10](E.makeLevel(code,10,0));
  }
});
test('level 1: every read occurs exactly once, and a scan of ten reads costs well over a thousand comparisons',()=>{
  for(const code of CODES){
    check[1](E.makeLevel(code,1,0));
  }
});
test('level 9: the band step needs counting past a board, and the boards give the same answer as scanning',()=>{
  for(const code of CODES){
    check[9](E.makeLevel(code,9,0));
  }
});
test('level 11: reads place uniquely with one mismatch allowed; the variant column is unanimous, the error column is not',()=>{
  for(const code of CODES){
    check[11](E.makeLevel(code,11,0));
  }
});
test('every fallback key generates directly without running out of tries',()=>{
  const gens={makeL1:1,makeL8:8,makeL9:9,makeL10:10,makeL11:11};
  assert.deepEqual(Object.keys(E.POOLS).sort(),Object.keys(gens).sort());
  withTries({strict:true},()=>{for(const [f,lv] of Object.entries(gens))for(const k of E.POOLS[f])check[lv](E[f](k));});
});
test('a generator that runs out of tries returns a valid level from its pool',()=>{
  withTries({limit:0},()=>{for(let i=0;i<20;i++)for(const lv of [1,8,9,10,11])check[lv](E.makeLevel('NO-TRIES-'+i,lv,i%3));});
  assert.equal(E.TRIES.limit,null);assert.equal(E.TRIES.strict,false);
});
test('puzzles are reproducible and a new variant changes them',()=>{
  for(const id of [1,2,4,7,8,9,10,11]){
    assert.deepEqual(plain(E.makeLevel('SAME',id,0)),plain(E.makeLevel('SAME',id,0)));
  }
  assert.notDeepEqual(plain(E.makeLevel('SAME',8,0)),plain(E.makeLevel('SAME',8,1)));
});
test('workbench report: columns, suffix array, bands and positions',()=>{
  const r=E.benchReport('panamabananas',['ana','ban','xyz']);
  assert.equal(r.L,'smnpbnnaaaaa$a');assert.equal(r.F,'$aaaaaabmnnnps');assert.equal(r.rows.length,14);
  assert.deepEqual(plain(r.patterns[0].positions),[1,7,9]);assert.equal(r.patterns[0].count,3);
  assert.equal(r.patterns[2].count,0);
  // problem A of the kit: these pairs share their first two columns
  const cols=(t,k)=>E.sortedRotations(t).map(x=>x.rot.slice(0,k)).join('|');
  assert.equal(cols('aaba$',2),cols('abaa$',2));assert.equal(cols('aaabaa$',3),cols('aabaaa$',3));
});
