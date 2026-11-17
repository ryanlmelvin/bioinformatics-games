const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const engine=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const sandbox={module:{exports:{}}};vm.runInNewContext(engine,sandbox);
const X=sandbox.module.exports;
const plain=x=>JSON.parse(JSON.stringify(x));
const CODES=Array.from({length:500},(_,i)=>'CODE-'+i);
const close=(a,b,rel=1e-6)=>assert(Math.abs(a-b)<=rel*Math.abs(b),a+' vs '+b);

test('seven, seven, other ledger agrees with direct fair-dice probabilities',()=>{
  assert.deepEqual(plain(X.sumLedger('SSO')),[[1,6],[9,114],[705,0]]);
  assert.deepEqual(plain(X.nightProbability('SSO')),{num:705,den:6912});
  close(705/6912,X.forwardProbability('SSO',X.PARLOUR));
});
test('every twelve-call ledger agrees with exact integer arithmetic',()=>{
  for(let mask=0;mask<4096;mask++){
    const calls=Array.from({length:12},(_,i)=>mask&(1<<i)?'S':'O');
    let f=0n,l=0n;
    const exact=calls.map((c,t)=>{
      const ef=c==='S'?1n:5n,el=c==='S'?6n:0n;
      [f,l]=t?[(3n*f+l)*ef,(f+3n*l)*el]:[ef,el];
      return [f,l];
    });
    X.sumLedger(calls).forEach((col,t)=>col.forEach((v,k)=>{
      assert(Number.isSafeInteger(v));assert.equal(BigInt(v),exact[t][k]);
    }));
    const p=X.nightProbability(calls);
    assert.equal(BigInt(p.num),f+l);
    assert.equal(BigInt(p.den),2n*6n**12n*4n**11n);
  }
});
test('fair dice have six seven outcomes; loaded pairs can never emit other',()=>{
  assert.equal(X.DICE_OUTCOMES.S.length,6);assert.equal(X.DICE_OUTCOMES.O.length,30);
  assert.equal(new Set([...X.DICE_OUTCOMES.S,...X.DICE_OUTCOMES.O].map(p=>p.join(','))).size,36);
  for(const code of CODES){
    const n=X.nightFor(code);assert(n.truth.every((k,i)=>k===0||n.calls[i]==='S'));
    assert.deepEqual(plain(X.ODDS),{start:[1,1],startOf:2,emit:[{S:1,O:5},{S:6,O:0}],emitOf:6,keep:3,swap:1,stepOf:4});
    const r=X.rng(X.hashStr(code));for(const c of ['S','O'])for(let i=0;i<24;i++){
      const p=X.diceFor(c,r);assert(p.every(x=>Number.isInteger(x)&&x>=1&&x<=6));assert.equal(p[0]+p[1]===7,c==='S');
    }
    const p=X.nightProbability(n.calls);close(p.num/p.den,X.forwardProbability(n.calls,X.PARLOUR));
  }
});

test('the ledger total equals the sum over every story (brute force), for every designed night',()=>{
  for(const n of [...X.NIGHTS.map(o=>o.calls),...X.VNIGHTS]){
    const bf=X.bruteForce(n),last=X.sumLedger(n).at(-1);
    assert.equal(bf.total,last[0]+last[1]);
    assert.equal(X.bestStory(n).value,bf.best);
  }
});

test('property 2: level 3 night, the bookkeeper belief crosses one half at least twice (500 codes)',()=>{
  for(const code of CODES){const n=X.nightFor(code);assert.equal(n.calls.length,12);assert.equal(n.truth.length,12);assert(X.crossings(n.calls)>=2,code);}
});

test('property 3: level 6 by-hand entries (first three columns) are whole numbers below 2000 (500 codes)',()=>{
  for(const code of CODES){
    const cols=X.sumLedger(X.nightFor(code).calls).slice(0,3);
    for(const c of cols)for(const v of c){assert(Number.isInteger(v));assert(v>=0&&v<2000);}
  }
});

