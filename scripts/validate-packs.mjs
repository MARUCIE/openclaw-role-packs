import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, isAbsolute, normalize } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname;
const packsDir = join(root, 'packs');
const catalogPath = join(root, 'catalog', 'packs.json');
const required = ['AGENTS.md', 'CLAUDE.md', 'settings.json', 'prompts.md', 'manifest.json', 'install.sh'];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function isSafeRelativePath(value) {
  if (!value || isAbsolute(value)) return false;
  const normalized = normalize(value);
  return normalized !== '..' && !normalized.startsWith('../') && !normalized.includes('/../');
}

const catalogRaw = readJson(catalogPath);
const catalogPacks = Array.isArray(catalogRaw) ? catalogRaw : catalogRaw.packs;
if (!Array.isArray(catalogPacks)) {
  throw new Error('catalog/packs.json must be an array or an object with packs[]');
}

const ids = [...new Set(catalogPacks.map((pack) => pack.id))].sort();
const dirs = readdirSync(packsDir).filter((name) => statSync(join(packsDir, name)).isDirectory()).sort();
const problems = [];

for (const id of ids) {
  if (!dirs.includes(id)) problems.push(`${id}: catalog id has no matching packs/ directory`);
}

for (const dir of dirs) {
  if (!ids.includes(dir)) problems.push(`${dir}: packs/ directory has no matching catalog entry`);
}

for (const id of dirs) {
  const packDir = join(packsDir, id);
  for (const filename of required) {
    if (!existsSync(join(packDir, filename))) {
      problems.push(`${id}: missing required file ${filename}`);
    }
  }

  const manifestPath = join(packDir, 'manifest.json');
  if (!existsSync(manifestPath)) continue;
  let manifest;
  try {
    manifest = readJson(manifestPath);
  } catch (error) {
    problems.push(`${id}: invalid manifest.json: ${error.message}`);
    continue;
  }

  if (manifest.pack !== id) {
    problems.push(`${id}: manifest.pack is ${manifest.pack}`);
  }
  if (!Array.isArray(manifest.items) || manifest.items.length === 0) {
    problems.push(`${id}: manifest.items must be a non-empty array`);
    continue;
  }

  for (const item of manifest.items) {
    if (!item.src || !item.dst || !item.type) {
      problems.push(`${id}: invalid manifest item ${JSON.stringify(item)}`);
      continue;
    }
    if (!isSafeRelativePath(item.src) || !isSafeRelativePath(item.dst)) {
      problems.push(`${id}: unsafe manifest path ${JSON.stringify(item)}`);
      continue;
    }
    const srcPath = join(packDir, item.src);
    if (!existsSync(srcPath)) {
      problems.push(`${id}: missing manifest source ${item.src}`);
    } else if (!statSync(srcPath).isFile()) {
      problems.push(`${id}: manifest source is not a file ${item.src}`);
    }
  }

  const shell = spawnSync('bash', ['-n', join(packDir, 'install.sh')], { encoding: 'utf8' });
  if (shell.status !== 0) {
    problems.push(`${id}: install.sh shell syntax failed: ${shell.stderr.trim()}`);
  }
}

if (problems.length) {
  console.error(`ERROR validation failed with ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`OK validated ${dirs.length} packs and ${ids.length} catalog entries`);
