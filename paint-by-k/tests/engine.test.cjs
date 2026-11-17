const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const engine=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const sandbox={module:{exports:{}}};vm.runInNewContext(engine,sandbox);
const E=Object.assign({},sandbox.module.exports);
// each puzzle is generated once and shared by the tests that look at it
const memo=new Map(),rawMake=E.makeLevel;E.makeLevel=(code,n)=>{const k=code+'|'+n;if(!memo.has(k))memo.set(k,rawMake(code,n));return memo.get(k);};
const N=500,codes=Array.from({length:N},(_,i)=>'PROP'+i);
const whole=x=>Math.abs(x-Math.round(x))<1e-9;
const near=(a,b,eps)=>Math.abs(a-b)<=(eps||1e-9);

/* The properties each generated level must have. The property tests and the fallback tests share them. */
const DESIGNS={2:'tulip',3:'fish',4:'mushroom',5:'heart',6:'boat',7:'house'};
function checkPicture(pic,design){
 assert.equal(pic.design,design);assert.equal(pic.px.length,144);
 const regs=new Set(pic.region.filter(r=>r!=='x'));assert.equal(regs.size,3);
 pic.px.forEach((p,i)=>{
  assert(p.every(v=>Number.isInteger(v)&&v>=0&&v<=10));
  if(pic.region[i]!=='x'){const b=pic.base[pic.region[i]];assert(Math.abs(p[0]-b[0])<=1&&Math.abs(p[1]-b[1])<=1);}
 });
}
const check={
 1(C){
  check[8](C);
  const piles=C.deck.map(c=>c.group),o=E.otherSorting(C.deck,piles);
  const diff=piles.map((p,i)=>p!==o[i]?i:-1).filter(i=>i>=0);
  assert.deepEqual(diff.map(i=>C.deck[i].hybrid!==null),diff.map(()=>true));assert.equal(diff.length,2);
 },
 2(L){checkPicture(L.pic,DESIGNS[2]);assert.equal(L.pots.length,3);assert.equal(L.strip.length,8);},
 3(L){
  checkPicture(L.pic,DESIGNS[3]);
  assert.equal(L.ff.idx[0],0);assert.equal(L.decoys.length,2);
  assert(near(L.best,E.maxDistance(L.pic.px,L.ff.centers)));
  for(const d of L.decoys)assert(L.best<E.maxDistance(L.pic.px,d.centers)-1e-9);
 },
 4(L){
  checkPicture(L.pic,DESIGNS[4]);const D=L.pic.px;
  assert.equal(L.pic.region.filter(r=>r==='x').length,1);
  assert(L.ff.idx.slice(0,3).includes(L.stray));
  assert(E.distortion(D,L.ff.centers)>=1.5*L.good.err);
  // the student's target lies strictly between, and whole-number pots can reach it
  assert(L.target<L.fftErr&&E.distortion(D,L.good.centers.map(c=>c.map(Math.round)))<=L.target+1e-9);
  assert.equal(L.six.length,6);L.sq.forEach(v=>assert(Number.isInteger(v)));
 },
 5(L){
  checkPicture(L.pic,DESIGNS[5]);assert.equal(L.B.length,4);
  assert(L.meanA.every(whole)&&L.meanB.every(whole));
  assert(new Set(L.B.map(i=>L.pic.px[i].join())).size>=3);
 },
 6(L){
  checkPicture(L.pic,DESIGNS[6]);const R=E.lloyd(L.pic.px,L.start);
  assert(R.rounds<=6);
  const last=R.steps[R.steps.length-1];assert.equal(last.changed,false);
  const errs=R.steps.filter(s=>s.changed).map(s=>s.err);
  for(let i=1;i<errs.length;i++)assert(errs[i]<errs[i-1]-1e-9);
  assert(near(last.err,errs[errs.length-1]));
  // the pot averaged by hand has a whole-number average after the first repaint
  const lab=R.steps[0].labels,mine=L.pic.px.filter((_,i)=>lab[i]===L.handPot);
  assert(E.centroid(mine).every(whole));
 },
 7(L){
  checkPicture(L.pic,DESIGNS[7]);const D=L.pic.px;
  assert(E.dist(L.bad[0],L.bad[1])<=1.5,'two pots almost the same colour');
  const B=E.lloyd(D,L.bad),G=E.lloyd(D,E.farthestFirst(D,3,0).centers);
  assert(B.err>=1.3*G.err);
 },
 8(C){
  const R=E.lloyd(C.data,C.start.map(i=>C.data[i]));
  assert(R.rounds<=5);
  assert.equal(C.data.length,12);C.data.forEach(v=>{assert.equal(v.length,7);assert(v.every(x=>Number.isInteger(x)&&x>=0&&x<=10));});
  for(let g=0;g<3;g++){const piles=new Set(C.deck.map((c,i)=>c.group===g&&c.hybrid===null?R.labels[i]:-1).filter(x=>x>=0));assert.equal(piles.size,1);}
  const centers=C.start.map(i=>C.data[i]);
  for(const i of C.hand)for(const c of centers)assert(Number.isInteger(E.dist2(C.data[i],c)));
  const lab=E.assign(C.data,centers),mine=C.data.filter((_,i)=>lab[i]===C.coord.center);
  assert(whole(E.centroid(mine)[C.coord.hour]));assert.equal(E.centroid(mine)[C.coord.hour],C.coord.value);
 },
 9(L){
  const D=L.D;
  // independently: at each step the closest pair of groups is unique
  let groups=D.map((_,i)=>[i]);
  for(const m of L.merges){
   const ds=[];for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++)ds.push({i,j,d:E.groupDist(D,groups[i],groups[j])});
   ds.sort((a,b)=>a.d-b.d);assert(ds.length===1||ds[1].d-ds[0].d>1e-9);
   assert(near(ds[0].d,m.d));
   const merged=groups[ds[0].i].concat(groups[ds[0].j]);groups=groups.filter((_,k)=>k!==ds[0].i&&k!==ds[0].j).concat([merged]);
  }
  D.forEach((r,i)=>r.forEach((v,j)=>{assert(Number.isInteger(v));assert.equal(v,D[j][i]);}));
  assert.equal(L.cut.length,3);
 },
 10(L){assert.equal(L.data.length,24);assert(L.lloyd.rounds<=6);}
};
function withTries(opts,f){Object.assign(E.TRIES,opts);try{return f();}finally{E.TRIES.limit=null;E.TRIES.strict=false;}}

