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
    location:{search,pathname:'/the-loom/'},URLSearchParams,
    localStorage:{getItem:()=>storage,setItem:(k,v)=>{writes.push(v);storage=v;}},
    setTimeout:()=>1,clearTimeout(){},matchMedia:()=>({matches:true}),Blob:function(){},URL:{createObjectURL:()=>'',revokeObjectURL(){}},MouseEvent:function(){}};
  vm.createContext(context);
  for(const [,code] of html.matchAll(/<script id="(?:engine|ui)">([\s\S]*?)<\/script>/g))vm.runInContext(code,context);
  return {api:context.window.__tl,el,writes,persisted:()=>JSON.parse(storage),ctx:context};
}
const E=boot('?debug=1&seed=X').ctx;   // engine functions live in the same context
/* Solve the current level the way a student's hand would, through the debug handle. */
function solve(api,id){
  const c=()=>api.state(),x=c().inst,st=()=>c().st;
  if(id===1){
    x.short.reads.forEach(r=>api.act('start',{i:r.pos}));api.skip();
    api.act('start',{i:x.long.reads[0].pos});api.skip();
  }else if(id===2){
    for(let j=0;j<x.rows.length;j++)api.drop('strip',st().order.indexOf(j),'strip',j);
    st().order.forEach((r,slot)=>api.input('num',x.rows[r].start,{i:slot}));
    st().order.forEach((r,slot)=>{if(x.rows[r].text.startsWith(x.pattern))api.act('find',{i:slot});});
  }else if(id===3){
    api.input('len',9);api.act('shelf',{k:'A'});api.act('shelf',{k:'B'});api.skip();api.act('col',{c:x.rows.length-1});api.act('shelf',{k:'C'});
  }else if(id===4){
    const want=x.ring.map((s,i)=>i).sort((a,b)=>x.ring[a]<x.ring[b]?-1:1);
    want.forEach((ri,j)=>api.drop('strip',st().order.indexOf(ri),'strip',j));
    api.input('lastcol',x.L);
  }else if(id===5){
    const n=x.text.length;x.rows.forEach((r,i)=>api.drop('peg',i,'lpeg',x.rows.findIndex(q=>q.start===(r.start+n-1)%n)));
  }else if(id===6){
    const used=[];for(let k=0;k<x.F.length;k++){const r=[...x.L].findIndex((ch,i)=>ch===x.F[k]&&!used.includes(i));used.push(r);api.act('put',{i:r});}
    const lf=E.lastToFirst(x.L);[...x.L].forEach((ch,r)=>api.drop('peg',r,'lpeg',lf[r]));
    let row=0;while(x.L[row]!=='$'){api.act('land',{i:lf[row]});row=lf[row];}
  }else if(id===7){
    const lf=E.lastToFirst(x.L);
    while(st().phase!=='done'){
      const s=st(),sym=x.pattern[s.j],kept=[];for(let r=s.band[0];r<=s.band[1];r++)if(x.L[r]===sym)kept.push(r);
      kept.forEach(r=>api.act('keep',{i:r}));const land=kept.map(r=>lf[r]);
      api.act('finger',{i:Math.min(...land)});api.act('finger',{i:Math.max(...land)});
    }
    api.skip();
  }else if(id===8){
    const lf=E.lastToFirst(x.L);let guard=0;
    while(st().phase!=='done'&&guard++<200){const s=st();if(s.phase==='walk')api.act('land',{i:lf[s.row]});else api.input('pos',x.labels[s.row]+s.steps);}
  }else if(id===9){
    for(let r=0;r<x.top;r++)if(x.L[r]===x.sym)api.act('cell',{i:r});
    const B=x.bottom+1,b=B-B%4;api.act('board',{i:b});
    for(let r=b;r<B;r++)if(x.L[r]===x.sym)api.act('cell',{i:r});
    api.input('vt',x.band[0]);api.input('vb',x.band[1]);
  }else if(id===10){
    api.act('whole');api.act('cut');
    x.hits.forEach(h=>api.act(E.mismatches(x.text.slice(h.start,h.start+8),x.read)<=1?'fit':'no',{s:h.start}));
  }else if(id===11){api.act('col',{i:x.v});}
}

