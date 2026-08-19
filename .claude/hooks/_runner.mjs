// KoJa 테스트 러너 탐지.
//   1) package.json의 test 스크립트가 있으면 → npm test
//   2) tests/**/*.test.{js,mjs,cjs,ts}가 있으면 → node --test
//   3) 둘 다 없으면 → null (P0 골격 단계에서는 테스트를 건너뜀)
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const IGNORE_DIRS = new Set(['hooks', 'node_modules', '.git', 'dist', 'build']);
const TEST_FILE = /\.test\.(js|mjs|cjs|ts)$/;

function findTests(dir, depth = 0) {
  if (depth > 4) return false;
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return false; }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name)) continue;
      // node --test는 test/ 안의 모든 .js도 테스트로 본다.
      if (e.name === 'test' && readdirSync(join(dir, e.name)).some(f => f.endsWith('.js'))) return true;
      if (findTests(join(dir, e.name), depth + 1)) return true;
    } else if (TEST_FILE.test(e.name)) {
      return true;
    }
  }
  return false;
}

export function resolveRunner(root, timeoutMs = 120000) {
  const pkg = join(root, 'package.json');
  if (existsSync(pkg)) {
    try {
      const t = JSON.parse(readFileSync(pkg, 'utf8'))?.scripts?.test;
      if (t && !/no test specified/i.test(t)) {
        return { label: 'npm test', run: () => spawnSync('npm test', { cwd: root, encoding: 'utf8', shell: true, timeout: timeoutMs }) };
      }
    } catch {}
  }
  if (findTests(root)) {
    return { label: 'node --test', run: () => spawnSync(process.execPath, ['--test'], { cwd: root, encoding: 'utf8', timeout: timeoutMs }) };
  }
  return null;
}
