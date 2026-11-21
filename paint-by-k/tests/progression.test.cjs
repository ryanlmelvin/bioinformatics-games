const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
/* Load both scripts into a vm with a small fake DOM. Inputs the level reads (#sq0, #potr, ...) are set through el(). */
function boot(saved,url){
 const elements=new Map(),writes=[];
 const el=key=>{if(!elements.has(key))elements.set(key,{innerHTML:'',textContent:'',value:'',hidden:false,checked:false,disabled:false,open:false,dataset:{},style:{},className:'',
  classList:{add(){},remove(){},toggle(){}},setAttribute(){},focus(){},click(){this.onclick&&this.onclick();}});return elements.get(key);};
 let storage=saved===undefined?null:JSON.stringify(saved);
 const context={document:{querySelector:el,addEventListener(){}},window:{},
  location:{search:'?debug=1',pathname:'/paint-by-k/',...url},URLSearchParams,
  localStorage:{getItem:()=>storage,setItem:(k,v)=>{writes.push(v);storage=v;}},
  setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:()=>1,cancelAnimationFrame(){},performance:{now:()=>0},matchMedia:()=>({matches:true})};
 vm.createContext(context);
 for(const [,code] of html.matchAll(/<script id="(?:engine|ui)">([\s\S]*?)<\/script>/g))vm.runInContext(code,context);
 return {api:context.window.__pk,E:context,el,writes,persisted:()=>JSON.parse(storage)};
}
const plain=x=>JSON.parse(JSON.stringify(x));
/* Play the loop buttons until the level is done. */
function loop(ui){let n=0;const c=()=>ui.api.state();while(!c().done&&n++<40)ui.api.act(c().st.next==='move'?'reavg':'repaint');assert(c().done,'loop finishes');return n;}
function mixFF(ui){const c=ui.api.state(),ff=c.inst.ff.idx;for(const i of ff.slice(1))ui.api.act('mix',String(i));}
const PLAY={
 1(ui){const c=ui.api.state();c.inst.deck.forEach((d,i)=>{ui.api.act('card',String(i));ui.api.act('pile',String(d.group));});ui.api.go();ui.api.act('judge','cant');},
 2(ui){const c=ui.api.state();for(const i of c.inst.strip)ui.api.act('pot',String(ui.E.nearest(c.pic.px[i],c.st.pots)));ui.api.go();},
 3(ui){mixFF(ui);},
 4(ui){const c=ui.api.state();mixFF(ui);ui.api.go();c.inst.sq.forEach((v,k)=>ui.el('#sq'+k).value=String(v));ui.api.act('checksq');ui.api.go();
   c.inst.good.centers.map(p=>p.map(Math.round)).forEach((p,j)=>{ui.api.act('sel',String(j));ui.api.act('spot',p.join(','));});},
 5(ui){const c=ui.api.state();for(const m of [c.inst.meanA,c.inst.meanB]){ui.el('#potr').value=String(m[0]);ui.el('#potb').value=String(m[1]);ui.api.act('mixpot');}},
 6(ui){const c=ui.api.state(),E=ui.E,P=c.pic.px;
   for(let x=0;x<12;x++){const i=c.inst.row*12+x,want=E.nearest(P[i],c.st.pots);for(let k=0;k<=want;k++)ui.api.act('cycle',String(i));}
   ui.api.act('checkrow');ui.api.go();
   const j=c.inst.handPot,mine=P.filter((_,i)=>c.st.lab[i]===j),m=E.centroid(mine);ui.el('#potr').value=String(m[0]);ui.el('#potb').value=String(m[1]);ui.api.act('movepot');ui.api.go();loop(ui);},
 7(ui){const c=()=>ui.api.state();let n=0;while(c().st.phase==='bad'&&n++<40)ui.api.act(c().st.next==='move'?'reavg':'repaint');
   const ff=ui.E.farthestFirst(c().pic.px,3,0).idx;ff.slice(1).forEach(i=>ui.api.act('mix',String(i)));loop(ui);},
 8(ui){const c=ui.api.state(),E=ui.E,I=c.inst;I.hand.forEach((ci,a)=>c.st.pots.forEach((p,j)=>ui.el('#sq'+(a*3+j)).value=String(E.dist2(I.data[ci],p))));
   ui.api.act('checksq');I.hand.forEach((ci,a)=>ui.api.act('near',a+','+E.nearest(I.data[ci],c.st.pots)));ui.api.go();
   ui.el('#coord').value=String(I.coord.value);ui.api.act('checkcoord');ui.api.go();loop(ui);},
 9(ui){const c=ui.api.state();for(const m of c.inst.merges){const G=c.st.groups,key=g=>g.slice().sort().join();
   const i=G.findIndex(g=>key(g)===key(m.a)),j=G.findIndex(g=>key(g)===key(m.b));ui.api.act('merge',Math.min(i,j)+','+Math.max(i,j));
   if(c.st.phase==='hand'){ui.el('#hand').value=String(c.inst.hand.value);ui.api.act('checkhand');}}
   ui.api.act('cut','3');},
 10(ui){loop(ui);}
};
test('a fresh save plays every level and ends with every term earned, in order, with each completion logged',()=>{
 const ui=boot(undefined,{search:'?debug=1&seed=PROG'});
 assert.equal(ui.api.levels().length,10);assert.equal(ui.api.vocab().length,14);
 for(let n=1;n<=10;n++){
  assert.equal(ui.api.state().L.id,n);
  PLAY[n](ui);assert(ui.api.state().done,'level '+n+' done');
  if(n<10)ui.api.loadLevel(n+1);
 }
 assert.deepEqual(plain(ui.api.earned()).sort(),plain(ui.api.vocab().map(v=>v.id)).sort());
 const lg=ui.api.log();for(let n=1;n<=10;n++)assert(lg.some(e=>e.ev==='complete'&&e.lvl===n),'completion of level '+n+' logged');
 const order=plain(ui.api.earned());assert.deepEqual(order.slice(0,6),['expvec','clustering','point','center','cluster','euclid']);
 assert.equal(ui.persisted().unlocked,10);assert.deepEqual(ui.persisted().done,Array.from(ui.api.levels(),l=>l.id));assert.match(ui.el('#count').innerHTML,/14 of 14 terms/);
 // level 8 scores the student's own level 1 piles
 assert.equal(ui.persisted().piles1.length,12);
});
test('?level=N never reads or writes saved progress',()=>{
 const saved={seed:'SAVED',unlocked:4,badges:['expvec','clustering'],earnedAt:{expvec:1,clustering:1},variants:{},piles1:null,log:[]};
 for(let n=1;n<=10;n++){
  const ui=boot(saved,{search:'?debug=1&level='+n+'&seed=PRAC'});
  assert.equal(ui.api.state().L.id,n);assert.equal(ui.api.saved().badges.length,0);
  PLAY[n](ui);assert(ui.api.state().done);
  assert.equal(ui.writes.length,0);assert.deepEqual(ui.persisted(),saved);
 }
});
test('level 2 shows every distance before a choice and prints one strip pixel per choice',()=>{
 const ui=boot(undefined,{search:'?debug=1&level=2&seed=RULER'}),c=ui.api.state();
 for(const [step,i] of c.inst.strip.entries()){
  const stage=ui.el('#stage').innerHTML,pixel=c.pic.px[i];
  assert.equal((stage.match(/<line class="ruler\b/g)||[]).length,3);
  assert.equal((stage.match(/<g\b[^>]*\bdata-act="pot"/g)||[]).length,3);
  const buttons=Array.from(stage.matchAll(/<button\b([^>]*\bdata-act="pot"[^>]*)>([\s\S]*?)<\/button>/g));
  assert.equal(buttons.length,3);
  for(const [j,pot] of c.st.pots.entries()){
   const choice=buttons.find(([,attrs])=>attrs.includes('data-arg="'+j+'"'));
   assert.ok(choice,'pot '+(j+1)+' has a choice button');
   assert.ok(choice[2].replace(/<[^>]+>/g,'').includes(ui.E.dist(pixel,pot).toFixed(1)+' away'));
  }
  assert.equal(ui.el('#go').hidden,true);
  const nearest=ui.E.nearest(pixel,c.st.pots);
  ui.api.act('pot',String(nearest));
  assert.equal(c.st.s,step+1);
  assert.equal(c.st.lab[i],nearest);
  assert.equal(c.st.lab.filter(j=>j!==null).length,step+1);
 }
 assert.equal(c.st.misses,0);
 assert.equal(c.done,false);
 assert.doesNotMatch(ui.el('#stage').innerHTML,/data-act="pot"/);
 assert.equal(ui.el('#go').hidden,false);
 ui.api.go();
 assert.ok(c.done);
 assert.deepEqual(plain(c.st.lab),plain(ui.E.assign(c.pic.px,c.st.pots)));
});
test('level 2 corrects a farther pot immediately and undo restores the pixel and its choices',()=>{
 const ui=boot(undefined,{search:'?debug=1&level=2&seed=WRONG'}),c=ui.api.state(),i=c.inst.strip[0];
 const before=ui.el('#stage').innerHTML,nearest=ui.E.nearest(c.pic.px[i],c.st.pots);
 ui.api.act('pot',String((nearest+1)%3));
 assert.equal(c.st.lab[i],nearest);assert.equal(c.st.s,1);assert.equal(c.msg.kind,'warn');assert.equal(c.st.misses,1);
 assert.match(c.msg.text,new RegExp('pot '+(nearest+1),'i'));
 ui.api.undo();
 assert.equal(c.st.lab[i],null);assert.equal(c.st.s,0);assert.equal(c.st.misses,0);
 assert.equal(ui.el('#stage').innerHTML,before);
});
test('level 3: three pots off the mark do not finish the level',()=>{
 const ui=boot(undefined,{search:'?debug=1&level=3&seed=WRONG'}),c=ui.api.state();
 // two pixels from the same region as pot 1 cannot reach the mark
 const same=c.pic.region.map((r,i)=>r===c.pic.region[0]&&i>0?i:-1).filter(i=>i>0);
 ui.api.act('mix',String(same[0]));ui.api.act('mix',String(same[1]));
 assert.equal(c.done,false);assert.equal(c.msg.kind,'warn');
 ui.api.act('pour','2');ui.api.act('pour','1');assert.equal(c.st.pots.length,1);
});
test('level 4 trap: the level 3 move spends a pot on the stray, the worst-pixel meter is satisfied, the print is not',()=>{
 const ui=boot(undefined,{search:'?debug=1&level=4&seed=TRAP'}),c=ui.api.state(),E=ui.E,P=c.pic.px;
 // a pixel that is not the worst is refused
 const w=E.worstIndex(P,c.st.pots),other=P.findIndex(p=>E.dist2(p,P[w])>0);
 ui.api.act('mix',String(other));assert.equal(c.st.pots.length,1);
 mixFF(ui);assert.equal(c.st.phase,'look');
 assert(c.st.pots.some(p=>E.dist2(p,P[c.inst.stray])===0),'a pot was spent on the stray');
 assert(E.maxDistance(P,c.st.pots)<=c.inst.fftMax+1e-9);
 assert(E.distortion(P,c.st.pots)>=1.5*c.inst.good.err);
 // the stem prints from the background's pot: its region has no pot of its own
 const stem=c.pic.region.map((r,i)=>r==='b'?i:-1).filter(i=>i>=0),bg=c.pic.region.map((r,i)=>r==='c'?i:-1).filter(i=>i>=0);
 assert(stem.some(i=>bg.some(j=>c.st.lab[i]===c.st.lab[j]))||stem.some(i=>c.st.lab[i]===c.st.lab[c.pic.region.indexOf('a')]));
});
test('level 6: a wrongly printed row is caught, and the error never rises',()=>{
 const ui=boot(undefined,{search:'?debug=1&level=6&seed=ROW'}),c=ui.api.state();
 ui.api.act('checkrow');assert.equal(c.st.phase,'row');assert.equal(c.st.wrong.length,12);
 PLAY[6](boot(undefined,{search:'?debug=1&level=6&seed=ROW'}));
 const u2=boot(undefined,{search:'?debug=1&level=6&seed=ROW'});PLAY[6](u2);const h=u2.api.state().st.hist.map(x=>x.err);
 for(let i=1;i<h.length;i++)assert(h[i]<h[i-1]+1e-9);
});
test('level 7 trap: the bad start stops at least 1.3 times worse than the level 3 start',()=>{
 const ui=boot(undefined,{search:'?debug=1&level=7&seed=BAD'});PLAY[7](ui);const c=ui.api.state();
 assert(c.badPrint.err>=1.3*c.goodPrint.err);
 // during the second start only the worst pixel takes a pot
});
test('level 9: a pair that is not the closest is refused and the closest is marked',()=>{
 const ui=boot(undefined,{search:'?debug=1&level=9&seed=TREE'}),c=ui.api.state(),m=c.inst.merges[0];
 const G=c.st.groups;let wrong=null;for(let i=0;i<8&&!wrong;i++)for(let j=i+1;j<8;j++)if(!(m.members.includes(i)&&m.members.includes(j))){wrong=i+','+j;break;}
 ui.api.act('merge',wrong);assert.equal(c.st.merges.length,0);assert(c.st.hint);
 PLAY[9](boot(undefined,{search:'?debug=1&level=9&seed=TREE'}));
 const u=boot(undefined,{search:'?debug=1&level=9&seed=TREE'});const s=u.api.state();
 for(const mm of s.inst.merges){const key=g=>g.slice().sort().join(),i=s.st.groups.findIndex(g=>key(g)===key(mm.a)),j=s.st.groups.findIndex(g=>key(g)===key(mm.b));u.api.act('merge',Math.min(i,j)+','+Math.max(i,j));if(s.st.phase==='hand'){
   u.el('#hand').value=String(s.inst.hand.value);u.api.act('checkhand');u.api.undo();
   assert.match(u.el('#stage').innerHTML,/id="hand"/,'the distance can still be entered after undo');
   u.el('#hand').value=String(s.inst.hand.value);u.api.act('checkhand');
 }}
 const targets=Array.from(u.el('#stage').innerHTML.matchAll(/data-act="cut" data-arg="(\d+)"[^>]*aria-label="Cut at distance ([\d.]+)"/g));
 assert.equal(targets.length,8);
 for(const [,groups,height] of targets)assert.equal(+groups,8-s.inst.merges.filter(m=>m.d<+height).length);
 u.api.act('cut','4');assert.equal(s.done,false);u.api.act('cut','3');assert(s.done);
});
test('undo restores the previous state',()=>{
 const ui=boot(undefined,{search:'?debug=1&level=3&seed=UNDO'}),c=()=>ui.api.state();
 ui.api.act('mix','5');assert.equal(c().st.pots.length,2);ui.api.undo();assert.equal(c().st.pots.length,1);
});
test('the workbench opens with ?bench=1',()=>{
 const ui=boot(undefined,{search:'?bench=1'});assert.match(ui.el('#bench').innerHTML,/Workbench/);
 ui.el('#bpts').value='0 0\n5 5\n0 5\n1 1\n2 2\n3 3\n1 2';ui.el('#bk').value='3';ui.el('#brun').click();assert.match(ui.el('#bout').innerHTML,/Farthest-first traversal/);assert.match(ui.el('#bout').innerHTML,/\(0, 0\) \(5, 5\) \(0, 5\)/);
 ui.el('#bk').value='2.5';ui.el('#brun').click();assert.match(ui.el('#bout').innerHTML,/whole number/);
 ui.el('#bk').value='2';ui.el('#bstart').value='1 2';ui.el('#brun').click();assert.match(ui.el('#bout').innerHTML,/Enter 2 starting points/);
 ui.el('#bpts').value='0 0\n1 1\noops';ui.el('#brun').click();assert.match(ui.el('#bout').innerHTML,/numeric coordinates/);
});
test('level 8 keeps the level 1 cards: New puzzle is disabled and does nothing',()=>{
 const ui=boot(undefined,{search:'?debug=1&seed=KEEP'});PLAY[1](ui);const piles=plain(ui.persisted().piles1);ui.api.loadLevel(8);
 const before=plain(ui.api.state().inst.data);assert.equal(ui.el('#fresh').disabled,true);assert.match(ui.el('#fresh').title,/level 1 cards/);
 ui.el('#fresh').click();assert.deepEqual(plain(ui.api.state().inst.data),before);assert.deepEqual(plain(ui.persisted().variants),{});
 assert.deepEqual(plain(ui.persisted().piles1),piles);
});
test('once the loop stops, both loop buttons are disabled (levels 6, 7, 8, 10)',()=>{
 for(const n of [6,7,8,10]){const ui=boot(undefined,{search:'?debug=1&level='+n+'&seed=STOP'});PLAY[n](ui);
  const h=ui.el('#stage').innerHTML;assert.doesNotMatch(h,/data-act="(repaint|reavg)"(?! disabled)/,'level '+n);}
});
test('the gene levels (8 and 10) use center and assign, not pots and printing',()=>{
 for(const n of [8,10]){const ui=boot(undefined,{search:'?debug=1&level='+n+'&seed=WORDS'});
  if(n===8){const c=ui.api.state(),E=ui.E,I=c.inst;I.hand.forEach((ci,a)=>c.st.pots.forEach((p,j)=>ui.el('#sq'+(a*3+j)).value=String(E.dist2(I.data[ci],p))));
   ui.api.act('checksq');I.hand.forEach((ci,a)=>ui.api.act('near',a+','+E.nearest(I.data[ci],c.st.pots)));ui.api.go();
   ui.el('#coord').value=String(I.coord.value);ui.api.act('checkcoord');ui.api.go();}
  const h=ui.el('#stage').innerHTML,r=ui.el('#rule').textContent;
  assert.match(h,/Assign every (card|gene) to its nearest center/,'level '+n);assert.match(h,/Move every center to the average/,'level '+n);
  assert.doesNotMatch(h+r,/\bpots?\b|Print/,'level '+n);}
});
test('terms inside reveal sentences are lower case unless they carry a proper name',()=>{
 const ui=boot(undefined,{search:'?debug=1&seed=CASE'});PLAY[1](ui);assert.match(ui.el('#panel').innerHTML,/is <span class="term" tabindex="0">clustering</);
 ui.api.loadLevel(2);PLAY[2](ui);const p=ui.el('#panel').innerHTML;assert.match(p,/>center<span/);assert.match(p,/>cluster<span/);
});

/* Every first-load code: a new browser draws one of these, so each is played through every level. */
test('every first-load code plays every level without a fallback puzzle',()=>{
 const codes=boot(undefined,{search:'?debug=1&seed=PROG'}).api.codes();assert.equal(codes.length,50);assert.equal(new Set(codes).size,50);
 for(const code of codes){
  const ui=boot(undefined,{search:'?debug=1&seed='+code});
  for(let n=1;n<=10;n++){if(n>1)ui.api.loadLevel(n);PLAY[n](ui);assert(ui.api.state().done,code+' level '+n+' completes');}
  assert.equal(ui.api.earned().length,ui.api.vocab().length,code+' earns every term');assert.equal(ui.api.fell(),0,code+' needs no fallback');
 }
});
