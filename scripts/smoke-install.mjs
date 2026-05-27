import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname;
const packsDir = join(root, 'packs');
const catalog = JSON.parse(readFileSync(join(root, 'catalog', 'packs.json'), 'utf8'));
const allPacks = (Array.isArray(catalog) ? catalog : catalog.packs).map((pack) => pack.id).sort();
const packArgIndex = process.argv.indexOf('--pack');
const selected = packArgIndex === -1 ? allPacks : [process.argv[packArgIndex + 1]].filter(Boolean);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const runRoot = process.env.ROLE_PACKS_TEST_DEST || join(root, 'out', 'verify', `install-smoke-${stamp}`);
const results = [];

mkdirSync(runRoot, { recursive: true });

for (const packId of selected) {
const packDir = join(packsDir, packId);
  const target = join(runRoot, packId);
  mkdirSync(target, { recursive: true });

  const install = spawnSync('bash', [join(root, 'install.sh'), packId, '--agent=codex', '--target', target], {
    cwd: root,
    env: {
      ...process.env,
      INSTALL_DEST: target,
      ROLE_PACKS_BASE_URL: '',
      FOUNDRY_BASE_URL: '',
    },
    encoding: 'utf8',
  });

  if (install.status !== 0) {
    console.error(install.stdout);
    console.error(install.stderr);
    throw new Error(`${packId}: installer exited ${install.status}`);
  }

  const manifest = JSON.parse(readFileSync(join(packDir, 'manifest.json'), 'utf8'));
  const verificationManifest = manifest.deprecated_alias_of
    ? JSON.parse(readFileSync(join(packsDir, manifest.deprecated_alias_of, 'manifest.json'), 'utf8'))
    : manifest;
  const missing = [];
  for (const item of verificationManifest.items) {
    const destination = join(target, item.dst);
    if (!existsSync(destination)) missing.push(item.dst);
  }
  if (missing.length) {
    throw new Error(`${packId}: missing installed files: ${missing.join(', ')}`);
  }

  results.push({ packId, target, files: verificationManifest.items.length });
  console.log(`OK ${packId}: installed ${verificationManifest.items.length} files`);
}

const summary = {
  generated: new Date().toISOString(),
  runRoot,
  packs: results,
};
writeFileSync(join(runRoot, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(`OK smoke installed ${results.length} pack(s) into ${runRoot}`);
