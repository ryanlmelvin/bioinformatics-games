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
const plain=x=>JSON.parse(JSON.stringify(x));
const slide=(ui,tape,offset)=>ui.events.input({target:{dataset:{slide:String(tape)},value:String(offset)}});
function fitsBoth(ui,p){return ui.api.state().inst.candidates.every(x=>ui.context.pairPositions(x.text,p,4,1).length);}
// Find the one pair on the bench that decides, line it up under the true string and choose that string.
function settle(ui){
 const c=ui.api.state(),real=c.inst.candidates.findIndex(x=>x.text===c.inst.genome);
 const decisive=c.inst.bench.map(i=>c.inst.pairs[i]).filter(p=>!fitsBoth(ui,p));assert.equal(decisive.length,1);
 ui.events.change({target:{id:'pairSelect',value:String(decisive[0].index)}});
 slide(ui,real,decisive[0].index);ui.api.choosePairAnswer(real);
 return {real,wrong:1-real,pair:decisive[0]};
}
test('level 11 retains its finale and unlocks level 12 in existing saved progress',()=>{
 const ui=boot(null);assert.equal(ui.api.state().L.id,11);walk(ui);
 assert(ui.api.state().done);assert(ui.api.state().blocks.includes('finale'));assert.equal(ui.persisted().unlocked,12);assert.deepEqual(ui.persisted().done,Array.from({length:11},(_,i)=>i+1));
 const resumed=boot(null,true,ui.persisted());assert.equal(resumed.api.state().L.id,12);assert(resumed.api.saved().badges.includes('debruijn'));
});
test('either Eulerian walk leads to pair checking, not premature completion',()=>{
 for(const order of [0,1]){
  const ui=boot();const c=ui.api.state();walk(ui,c.inst.candidates[order].walk);
  assert.equal(c.phase,'pairs');assert.equal(c.done,false);assert(!ui.api.saved().badges.includes('readpair'));
  // Five pairs are offered, and the first is one that fits both strings.
  assert.equal(ui.el('#pairwork').innerHTML.match(/<option /g).length,5);
  const first=c.inst.pairs[c.inst.bench[0]];assert.equal(c.pairSel,first.index);assert(fitsBoth(ui,first));
  // Nothing is given away until a pair has been lined up under the chosen string.
  const home=c.inst.candidates[0].text.indexOf(first.left);
  slide(ui,0,(home+1)%15);ui.api.choosePairAnswer(0);
  assert.equal(c.phase,'pairs');assert.match(c.msg.text,/not lined up/);assert.doesNotMatch(c.msg.text,/fits both/);
  slide(ui,0,home);ui.api.choosePairAnswer(0);
  assert.match(c.msg.text,/fits both/);assert.equal(c.pairWon,null);assert.match(ui.el('#pairwork').innerHTML,/\(fits both\)/);
  // The one deciding pair can never be lined up under the wrong string, wherever it is slid.
  const trueIndex=c.inst.candidates.findIndex(x=>x.text===c.inst.genome),wrong=1-trueIndex;
  const decisive=c.inst.bench.map(i=>c.inst.pairs[i]).filter(p=>!fitsBoth(ui,p));assert.equal(decisive.length,1);
  ui.events.change({target:{id:'pairSelect',value:String(decisive[0].index)}});
  for(let offset=0;offset<=14;offset++){slide(ui,wrong,offset);ui.api.choosePairAnswer(wrong);assert.match(c.msg.text,/not lined up/);}
  slide(ui,trueIndex,(decisive[0].index+1)%15);ui.api.choosePairAnswer(trueIndex);assert.match(c.msg.text,/not lined up/);
  slide(ui,trueIndex,decisive[0].index);ui.api.choosePairAnswer(trueIndex);
  // Lining it up settles the question and shows the evidence; the level waits for the lesson button.
  assert.equal(c.phase,'pairs');assert.equal(c.done,false);
  assert.deepEqual(plain(c.pairWon),{cand:trueIndex,offset:decisive[0].index,pair:decisive[0].index});
  assert.match(c.msg.text,/ only\./);assert.match(ui.el('#pairwork').innerHTML,/settles it/);assert.match(ui.el('#pairwork').innerHTML,/class="bad"/);
  assert.equal(ui.el('#skip').hidden,false);assert(!ui.api.saved().badges.includes('readpair'));
  ui.api.choosePairAnswer(wrong);assert.equal(plain(c.pairWon).cand,trueIndex);
  ui.el('#skip').click();assert.equal(c.phase,'paired');assert(c.done);
  for(const id of ['repeat','readpair','pairedgraph'])assert(ui.persisted().badges.includes(id));
  assert.match(ui.el('#guideBody').innerHTML,/ba3j/);assert.match(ui.el('#panel').innerHTML,/In the wild/);
  assert.match(c.msg.text,/^Fifteen paired edges/);
  ui.el('#fresh').click();assert.equal(ui.api.state().phase,'play');assert.equal(ui.api.state().pairWon,null);
 }
});
test('leaving during split animation cannot finish or award terms in another level',()=>{
 const ui=boot(12,false);walk(ui);const c=ui.api.state();settle(ui);
 assert(c.pairWon);assert.equal(c.phase,'pairs');ui.el('#skip').click();assert.equal(c.phase,'split');
 ui.api.loadLevel(1);for(const fn of ui.timeouts)fn();
 assert.equal(ui.api.state().L.id,1);assert.equal(ui.api.state().done,false);assert(!ui.persisted().badges.includes('readpair'));
});
test('a completed paired level can be replayed without losing earned vocabulary',()=>{
 const ui=boot();walk(ui);const c=ui.api.state();settle(ui);ui.el('#skip').click();assert(c.done);
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
  assert.doesNotMatch(ui.el('#pips').innerHTML,/ disabled/);
  assert.deepEqual(ui.persisted(),saved);assert.equal(ui.writes.length,0);
 }
});
test('practice completion, navigation, and puzzle changes never alter saved course progress',()=>{
 const ui=boot(null,true,null,{pathname:'/bridge-walker/level-12/'}),prior=ui.persisted();
 walk(ui);const c=ui.api.state();settle(ui);ui.el('#skip').click();
 assert(c.done);assert(ui.api.saved().badges.includes('pairedgraph'));
 ui.api.loadLevel(1);assert.match(ui.el('#pips').innerHTML,/<button data-lvl="12" class=" fin" aria-label/);
 ui.el('#seed').value='FRESHPAIR';ui.el('#setSeed').click();
 assert.equal(ui.api.state().L.id,12);assert.equal(ui.api.saved().badges.length,0);
 ui.el('#fresh').click();assert.equal(ui.api.state().phase,'play');
 assert.deepEqual(ui.persisted(),prior);assert.equal(ui.writes.length,0);
 const reloaded=boot(null,true,prior,{pathname:'/bridge-walker/level-12/'});
 assert.equal(reloaded.api.state().L.id,12);assert.equal(reloaded.api.saved().badges.length,0);
});
test('invalid direct levels fall back to normal saved progress, with every level open',()=>{
 for(const value of ['0','13','1.5','abc']){
  const ui=boot(null,true,null,{search:'?debug=1&level='+value});
  assert.equal(ui.api.state().L.id,11);assert(ui.api.saved().badges.includes('debruijn'));
  assert.doesNotMatch(ui.el('#pips').innerHTML,/ disabled/);assert.match(ui.el('#pips').innerHTML,/<button data-lvl="12" class="" aria-label="Level 12"/);
  ui.api.loadLevel(12);assert.equal(ui.api.state().L.id,12);
 }
});
