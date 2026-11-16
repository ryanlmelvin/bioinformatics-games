import {mkdir,copyFile,writeFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'_site');
// Explicit public-file list keeps instructor keys, tests, and local tooling out of Pages.
const publicFiles=['index.html','motif-slots/index.html','bridge-walker/index.html','toll-city/index.html','hollow-mountain/index.html',
  'paint-by-k/index.html','the-loom/index.html','cho-han-night/index.html','lockpick/index.html','materials/genome-assembly-play-guide.docx',
  'materials/motifs-play-guide.docx','materials/alignment-play-guide.docx','materials/evolutionary-trees-play-guide.docx'];
const aliases={'bridge-walker/level-12/index.html':'bridge-walker/index.html'};
await rm(output,{recursive:true,force:true});
for(const file of publicFiles){await mkdir(path.dirname(path.join(output,file)),{recursive:true});await copyFile(path.join(root,file),path.join(output,file));}
for(const [dest,src] of Object.entries(aliases)){await mkdir(path.dirname(path.join(output,dest)),{recursive:true});await copyFile(path.join(root,src),path.join(output,dest));}
await writeFile(path.join(output,'.nojekyll'),'');
console.log(`Built ${publicFiles.length+Object.keys(aliases).length} public files in _site/`);
