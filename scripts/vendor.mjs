import { copyFile, mkdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const source = resolve('node_modules/three/build/three.module.min.js');
const targetDirectory = resolve('vendor');
const target = resolve(targetDirectory, 'three.module.min.js');

try {
  const sourceInfo = await stat(source);
  if (!sourceInfo.isFile()) throw new Error('Three.js module is not a file.');
  await mkdir(targetDirectory, { recursive: true });
  await copyFile(source, target);
  process.stdout.write('Prepared pinned Three.js browser runtime.\n');
} catch (error) {
  throw new Error(`Unable to prepare Three.js. Run npm install first. ${error instanceof Error ? error.message : String(error)}`);
}
