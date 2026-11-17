const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
/* Load both scripts into a vm with a small fake DOM, so the real file is what gets tested. */
function boot(search,saved){
  const elements=new Map(),writes=[];
  const el=key=>{if(!elements.has(key))elements.set(key,{innerHTML:'',textContent:'',value:'',hidden:false,disabled:false,className:'',dataset:{},style:{},open:false,
    classList:{add(){},remove(){},toggle(){},contains(){return false;}},setAttribute(){},focus(){},click(){this.onclick&&this.onclick();}});return elements.get(key);};
  let storage=saved===undefined?null:JSON.stringify(saved);
  const context={document:{querySelector:el,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){},activeElement:null,title:'',
      createElement:()=>({click(){},remove(){}}),body:{appendChild(){}},elementFromPoint:()=>null},window:{},
    location:{search,pathname:'/long-distance/'},URLSearchParams,
    localStorage:{getItem:()=>storage,setItem:(k,v)=>{writes.push(v);storage=v;}},
    setTimeout:()=>1,clearTimeout(){},matchMedia:()=>({matches:true}),Blob:function(){},URL:{createObjectURL:()=>'',revokeObjectURL(){}},MouseEvent:function(){}};
  vm.createContext(context);
  for(const [,code] of html.matchAll(/<script id="(?:engine|ui)">([\s\S]*?)<\/script>/g))vm.runInContext(code,context);
  return {api:context.window.__ld,el,writes,persisted:()=>JSON.parse(storage),ctx:context};
}
const E=boot('?debug=1&seed=X').ctx;   // engine functions live in the same context
const plain=x=>JSON.parse(JSON.stringify(x));
/* Solve the current level the way a student's hand would, through the debug handle. */
function solve(api,id){
  const c=()=>api.state(),x=c().inst;
  const plateOf=w=>{for(let b=0;b<x.boards.length;b++){const i=x.boards[b].labels.indexOf(w);if(i>=0)return {b,i};}throw new Error('no plate '+w);};
  if(id===1){
    x.known.forEach((k,s)=>{if(k.on)api.act('at',{s,i:k.at});});
    x.unknown.forEach((k,u)=>api.act('guess',{u,v:k.on?'on':'off'}));
  }else if(id===2){
    for(let r=0;r<3;r++)api.act('round');api.act('bigger');for(let r=0;r<3;r++)api.act('round');
    api.skip();api.act('peek',{i:5});api.act('cut');
  }else if(id===3){
    x.boards.forEach((b,i)=>{if(b.on)api.act('plug',{b:i,i:b.at});});
    api.act('plate',plateOf('GATA'));api.act('run');
  }else if(id===4){
    api.act('plate',plateOf('CTCC'));api.act('want');api.act('val',{v:-1});api.act('run');
  }else if(id===5){
    const s=E.soft(x.A.labels,x.want);s.pull.forEach((p,i)=>api.input('pull',p,{i}));api.input('sum',s.tot);
    api.input('out','24/32',{k:'A'});api.input('out','0.5',{k:'B'});api.input('out','1/2',{k:'C'});
  }else if(id===6){
    api.act('plate',plateOf('TATA'));api.act('run');api.skip();api.act('dist',{d:1});api.act('run');
  }else if(id===7){
    api.act('plate',plateOf('TATA'));api.act('dist',{q:0,d:1});api.act('addq');api.act('plate',plateOf('GATA'));api.act('rule',{r:'both'});api.act('run');
  }else if(id===8){
    api.act('arm',{f:'who'});api.act('plate',plateOf('GATA'));api.act('arm',{f:'want'});api.act('plate',plateOf('CAGC'));api.act('dist',{d:1});
    api.act('arm',{f:'r2'});api.act('plate',plateOf('GATA'));api.act('riv');api.act('run');
  }else if(id===9){
    api.act('src',{b:0,i:x.boards[0].src});api.act('src',{b:1,i:x.boards[1].src});api.skip();
  }else if(id===10){
    const v=x.vars.findIndex(q=>q.kind==='partner');api.act('apply',{v});api.act('blame',{v});api.act('scan');
  }
}
const ORDER=['enhancer','field','token','attention','query','key','value','weight','softmax','posenc','head','layer','embedding','transformer','mlm','param','ism'];

