import { readFile, lstat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

// Dynamic video/image switches reuse assets already declared in the HTML.
export async function publicFiles(root) {
  const html = await readFile(resolve(root, 'index.html'), 'utf8');
  const files = new Set(['index.html', 'style.css', 'app.js']);
  for (const match of html.matchAll(/(?:src|href|poster)="(assets\/[^"#]+)"/g)) {
    const name = match[1].split('?')[0];
    if (!/^assets\/[a-zA-Z0-9_./-]+$/.test(name) || name.split('/').some(part => !part || part.startsWith('.'))) {
      throw new Error('Invalid public asset path');
    }
    files.add(name);
  }
  for (const name of files) {
    const file = resolve(root, name);
    if (!file.startsWith(resolve(root) + sep)) throw new Error('Asset outside site root');
    // Reject symlinked assets and parents instead of publishing their targets.
    let current = resolve(root);
    for (const segment of name.split('/')) {
      current = resolve(current, segment);
      if ((await lstat(current)).isSymbolicLink()) throw new Error('Symlinked public path');
    }
    if (!(await lstat(file)).isFile()) throw new Error(`Missing public file: ${name}`);
  }
  return [...files].sort();
}
