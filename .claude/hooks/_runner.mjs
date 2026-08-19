// 테스트 러너 탐지. 기술 스택이 SPEC §6 에서 아직 미정이라 자동으로 고른다.
//   1) package.json 에 test 스크립트가 있으면  → npm test
//   2) *.test.js 나 test/ 안의 .js 가 있으면    → node --test  (인자 없이: 루트에서 자동 탐색)
//   3) 둘 다 없으면                             → null (테스트 건너뜀)
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const IGNORE_DIRS = new Set(['.claude', 'node_modules', '.git', 'dist', 'build']);
const TEST_FILE = /\.test\.(js|mjs|cjs|ts)$/;

function findTests(dir, depth = 0) {
  if (depth > 4) return false;
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return false; }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name)) continue;
      // node --test 는 test/ 안의 모든 .js 를 테스트로 본다
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
