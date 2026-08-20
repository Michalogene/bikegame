import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

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
    if (/console\.log\(/.test(source) && !full.endsWith('serve.mjs') && !full.endsWith('build.mjs') && !full.endsWith('check.mjs') && !full.endsWith('browser-smoke.mjs')) {
      failures.push(`${full}: contains console.log`);
    }
    if (source.length > 50000) failures.push(`${full}: exceeds 50 KB module budget`);
    const syntax = spawnSync(process.execPath, ['--check', full], { encoding: 'utf8' });
    if (syntax.status !== 0) failures.push(`${full}: ${syntax.stderr.trim() || 'syntax check failed'}`);
  }
}

for (const root of roots) await walk(root);

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Static and syntax checks passed.');
}
