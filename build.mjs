import { mkdir, copyFile, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { publicFiles } from './public-files.mjs';
const root = resolve('.');
const files = await publicFiles(root);
// dist is generated output: recreate it so removed assets never survive a build.
await rm(resolve(root, 'dist'), {recursive:true, force:true});
for (const name of files) {
  const destination = resolve(root, 'dist', name);
  await mkdir(dirname(destination), {recursive:true});
  await copyFile(resolve(root, name), destination);
}
console.log(`Built ${files.length} public files in dist/`);
