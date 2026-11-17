/* Offline copy of the book. Every request goes to the network first, so a reader who is online always gets the
   published page; the cache answers only when the network does not. scripts/build.mjs fills in the two lines below. */
const VERSION='dev';
const FILES=[];
const CACHE='book-'+VERSION;
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>Promise.all(FILES.map(f=>c.add(new Request(f,{cache:'reload'})).catch(()=>{})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('book-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET'||new URL(r.url).origin!==self.location.origin)return;
  e.respondWith((async()=>{
    try{
      const res=await fetch(r);
      if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy)).catch(()=>{});}
      return res;
    }catch(err){
      const hit=await caches.match(r,{ignoreSearch:true})||(r.mode==='navigate'&&await caches.match('./'));
      if(hit)return hit;
      throw err;
    }
  })());
});
