const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const engine=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const sandbox={module:{exports:{}}};vm.runInNewContext(engine,sandbox);
const E=sandbox.module.exports;
const plain=x=>JSON.parse(JSON.stringify(x));
const CODES=Array.from({length:500},(_,i)=>'CODE'+i+'|0');

/* Independent brute force for the end-to-end route: score every complete route through the grid. */
function bruteGlobal(v,w,sc){
  let best=-Infinity,ways=0;
  const walk=(i,j,t)=>{
    if(i===v.length&&j===w.length){if(t>best){best=t;ways=0;}if(t===best)ways++;return;}
    if(i<v.length&&j<w.length)walk(i+1,j+1,t+E.pairScore(sc,v[i],w[j]));
    if(i<v.length)walk(i+1,j,t+sc.indel);
    if(j<w.length)walk(i,j+1,t+sc.indel);
  };
  walk(0,0,0);return {best,ways};
}
/* A second way to the taxi answers: try every place to get on and off, each as its own end-to-end problem. */
function everyTaxi(v,w,sc,mode){
  let best=-Infinity,ways=0;
  for(let a=0;a<=v.length;a++)for(let b=0;b<=w.length;b++){
    if(mode==='overlap'&&b!==0)continue;
    for(let c=a;c<=v.length;c++)for(let d=b;d<=w.length;d++){
      if(mode==='overlap'&&c!==v.length)continue;
      const r=E.align(v.slice(a,c),w.slice(b,d),sc,'global');
      if(r.best>best){best=r.best;ways=0;}if(r.best===best)ways+=r.count;
    }
  }
  return {best,ways};
}

