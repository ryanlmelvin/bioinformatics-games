const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function boot(saved=null,url={}){
 const elements=new Map(),events={},writes=[];
 const el=key=>{if(!elements.has(key))elements.set(key,{innerHTML:'',textContent:'',hidden:false,checked:false,disabled:false,value:'',dataset:{},attrs:{},
   style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k]||'';},focus(){},click(){this.onclick?.();}});return elements.get(key);};
 let storage=saved?JSON.stringify(saved):null;
 const context={document:{querySelector:el,addEventListener:(type,fn)=>events[type]=fn,title:''},window:{},
  location:{search:'?debug=1&seed=PROG',pathname:'/hollow-mountain/',...url},URLSearchParams,
  localStorage:{getItem:()=>storage,setItem:(key,value)=>{writes.push(value);storage=value;}},
  setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},requestAnimationFrame:()=>1,cancelAnimationFrame(){},
  performance:{now:()=>0},matchMedia:()=>({matches:true})};
 vm.createContext(context);
 for(const [,code] of html.matchAll(/<script id="(?:engine|ui)">([\s\S]*?)<\/script>/g))vm.runInContext(code,context);
 return {api:context.window.__hm,E:context,el,writes,persisted:()=>storage&&JSON.parse(storage)};
}
const st=ui=>ui.api.state();
const plain=x=>JSON.parse(JSON.stringify(x));
function fillHands(ui){for(let k=0;k<80;k++){const c=st(ui);const open=Object.keys(c.hand).find(id=>!c.hand[id].ok);if(!open||c.done)return;ui.api.act('in',{id:open,value:String(c.hand[open].want)});}}
function digAll(ui){const c=st(ui);for(let g=0;g<6&&c.next<c.n;g++){fillHands(ui);const at=ui.E.attachPoint(c.cave,c.D,c.next);
  ui.api.act('tunnel',{e:at.ei});ui.api.act('dig',{e:at.ei,x:at.off,from:at.from,L:at.L});}}
const PLAY={
 1(ui){const c=st(ui);for(const k of [0,1]){const [a,b]=c.v.hand[k];for(let col=0;col<12;col++)if(c.v.short[a][col]!==c.v.short[b][col])ui.api.act('col',{c:col});}
   ui.api.act('pick',{v:c.v.pairs.find(x=>x[0]===0)[1]});},
 2(ui){const c=st(ui);for(let a=0;a<4;a++)for(let b=a+1;b<4;b++){ui.api.act('node',{v:a});ui.api.act('node',{v:b});fillHands(ui);}fillHands(ui);},
 3(ui){const c=st(ui);const s=ui.E.makeStar(c.key.replace(/\|3\|/,'|3|'));// same key the level uses
   c.D.forEach((_,i)=>ui.api.act('in',{id:'y'+i,value:String(ui.E.limbLength(c.D,i))}));ui.api.act('walk');},
 4(ui){digAll(ui);ui.api.act('walk');},
 5(ui){digAll(ui);ui.api.act('walk');},
 6(ui){digAll(ui);ui.api.act('walk');ui.api.act('skip');fillHands(ui);},
 7(ui){const c=st(ui);for(let g=0;g<3&&!c.done;g++){const J=c.up.joins[c.j],i=c.cl.findIndex(x=>x.id===J.a),j=c.cl.findIndex(x=>x.id===J.b);ui.api.act('cell',{i,j});fillHands(ui);}},
 8(ui){const c=st(ui);ui.api.act('skip');ui.api.act('walk');fillHands(ui);const R=c.R,p=R.mins[0];ui.api.act('cell',{i:R.labels.indexOf(p[0]),j:R.labels.indexOf(p[1])});fillHands(ui);},
 9(ui){const c=st(ui);fillHands(ui);ui.api.act('cell',{i:c.R.i,j:c.R.j});fillHands(ui);ui.api.act('skip');},
 10(ui){const c=st(ui);const o=ui.E.nniOptions(c.t),idx=o.findIndex(x=>ui.E.quartetScore(x.tree,c.D)===15),pick=o[idx],k=o.filter(x=>x.edge===pick.edge).indexOf(pick);
   ui.api.act('tunnel',{e:pick.edge});ui.api.act('swap',{k});},
 11(ui){const c=st(ui);for(let g=0;g<6&&c.stage==='join';g++){const R=c.r.rounds[c.round];ui.api.act('cell',{i:R.i,j:R.j});}ui.api.act('node',{v:2});}
};

