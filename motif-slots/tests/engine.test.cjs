const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const engine=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const sandbox={module:{exports:{}}};vm.runInNewContext(engine,sandbox);
const E=sandbox.module.exports;
const plain=x=>JSON.parse(JSON.stringify(x));
const CODES=Array.from({length:500},(_,i)=>'PROP-'+i);
const exactCounts=(texts,k)=>{const m=new Map();texts.forEach(t=>E.kmersOf(t,k).forEach(w=>m.set(w,(m.get(w)||0)+1)));return m;};

/* ---------- section 5.5, one test per property ---------- */
test('property 1: level 1 has exactly one 5-mer occurring four times, and no other more than twice (500 codes)',()=>{
  for(const c of CODES){
    const L=E.genL1(c),m=exactCounts([L.text],5);
    assert.equal(L.text.length,80);
    const four=[...m].filter(([,n])=>n===4).map(([w])=>w);
    assert.deepEqual(four,[L.word]);
    for(const [w,n] of m)if(w!==L.word)assert(n<=2,c+' '+w);
    assert(E.DNAA5.includes(L.word));
  }
});
test('property 2: levels 2 and 3 have a unique winner at one mismatch (level 3: either strand) that beats every other word by two and never occurs exactly (500 codes)',()=>{
  for(const c of CODES){
    const L2=E.genL2(c),m2=E.litCounts([L2.text],5,1,false);
    const best2=Math.max(...m2.values());
    assert.equal(m2.get(L2.word),best2);
    for(const [w,n] of m2)if(w!==L2.word)assert(n<=best2-2,c+' L2 '+w);
    assert.equal(E.countD(L2.text,L2.word,0),0);
    assert(Math.max(...exactCounts([L2.text],5).values())<=2,'level 1 counting finds no clear winner');
    // every compared window is one letter away from the word
    for(const p of L2.compare)assert.equal(E.hamming(L2.text.substr(p,5),L2.word),1);
    const L3=E.genL3(c),m3=E.litCounts([L3.text],5,1,true),best3=Math.max(...m3.values());
    assert.deepEqual(plain(E.frequentWords(L3.text,5,1,true).words),[L3.word,L3.rc].sort());
    for(const [w,n] of m3)if(w!==L3.word&&w!==L3.rc)assert(n<=best3-2,c+' L3 '+w);
    assert.equal(E.countD(L3.text,L3.word,0)+E.countD(L3.text,L3.rc,0),0);
    // the window written backwards by hand reads as the word with one change
    assert.equal(E.hamming(E.revcomp(L3.text.substr(L3.handAt,5)),L3.word),1);
  }
});
test('property 3: level 4 plants a word within two mismatches on every strip, never exact, the unique median string; the decoy wins on lit windows but sits on at most three strips (500 codes)',()=>{
  for(const c of CODES){
    const L=E.genL4(c),T=L.word;
    assert.equal(L.strips.length,10);L.strips.forEach(s=>assert.equal(s.length,24));
    for(const s of L.strips){assert(E.countD(s,T,2)>0);assert.equal(E.countD(s,T,0),0);}
    const t=E.distTable(L.strips,6),me=t[parseInt([...T].map(x=>'ACGT'.indexOf(x)).join(''),4)];
    let ties=0;for(let p=0;p<t.length;p++)if(t[p]<=me)ties++;
    assert.equal(ties,1,c+' median not unique');
    assert.equal(E.distToDna(E.medianString(L.strips,6),L.strips),me);
    const lit=E.litCounts(L.strips,6,1,false),top=E.tally(L.strips,6,1,false)[0];
    assert.equal(top.word,L.decoy);
    assert(lit.get(L.decoy)>(lit.get(T)||0));
    assert(E.stripsLit(L.strips,L.decoy,1)<=3);
    assert(E.stripsLit(L.strips,L.planted,0)===3&&E.countD(L.strips.join('|'),L.planted,0)===8,'eight copies on three strips');
    assert(L.allTen.includes(T));
  }
});
test('property 4: levels 7 and 8 (five reels, k = 4): going down the reels without pseudocounts ends above the planted misses, with pseudocounts finds the planted sites; the hand arithmetic is in quarters (500 codes)',()=>{
  for(const c of CODES){
    const L=E.genL7(c),{dna,k,sites}=L;
    assert.equal(dna.length,5);assert.equal(k,4);
    const planted=E.scoreAt(dna,sites,k);
    assert(E.scoreAt(dna,E.greedy(dna,k,false),k)>planted);
    assert.deepEqual(plain(E.greedy(dna,k,true)),plain(sites));
    // the student's own descent from reel 1's site: a zero throws out reel 2's site, and pseudocounts recover every site
    const f0=E.greedyFrom(dna,k,sites[0],false);
    assert.notEqual(f0[1],sites[1]);
    assert.equal(E.prob(dna[1].substr(sites[1],k),E.profileOf([dna[0].substr(sites[0],k)],false)),0);
    assert(E.scoreAt(dna,f0,k)>planted);
    assert.deepEqual(plain(E.greedyFrom(dna,k,sites[0],true)),plain(sites));
    // quarters: the four-reel vote and every probability multiplied out from it
    const P=E.profileOf(E.motifsAt(dna,sites,k).slice(0,4),false);
    P.forEach(r=>r.forEach(x=>assert(Number.isInteger(x*4))));
    const pr=E.kmersOf(dna[4],k).map(w=>E.prob(w,P));
    pr.forEach(x=>assert(Number.isInteger(x*256)));
    assert(pr[sites[4]]>0&&pr.every((x,j)=>j===sites[4]||x<pr[sites[4]]));
  }
});
test('property 5: level 9: of twenty seeded spins at least one stalls above the planted misses and at least one reaches them; the first spin stalls (500 codes)',()=>{
  for(const c of CODES){
    const L=E.genL9(c);
    assert.equal(L.starts.length,20);
    const runs=L.starts.map(s=>E.randomizedRun(L.dna,L.k,s));
    assert(runs.some(r=>r.score>L.planted));
    assert(runs.some(r=>r.score<=L.planted));
    assert(runs[0].score>L.planted);
  }
});
test('property 6: level 10: at the scripted stall no single-reel best re-stop changes anything, and a seeded run of at most forty single-reel spins reaches the planted misses (500 codes)',()=>{
  for(const c of CODES){
    const L=E.genL9(c),{dna,k,stall}=L;
    assert(E.scoreAt(dna,stall,k)>L.planted);
    for(let i=0;i<dna.length;i++){
      const w=E.leaveOneOut(dna,k,stall,i);
      assert(w.every((x,j)=>j===stall[i]||x<w[stall[i]]),c+' reel '+i);
    }
    const run=E.gibbsRun(dna,k,stall,40,E.rng(E.hashStr(c+'|L10|'+L.gseed)));
    const hit=run.steps.findIndex(s=>s.score<=L.planted);
    assert(hit>=0&&hit<40);
    assert(run.steps.slice(0,hit+1).some((s,j)=>s.score>(j?run.steps[j-1].score:E.scoreAt(dna,stall,k))),'it gets out by landing somewhere worse');
  }
});

