/* The whole-book link and the installable app: the pieces that must agree across files. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'../..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const home=read('index.html');
const book={};vm.runInNewContext(read('book/chapters.js'),{window:book});
function gameLink(c){
  const el=()=>({innerHTML:'',textContent:'',hidden:false,value:'',dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},setAttribute(){},focus(){},click(){}});
  const els=new Map(),q=k=>{if(!els.has(k))els.set(k,el());return els.get(k);};let stored=null;
  const ctx={module:{exports:{}},document:{querySelector:q,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){},title:''},window:{},
    location:{search:'?seed=BOOK%2F1',hash:'',pathname:'/'+c.dir+'/',origin:'https://example.test'},URLSearchParams,history:{replaceState(){}},
    localStorage:{getItem:()=>null,setItem:(k,v)=>{assert.equal(k,c.key,'chapters.js names the storage key the game really uses');stored=v;}},
    setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},requestAnimationFrame:()=>1,cancelAnimationFrame(){},performance:{now:()=>0},matchMedia:()=>({matches:true})};
  vm.createContext(ctx);
  for(const [,code] of read(c.dir+'/index.html').matchAll(/<script id="(?:engine|ui)">([\s\S]*?)<\/script>/g))vm.runInContext(code,ctx);
  return JSON.parse(stored).link;
}
test('the front page checks a chapter’s link exactly as the chapter’s game writes it',()=>{
  const src=/const mark=[^\n]+\nfunction sound\(c,enc\)\{[^\n]+\n[^\n]+\}/.exec(home);assert(src,'front page still has mark() and sound()');
  const sound=vm.runInNewContext(src[0]+';sound');
  assert.equal(book.BOOK.chapters.length,7);
  for(const c of book.BOOK.chapters){
    const link=gameLink(c);assert.match(link,/^1\.[0-9a-z]+\.[01]+\.[0-9a-z]+\.BOOK%2F1$/,c.dir);
    assert.equal(link.split('.')[1].length,c.terms,c.dir+': term count in chapters.js');assert.equal(link.split('.')[2].length,c.levels,c.dir+': level count in chapters.js');
    assert(!/[\/:]/.test(link),'a game link never holds the characters that separate chapters in a book link');
    assert.equal(sound(c,link),true,c.dir);assert.equal(sound(c,link.replace('.0','.1')),false,c.dir+' changed');
    assert.equal(sound(book.BOOK.chapters.find(x=>x!==c),link),false,c.dir+' offered to another chapter');
  }
});
test('every page offers the app, and the manifest and worker are ready for the build',()=>{
  const m=JSON.parse(read('manifest.webmanifest'));
  assert.equal(m.display,'standalone');assert.equal(m.start_url,'./');assert.equal(m.scope,'./');
  for(const size of ['192x192','512x512'])assert(m.icons.some(i=>i.sizes===size&&i.purpose==='any'),size);
  assert(m.icons.some(i=>i.purpose==='maskable'));
  for(const i of m.icons)assert(fs.existsSync(path.join(root,i.src)),i.src);
  const build=read('scripts/build.mjs');
  for(const f of ['manifest.webmanifest','sw.js','book/icon-180.png',...m.icons.map(i=>i.src)])assert(build.includes("'"+f+"'"),f+' is published');
  const sw=read('sw.js');assert(sw.includes("const VERSION='dev';")&&sw.includes('const FILES=[];'),'build placeholders');
  assert.match(home,/<link rel="manifest" href="manifest\.webmanifest">/);assert.match(home,/data-bk-app/);
  for(const g of ['motif-slots','bridge-walker','toll-city','hollow-mountain','paint-by-k','the-loom','cho-han-night','lockpick'])
    assert.match(read(g+'/index.html'),/<link rel="manifest" href="\.\.\/manifest\.webmanifest">/,g);
  for(const c of book.BOOK.chapters)assert.match(read(c.dir+'/index.html'),/<div data-bk-app><\/div>/,c.dir);
  const shell=read('book/book.js');assert.match(shell,/navigator\.storage\.persist\(\)/);assert.match(shell,/beforeinstallprompt/);assert.match(shell,/serviceWorker\.register\(base\+'sw\.js'\)/);
});
