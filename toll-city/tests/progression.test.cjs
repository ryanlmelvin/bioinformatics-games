const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
/* Load both scripts into a sandbox with a small fake page. */
function boot(saved=null,search='?debug=1&seed=PROG'){
  const elements=new Map(),events={},writes=[];
  const el=key=>{if(!elements.has(key))elements.set(key,{innerHTML:'',textContent:'',hidden:false,checked:false,disabled:false,value:'',dataset:{},style:{setProperty(){}},
    classList:{add(){},remove(){},toggle(){}},setAttribute(){},focus(){},click(){this.onclick&&this.onclick();}});return elements.get(key);};
  let storage=saved?JSON.stringify(saved):null;
  const context={document:{querySelector:el,addEventListener:(type,fn)=>events[type]=fn,title:''},window:{},
    location:{search,pathname:'/toll-city/'},URLSearchParams,
    localStorage:{getItem:()=>storage,setItem:(k,v)=>{writes.push(v);storage=v;}},
    setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},requestAnimationFrame:()=>1,cancelAnimationFrame(){},
    performance:{now:()=>0},matchMedia:()=>({matches:true})};
  vm.createContext(context);
  for(const [,code] of html.matchAll(/<script id="(?:engine|ui)">([\s\S]*?)<\/script>/g))vm.runInContext(code,context);
  return {api:context.window.__tc,E:context,el,writes,persisted:()=>JSON.parse(storage)};
}
const st=ui=>ui.api.state();
const arrivals=(g,i,j)=>[['S',i-1,j],['E',i,j-1],['D',i-1,j-1]].filter(([d,a,b])=>a>=0&&b>=0&&g.weight(i,j,d)!==null&&g.s[a][b]!==undefined)
  .map(([d,a,b])=>({d,val:g.s[a][b]+g.weight(i,j,d)}));