test('a fresh save plays every level and ends with every term earned, each completion in the move log',()=>{
 const ui=boot();assert.equal(st(ui).L.id,1);
 const n=ui.api.levels().length;assert(n<=12);assert(ui.api.vocab().length<=21);assert.equal(ui.api.vocab().length,17);
 for(let id=1;id<=n;id++){assert.equal(st(ui).L.id,id,'on level '+id);PLAY[id](ui);assert(st(ui).done,'level '+id+' completes');
  if(id<n)ui.api.act('next');}
 const earned=ui.api.earned();assert.deepEqual(plain(earned),plain(ui.api.vocab().map(v=>v.id)),'every term, in the listed order');
 const done=ui.api.log().filter(e=>e.ev==='complete').map(e=>e.lvl);assert.deepEqual(plain(done),[1,2,3,4,5,6,7,8,9,10,11]);
 assert.equal(ui.el('#gcount').textContent,'17 of 17 terms');
 assert.equal(ui.persisted().badges.length,17);
});
test('?level=N never reads or writes saved progress',()=>{
 const saved={seed:'KEEP',unlocked:5,badges:['dmat','tree'],earnedAt:{dmat:1,tree:2},variants:{},log:[]};
 for(let id=1;id<=11;id++){const ui=boot(saved,{search:'?debug=1&level='+id});
  assert.equal(st(ui).L.id,id);assert.equal(ui.api.earned().length,0);assert.doesNotMatch(ui.el('#pips').innerHTML,/disabled/);
  PLAY[id](ui);assert(st(ui).done);ui.api.act('fresh');
  assert.equal(ui.writes.length,0);assert.deepEqual(ui.persisted(),saved);}
});
test('level 1: a wrong pairing does not finish the level',()=>{
 const ui=boot();const c=st(ui);for(const k of [0,1]){const [a,b]=c.v.hand[k];for(let col=0;col<12;col++)ui.api.act('col',{c:col});}
 const want=c.v.pairs.find(x=>x[0]===0)[1];ui.api.act('pick',{v:[1,2,3].find(x=>x!==want)});assert(!c.done);assert.equal(c.msg.kind,'warn');
});
test('level 4: hanging D with a value that is not the smallest fails the walk; the smallest passes',()=>{
 const ui=boot(null,{search:'?debug=1&level=4&seed=TRAP'});const c=st(ui);fillHands(ui);
 const rows=c.rowList,max=Math.max(...rows.map(r=>r.v)),min=Math.min(...rows.map(r=>r.v));assert(max>min);
 const r=rows.find(x=>x.v===max),t=c.cave,p=ui.E.pathNodes(t,r.i,r.k),x=c.D[r.i][3]-max;
 // hang where the large value says, if that point is inside a tunnel on the path
 let acc=0,done=false;for(let s=0;s<p.length-1&&!done;s++){const ei=ui.E.edgeIndex(t,p[s],p[s+1]),w=t.edges[ei].w;
  if(acc<x&&x<acc+w){ui.api.act('tunnel',{e:ei});ui.api.act('dig',{e:ei,x:x-acc,from:p[s],L:max});done=true;}acc+=w;}
 if(done){ui.api.act('walk');assert(!c.done);assert(c.walkRes.bad.length>0);ui.api.act('undo');}
 digAll(ui);ui.api.act('walk');assert(c.done);
});
test('level 6: the cave the formula builds still fails the walk; no dig can finish the level',()=>{
 for(const seed of ['L6A','L6B','L6C']){const ui=boot(null,{search:'?debug=1&level=6&seed='+seed});const c=st(ui);
  digAll(ui);ui.api.act('walk');assert(!c.done);assert(c.walkRes.bad.length>0);assert.equal(ui.el('#skip').hidden,false);
  ui.api.act('walk');ui.api.act('walk');assert.equal(c.walkLeft,0);assert(!c.done);}
});
test('level 7: joining a pair that is not the closest is refused by the story',()=>{
 const ui=boot(null,{search:'?debug=1&level=7&seed=CLK'});const c=st(ui),J=c.up.joins[0];
 const pairs=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]].filter(([i,j])=>!((i===J.a&&j===J.b)||(i===J.b&&j===J.a)));
 for(const [i,j] of pairs){ui.api.act('cell',{i,j});assert.equal(c.stage,'pick');assert.equal(c.msg.kind,'warn');}
 assert.equal(c.j,0);
});
test('level 8: closest-pair joining fails the walk; a wrong discounted pick is refused',()=>{
 const ui=boot(null,{search:'?debug=1&level=8&seed=FST'});const c=st(ui);ui.api.act('skip');ui.api.act('walk');
 assert(c.walkRes.bad.length>0);assert.equal(c.stage,'totals');fillHands(ui);assert.equal(c.stage,'pick');
 const cp=ui.E.minPair(c.D).pair;ui.api.act('cell',{i:cp[0],j:cp[1]});assert.equal(c.stage,'pick');
});
test('level 10: a swap that does not reach the top score leaves the level open, and undo restores it',()=>{
 const ui=boot(null,{search:'?debug=1&level=10&seed=SWP'});const c=st(ui),before=ui.E.quartetScore(c.t,c.D);
 const o=ui.E.nniOptions(c.t),bad=o.find(x=>ui.E.quartetScore(x.tree,c.D)<15),k=o.filter(x=>x.edge===bad.edge).indexOf(bad);
 ui.api.act('tunnel',{e:bad.edge});ui.api.act('swap',{k});assert(!c.done);ui.api.act('undo');assert.equal(ui.E.quartetScore(c.t,c.D),before);
});
test('workbench opens with ?bench=1 and saves nothing',()=>{
 const ui=boot(null,{search:'?bench=1'});assert.match(ui.el('#bOut').innerHTML,/Neighbor joining/);assert.match(ui.el('#bOut').innerHTML,/Reproduces the chart/);
 assert.equal(ui.writes.length,0);
});

/* Every first-load code: a new browser draws one of these, so each is played through every level. */
test('every first-load code plays every level without a fallback puzzle',()=>{
 const codes=boot().api.codes();assert.equal(codes.length,50);assert.equal(new Set(codes).size,50);
 for(const code of codes){
  const ui=boot(null,{search:'?debug=1&seed='+code}),n=ui.api.levels().length;
  for(let id=1;id<=n;id++){if(id>1)ui.api.loadLevel(id);PLAY[id](ui);assert(st(ui).done,code+' level '+id+' completes');}
  assert.equal(ui.api.earned().length,ui.api.vocab().length,code+' earns every term');assert.equal(ui.api.fell(),0,code+' needs no fallback');
 }
});
