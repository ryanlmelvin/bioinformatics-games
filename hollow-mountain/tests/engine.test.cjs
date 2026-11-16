const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const engine=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const sandbox={module:{exports:{}}};vm.runInNewContext(engine,sandbox);
const E=sandbox.module.exports;
const CODES=500,code=i=>'ENGINE-'+i;
const key=(i,l)=>code(i)+'|'+l+'|0';
const whole=x=>Number.isInteger(x);
const plain=x=>JSON.parse(JSON.stringify(x));
function chartOK(D){D.forEach((r,i)=>{assert.equal(r[i],0);r.forEach((x,j)=>{assert.equal(x,D[j][i]);assert(whole(x));});});}
function tunnelsOK(t){t.edges.forEach(e=>{assert(whole(e.w),'whole tunnel');assert(e.w>=1&&e.w<=9,'tunnel 1..9, got '+e.w);});}
const parseMatrix=s=>s.trim().split('\n').map(l=>l.trim().split(/\s+/).map(Number));
const close=(A,B,tol)=>A.every((r,i)=>r.every((x,j)=>Math.abs(x-B[i][j])<(tol||1e-3)));

test('property 1: tunnel lengths are whole numbers from 1 to 9; every chart is symmetric with a zero diagonal',()=>{
 for(let i=0;i<CODES;i++){
  const v=E.makeViruses(key(i,1));chartOK(v.D1);chartOK(v.D6);
  const lit=E.makeLit(key(i,2));tunnelsOK(lit.tree);chartOK(lit.D);
  const s=E.makeStar(key(i,3));tunnelsOK(s.tree);chartOK(s.D);
  for(const [n,l] of [[4,4],[5,5]]){const g=E.makeGrow(key(i,l),n);tunnelsOK(g.tree);chartOK(g.D);}
  const c=E.makeClock(key(i,7));tunnelsOK(c.tree);chartOK(c.D);
  const f=E.makeFast(key(i,8));tunnelsOK(f.tree);chartOK(f.D);
  const j=E.makeJoin5(key(i,9));tunnelsOK(j.tree);chartOK(j.D);
  const w=E.makeSwap(key(i,10));tunnelsOK(w.tree);chartOK(w.D);
 }
 tunnelsOK(E.SARS.tree);chartOK(E.SARS.D);
});

test('property 2: levels 3 to 5 charts fit a cave exactly and every limb length the student computes is whole',()=>{
 for(let i=0;i<CODES;i++){
  const s=E.makeStar(key(i,3));assert(E.additiveCheck(s.D));
  for(let j=0;j<3;j++)E.limbRows(s.D,j).forEach(r=>assert(whole(r.v)&&r.v>=1));
  assert(E.sameMatrix(E.leafDist(E.additivePhylogeny(s.D)),s.D));
  for(const [n,l] of [[4,4],[5,5]]){
   const g=E.makeGrow(key(i,l),n);assert(E.additiveCheck(g.D));
   let cave=g.start;
   for(let j=E.presentLeaves(cave).length;j<n;j++){
    E.limbRows(g.D,j,E.presentLeaves(cave)).forEach(r=>assert(whole(r.v)));
    const at=E.attachPoint(cave,g.D,j);
    assert(whole(at.L)&&at.L>=1&&whole(at.x)&&whole(at.off)&&at.ei!==undefined,'hangs inside a tunnel at a whole distance');
    assert(E.canHang(cave,at.ei,at.off,at.from,at.L));
    cave=E.hang(cave,at.ei,at.off,at.from,j,at.L);
   }
   assert(E.sameMatrix(E.leafDist(cave),g.D),'the rebuilt cave reproduces the chart');
  }
 }
});

test('property 3: level 6 chart has a foursome that misses the four-point condition by 2 or more',()=>{
 for(let i=0;i<CODES;i++){
  const v=E.makeViruses(key(i,6));
  assert(E.fourPointGap(v.D6,[0,1,2,3])>=2);
  assert(!E.additiveCheck(v.D6));
  assert(E.additiveCheck(v.D1),'level 1 stretch fits a cave');
  // level 1 pairing by eye is clear: the sister pairing has the smallest sum, strictly
  const p=v.pairs.find(x=>x[0]===0),s=E.fourSums(v.D1,[0,1,2,3]),want=p[1]===1?0:p[1]===2?1:2;
  assert.equal(s.indexOf(Math.min(...s)),want);assert.equal(s.filter(x=>x===Math.min(...s)).length,1);
  // the building attempt in level 6 stays whole: Y lengths and the formula's hang point
  assert.deepEqual(plain(E.presentLeaves(v.Y)),[0,1,2]);assert(v.Y.edges.every(e=>e.a!==3&&e.b!==3),'D is not yet in the Y');
  assert(E.sameMatrix(E.leafDist(v.Y).slice(0,3).map(r=>r.slice(0,3)),v.D6.slice(0,3).map(r=>r.slice(0,3))),'the Y fits A, B, C');
  v.Y.edges.forEach(e=>assert(whole(e.w)&&e.w>=1));assert(whole(v.attach.L)&&whole(v.attach.off));
  // whatever cave is built, it cannot reproduce a chart that breaks the four-point condition
  const built=E.hang(v.Y,v.attach.ei,v.attach.off,v.attach.from,3,v.attach.L);
  assert(!E.sameMatrix(E.leafDist(built),v.D6));
  // two letters at most per column, so every triangle sum is even
  for(let c=0;c<20;c++)assert(new Set(v.seqs.map(x=>x[c])).size<=2);
 }
});

