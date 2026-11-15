import {mkdir,copyFile,writeFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'_site');
// Explicit public-file list keeps instructor keys, tests, and local tooling out of Pages.
const publicFiles=['index.html','bridge-walker/index.html','lockpick/index.html','materials/genome-assembly-reading-guide.docx'];
await rm(output,{recursive:true,force:true});
for(const file of publicFiles){await mkdir(path.dirname(path.join(output,file)),{recursive:true});await copyFile(path.join(root,file),path.join(output,file));}
await writeFile(path.join(output,'.nojekyll'),'');
console.log(`Built ${publicFiles.length} public files in _site/`);