test('property 4: level 7 most likely story is unique and differs from the round-by-round likelier pair (500 codes)',()=>{
  for(const code of CODES){
    const calls=X.vnightFor(code),b=X.bestStory(calls),L=X.likelierPairs(calls),bl=X.bestLedger(calls);
    assert(b.unique);assert(!L.includes(-1));
    assert(b.story.some((k,i)=>k!==L[i]),code);
    // every arrow the student clicks has one right answer, and the typed columns stay small
    for(const f of bl.from.slice(1))assert(!f.includes(-1));
    for(const c of bl.cols.slice(0,3))for(const v of c)assert(Number.isInteger(v)&&v<2000);
    // unique by brute force too
    const all=[];for(let m=0;m<64;m++){const s=Array.from({length:6},(_,i)=>(m>>(5-i))&1);all.push(X.storyChances(s,calls).both);}
    assert.equal(all.filter(v=>v===b.value).length,1);
  }
});

test('property 5: levels 8-10 family: five members, 8-10 columns, exactly one column fails the default; scores as designed (500 codes)',()=>{
  for(const code of CODES){
    const f=X.makeFamily(code);
    assert.equal(f.aln.length,5);assert(f.n>=8&&f.n<=10);f.aln.forEach(r=>assert.equal(r.length,f.n));
    const fails=X.roomsOf(f.aln,X.DEFAULT_GAPS).filter(x=>!x).length;assert.equal(fails,1);
    const s=X.familyScores(f);
    assert(s.str>0);assert(s.rel>=100*s.str,'relative x100 stranger '+code);
    assert.equal(s.sec0,0,'second relative zero without pseudocounts '+code);
    assert(s.sec1>s.str1,'second relative above stranger with pseudocounts '+code);
    // the reason for zero: one room never heard one of its letters
    assert(!f.aln.some(r=>r[f.slipCol]===f.unseen));
  }
});

test('seed reproducibility',()=>{
  assert.deepEqual(plain(X.makeFamily('SAME')),plain(X.makeFamily('SAME')));
  assert.deepEqual(plain(X.nightFor('SAME')),plain(X.nightFor('SAME')));
});