test('property 4: level 7 chart comes from a steady-rate cave, UPGMA reproduces it exactly, no join is tied',()=>{
 for(let i=0;i<CODES;i++){
  const c=E.makeClock(key(i,7)),d=E.leafDist(c.tree).length&&(()=>{const A=E.adjOf(c.tree);return null;})();
  // every entrance is equally far from the first chamber
  const fromRoot=[];(function walk(){const A=E.adjOf(c.tree),dist=Array(c.tree.N).fill(null);dist[c.tree.root]=0;const st=[c.tree.root];
   while(st.length){const u=st.pop();for(const y of A[u])if(dist[y.v]===null){dist[y.v]=dist[u]+y.w;st.push(y.v);}}
   for(let l=0;l<4;l++)fromRoot.push(dist[l]);})();
  assert.equal(new Set(fromRoot).size,1);
  assert.equal(c.up.ties,false);
  assert(E.sameMatrix(E.leafDist(c.up.tree),c.D));
  c.up.joins.forEach(J=>{assert(whole(J.h));Object.values(J.row).forEach(x=>assert(whole(x)));});
 }
});

test('property 5: level 8 fits a cave; closest pair not neighbors; UPGMA shape differs; smallest discounted entry unique and elsewhere',()=>{
 for(let i=0;i<CODES;i++){
  const f=E.makeFast(key(i,8));
  assert(E.additiveCheck(f.D));
  const mp=E.minPair(f.D);assert(mp.unique);assert(!E.isCherry(f.tree,mp.pair[0],mp.pair[1]));
  assert(!E.sameShape(f.up.tree,f.tree));
  assert(!E.sameMatrix(E.leafDist(f.up.tree),f.D),'closest-pair cave fails the walk test');
  // With four entrances D*(i,j) = D*(k,l) for complementary pairs, so "unique" means: the smallest value sits on exactly
  // one complementary pair of pairs, and both are neighbors.
  const r0=f.nj.rounds[0];assert.equal(r0.ties,false);assert.equal(r0.mins.length,2);
  r0.mins.forEach(p=>{assert(E.isCherry(f.tree,p[0],p[1]));assert.notDeepEqual(plain(p),plain(mp.pair));});
  assert(E.isCherry(f.tree,r0.a,r0.b),'discounted chart picks true neighbors');
  [r0.li,r0.lj,r0.delta,...r0.total,...r0.merged].forEach(x=>assert(whole(x)));
  assert(E.sameMatrix(E.leafDist(f.nj.tree),f.D));
 }
});

test('property 6: level 9 neighbor joining reproduces the exact chart and no round has a tie',()=>{
 for(let i=0;i<CODES;i++){
  const j=E.makeJoin5(key(i,9));
  assert.equal(j.nj.ties,false);j.nj.rounds.forEach(r=>assert.equal(r.ties,false));
  assert(E.sameMatrix(E.leafDist(j.nj.tree),j.D));
  const r0=j.nj.rounds[0];[r0.li,r0.lj,...r0.merged].forEach(x=>assert(whole(x)));
  // and it still returns a cave on level 6's lying chart
  const v=E.makeViruses(key(i,6)),lie=E.nj(v.D6);assert.equal(lie.tree.edges.length,5);
 }
});

test('property 7: level 10 start is one interchange from the true shape; exactly one swap reaches the top foursome score',()=>{
 for(let i=0;i<CODES;i++){
  const w=E.makeSwap(key(i,10));
  assert(!E.sameShape(w.start,w.tree));
  const opts=E.nniOptions(w.start);assert.equal(opts.length,6);
  assert.equal(opts.filter(o=>E.sameShape(o.tree,w.tree)).length,1);
  const scores=opts.map(o=>E.quartetScore(o.tree,w.D));
  assert.equal(scores.filter(s=>s===w.max).length,1);assert.equal(w.max,15);
  assert(w.score<w.max);assert.equal(E.quartetScore(w.tree,w.D),15);
 }
});