const ready=(g,i,j)=>{if(g.s[i][j]!==undefined)return false;const n=[['S',i-1,j],['E',i,j-1],['D',i-1,j-1]].filter(([d,a,b])=>a>=0&&b>=0&&g.weight(i,j,d)!==null);return n.length&&n.every(([,a,b])=>g.s[a][b]!==undefined);};
function pencilOne(ui,rowOnly){
  const g=st(ui).g;
  for(let i=0;i<=g.n;i++)for(let j=0;j<=g.m;j++){
    if(rowOnly!==undefined&&i!==rowOnly)continue;
    if(ready(g,i,j)){const ar=arrivals(g,i,j),b=Math.max(...ar.map(x=>x.val));ui.api.act('street',i,j,ar.find(x=>x.val===b).d);return [i,j];}
  }
  return null;
}
function walkBack(ui){
  let guard=0;
  while(!st(ui).done&&guard++<100){const c=st(ui),[i,j]=c.pos,d=c.g.arrow[i][j],f=d==='S'?[i-1,j]:d==='E'?[i,j-1]:[i-1,j-1];ui.api.act('corner',f[0],f[1]);}
}
/* Play every level the way a student would, through the same dispatcher the clicks use. */
const play={
  1(ui){ui.api.act('gap',0,0);ui.api.act('gap',0,0);assert.equal(st(ui).a[0],st(ui).inst.v[0]);ui.api.act('lock');},
  2(ui){
    const c=st(ui),{v,w}=c.inst,g=ui.E.greedy(v,w);
    for(const d of g.moves){if(st(ui).g.moves.length>=g.moves.length)break;ui.api.act('move',d);}
    assert.equal(st(ui).done,false,'the greedy player does not reach par');assert(st(ui).g.score<c.inst.par);
    ui.api.act('skip');assert.equal(st(ui).g.moves.length,0);
    for(const d of ui.E.align(v,w,{match:1,mismatch:0,indel:0},'global').moves){if(st(ui).done)break;ui.api.act('move',d);}
  },
  3(ui){
    ui.api.act('answer',1);assert.equal(st(ui).phase,'ask');assert(st(ui).shown);
    ui.api.act('answer',2);assert.equal(st(ui).phase,'dots');
    const tp=st(ui).tp;ui.api.act('corner',tp.i+1,tp.j);assert.equal(st(ui).done,false);
    ui.api.act('corner',tp.i,tp.j);
  },
  4(ui){assert.equal(ui.el('#skip').hidden,true);ui.api.act('bot');assert.equal(st(ui).total,251595969);ui.api.act('skip');},
  5(ui){
    for(const r of ui.E.allRoutes(2,2)){let i=0,j=0;for(const d of r){if(d==='S')i++;else j++;ui.api.act('street',i,j,d);}}
    assert.equal(Object.keys(st(ui).found).length,6);ui.api.act('skip');assert.equal(st(ui).phase,'big');
    // a poorer street is refused by the pencil
    const g=st(ui).g;
    for(let n=0;n<40;n++){
      let bad=null;
      for(let i=0;i<=4&&!bad;i++)for(let j=0;j<=4&&!bad;j++)if(ready(g,i,j)){const ar=arrivals(g,i,j),b=Math.max(...ar.map(x=>x.val));const x=ar.find(y=>y.val<b);if(x)bad=[i,j,x.d];}
      if(bad){ui.api.act('street',...bad);assert.equal(g.s[bad[0]][bad[1]],undefined);assert.equal(st(ui).stage.kind,'warn');break;}
      pencilOne(ui);
    }
    while(g.byHand<15)pencilOne(ui);
    assert.equal(ui.el('#skip').hidden,false);ui.api.act('skip');assert.equal(st(ui).phase,'bot');
    ui.api.act('run');assert.equal(st(ui).done,false);assert.equal(st(ui).botRuns.off.routes,70);
    ui.api.act('memo',true);ui.api.act('run');
  },
  6(ui){ui.api.act('corner',0,0);assert.equal(st(ui).back.length,1);walkBack(ui);},
  7(ui){
    ui.api.act('skip');assert.equal(st(ui).phase,'row');
    ui.api.act('street',2,1,'S');assert.equal(st(ui).g.s[2][1],undefined,'only row 1 is pencilled by hand');
    while(pencilOne(ui,1));
    ui.api.act('skip');assert.equal(st(ui).phase,'back');walkBack(ui);
  },
  8(ui){
    const c=st(ui),g=c.g,b=Math.max(...arrivals(g,2,2).map(x=>x.val));
    ui.api.act('type',String(b-1));assert.equal(c.phase,'one');assert.equal(g.s[2][2],undefined);
    ui.api.act('type',String(b));assert.equal(c.phase,'ready');
    ui.api.act('skip');walkBack(ui);
    assert.notEqual(st(ui).top+st(ui).bot,'');
  },
  9(ui){
    const c=st(ui),p=c.inst,n=p.v.length,m=p.w.length;
    ui.api.act('corner',0,0);ui.api.act('corner',n,m);assert.equal(c.done,false,'corner to corner is not the answer');assert(c.tries[0]<0);
    ui.api.act('corner',...p.local.start);ui.api.act('corner',...p.local.end);
  },
  10(ui){
    const c=st(ui),p=c.inst;
    ui.api.act('corner',2,3);assert.equal(c.on,null,'the taxi is free only down the left edge');
    ui.api.act('corner',0,0);ui.api.act('corner',p.v.length,p.w.length);assert.equal(c.done,false);
    ui.api.act('corner',...p.overlap.start);ui.api.act('corner',...p.overlap.end);
  },
  11(ui){ui.api.act('skip');assert.equal(st(ui).phase,'back');assert.equal(ui.el('#skip').hidden,true);ui.api.act('corner',0,0);assert.equal(st(ui).back.length,1);walkBack(ui);assert.equal(st(ui).back.length,22);}
};