test('property 1: pictures are designed 12x12 pixel art with three ink regions, seeded jitter, whole inks 0..10',()=>{
 const levels={2:'tulip',3:'fish',4:'mushroom',5:'heart',6:'boat',7:'house'};
 const seen={};
 for(const code of codes)for(const [n,design] of Object.entries(levels)){
  const pic=E.makeLevel(code,+n).pic;checkPicture(pic,design);
  (seen[n]=seen[n]||new Set()).add(JSON.stringify(pic.px));
 }
 for(const n in seen)assert(seen[n].size>N*0.9,'jitter varies with the puzzle code');
 // the same code gives the same picture
 assert.deepEqual(JSON.stringify(E.makeLevel('X',3)),JSON.stringify(E.makeLevel('X',3)));
});

test('property 2: level 3 farthest-first pots beat both decoy placements on the worst pixel',()=>{
 for(const code of codes){
  check[3](E.makeLevel(code,3));
 }
});

test('property 3: level 4 farthest-first spends one of its first three pots on the stray, and ends 1.5x worse than the loop',()=>{
 for(const code of codes){
  check[4](E.makeLevel(code,4));
 }
});

test('property 4: level 6 loop settles within six rounds and the error falls at every half-step',()=>{
 for(const code of codes){
  check[6](E.makeLevel(code,6));
 }
});

test('property 5: level 7 bad start stops at least 1.3x worse than the level 3 start',()=>{
 for(const code of codes){
  check[7](E.makeLevel(code,7));
 }
});

test('property 6: level 8 cards form three groups, the loop settles in five rounds, hand work is whole numbers',()=>{
 for(const code of codes){
  const C=E.makeLevel(code,8);check[8](C);
  // level 1 and level 8 share the same cards
  assert.deepEqual(JSON.stringify(E.makeLevel(code,1).data),JSON.stringify(C.data));
 }
});

test('property 7: level 9 has no tied merge',()=>{
 for(const code of codes){
  check[9](E.makeLevel(code,9));
 }
});

test('level 10 genes: the loop from farthest-first pots recovers the three illustrative patterns',()=>{
 for(const code of codes.slice(0,200))check[10](E.makeLevel(code,10));
});

test('level 1: the second sorting differs from the student piles only on the two hybrid cards',()=>{
 for(const code of codes.slice(0,200)){
  check[1](E.makeLevel(code,1));
 }
});