/* ---------- other guarantees the levels rely on ---------- */
test('level 11 brings back the level 4 strips and the unattended machine finds AAAATATCT (500 codes)',()=>{
  for(const c of CODES){
    const L=E.genL11(c),L4=E.genL4(c);
    assert.equal(L.strips.length,10);
    L.strips.forEach((s,i)=>{assert.equal(E.hamming(s.substr(L.sites[i],9),E.EVENING),1);
      const same=[...s].filter((x,j)=>x===L4.strips[i][j]).length;assert(same>=15);});
    assert.equal(E.consensusOf(E.motifsAt(L.strips,L.run.best,9)),'AAAATATCT');
  }
});
test('level 5 and level 6 instances are playable (500 codes)',()=>{
  for(const c of CODES){
    const L5=E.genL5(c);assert.equal(L5.reels.length,4);
    assert(E.scoreAt(L5.reels,L5.start,6)>L5.target);
    const L6=E.genL6(c);assert.equal(L6.reels.length,3);
    assert.notEqual(L6.totals[0],L6.totals[1]);
    assert.deepEqual(plain(L6.totals),plain(L6.words.map(w=>E.distToDna(w,L6.reels))));
  }
});
test('puzzles are reproducible from the code and differ between codes',()=>{
  for(const g of [1,2,3,4,6,7,9,11])assert.deepEqual(plain(E.GEN[g]('SAME')),plain(E.GEN[g]('SAME')));
  assert.notEqual(E.genL4('A1').strips.join(),E.genL4('A2').strips.join());
  assert.notEqual(E.genL9('A1').dna.join(),E.genL9('A2').dna.join());
});