test('a fresh save plays every level and ends with every term earned, in order, with completions logged',()=>{
  const ui=boot('?debug=1&seed=PROG');
  const levels=ui.api.levels();assert.equal(levels.length,10);
  const vocab=ui.api.vocab();assert(vocab.length<=21);assert.equal(vocab.length,17);
  for(const L of levels){
    assert.equal(ui.api.state().L.id,L.id,'level '+L.id+' loaded');
    solve(ui.api,L.id);
    assert(ui.api.state().done,'level '+L.id+' complete: '+ui.api.state().msg.text);
    if(L.id<levels.length){assert.match(ui.el('#panel').innerHTML,/id="next"/);ui.api.loadLevel(L.id+1);}
  }
  assert.deepEqual(plain(ui.api.earned()),ORDER);
  assert.equal(ui.el('#gcount').textContent,'17 of 17 terms');
  assert.deepEqual(plain(ui.api.log().filter(e=>e.ev==='complete').map(e=>e.lvl)),[1,2,3,4,5,6,7,8,9,10]);
  assert.deepEqual(plain(ui.persisted().done),[1,2,3,4,5,6,7,8,9,10]);
});
test('?level=N opens a practice session that never reads or writes saved progress',()=>{
  const saved={seed:'KEEP',unlocked:2,done:[1],badges:['enhancer'],earnedAt:{enhancer:1},variants:{},log:[]};
  const ui=boot('?debug=1&level=4&seed=PRAC',saved);
  assert.equal(ui.api.state().L.id,4);assert.equal(ui.api.saved().seed,'PRAC');
  solve(ui.api,4);assert(ui.api.state().done);
  assert.equal(ui.writes.length,0);assert.deepEqual(ui.persisted(),saved);
});
test('level 2: three rounds never reach the gene on the real strand, and giving up is the way on',()=>{
  const api=boot('?debug=1&level=2&seed=WALL').api;
  for(let r=0;r<3;r++)api.act('round');api.act('bigger');
  for(let r=0;r<6;r++)api.act('round');
  assert.equal(api.state().st.r,3);assert.equal(api.state().st.phase,'big');assert.match(api.state().msg.text,/short of the gene/);
  api.skip();assert.equal(api.state().st.phase,'window');assert.equal(api.state().done,false);
});
test('level 3: a slip that names a position fails, whatever the position',()=>{
  const api=boot('?debug=1&level=3&seed=POS').api,x=api.state().inst;
  x.boards.forEach((b,i)=>{if(b.on)api.act('plug',{b:i,i:b.at});});
  api.act('kind',{k:'pos'});
  for(let k=0;k<12;k++){api.act('run');assert.equal(api.state().done,false,'k='+api.state().st.slip.k);api.act('k',{d:k<3?-1:1});}
  api.act('plate',{b:1,i:0});api.act('run');assert.equal(api.state().done,false);
});
test('level 4: asking for GATA alone, or giving CTCC anything but -1, leaves a lamp wrong',()=>{
  const api=boot('?debug=1&level=4&seed=VAL').api,x=api.state().inst;
  api.act('run');assert.equal(api.state().done,false);
  const b=x.boards.findIndex(q=>q.labels.includes('CTCC'));api.act('plate',{b,i:x.boards[b].labels.indexOf('CTCC')});api.act('want');
  for(const v of [1,0]){api.act('val',{v});api.act('run');assert.equal(api.state().done,false);assert.match(api.state().msg.text,/Predicted/);}
  api.act('val',{v:-1});api.act('run');assert(api.state().done);
});
test('level 5: wrong numbers are not accepted',()=>{
  const api=boot('?debug=1&level=5&seed=SOFT').api,x=api.state().inst;
  api.input('pull',3,{i:0});assert.equal(Object.keys(api.state().st.pulls).length,0);assert.match(api.state().msg.text,/double/);
  const s=E.soft(x.A.labels,x.want);s.pull.forEach((p,i)=>api.input('pull',p,{i}));api.input('sum',31);assert.equal(api.state().st.phase,'sum');
  api.input('sum',32);api.input('out','0.5',{k:'A'});assert.equal(api.state().st.phase,'A');api.input('out','0.75',{k:'A'});assert.equal(api.state().st.phase,'B');
});
test('level 6: no query separates the shuffled boards until position is written on the plates',()=>{
  const api=boot('?debug=1&level=6&seed=SHUF').api,x=api.state().inst;
  assert.deepEqual([...x.boards[0].labels].sort(),[...x.boards[1].labels].sort());assert.notEqual(x.boards[0].on,x.boards[1].on);
  for(let i=0;i<10;i++){api.act('plate',{b:0,i});api.act('run');assert.equal(api.state().done,false);assert.match(api.state().msg.text,/same ten plates/);}
  api.skip();api.act('plate',{b:0,i:9});api.act('run');assert.equal(api.state().done,false);
  api.act('dist',{d:1});api.act('dist',{d:1});api.act('run');assert.equal(api.state().done,false);
  api.act('dist',{d:-1});api.act('run');assert(api.state().done);
});
test('level 7: one query cannot predict the boards, and two need the rule "both"',()=>{
  const api=boot('?debug=1&level=7&seed=HEAD').api,x=api.state().inst;
  const at=w=>{const b=x.boards.findIndex(q=>q.labels.includes(w));return {b,i:x.boards[b].labels.indexOf(w)};};
  for(const w of ['TATA','GATA'])for(const d of [null,1]){api.loadLevel(7);api.act('plate',at(w));if(d)api.act('dist',{q:0,d});api.act('run');assert.equal(api.state().done,false,w+d);}
  api.loadLevel(7);api.act('plate',at('TATA'));api.act('dist',{q:0,d:1});api.act('addq');api.act('plate',at('GATA'));api.act('run');assert.equal(api.state().done,false);
  api.act('rule',{r:'both'});api.act('run');assert(api.state().done);
});
test('level 8: one round is not enough, and either partner may do the asking',()=>{
  const api=boot('?debug=1&level=8&seed=LAY').api,x=api.state().inst;
  const at=w=>{const b=x.boards.findIndex(q=>q.labels.includes(w));return {b,i:x.boards[b].labels.indexOf(w)};};
  assert.deepEqual([...x.boards[0].labels].sort(),[...x.boards[2].labels].sort());
  for(const w of ['GATA','CAGC']){api.loadLevel(8);api.act('arm',{f:'r2'});api.act('plate',at(w));api.act('run');assert.equal(api.state().done,false);}
  api.loadLevel(8);api.act('arm',{f:'who'});api.act('plate',at('CAGC'));api.act('arm',{f:'want'});api.act('plate',at('GATA'));
  api.act('arm',{f:'r2'});api.act('plate',at('CAGC'));api.act('riv');api.act('run');assert.equal(api.state().done,false,'distance still any');
  api.act('dist',{d:1});api.act('run');assert(api.state().done);
});
test('level 9: a wrong jack does not lift the cover, and giving up is right only on the last board',()=>{
  const api=boot('?debug=1&level=9&seed=MASK').api,x=api.state().inst;
  api.skip();assert.equal(api.state().st.b,0);assert.match(api.state().msg.text,/occurs twice/);
  const wrong=[...Array(10).keys()].find(i=>i!==x.boards[0].src&&i!==x.boards[0].cover);
  api.act('src',{b:0,i:wrong});assert.equal(api.state().st.b,0);
  api.act('src',{b:0,i:x.boards[0].src});api.act('src',{b:1,i:x.boards[1].src});assert.equal(api.state().st.b,2);
  for(let i=0;i<10;i++)if(i!==x.boards[2].cover)api.act('src',{b:2,i});
  assert.equal(api.state().done,false);api.skip();assert(api.state().done);
});
test('level 10: the variant inside a GATA is not the one, and the last terms wait for the other levels',()=>{
  const api=boot('?debug=1&level=10&seed=VAR').api,x=api.state().inst;
  x.vars.forEach((q,v)=>{if(q.kind!=='partner'){api.act('apply',{v});api.act('blame',{v});assert.equal(api.state().st.phase,'test');api.act('apply',{v});}});
  solve(api,10);assert(api.state().done);assert.deepEqual(plain(api.earned()),['ism']);
});
test('undo rebuilds the screen from the level state',()=>{
  const ui=boot('?debug=1&level=1&seed=TU'),api=ui.api,x=api.state().inst,s=x.known.findIndex(k=>k.on);
  api.act('at',{s,i:x.known[s].at});assert.equal(Object.keys(api.state().st.found).length,1);ui.el('#undo').click();assert.equal(Object.keys(api.state().st.found).length,0);
});

/* Every first-load code: a new browser draws one of these, so each is played through every level. */
test('every first-load code plays every level without a fallback puzzle',()=>{
  const codes=boot('?debug=1&seed=X').api.codes();assert.equal(codes.length,50);assert.equal(new Set(codes).size,50);
  for(const code of codes){
    const ui=boot('?debug=1&seed='+code);
    for(let id=1;id<=10;id++){ui.api.loadLevel(id);solve(ui.api,id);assert(ui.api.state().done,code+' level '+id+' completes');}
    assert.equal(ui.api.earned().length,ui.api.vocab().length,code+' earns every term');assert.equal(ui.api.fell(),0,code+' needs no fallback');
  }
});