test('property 1: levels 1, 2 and 7 have a unique longest common subsequence of length at least 4, and greedy scores below par (500 codes)',()=>{
  for(const key of CODES){
    const d=E.makeDecks(key);
    assert.equal(d.v.length,7);assert.equal(d.w.length,8);
    const l=E.allLCS(d.v,d.w);
    assert(l.length>=4,key);assert.equal(l.strings.length,1,key);assert.equal(d.lcs,l.strings[0]);assert.equal(d.par,l.length);
    assert.equal(E.align(d.v,d.w,E.PAIRS,'global').best,d.par);
    const g=E.greedy(d.v,d.w);assert(g.score<d.par,key);
    assert.equal(E.matchesOn(d.v,d.w,[0,0],g.moves),g.score);
  }
});
test('property 2: level 5 has a unique best route and the richer-street walker gets strictly less (500 codes)',()=>{
  for(const key of CODES){
    const {small,big}=E.makeCity(key);
    assert.equal(big.down.length,4);assert.equal(big.right[0].length,4);
    const totals=E.allRoutes(4,4).map(r=>E.routeSights(big.down,big.right,r));
    assert.equal(totals.length,70);
    const best=Math.max(...totals);
    assert.equal(totals.filter(t=>t===best).length,1,key);
    assert.equal(E.manhattan(big.down,big.right).best,best);
    assert(E.manhattanGreedy(big.down,big.right).score<best,key);
    assert.equal(E.allRoutes(2,2).length,6);
    const st=E.allRoutes(2,2).map(r=>E.routeSights(small.down,small.right,r));
    assert.equal(st.filter(t=>t===Math.max(...st)).length,1);
  }
});
test('property 3: level 8 has a unique best route under tolls, and it is not a best route for counting pairs, so it differs from level 7 (500 codes)',()=>{
  CODES.forEach((key,n)=>{
    const d=E.makeDecks(key),t=E.align(d.v,d.w,E.TOLLS,'global');
    assert.equal(t.count,1,key);
    assert(E.matchesOn(d.v,d.w,t.start,t.moves)<d.par,key);
    assert.equal(E.routeScore(d.v,d.w,E.TOLLS,t.start,t.moves),t.best);
    if(n<40){const b=bruteGlobal(d.v,d.w,E.TOLLS);assert.equal(b.best,t.best);assert.equal(b.ways,1);}
  });
});
test('property 4: level 9 has a unique best local alignment scoring at least 4, and the best global score is negative (500 codes)',()=>{
  CODES.forEach((key,n)=>{
    const p=E.makeLocal(key);
    assert.equal(p.v.length,10);assert.equal(p.w.length,11);
    assert.equal(p.local.count,1,key);assert(p.local.best>=4);assert(p.global.best<0);
    assert.equal(E.routeScore(p.v,p.w,E.TOLLS,p.local.start,p.local.moves),p.local.best);
    if(n<60){const b=everyTaxi(p.v,p.w,E.TOLLS,'local');assert.equal(b.best,p.local.best);assert.equal(b.ways,1);}
  });
});
test('property 5: level 10 has a unique best overlap of six or seven letters with exactly one mismatch (500 codes)',()=>{
  CODES.forEach((key,n)=>{
    const p=E.makeOverlap(key),o=p.overlap;
    assert.equal(o.count,1,key);
    assert(o.top.length===6||o.top.length===7);
    assert(!o.top.includes('-')&&!o.bottom.includes('-'));
    assert.equal([...o.top].filter((c,k)=>c!==o.bottom[k]).length,1);
    assert.equal(o.start[1],0);assert.equal(o.end[0],p.v.length);
    assert(p.v.endsWith(o.top)&&p.w.startsWith(o.bottom));
    {const b=everyTaxi(p.v,p.w,E.TOLLS,'overlap');assert.equal(b.best,o.best);assert.equal(b.ways,1);}
  });
});
test('Rosalind BA5B sample: the longest Manhattan path is 34',()=>{
  const down=[[1,0,2,4,3],[4,6,5,2,1],[4,4,5,2,1],[5,6,8,5,3]],right=[[3,2,4,0],[3,2,4,2],[0,7,3,3],[3,3,0,2],[1,3,2,2]];
  assert.equal(E.manhattan(down,right).best,34);
});
test('Rosalind BA5C sample: a longest common subsequence of AACCTTGG and ACACTGTGA',()=>{
  const l=E.allLCS('AACCTTGG','ACACTGTGA');assert.equal(l.length,6);assert(l.strings.includes('AACTGG'));
  const r=E.align('AACCTTGG','ACACTGTGA',E.PAIRS,'global');assert.equal(r.best,6);
  assert(l.strings.includes([...r.top].filter((c,k)=>c===r.bottom[k]).join('')));
});
test('Rosalind BA5E sample: global alignment, BLOSUM62, indel 5',()=>{
  const r=E.align('PLEASANTLY','MEANLY',{matrix:'BLOSUM62',indel:-5},'global');
  assert.equal(r.best,8);assert.equal(r.top.replace(/-/g,''),'PLEASANTLY');assert.equal(r.bottom.replace(/-/g,''),'MEANLY');
  assert.equal(E.routeScore('PLEASANTLY','MEANLY',r.sc,[0,0],'SDDDSSDSDD'.split('')),8);
});
test('Rosalind BA5F sample: local alignment, PAM250, indel 5',()=>{
  const r=E.align('MEANLY','PENALTY',{matrix:'PAM250',indel:-5},'local');assert.equal(r.best,15);
  assert.equal(r.top,'EANL-Y');assert.equal(r.bottom,'ENALTY');
});
test('Rosalind BA5I sample: overlap alignment, +1 / -2 / -2',()=>{
  const r=E.align('PAWHEAE','HEAGAWGHEE',{match:1,mismatch:-2,indel:-2},'overlap');assert.equal(r.best,1);
  assert.equal(E.routeScore(r.v,r.w,r.sc,r.start,r.moves),1);assert(r.top.replace(/-/g,'').length>0);
});
test('level 4: twelve-card decks have 251,595,969 complete games, and the brute-force enumerator lists them in order',()=>{
  assert.equal(E.countGames(12,12),251595969);
  assert.equal(E.countGames(2,2),13);
  assert.deepEqual(plain([...E.everyGame(1,1)]),['D','SE','ES']);
  assert.equal([...E.everyGame(3,4)].length,E.countGames(3,4));
  assert.equal(E.binom(8,4),70);
});
test('level 3: the two histories leave the same cards with different scores, and the finish is the same best finish',()=>{
  for(const key of CODES.slice(0,100)){
    const d=E.makeDecks(key),t=E.tablePuzzle(d);
    const end=m=>E.routeCorners([0,0],m).pop().join(',');
    assert.equal(end(t.histA),t.i+','+t.j);assert.equal(end(t.histB),t.i+','+t.j);
    assert(t.scoreA>t.scoreB);assert.equal(E.matchesOn(d.v,d.w,[0,0],t.histA),t.scoreA);
    assert.equal(t.scoreA+t.finishScore,d.par);assert(t.finishScore>=2);
  }
});
test('level 11: the protein fragments are real and the finished method aligns them',()=>{
  const r=E.codeBreakers();
  assert.equal(r.top.replace(/-/g,''),E.PROTEINS.a.seq);assert.equal(r.bottom.replace(/-/g,''),E.PROTEINS.b.seq);
  assert.equal(r.best,E.routeScore(r.v,r.w,r.sc,[0,0],r.moves));
  assert(E.PROTEINS.a.seq.length===20&&E.PROTEINS.b.seq.length===20);
});
test('scoring matrices are symmetric and match spot values from Rosalind',()=>{
  for(const k of ['BLOSUM62','PAM250']){const M=E.MATRICES[k];for(const p in M)assert.equal(M[p],M[p[1]+p[0]]);}
  assert.equal(E.MATRICES.BLOSUM62.WW,11);assert.equal(E.MATRICES.PAM250.WW,17);assert.equal(E.MATRICES.BLOSUM62.AR,-1);
});
test('puzzles are reproducible from the code and change with a new puzzle',()=>{
  assert.deepEqual(plain(E.makeDecks('CLASS|0')),plain(E.makeDecks('CLASS|0')));
  assert.notEqual(E.makeDecks('CLASS|0').v+E.makeDecks('CLASS|0').w,E.makeDecks('CLASS|1').v+E.makeDecks('CLASS|1').w);
  assert.deepEqual(plain(E.makeLocal('CLASS|0')),plain(E.makeLocal('CLASS|0')));
});
new vm.Script(html.match(/<script id="ui">([\s\S]*?)<\/script>/)[1]);
