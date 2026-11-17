/* Open levels and the progress link, checked the same way in every game. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const GAMES=['bridge-walker','motif-slots','toll-city','hollow-mountain','paint-by-k','the-loom','cho-han-night','long-distance'];
function boot(game,{search='?debug=1',hash='',saved=null,confirm}={}){
  const html=fs.readFileSync(path.join(__dirname,'../..',game,'index.html'),'utf8');
  const elements=new Map(),writes=[],urls=[];
  const el=key=>{if(!elements.has(key))elements.set(key,{innerHTML:'',textContent:'',hidden:false,checked:false,disabled:false,value:'',dataset:{},style:{setProperty(){}},
    classList:{add(){},remove(){},toggle(){}},setAttribute(k,v){this[k]=v;},focus(){},click(){this.onclick&&this.onclick();}});return elements.get(key);};
  let storage=saved?JSON.stringify(saved):null;
  const context={module:{exports:{}},document:{querySelector:el,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){},title:''},window:{},
    location:{search,hash,pathname:'/'+game+'/',origin:'https://example.test'},URLSearchParams,history:{replaceState:(a,b,u)=>urls.push(u)},
    localStorage:{getItem:()=>storage,setItem:(k,v)=>{writes.push(v);storage=v;}},
    setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},requestAnimationFrame:()=>1,cancelAnimationFrame(){},
    performance:{now:()=>0},matchMedia:()=>({matches:true})};
  if(confirm)context.confirm=confirm;
  vm.createContext(context);
  for(const [,code] of html.matchAll(/<script id="(?:engine|ui)">([\s\S]*?)<\/script>/g))vm.runInContext(code,context);
  const api=context.window[Object.keys(context.window).find(k=>k.startsWith('__'))];
  return {api,el,writes,urls,persisted:()=>JSON.parse(storage),hash:()=>{const v=el('#saveLink').value;return v.slice(v.indexOf('#'));}};
}
/* a save as a student might leave it: the first half of the terms, levels 1, 2 and the last one finished */
function someProgress(game,seed='MY CODE/7'){
  const probe=boot(game),ids=Array.from(probe.api.vocab(),v=>v.id),n=probe.api.levels().length;
  const badges=ids.slice(0,Math.ceil(ids.length/2)),earnedAt={};badges.forEach((id,i)=>earnedAt[id]=1+i%n);
  return {saved:{seed,unlocked:3,done:[1,2,n],badges,earnedAt,variants:{},log:[]},n};
}
const plain=x=>JSON.parse(JSON.stringify(x));
for(const game of GAMES){
  test(game+': every level is open on a first visit, and nothing is earned by opening one',()=>{
    const ui=boot(game,{search:'?debug=1&seed=OPEN'}),n=(ui.el('#pips').innerHTML.match(/<button/g)||[]).length;
    assert(n>=10);assert.doesNotMatch(ui.el('#pips').innerHTML,/ disabled| fin/);
    for(let id=n;id>=1;id--){ui.api.loadLevel(id);assert.equal(ui.api.state().L.id,id);}
    assert.equal(ui.api.saved().badges.length,0);assert.deepEqual(plain(ui.api.saved().done),[]);
  });
  test(game+': the progress link restores an empty browser, and the address is left clean',()=>{
    const {saved,n}=someProgress(game),home=boot(game,{saved}),link=home.hash();
    assert.match(link,/^#save=1\.[0-9a-z]+\.[01]+\.[0-9a-z]+\..+$/);
    assert.equal(home.el('#saveLink').value,'https://example.test/'+game+'/?debug=1'+link);
    const away=boot(game,{hash:link}),S=away.persisted();
    assert.equal(S.seed,saved.seed);assert.deepEqual(S.badges.slice().sort(),saved.badges.slice().sort());
    assert.deepEqual(S.earnedAt,saved.earnedAt);assert.deepEqual(S.done,[1,2,n]);assert.equal(S.unlocked,n);
    assert.match(away.el('#linkNoteText').textContent,new RegExp('Restored.*'+saved.badges.length+' vocabulary terms? and 3 finished levels'));
    assert.equal(away.el('#linkNote').hidden,false);
    assert(S.log.some(e=>e.ev==='restore'&&e.terms.length===saved.badges.length));
    assert.equal(away.hash(),link,'the restored page offers the same link');
    assert.deepEqual(away.urls,['/'+game+'/?debug=1'],'the link is taken out of the address once read');assert.equal(home.urls.length,0);assert.equal(S.link,link.slice(6),'the save records its own link for the front page');
    assert.equal(away.api.state().L.id,3,'opens on the first unfinished level');assert.equal(away.el('#copyLinkTop').hidden,true);
    away.el('#copyLinkTop').hidden=true;away.api.saved().done.push(3);away.el('#restart').click();
    assert.match(away.el('#linkNoteText').textContent,/progress link has changed/);assert.equal(away.el('#copyLinkTop').hidden,false);
    assert.match(away.hash(),/^#save=1\.[0-9a-z]+\.111/);
    for(const id of [1,2,n])assert.match(away.el('#pips').innerHTML,new RegExp('="'+id+'" class="(on)? fin"'));
  });
  test(game+': a link only adds to what the browser already has',()=>{
    const {saved,n}=someProgress(game),link=boot(game,{saved}).hash();
    const local=Object.assign(boot(game,{search:'?debug=1'}).persisted(),{seed:saved.seed,unlocked:4,done:[1,3],badges:[saved.badges[0]],earnedAt:{[saved.badges[0]]:3}});
    const S=boot(game,{hash:link,saved:local}).persisted();
    assert.deepEqual(S.done,[...new Set([1,2,3,n])].sort((a,b)=>a-b));assert.equal(S.badges.length,saved.badges.length);
    assert.equal(S.earnedAt[saved.badges[0]],3,'a term already held keeps its own level');
    const same=boot(game,{hash:link,saved});assert.equal(same.el('#linkNoteText').textContent,'');assert(!same.persisted().log.some(e=>e.ev==='restore'));
  });
  test(game+': a changed or cut-off link restores nothing and says so',()=>{
    const {saved}=someProgress(game),link=boot(game,{saved}).hash();
    const parts=link.split('.');parts[1]=(parts[1][parts[1].length-1]==='0'?parts[1].slice(0,-1)+'1':'1'+parts[1].slice(1).replace(/^./,'2'));
    for(const bad of [parts.join('.'),link.slice(0,-2),link.replace(/\.[01]+\./,m=>m.replace(/0/,'1')),'#save=nonsense']){
      const ui=boot(game,{hash:bad});
      assert.equal(ui.api.saved().badges.length,0,bad);assert.deepEqual(plain(ui.api.saved().done),[]);
      assert.match(ui.el('#linkNoteText').textContent,/nothing was restored/);
    }
  });
  test(game+': a link for another puzzle code asks before replacing progress',()=>{
    const {saved}=someProgress(game),link=boot(game,{saved}).hash();
    const local=Object.assign(boot(game,{search:'?debug=1&seed=OTHER'}).persisted(),{unlocked:2,done:[1],badges:[saved.badges[1]],earnedAt:{[saved.badges[1]]:1}});
    let asked='';
    const kept=boot(game,{hash:link,saved:local,confirm:m=>{asked=m;return false;}});
    assert.match(asked,/MY CODE\/7[\s\S]*OTHER/);assert.equal(kept.persisted().seed,'OTHER');assert.deepEqual(kept.persisted().done,[1]);
    assert.match(kept.el('#linkNoteText').textContent,/Kept the progress saved in this browser/);
    const swapped=boot(game,{hash:link,saved:local,confirm:()=>true});
    assert.equal(swapped.persisted().seed,saved.seed);assert.equal(swapped.persisted().badges.length,saved.badges.length);
    let quiet=true;const empty=boot(game,{hash:link,saved:{seed:'BLANK',unlocked:1,badges:[],earnedAt:{},variants:{},log:[]},confirm:()=>{quiet=false;return false;}});
    assert(quiet,'an empty save is replaced without a question');assert.equal(empty.persisted().seed,saved.seed);
  });
  test(game+': a save from before levels were open keeps its finished levels',()=>{
    const old={seed:'OLD',unlocked:4,badges:[],earnedAt:{},variants:{},log:[{t:1,lvl:6,ev:'complete'}]};
    const ui=boot(game,{saved:old});assert.deepEqual(ui.persisted().done,[1,2,3,6]);
    assert.equal(ui.api.state().L.id,4,'opens on the first unfinished level');assert.doesNotMatch(ui.el('#pips').innerHTML,/ disabled/);
  });
  test(game+': a practice session ignores a progress link and writes no address',()=>{
    const {saved}=someProgress(game),link=boot(game,{saved}).hash();
    const ui=boot(game,{search:'?debug=1&level=2',hash:link});
    assert.equal(ui.api.saved().badges.length,0);assert.equal(ui.urls.length,0);assert.equal(ui.writes.length,0);assert.equal(ui.el('#savebar').hidden,true);
  });
  test(game+': ?seed= starts that puzzle code, and the progress link carries it',()=>{
    const ui=boot(game,{search:'?debug=1&seed=CLASS'});
    assert.equal(ui.api.saved().seed,'CLASS');assert.match(ui.el('#saveLink').value,/\/[a-z-]+\/\?debug=1#save=.*\.CLASS$/);assert.equal(ui.urls.length,0);
  });
}