test('a fresh save plays every level and ends with every term earned, in order, with completions logged',()=>{
  const ui=boot('?debug=1&seed=PROG');
  const levels=ui.api.levels();assert(levels.length<=12);assert.equal(levels.length,11);
  const vocab=ui.api.vocab();assert(vocab.length<=21);assert.equal(vocab.length,11);
  for(const L of levels){
    assert.equal(ui.api.state().L.id,L.id,'level '+L.id+' loaded');
    solve(ui.api,L.id);
    assert(ui.api.state().done,'level '+L.id+' complete');
    if(L.id<levels.length){assert.match(ui.el('#panel').innerHTML,/id="next"/);ui.api.loadLevel(L.id+1);}
  }
  assert.deepEqual(JSON.parse(JSON.stringify(ui.api.earned())),['mapping','sa','end','bwt','rot','fl','lf','bs','psa','ckpt','seed']);
  assert.equal(ui.el('#gcount').textContent,'11 of 11 terms');
  const done=ui.api.log().filter(e=>e.ev==='complete').map(e=>e.lvl);
  assert.deepEqual(JSON.parse(JSON.stringify([...new Set(done)])),JSON.parse(JSON.stringify(levels.map(l=>l.id))));
  const saved=ui.persisted();assert.equal(saved.unlocked,11);assert.deepEqual(saved.done,Array.from(ui.api.levels(),l=>l.id));assert.equal(saved.badges.length,11);
});
test('many puzzle codes: every level can be finished the way the student plays it',()=>{
  for(let k=0;k<25;k++){
    const ui=boot('?debug=1&seed=MANY'+k);
    for(let id=1;id<=11;id++){ui.api.loadLevel(id);solve(ui.api,id);assert(ui.api.state().done,'code '+k+' level '+id);}
    assert.equal(ui.api.earned().length,11);
  }
});
test('?level=N never reads or writes saved progress',()=>{
  const saved={seed:'KEEP',unlocked:3,badges:['mapping','sa'],earnedAt:{mapping:1,sa:2},variants:{},log:[]};
  for(const n of [1,5,11]){
    const ui=boot('?debug=1&level='+n+'&seed=KEEP',saved);
    assert.equal(ui.api.state().L.id,n);assert.equal(ui.api.earned().length,0);
    solve(ui.api,n);assert(ui.api.state().done);
    assert.equal(ui.writes.length,0);assert.deepEqual(ui.persisted(),saved);
  }
  const normal=boot('?debug=1',saved);assert.equal(normal.api.state().L.id,3);assert.deepEqual(JSON.parse(JSON.stringify(normal.api.earned())),['mapping','sa']);
});
test('level 1: a wrong start costs comparisons and places nothing',()=>{
  const ui=boot('?debug=1&level=1&seed=T1'),x=ui.api.state().inst,r=x.short.reads[0];
  const wrong=[...Array(37).keys()].find(i=>i!==r.pos&&x.short.text[i]!==r.read[0]);
  ui.api.act('start',{i:wrong});const st=ui.api.state().st;
  assert.equal(st.placed.length,0);assert.equal(st.comps,1);assert.match(ui.api.state().msg.text,/does not start/);
});
test('level 3: both ways of keeping the sorted list overflow the shelf for a genome; only then is the handover offered',()=>{
  const ui=boot('?debug=1&level=3&seed=T3'),api=ui.api;
  api.input('len',9);assert.equal(ui.el('#skip').hidden,true);
  api.act('shelf',{k:'A'});api.act('shelf',{k:'B'});
  const t=api.state().st.tried;assert(t.A.over&&t.B.over);assert(t.A.ratio>1e9);assert.equal(Math.round(t.B.ratio),16);
  assert.equal(ui.el('#skip').hidden,false);
  api.act('shelf',{k:'C'});assert.equal(api.state().done,false);   // locked until the handover and the run meter
});
test('level 5: a thread between two different letters of the word will not hold',()=>{
  const ui=boot('?debug=1&level=5&seed=T5'),api=ui.api,x=api.state().inst,n=x.text.length;
  const r=0,good=x.rows.findIndex(q=>q.start===(x.rows[0].start+n-1)%n),bad=(good+1)%n;
  api.drop('peg',r,'lpeg',bad);assert.equal(Object.keys(api.state().st.tied).length,0);assert.match(api.state().msg.text,/will not hold/);
});
test('level 6: the left beam fills only in alphabetical order, and a crossing thread is refused until one is cut',()=>{
  const ui=boot('?debug=1&level=6&seed=T6'),api=ui.api,x=api.state().inst,L=x.L,F=x.F;
  const notFirst=[...L].findIndex(c=>c!==F[0]);api.act('put',{i:notFirst});assert.equal(api.state().st.left.length,0);assert.match(api.state().msg.text,/strips were sorted/);
  const used=[];for(let k=0;k<F.length;k++){const r=[...L].findIndex((ch,i)=>ch===F[k]&&!used.includes(i));used.push(r);api.act('put',{i:r});}
  assert.equal(api.state().st.phase,'tie');
  // a letter that appears at least twice: tie its first right-beam copy to its second left-beam slot
  const c=[...new Set(L)].find(ch=>L.split(ch).length>2),rs=[...L].map((ch,i)=>ch===c?i:-1).filter(i=>i>=0),ls=[...F].map((ch,i)=>ch===c?i:-1).filter(i=>i>=0);
  api.drop('peg',rs[0],'lpeg',ls[1]);assert.equal(api.state().st.tied[rs[0]],ls[1]);
  api.drop('peg',rs[1],'lpeg',ls[0]);assert.equal(api.state().st.tied[rs[1]],undefined);assert.match(api.state().msg.text,/never cross/);
  api.act('cut',{i:rs[0]});assert.equal(api.state().st.tied[rs[0]],undefined);
  api.drop('peg',rs[1],'lpeg',ls[0]);assert.equal(api.state().st.tied[rs[1]],ls[0]);
  // out of order, the first copy is now stuck: its own slot would cross, the other slot is taken
  api.drop('peg',rs[0],'lpeg',ls[1]);assert.equal(api.state().st.tied[rs[0]],undefined);
});
test('level 7: a finger only stays where a kept thread lands',()=>{
  const ui=boot('?debug=1&level=7&seed=T7'),api=ui.api,x=api.state().inst,lf=E.lastToFirst(x.L);
  const sym=x.pattern[x.pattern.length-1],kept=[...x.L].map((c,i)=>c===sym?i:-1).filter(i=>i>=0);
  const off=[...x.L].findIndex(c=>c!==sym);api.act('keep',{i:off});assert.equal(api.state().st.kept.length,0);
  kept.forEach(r=>api.act('keep',{i:r}));assert.equal(api.state().st.phase,'land');
  const land=kept.map(r=>lf[r]),wrong=[...Array(x.L.length).keys()].find(i=>!land.includes(i));
  api.act('finger',{i:wrong});assert.equal(api.state().st.newTop,null);
  api.act('finger',{i:Math.max(...land)});assert.equal(api.state().st.newTop,land.length>1?null:Math.max(...land));
});
test('level 10: the whole read finds nothing, and the decoy hit cannot be accepted',()=>{
  const ui=boot('?debug=1&level=10&seed=T10'),api=ui.api,x=api.state().inst;
  api.act('whole');assert.equal(api.state().st.phase,'cut');api.act('cut');
  const decoy=x.hits.find(h=>h.start!==x.at);api.act('fit',{s:decoy.start});
  assert.equal(api.state().st.judged[decoy.start],undefined);assert.match(api.state().msg.text,/letters differ/);
});
test('plural of match and the level 11 brief agree with the screen',()=>{
  const ui=boot('?debug=1&level=7&seed=PL');solve(ui.api,7);assert.doesNotMatch(ui.el('#stage').innerHTML,/matchs/);
  const u11=boot('?debug=1&level=11&seed=PL');assert.equal(u11.api.state().inst.reads.length,8);assert.match(u11.el('#brief').innerHTML,/^Eight reads/);
});
test('level 11: the single misread column is not the answer',()=>{
  const ui=boot('?debug=1&level=11&seed=T11'),api=ui.api,x=api.state().inst;
  api.act('col',{i:x.err});assert.equal(api.state().done,false);assert.match(api.state().msg.text,/Only one/);
  api.act('col',{i:x.v});assert(api.state().done);
});
test('undo and restart rebuild the screen from the level state',()=>{
  const ui=boot('?debug=1&level=5&seed=TU'),api=ui.api,x=api.state().inst,n=x.text.length;
  api.drop('peg',0,'lpeg',x.rows.findIndex(q=>q.start===(x.rows[0].start+n-1)%n));
  assert.equal(Object.keys(api.state().st.tied).length,1);ui.el('#undo').click();assert.equal(Object.keys(api.state().st.tied).length,0);
});