test('every fallback key generates directly without running out of tries',()=>{
 assert.deepEqual(Object.keys(E.POOLS).sort(),['10','3','4','5','6','7','9','cards']);
 withTries({strict:true},()=>{
  for(const k of E.POOLS.cards){const C=E.GEN.cards(k);check[1](C);check[8](C);}
  for(const n of [3,4,5,6,7,9,10])for(const k of E.POOLS[n])check[n](E.GEN[n](k));
 });
});
test('a generator that runs out of tries returns a valid level from its pool',()=>{
 withTries({limit:0},()=>{
  for(let i=0;i<10;i++)for(let n=1;n<=10;n++)check[n](rawMake('NO-TRIES-'+i,n));
  // levels 1 and 8 still share their cards
  for(let i=0;i<10;i++)assert.deepEqual(JSON.stringify(rawMake('NO-TRIES-'+i,1)),JSON.stringify(rawMake('NO-TRIES-'+i,8)));
 });
 assert.equal(E.TRIES.limit,null);assert.equal(E.TRIES.strict,false);
});

/* ---------- Rosalind samples ---------- */
const pts=s=>s.trim().split('\n').map(l=>l.trim().split(/\s+/).map(Number));
test('BA8A farthest-first traversal sample',()=>{
 const D=pts('0.0 0.0\n5.0 5.0\n0.0 5.0\n1.0 1.0\n2.0 2.0\n3.0 3.0\n1.0 2.0');
 assert.deepEqual(JSON.parse(JSON.stringify(E.farthestFirst(D,3,0).centers)),[[0,0],[5,5],[0,5]]);
});
test('BA8B squared error distortion sample',()=>{
 const C=pts('2.31 4.55\n5.96 9.08'),D=pts('3.42 6.03\n6.23 8.25\n4.76 1.64\n4.47 4.33\n3.95 7.61\n8.93 2.97\n9.74 4.03\n1.73 1.28\n9.72 5.01\n7.27 3.77');
 assert.equal(E.distortion(D,C).toFixed(3),'18.246');
});
test('BA8C Lloyd algorithm sample',()=>{
 const D=pts('1.3 1.1\n1.3 0.2\n0.6 2.8\n3.0 3.2\n1.2 0.7\n1.4 1.6\n1.2 1.0\n1.2 1.1\n0.6 1.5\n1.8 2.6\n1.2 1.3\n1.2 1.0\n0.0 1.9');
 const R=E.lloyd(D,D.slice(0,2));
 assert.deepEqual(R.centers.map(c=>c.map(x=>x.toFixed(3)).join(' ')),['1.800 2.867','1.060 1.140']);
});
test('BA8E hierarchical clustering sample',()=>{
 const D=pts('0.00 0.74 0.85 0.54 0.83 0.92 0.89\n0.74 0.00 1.59 1.35 1.20 1.48 1.55\n0.85 1.59 0.00 0.63 1.13 0.69 0.73\n0.54 1.35 0.63 0.00 0.66 0.43 0.88\n0.83 1.20 1.13 0.66 0.00 0.72 0.55\n0.92 1.48 0.69 0.43 0.72 0.00 0.80\n0.89 1.55 0.73 0.88 0.55 0.80 0.00');
 const out=JSON.parse(JSON.stringify(E.hierarchical(D).map(m=>m.members.map(i=>i+1).join(' '))));
 assert.deepEqual(out,['4 6','5 7','3 4 6','1 2','5 7 3 4 6','1 2 5 7 3 4 6']);
});
test('instructor reading-guide examples: MaxDistance 4, Distortion 9, D_avg 12',()=>{
 assert.equal(E.maxDistance([[2,6],[4,9],[5,7],[6,5],[8,3]],[[4,5],[7,4]]),4);
 assert(near(E.distortion([[2,8],[2,5],[6,9],[7,5],[5,2]],[[3,5],[5,4]]),9));
 const D=[[0,20,9,11],[20,0,17,11],[9,17,0,8],[11,11,8,0]];
 assert.equal(E.groupDist(D,[0,1],[2,3]),12);
});
test('workbench parses pasted points and runs both methods',()=>{
 const P=E.parsePoints('0 0\n5,5\n\n0 5\n1 1\n--------\n2 2');
 assert.equal(P.length,5);const r=E.bench(P,2);
 assert.equal(r.ff.centers.length,2);assert(r.lloyd.steps.length>0);assert(Number.isFinite(r.lloyd.err));
});
