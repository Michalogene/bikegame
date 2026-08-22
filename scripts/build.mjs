import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const entry of ['index.html', 'styles', 'src', 'vendor', 'README.md', 'ASSET_LICENSES.md']) {
  await cp(resolve(root, entry), resolve(dist, entry), { recursive: true });
}

process.stdout.write('Built static distribution in dist/.\n');
