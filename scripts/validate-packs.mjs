import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, isAbsolute, normalize } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname;
const packsDir = join(root, 'packs');
const catalogPath = join(root, 'catalog', 'packs.json');
const skillsCatalogPath = join(root, 'catalog', 'skills.json');
const required = ['AGENTS.md', 'CLAUDE.md', 'settings.json', 'prompts.md', 'manifest.json', 'install.sh'];
const forbiddenPublicSource = /(file:\/\/\/Users\/|\/Users\/|C:[\\/]+Users[\\/]+|~\/Projects)/;
const legacyPagesInstall = /agent-foundry\.pages\.dev\/packs\/[^"'<\s]+\/install\.sh/i;
const publicUrl = /^https?:\/\//i;

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function isSafeRelativePath(value) {
  if (!value || isAbsolute(value)) return false;
  const normalized = normalize(value);
  return normalized !== '..' && !normalized.startsWith('../') && !normalized.includes('/../');
}

function walkStrings(value, visit, path = '$') {
  if (typeof value === 'string') {
    visit(value, path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkStrings(item, visit, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      walkStrings(item, visit, `${path}.${key}`);
    }
  }
}

function listFiles(rootDir) {
  const files = [];
  const pending = [rootDir];
  while (pending.length) {
    const current = pending.pop();
    for (const name of readdirSync(current)) {
      const path = join(current, name);
      const stat = statSync(path);
      if (stat.isDirectory()) pending.push(path);
      else if (stat.isFile()) files.push(path);
    }
  }
  return files.sort();
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

  const settingsPath = join(packDir, 'settings.json');
  if (existsSync(settingsPath)) {
    const settings = readJson(settingsPath);
    walkStrings(settings, (value, path) => {
      if (forbiddenPublicSource.test(value)) {
        problems.push(`${id}: settings.json ${path} exposes local-only source ${value}`);
      }
    });
  }

  const guidePath = join(packDir, 'guide.html');
  if (existsSync(guidePath)) {
    const guide = readFileSync(guidePath, 'utf8');
    if (legacyPagesInstall.test(guide)) {
      problems.push(`${id}: guide.html exposes legacy Pages install.sh URL`);
    }
    if (forbiddenPublicSource.test(guide)) {
      problems.push(`${id}: guide.html exposes local-only source`);
    }
  }

  for (const path of listFiles(packDir)) {
    const text = readFileSync(path, 'utf8');
    if (legacyPagesInstall.test(text)) {
      problems.push(`${id}: ${path.replace(`${packDir}/`, '')} exposes legacy Pages install.sh URL`);
    }
    if (forbiddenPublicSource.test(text)) {
      problems.push(`${id}: ${path.replace(`${packDir}/`, '')} exposes local-only source`);
    }
  }
}

if (existsSync(skillsCatalogPath)) {
  const skillsCatalog = readJson(skillsCatalogPath);
  const skills = skillsCatalog.skills || [];
  for (const skill of skills) {
    const label = skill.id || skill.name || '<unknown>';
    const source = String(skill.source || 'clawhub').toLowerCase();
    if (source === 'local') {
      problems.push(`catalog/skills.json ${label}: local source is not publicly installable`);
    }
    const urls = [skill.url, skill.sourceUrl, skill.repositoryUrl]
      .filter((value) => typeof value === 'string' && value.length > 0);
    if (!urls.some((value) => publicUrl.test(value))) {
      problems.push(`catalog/skills.json ${label}: missing public http(s) source URL`);
    }
    for (const value of urls) {
      if (!publicUrl.test(value) || forbiddenPublicSource.test(value)) {
        problems.push(`catalog/skills.json ${label}: non-public source URL ${value}`);
      }
    }
  }
}

if (problems.length) {
  console.error(`ERROR validation failed with ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`OK validated ${dirs.length} packs and ${ids.length} catalog entries`);
