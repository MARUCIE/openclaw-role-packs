import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const sourceArgIndex = process.argv.indexOf('--source');
const source = resolve(sourceArgIndex === -1 ? '/Users/mauricewen/Projects/22-openclaw-foundry' : process.argv[sourceArgIndex + 1]);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupRoot = join(root, '.sync-backups', stamp);
const tmpRoot = join(root, '.sync-tmp', stamp);
const sourcePacks = join(source, 'web', 'public', 'packs');
const sourceData = join(source, 'web', 'public', 'data');
const targetPacks = join(root, 'packs');
const targetCatalog = join(root, 'catalog');

if (!existsSync(sourcePacks) || !statSync(sourcePacks).isDirectory()) {
  throw new Error(`source packs directory missing: ${sourcePacks}`);
}
if (!existsSync(sourceData) || !statSync(sourceData).isDirectory()) {
  throw new Error(`source data directory missing: ${sourceData}`);
}

mkdirSync(tmpRoot, { recursive: true });
cpSync(sourcePacks, join(tmpRoot, 'packs'), { recursive: true });
mkdirSync(join(tmpRoot, 'catalog'), { recursive: true });
for (const filename of ['packs.json', 'skills.json', 'skills-categories.json', 'collections.json', 'providers.json', 'stats.json']) {
  const src = join(sourceData, filename);
  if (existsSync(src)) cpSync(src, join(tmpRoot, 'catalog', filename));
}

mkdirSync(backupRoot, { recursive: true });
if (existsSync(targetPacks)) renameSync(targetPacks, join(backupRoot, 'packs'));
if (existsSync(targetCatalog)) renameSync(targetCatalog, join(backupRoot, 'catalog'));
renameSync(join(tmpRoot, 'packs'), targetPacks);
renameSync(join(tmpRoot, 'catalog'), targetCatalog);
rmSync(join(root, '.sync-tmp'), { recursive: true, force: true });

console.log(`OK synced from ${source}`);
console.log(`Backup: ${backupRoot}`);
console.log(`Packs: ${readdirSync(targetPacks).filter((name) => statSync(join(targetPacks, name)).isDirectory()).length}`);
