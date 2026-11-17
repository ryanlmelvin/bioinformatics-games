import {mkdir,copyFile,writeFile,readFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'_site');
// Only these reviewed learning resources are public. Never copy whole material folders.
const units=['motifs','genome-assembly','alignment','hmm','evolutionary-trees','clustering','burrows-wheeler'];
const resources=['play-guide','discussion-questions','coding-and-paper-tasks','pictionary-cards'];
const publicFiles=['index.html','motif-slots/index.html','bridge-walker/index.html','toll-city/index.html','hollow-mountain/index.html',
  'paint-by-k/index.html','the-loom/index.html','cho-han-night/index.html','lockpick/index.html',
  ...units.flatMap(unit=>resources.map(resource=>`materials/${unit}-${resource}.docx`)),
  // the shared book shell: bar, covers, sound and celebrations
  'book/book.css','book/book.js','book/chapters.js','book/favicon.svg',
  // the installable app: manifest, icons and the offline worker
  'manifest.webmanifest','sw.js','book/icon-180.png','book/icon-192.png','book/icon-512.png','book/icon-maskable-512.png',
  ...['motif-slots','bridge-walker','toll-city','hollow-mountain','paint-by-k','the-loom','cho-han-night','lockpick'].map(g=>`book/art/${g}.svg`),
  'materials/learning-guide.docx','materials/suggested-investigations.docx','materials/presentation-checklist.docx'];
const aliases={'bridge-walker/level-12/index.html':'bridge-walker/index.html'};
await rm(output,{recursive:true,force:true});
for(const file of publicFiles){await mkdir(path.dirname(path.join(output,file)),{recursive:true});await copyFile(path.join(root,file),path.join(output,file));}
for(const [dest,src] of Object.entries(aliases)){await mkdir(path.dirname(path.join(output,dest)),{recursive:true});
  // an alias sits one folder deeper, so its links to the shared shell and the contents page need one more step up
  const html=await readFile(path.join(root,src),'utf8');await writeFile(path.join(output,dest),html.replaceAll('"../','"../../'));}
// the offline worker learns which pages to keep (everything but the Word files, which it keeps once opened) and a version that changes with them
const keep=[...publicFiles,...Object.keys(aliases)].filter(f=>!f.endsWith('.docx')&&f!=='sw.js');
const hash=createHash('sha256');for(const f of keep)hash.update(await readFile(path.join(output,f)));
const sw=await readFile(path.join(root,'sw.js'),'utf8');
if(!sw.includes("const VERSION='dev';")||!sw.includes('const FILES=[];'))throw new Error('sw.js has lost its build placeholders');
await writeFile(path.join(output,'sw.js'),sw.replace("const VERSION='dev';",`const VERSION='${hash.digest('hex').slice(0,12)}';`)
  .replace('const FILES=[];',`const FILES=${JSON.stringify(keep.map(f=>f==='index.html'?'./':f.replace(/index\.html$/,'')))};`));
await writeFile(path.join(output,'.nojekyll'),'');
console.log(`Built ${publicFiles.length+Object.keys(aliases).length} public files in _site/`);