test('Rosalind BA10A: probability of a hidden path',()=>{
  const hmm={states:['A','B'],T:{A:{A:.194,B:.806},B:{A:.273,B:.727}},E:{}};
  close(X.pathProbability('AABBBAABABAAAABBBBAABBABABBBAABBAAAABABAABBABABBAB'.split(''),hmm),5.01732865318e-19,1e-9);
});
test('Rosalind BA10B: probability of an outcome given a hidden path',()=>{
  const hmm={states:['A','B'],E:{A:{x:.612,y:.314,z:.074},B:{x:.346,y:.317,z:.336}}};
  close(X.outcomeGivenPath('xxyzyxzzxzxyxyyzxxzzxxyyxxyxyzzxxyzyzxzxxyxyyzxxzx','BBBAAABABABBBBBBAAAAAABAAAABABABBBBBABAABABABABBBB',hmm),1.93157070893e-28,1e-9);
});
test('Rosalind BA10C: Viterbi',()=>{
  const hmm={states:['A','B'],T:{A:{A:.641,B:.359},B:{A:.729,B:.271}},E:{A:{x:.117,y:.691,z:.192},B:{x:.097,y:.42,z:.483}}};
  assert.equal(X.viterbi('xyxzzxyxyy',hmm),'AAABBAAAAA');
});
test('Rosalind BA10D: outcome likelihood',()=>{
  const hmm={states:['A','B'],T:{A:{A:.303,B:.697},B:{A:.831,B:.169}},E:{A:{x:.533,y:.065,z:.402},B:{x:.342,y:.334,z:.324}}};
  close(X.forwardProbability('xzyyzzyzyy',hmm),1.1005510319694847e-06,1e-9);
});
const r3=x=>Math.round(x*1000)/1000;
function table(P,which,cols){return plain(P.states.map(s=>cols.map(c=>r3(P[which][s][c]))));}
test('Rosalind BA10E: profile HMM',()=>{
  const aln=['EBA','EBD','EB-','EED','EBD','EBE','E-D','EBD'],al='ABCDE'.split('');
  const P=X.profileHMM(aln,{alphabet:al,isRoom:X.roomsByTheta(aln,0.289)});
  const T=table(P,'T',P.states);
  assert.deepEqual(plain(P.states),['S','I0','M1','D1','I1','M2','D2','I2','M3','D3','I3','E']);
  assert.deepEqual(T[0],[0,0,1,0,0,0,0,0,0,0,0,0]);
  assert.deepEqual(T[2],[0,0,0,0,0,.875,.125,0,0,0,0,0]);
  assert.deepEqual(T[5],[0,0,0,0,0,0,0,0,.857,.143,0,0]);
  assert.deepEqual(T[6],[0,0,0,0,0,0,0,0,1,0,0,0]);
  assert.deepEqual(T[8],[0,0,0,0,0,0,0,0,0,0,0,1]);
  assert.deepEqual(T[9],[0,0,0,0,0,0,0,0,0,0,0,1]);
  const Em=table(P,'E',al);
  assert.deepEqual(Em[2],[0,0,0,0,1]);assert.deepEqual(Em[5],[0,.857,0,0,.143]);assert.deepEqual(Em[8],[.143,0,0,.714,.143]);
  assert.equal(r3(Em.flat().reduce((a,b)=>a+b,0)),3);
});
test('Rosalind BA10F: profile HMM with pseudocounts',()=>{
  const aln=['ADA','ADA','AAA','ADC','-DA','D-A'],al='ABCDE'.split('');
  const P=X.profileHMM(aln,{alphabet:al,isRoom:X.roomsByTheta(aln,0.358),sigma:0.01});
  const T=table(P,'T',P.states),Em=table(P,'E',al);
  const want=[[0,.01,.819,.172,0,0,0,0,0,0,0,0],[0,.333,.333,.333,0,0,0,0,0,0,0,0],[0,0,0,0,.01,.786,.204,0,0,0,0,0],
    [0,0,0,0,.01,.981,.01,0,0,0,0,0],[0,0,0,0,.333,.333,.333,0,0,0,0,0],[0,0,0,0,0,0,0,.01,.981,.01,0,0],
    [0,0,0,0,0,0,0,.01,.981,.01,0,0],[0,0,0,0,0,0,0,.333,.333,.333,0,0],[0,0,0,0,0,0,0,0,0,0,.01,.99],
    [0,0,0,0,0,0,0,0,0,0,.5,.5],[0,0,0,0,0,0,0,0,0,0,.5,.5],[0,0,0,0,0,0,0,0,0,0,0,0]];
  assert.deepEqual(T,want);
  assert.deepEqual(Em[1],[.2,.2,.2,.2,.2]);assert.deepEqual(Em[2],[.771,.01,.01,.2,.01]);
  assert.deepEqual(Em[5],[.2,.01,.01,.771,.01]);assert.deepEqual(Em[8],[.803,.01,.168,.01,.01]);
  assert.deepEqual(Em[3],[0,0,0,0,0]);
});
test('a member walk through its own family is one the profile allows',()=>{
  for(const code of CODES.slice(0,50)){
    const f=X.makeFamily(code),P=X.profileHMM(f.aln,{maxGaps:X.DEFAULT_GAPS});
    for(const seq of f.aln){
      const w=X.memberWalk(seq,f.isRoom).map(s=>s.kind+s.room),text=seq.replace(/-/g,'');
      assert(X.walkProbability(text,w,P)>0);
      assert(X.profileBest(text,P).prob>=X.walkProbability(text,w,P)-1e-18);
    }
  }
});
new vm.Script(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1]);
