import {mkdir,copyFile,writeFile,readFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'_site');
// Only these reviewed learning resources are public. Never copy whole material folders.
const units=['motifs','genome-assembly','alignment','hmm','evolutionary-trees','clustering','burrows-wheeler'];
const resources=['play-guide','discussion-questions','coding-and-paper-tasks'];
const publicFiles=['index.html','motif-slots/index.html','bridge-walker/index.html','toll-city/index.html','hollow-mountain/index.html',
  'paint-by-k/index.html','the-loom/index.html','cho-han-night/index.html','lockpick/index.html',
  ...units.flatMap(unit=>resources.map(resource=>`materials/${unit}-${resource}.docx`)),
  // the shared book shell: bar, covers, sound and celebrations
  'book/book.css','book/book.js','book/chapters.js','book/favicon.svg',
  ...['motif-slots','bridge-walker','toll-city','hollow-mountain','paint-by-k','the-loom','cho-han-night','lockpick'].map(g=>`book/art/${g}.svg`),
  'materials/learning-guide.docx','materials/suggested-investigations.docx','materials/presentation-checklist.docx'];
const aliases={'bridge-walker/level-12/index.html':'bridge-walker/index.html'};
await rm(output,{recursive:true,force:true});
for(const file of publicFiles){await mkdir(path.dirname(path.join(output,file)),{recursive:true});await copyFile(path.join(root,file),path.join(output,file));}
for(const [dest,src] of Object.entries(aliases)){await mkdir(path.dirname(path.join(output,dest)),{recursive:true});
  // an alias sits one folder deeper, so its links to the shared shell and the contents page need one more step up
  const html=await readFile(path.join(root,src),'utf8');await writeFile(path.join(output,dest),html.replaceAll('"../','"../../'));}
await writeFile(path.join(output,'.nojekyll'),'');
console.log(`Built ${publicFiles.length+Object.keys(aliases).length} public files in _site/`);
