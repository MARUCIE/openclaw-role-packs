import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const sourceArgIndex = process.argv.indexOf('--source');
const sourceInput = sourceArgIndex === -1 ? process.env.FOUNDRY_SOURCE : process.argv[sourceArgIndex + 1];
if (!sourceInput) {
  throw new Error('Missing Foundry source. Pass --source <foundry-root> or set FOUNDRY_SOURCE.');
}
const source = resolve(sourceInput);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupRoot = join(root, '.sync-backups', stamp);
const tmpRoot = join(root, '.sync-tmp', stamp);
const sourcePacks = join(source, 'web', 'public', 'packs');
const sourceData = join(source, 'web', 'public', 'data');
const targetPacks = join(root, 'packs');
const targetCatalog = join(root, 'catalog');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function readCatalogEntries(path) {
  if (!existsSync(path)) return [];
  const raw = readJson(path);
  return Array.isArray(raw) ? raw : raw.packs || [];
}

if (!existsSync(sourcePacks) || !statSync(sourcePacks).isDirectory()) {
  throw new Error(`source packs directory missing: ${sourcePacks}`);
}
if (!existsSync(sourceData) || !statSync(sourceData).isDirectory()) {
  throw new Error(`source data directory missing: ${sourceData}`);
}

mkdirSync(tmpRoot, { recursive: true });
cpSync(sourcePacks, join(tmpRoot, 'packs'), { recursive: true });
mkdirSync(join(tmpRoot, 'catalog'), { recursive: true });
for (const filename of ['packs.json', 'skills.json', 'skills-categories.json', 'collections.json', 'providers.json', 'stats.json', 'role-pack-release.json']) {
  const src = join(sourceData, filename);
  if (existsSync(src)) cpSync(src, join(tmpRoot, 'catalog', filename));
}

const sourcePackDirs = readdirSync(join(tmpRoot, 'packs'))
  .filter((name) => statSync(join(tmpRoot, 'packs', name)).isDirectory())
  .sort();
const catalogPacksPath = join(tmpRoot, 'catalog', 'packs.json');
const catalogPacksRaw = readJson(catalogPacksPath);
const catalogPacks = Array.isArray(catalogPacksRaw) ? catalogPacksRaw : catalogPacksRaw.packs || [];
const existingCatalogById = new Map(readCatalogEntries(join(targetCatalog, 'packs.json')).map((entry) => [entry.id, entry]));
const catalogIds = new Set(catalogPacks.map((entry) => entry.id));
for (const packId of sourcePackDirs) {
  if (catalogIds.has(packId)) continue;
  const manifest = readJson(join(tmpRoot, 'packs', packId, 'manifest.json'));
  const previous = existingCatalogById.get(packId);
  catalogPacks.push(previous || {
    id: packId,
    name: manifest.name || packId,
    nameZh: manifest.nameZh || manifest.name || packId,
    description: manifest.description || `Deprecated alias for ${manifest.deprecated_alias_of || packId}.`,
    descriptionZh: manifest.descriptionZh || `旧安装别名，指向 ${manifest.deprecated_alias_of || packId}。`,
    icon: 'extension',
    color: '#64748B',
    line: 'legacy',
    lineZh: '旧别名',
    layerIds: [],
    version: manifest.version || '1.0.0',
    files: ['CLAUDE.md', 'AGENTS.md', 'settings.json', 'prompts.md', 'install.sh', 'manifest.json'],
    artifacts: {
      skills: 0,
      agents: 0,
      references: 0
    },
    tier: 'deprecated',
    specVersion: '1.0',
    hasFirstUseDemo: false,
    hasE2eEvidence: false
  });
}
catalogPacks.sort((a, b) => a.id.localeCompare(b.id));
if (Array.isArray(catalogPacksRaw)) {
  writeJson(catalogPacksPath, catalogPacks);
} else {
  writeJson(catalogPacksPath, { ...catalogPacksRaw, packs: catalogPacks });
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
