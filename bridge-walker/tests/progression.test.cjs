const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function boot(level=12,reduced=true,saved=null,url={}){
 const elements=new Map(),events={},timeouts=[],writes=[];
 const el=key=>{if(!elements.has(key))elements.set(key,{innerHTML:'',textContent:'',hidden:false,checked:false,disabled:false,dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},setAttribute(k,v){this[k]=v;},focus(){},click(){this.onclick?.();}});return elements.get(key);};
 const prior=saved||{seed:'PROGRESSION',unlocked:level||11,badges:['debruijn'],earnedAt:{debruijn:9},variants:{},clean:[],intros:[11],log:[]};
 let storage=JSON.stringify(prior);
 const context={document:{querySelector:el,addEventListener:(type,fn)=>events[type]=fn},window:{},
 location:{search:'?debug=1',pathname:'/bridge-walker/',...url},URLSearchParams,
 localStorage:{getItem:()=>storage,setItem:(key,value)=>{writes.push(value);storage=value;}},
 setTimeout:fn=>{timeouts.push(fn);return timeouts.length;},clearTimeout(){},setInterval:()=>1,clearInterval(){},
 requestAnimationFrame:()=>1,cancelAnimationFrame(){},performance:{now:()=>0},matchMedia:()=>({matches:reduced})};
 vm.createContext(context);
 for(const [,code] of html.matchAll(/<script id="(?:engine|ui)">([\s\S]*?)<\/script>/g))vm.runInContext(code,context);
 return {api:context.window.__bw,context,el,events,timeouts,writes,persisted:()=>JSON.parse(storage)};
}
function walk(ui,ids){const c=ui.api.state();ui.api.nodeClick(c.inst.start);for(const id of ids||c.inst.edges.map(e=>e.id))ui.api.nodeClick(c.E[id].to);}
test('level 11 retains its finale and unlocks level 12 in existing saved progress',()=>{
 const ui=boot(null);assert.equal(ui.api.state().L.id,11);walk(ui);
 assert(ui.api.state().done);assert(ui.api.state().blocks.includes('finale'));assert.equal(ui.persisted().unlocked,12);
 const resumed=boot(null,true,ui.persisted());assert.equal(resumed.api.state().L.id,12);assert(resumed.api.saved().badges.includes('debruijn'));
});
test('either Eulerian walk leads to pair checking, not premature completion',()=>{
 for(const order of [0,1]){
  const ui=boot();const c=ui.api.state();walk(ui,c.inst.candidates[order].walk);
  assert.equal(c.phase,'pairs');assert.equal(c.done,false);assert(!ui.api.saved().badges.includes('readpair'));
  ui.api.choosePairAnswer(0);assert.equal(c.phase,'pairs');assert.match(c.msg.text,/fits both/);
  const trueIndex=c.inst.candidates.findIndex(x=>x.text===c.inst.genome),wrong=1-trueIndex;
  const decisive=c.inst.pairs.find(p=>!ui.context.pairPositions(c.inst.candidates[wrong].text,p,4,1).length);
  ui.events.change({target:{id:'pairSelect',value:String(decisive.index)}});
  ui.api.choosePairAnswer(wrong);assert.match(c.msg.text,/cannot fit/);
  c.pairOffsets[trueIndex]=(decisive.index+1)%10;
  ui.api.choosePairAnswer(trueIndex);assert.match(c.msg.text,/Slide the pair/);
  ui.events.input({target:{dataset:{slide:String(trueIndex)},value:String(decisive.index)}});
  ui.api.choosePairAnswer(trueIndex);assert.equal(c.phase,'paired');assert(c.done);
  for(const id of ['repeat','readpair','pairedgraph'])assert(ui.persisted().badges.includes(id));
  assert.match(ui.el('#guideBody').innerHTML,/ba3j/);assert.match(ui.el('#panel').innerHTML,/In the wild/);
  assert.equal(ui.el('#map').viewBox,'0 0 420 500');
  ui.el('#fresh').click();assert.equal(ui.api.state().phase,'play');assert.equal(ui.el('#map').viewBox,'0 0 760 500');
 }
});
test('leaving during split animation cannot finish or award terms in another level',()=>{
 const ui=boot(12,false);walk(ui);const c=ui.api.state();const answer=c.inst.candidates.findIndex(x=>x.text===c.inst.genome);
 c.pairSel=0;c.pairOffsets[answer]=0;ui.api.choosePairAnswer(answer);assert.equal(c.phase,'split');
 ui.api.loadLevel(1);for(const fn of ui.timeouts)fn();
 assert.equal(ui.api.state().L.id,1);assert.equal(ui.api.state().done,false);assert(!ui.persisted().badges.includes('readpair'));
});
test('a completed paired level can be replayed without losing earned vocabulary',()=>{
 const ui=boot();walk(ui);const c=ui.api.state();const answer=c.inst.candidates.findIndex(x=>x.text===c.inst.genome);
 c.pairSel=0;c.pairOffsets[answer]=0;ui.api.choosePairAnswer(answer);
 ui.api.loadLevel(12);assert.equal(ui.api.state().phase,'play');assert(ui.api.saved().badges.includes('pairedgraph'));
});
test('direct level links start fresh without debug or inherited vocabulary',()=>{
 const saved={seed:'PAIRQA',unlocked:1,badges:['repeat','readpair','pairedgraph'],earnedAt:{repeat:12,readpair:12,pairedgraph:12},variants:{},clean:[],intros:[],log:[]};
 for(const url of [
  {pathname:'/bridge-walker/level-12/',search:''},
  {pathname:'/bridge-walker/level-12/index.html',search:''},
  {search:'?level=12&seed=PAIRQA'},
  {search:'?debug=1&level=12&seed=PAIRQA'}
 ]){
  const ui=boot(null,true,saved,url);
  assert.match(ui.el('#title').textContent,/Level 12:/);
  assert.equal(ui.el('#gcount').textContent,'0 of 21 terms');
  assert.match(ui.el('#pips').innerHTML,/<button data-lvl="12" class="on"/);
  assert.deepEqual(ui.persisted(),saved);assert.equal(ui.writes.length,0);
 }
});
test('practice completion, navigation, and puzzle changes never alter saved course progress',()=>{
 const ui=boot(null,true,null,{pathname:'/bridge-walker/level-12/'}),prior=ui.persisted();
 walk(ui);const c=ui.api.state(),answer=c.inst.candidates.findIndex(x=>x.text===c.inst.genome);
 c.pairSel=0;c.pairOffsets[answer]=0;ui.api.choosePairAnswer(answer);
 assert(c.done);assert(ui.api.saved().badges.includes('pairedgraph'));
 ui.api.loadLevel(1);assert.match(ui.el('#pips').innerHTML,/<button data-lvl="12" aria-label/);
 ui.el('#seed').value='FRESHPAIR';ui.el('#setSeed').click();
 assert.equal(ui.api.state().L.id,12);assert.equal(ui.api.saved().badges.length,0);
 ui.el('#fresh').click();assert.equal(ui.api.state().phase,'play');
 assert.deepEqual(ui.persisted(),prior);assert.equal(ui.writes.length,0);
 const reloaded=boot(null,true,prior,{pathname:'/bridge-walker/level-12/'});
 assert.equal(reloaded.api.state().L.id,12);assert.equal(reloaded.api.saved().badges.length,0);
});
test('invalid direct levels fall back to normal saved progress',()=>{
 for(const value of ['0','13','1.5','abc']){
  const ui=boot(null,true,null,{search:'?debug=1&level='+value});
  assert.equal(ui.api.state().L.id,11);assert(ui.api.saved().badges.includes('debruijn'));
 }
});
