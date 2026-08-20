import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';

const roots = ['src', 'scripts', 'tests'];
const failures = [];

async function walk(path) {
  for (const name of await readdir(path)) {
    const full = join(path, name);
    const info = await stat(full);
    if (info.isDirectory()) {
      await walk(full);
      continue;
    }
    if (!['.js', '.mjs'].includes(extname(full))) continue;
    const source = await readFile(full, 'utf8');
    if (source.includes('\t')) failures.push(`${full}: contains tab indentation`);
    if (/console\.log\(/.test(source) && !full.endsWith('serve.mjs') && !full.endsWith('build.mjs')) {
      failures.push(`${full}: contains console.log`);
    }
    if (source.length > 45000) failures.push(`${full}: exceeds 45 KB module budget`);
  }
}

for (const root of roots) await walk(root);

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Static checks passed.');
}