/* ---------- Rosalind sample datasets ---------- */
const S2F=['CGCCCCTCTCGGGGGTGTTCAGTAAACGGCCA','GGGCGAGGTATGTGTAAGTGCCAAGGTGCCAG','TAGTACCGAGACCGAAAGAAGTATACAGGCGT','TAGATCAAGTTTCAGGTGCACGTCGGTGAACC','AATCCACCAGCTCCACGTGCAATGTTGGCCTA'];
const S2FOUT=['TCTCGGGG','CCAAGGTG','TACAGGCG','TTCAGGTG','TCCACGTG'];
test('Rosalind BA1J: frequent words with mismatches and reverse complements',()=>{
  assert.deepEqual(plain(E.frequentWords('ACGTTGCATGTCGCATGATGCATGAGAGCT',4,1,true).words),['ACAT','ATGT']);
});
test('Rosalind BA2B: median string',()=>{
  const dna=['AAATTGACGCAT','GACGACCACGTT','CGTCAGCGCCTG','GCTGAGCACCGG','AGTACGGGACAG'];
  const w=E.medianString(dna,3);
  assert.equal(E.distToDna(w,dna),E.distToDna('GAC',dna));
  const t=E.distTable(dna,3);assert.equal(Math.min(...t),E.distToDna('GAC',dna));
});
test('Rosalind BA2C: profile-most probable k-mer',()=>{
  const P=[[0.2,0.2,0.3,0.2,0.3],[0.4,0.3,0.1,0.5,0.1],[0.3,0.3,0.5,0.2,0.4],[0.1,0.2,0.1,0.1,0.2]];
  assert.equal(E.mostProbable('ACCTGTTTATTGCCTAAGTTCCGAACAAACCCAATATAGCCCGAGGGCCT',5,P),'CCGAG');
});
test('Rosalind BA2D and BA2E: greedy motif search without and with pseudocounts',()=>{
  const dna=['GGCGTTCAGGCA','AAGAATCAGTCA','CAAGGAGTTCGC','CACGTCAATCAC','CAATAATATTCG'];
  assert.deepEqual(plain(E.motifsAt(dna,E.greedy(dna,3,false),3)),['CAG','CAG','CAA','CAA','CAA']);
  assert.deepEqual(plain(E.motifsAt(dna,E.greedy(dna,3,true),3)),['TTC','ATC','TTC','ATC','TTC']);
});
test('Rosalind BA2F: randomized motif search, 1000 runs',()=>{
  // Rosalind accepts any best collection; ours must be as good as the sample answer, and the sample answer must be a stopping point
  const r=E.randomizedSearch(S2F,8,1000,E.rng(1));
  assert.equal(r.score,E.scoreOf(S2FOUT));
  const at=S2FOUT.map((m,i)=>S2F[i].indexOf(m));
  assert.deepEqual(plain(E.motifsAt(S2F,E.randomizedRun(S2F,8,at).best,8)),S2FOUT);
});
test('Rosalind BA2G: Gibbs sampler, 20 starts of 100 steps reaches the sample answer\'s misses',()=>{
  const r=E.gibbsSearch(S2F,8,100,20,E.rng(7));
  assert(r.score<=E.scoreOf(S2FOUT),'score '+r.score+' vs '+E.scoreOf(S2FOUT));
});
test('small definitions behave as in the text',()=>{
  assert.equal(E.hamming('CGAAT','CGGAC'),2);
  assert.equal(E.revcomp('AAAACCCGGT'),'ACCGGGTTTT');
  assert.equal(E.neighbors('ACG',1).length,10);
  assert.equal(E.scoreOf(['TCGG','CCGG']),1);
  assert.equal(E.consensusOf(['ACTGACGT','ACGTACGT','ACTTACTT']),'ACTTACGT');
});