test('a fresh save plays through every level and earns every term, and the move log records each completion',()=>{
  const ui=boot();
  assert.equal(st(ui).L.id,1);
  for(let n=1;n<=11;n++){
    assert.equal(st(ui).L.id,n);
    play[n](ui);
    assert(st(ui).done,'level '+n+' completes');
    const want=ui.api.termsAt()[n]||[];for(const t of want)assert(ui.api.earned().includes(t),t+' earned at level '+n);
    if(n<11){assert.match(ui.el('#panel').innerHTML,/data-act="next"/);ui.api.act('next');}
  }
  const saved=ui.persisted();
  assert.equal(saved.badges.length,13);assert.equal(JSON.stringify([...saved.badges].sort()),JSON.stringify(ui.api.vocab().map(v=>v.id).sort()));
  assert.match(ui.el('#hdrinfo').innerHTML,/13 of 13 terms/);
  const done=ui.api.log().filter(e=>e.ev==='complete').map(e=>e.lvl);
  for(let n=1;n<=11;n++)assert(done.includes(n),'log has level '+n);
  assert.equal(saved.unlocked,11);assert.deepEqual(saved.done,Array.from(ui.api.levels(),l=>l.id));
  assert.match(ui.el('#guideBody').innerHTML,/Rosalind BA5B/);
});
test('every level is open from the start, only finished levels are marked, and saved progress resumes',()=>{
  const ui=boot();assert.doesNotMatch(ui.el('#pips').innerHTML,/ disabled| fin/);
  ui.api.act('lvl',5);assert.equal(st(ui).L.id,5);assert.equal(ui.api.earned().length,0);
  ui.api.act('lvl',1);play[1](ui);assert.deepEqual(ui.persisted().done,[1]);assert.match(ui.el('#pips').innerHTML,/data-a="1" class="on fin"/);const again=boot(ui.persisted());assert.equal(st(again).L.id,2);assert(again.api.earned().includes('alignment'));
});
test('?level=N is a fresh practice session that never reads or writes saved progress',()=>{
  const saved={seed:'SAVED',unlocked:3,badges:['alignment','indel','lcs'],earnedAt:{},variants:{},games:{},arrows:{},routes:{},log:[]};
  for(const n of [1,5,8,11]){
    const ui=boot(saved,'?debug=1&level='+n+'&seed=PRACTICE');
    assert.equal(st(ui).L.id,n);assert.equal(ui.api.earned().length,0);
    play[n](ui);assert(st(ui).done);
    ui.api.act('lvl',2);assert.equal(st(ui).L.id,2);
    assert.equal(ui.writes.length,0);assert.deepEqual(ui.persisted(),saved);
  }
});
test('level 6 replays the arrows pencilled in level 5, and level 8 differs from the level 7 route',()=>{
  const ui=boot();for(let n=1;n<=8;n++){play[n](ui);if(n===5){const g=st(ui).g;ui.api.act('next');assert.deepEqual(JSON.parse(JSON.stringify(st(ui).g.arrow)),JSON.parse(JSON.stringify(g.arrow)));play[6](ui);n=6;}if(n<8)ui.api.act('next');}
  const log=ui.api.log().filter(e=>e.ev==='complete'&&e.lvl===8)[0];assert(log.old&&log.now);assert.notEqual(log.old,log.now);
});
test('the wall level cannot be finished by the bot: it has hundreds of millions of games to play',()=>{
  const ui=boot(null,'?debug=1&level=4&seed=WALL');ui.api.act('bot');
  const c=st(ui);assert.equal(c.bot.played,0);assert(c.total>2.5e8);assert.equal(c.done,false);
  assert.match(ui.el('#skip').textContent,/hopeless/);
});
test('workbench opens without touching saved progress',()=>{
  const ui=boot(null,'?bench=1');assert.equal(ui.writes.length,0);assert.equal(ui.el('#title').textContent,'Workbench');
});

/* Every first-load code: a new browser draws one of these, so each is played through every level. */
test('every first-load code plays every level without a fallback puzzle',()=>{
  const codes=boot().api.codes();assert.equal(codes.length,50);assert.equal(new Set(codes).size,50);
  for(const code of codes){
    const ui=boot(null,'?debug=1&seed='+code);
    for(let n=1;n<=11;n++){if(n>1)ui.api.loadLevel(n);play[n](ui);assert(st(ui).done,code+' level '+n+' completes');}
    assert.equal(ui.api.earned().length,ui.api.vocab().length,code+' earns every term');assert.equal(ui.api.fell(),0,code+' needs no fallback');
  }
});
