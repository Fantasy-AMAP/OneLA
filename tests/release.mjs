import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { publicFiles } from '../public-files.mjs';
async function list(root, prefix='') {
  const result=[];
  for (const entry of await readdir(resolve(root,prefix), {withFileTypes:true})) {
    const name=prefix ? `${prefix}/${entry.name}` : entry.name;
    assert(!entry.isSymbolicLink(), `Symlink in release: ${name}`);
    if(entry.isDirectory()) result.push(...await list(root,name)); else result.push(name);
  }
  return result.sort();
}
const expected=await publicFiles('.');
assert.deepEqual(await list('dist'),expected,'Release must contain exactly the public allowlist');
for (const name of expected) {
  assert((await readFile(resolve('dist',name))).equals(await readFile(resolve(name))), `Build copy differs: ${name}`);
}
const privateMarkers=/(?:\/Users\/|\/home\/|(?:[A-Z]:\\Users\\)|AKIA[A-Z0-9]{16}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|hf_[A-Za-z0-9]{20,}|BEGIN [A-Z ]*PRIVATE KEY)/i;
for(const name of expected.filter(x=>/\.(html|css|js|svg|vtt)$/.test(x))) {
  assert(!privateMarkers.test(await readFile(resolve('dist',name),'utf8')),`Private marker in ${name}`);
}
console.log(`Release verified: ${expected.length} public files; no private files or internal text markers`);