test('level 11 illustrative chart: neighbor joining puts the civet virus on the junction where the human pair hangs',()=>{
 const r=E.nj(E.SARS.D);assert.equal(r.ties,false);assert(E.sameMatrix(E.leafDist(r.tree),E.SARS.D));
 assert(E.sameShape(r.tree,E.SARS.tree));assert(E.isCherry(E.SARS.tree,0,1));
});

test('Rosalind BA7A: distances between leaves',()=>{
 const t=E.parseAdjacency('0->4:11 1->4:2 2->5:6 3->5:7 4->0:11 4->1:2 4->5:4 5->4:4 5->3:7 5->2:6'.split(' '),4);
 assert.deepEqual(plain(E.leafDist(t)),parseMatrix('0 13 21 22\n13 0 12 13\n21 12 0 13\n22 13 13 0'));
});
test('Rosalind BA7B: limb length',()=>{
 assert.equal(E.limbLength(parseMatrix('0 13 21 22\n13 0 12 13\n21 12 0 13\n22 13 13 0'),1),2);
});
test('Rosalind BA7C: additive phylogeny',()=>{
 const D=parseMatrix('0 13 21 22\n13 0 12 13\n21 12 0 13\n22 13 13 0'),t=E.additivePhylogeny(D);
 const want=E.parseAdjacency('0->4:11 1->4:2 2->5:6 3->5:7 4->0:11 4->1:2 4->5:4 5->4:4 5->3:7 5->2:6'.split(' '),4);
 assert.deepEqual(plain(E.adjacencyList(t).sort()),plain(E.adjacencyList(want).sort()));
});
test('Rosalind BA7D: UPGMA',()=>{
 const D=parseMatrix('0 20 17 11\n20 0 20 13\n17 20 0 10\n11 13 10 0'),u=E.upgma(D);
 const want=E.parseAdjacency(['0->5:7.000','1->6:8.833','2->4:5.000','3->4:5.000','4->5:2.000','5->6:1.833'],4);
 assert(close(E.leafDist(u.tree),E.leafDist(want)));
 assert.deepEqual(plain(u.tree.edges.map(e=>+e.w.toFixed(3)).sort((a,b)=>a-b)),plain(want.edges.map(e=>e.w).sort((a,b)=>a-b)));
});
test('Rosalind BA7E: neighbor joining',()=>{
 const D=parseMatrix('0 23 27 20\n23 0 30 28\n27 30 0 30\n20 28 30 0'),r=E.nj(D);
 const want=E.parseAdjacency(['0->4:8.000','1->5:13.500','2->5:16.500','3->4:12.000','4->5:2.000'],4);
 assert(close(E.leafDist(r.tree),E.leafDist(want)));
 assert.deepEqual(plain(r.tree.edges.map(e=>e.w).sort((a,b)=>a-b)),plain(want.edges.map(e=>e.w).sort((a,b)=>a-b)));
});
test('nearest neighbors of a tree (no Rosalind page): hand-built cases',()=>{
 // ((0,1),(2,3)) : inner tunnel 4-5. Its two neighbours are ((0,2),(1,3)) and ((0,3),(1,2)).
 const t={n:4,N:6,edges:[{a:0,b:4,w:1},{a:1,b:4,w:1},{a:4,b:5,w:1},{a:2,b:5,w:1},{a:3,b:5,w:1}]};
 const o=E.nniOptions(t);assert.equal(o.length,2);
 assert.deepEqual(plain(o.map(x=>[...E.splitsOf(x.tree)][0]).sort()),['1,2','1,3']);
 // six entrances, caterpillar 0,1 | 2 | 3 | 4,5: three inner tunnels, six neighbours, all different, none the original
 const c={n:6,N:10,edges:[{a:0,b:6,w:1},{a:1,b:6,w:1},{a:6,b:7,w:1},{a:2,b:7,w:1},{a:7,b:8,w:1},{a:3,b:8,w:1},{a:8,b:9,w:1},{a:4,b:9,w:1},{a:5,b:9,w:1}]};
 const six=E.nniOptions(c);assert.equal(six.length,6);
 const shapes=six.map(x=>[...E.splitsOf(x.tree)].sort().join('|'));assert.equal(new Set(shapes).size,6);
 assert(!shapes.includes([...E.splitsOf(c)].sort().join('|')));
 six.forEach(x=>assert.equal(x.tree.edges.length,9));
});
test('puzzles are reproducible from the code and vary with it',()=>{
 assert.deepEqual(plain(E.makeFast('A|8|0')),plain(E.makeFast('A|8|0')));
 assert.notDeepEqual(plain(E.makeSwap('A|10|0').D),plain(E.makeSwap('A|10|1').D));
 assert.notDeepEqual(plain(E.makeViruses('A|1|0').seqs),plain(E.makeViruses('B|1|0').seqs));
});
test('the interface script parses',()=>{
 const m=html.match(/<script id="ui">([\s\S]*?)<\/script>/);if(m)new vm.Script(m[1]);
});
