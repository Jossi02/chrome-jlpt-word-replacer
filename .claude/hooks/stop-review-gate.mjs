#!/usr/bin/env node
// Stop
// 이번 턴에서 소스 파일이 바뀌었으면: 테스트 전체를 돌리고, 리뷰를 마칠 때까지 턴을 막는다.
// "기능 하나 = 한 턴" 이므로 기능이 추가될 때마다 정확히 한 번 걸린다.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { resolveRunner } from './_runner.mjs';

const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const STATE = join(ROOT, '.claude', 'state', 'pending-review.json');

function readStdin() {
  try { return JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { return {}; }
}
function loadPending() {
  if (!existsSync(STATE)) return [];
  try { const s = JSON.parse(readFileSync(STATE, 'utf8')); return Array.isArray(s.files) ? s.files : []; }
  catch { return []; }
}
function clearPending() {
  mkdirSync(dirname(STATE), { recursive: true });
  writeFileSync(STATE, JSON.stringify({ files: [] }, null, 2));
}

const input = readStdin();
const pending = loadPending();
if (pending.length === 0) process.exit(0); // 소스 변경 없음 → 조용히 통과

const runner = resolveRunner(ROOT);
let testFailed = false;
let testSection;

if (!runner) {
  testSection = '테스트: **러너 없음** (`*.test.js` 도 `package.json` 의 test 스크립트도 없음)';
} else {
  const r = runner.run();
  testFailed = r.status !== 0;
  const tail = String((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-30).join('\n');
  testSection = `테스트: \`${runner.label}\` → ${testFailed ? '**실패**' : '통과'}\n\`\`\`\n${tail}\n\`\`\``;
}

// 이미 한 번 막은 뒤라면(리뷰 라운드 중) 다시 막지 않는다 → 무한 루프 방지
if (input.stop_hook_active === true) {
  clearPending();
  if (testFailed) {
    process.stdout.write(JSON.stringify({
      systemMessage: `⚠ 리뷰 후에도 테스트가 실패합니다 (${runner.label}). 다음 턴에서 마저 고치세요.`
    }));
  }
  process.exit(0);
}

clearPending();

const reason = [
  `[리뷰 게이트] 이번 턴에서 소스 ${pending.length}개가 변경되었습니다:`,
  pending.map(f => `  - ${f}`).join('\n'),
  '',
  testSection,
  '',
  '턴을 끝내기 전에 아래를 수행하세요.',
  '',
  '1. 테스트',
  testFailed
    ? '   - 실패한 테스트를 고칩니다. 테스트 쪽이 틀렸다고 판단되면 근거를 밝히고 테스트를 고칩니다.'
    : (runner
        ? '   - 통과했습니다. 이번에 바뀐 로직을 실제로 덮는 케이스가 있는지 확인하고, 없으면 추가합니다.'
        : '   - 변경된 것이 순수 함수(특히 `src/matcher.js` 의 조사 분리)라면 `test/matcher.test.js` 를 만들고 `node --test` 로 돌립니다. SPEC §10 이 이 부분만은 자동 테스트할 값어치가 있다고 못박아 두었습니다.'),
  '',
  '2. 코드 리뷰 — 변경된 파일을 SPEC.md 와 대조합니다. 특히:',
  '   - §4.3 단어당 첫 등장만 치환 (`replacedLemmas` 가 지연 재스캔 사이에 유지되는가)',
  '   - §4.4 조사 처리 (긴 조사 우선 / 앞 글자가 한글이면 제외 / 목록 밖 글자가 뒤에 붙으면 치환 안 함)',
  '   - §4.6 치환 대상 영역 (input·textarea·contenteditable 을 건드리지 않는가)',
  '   - §8.5 에러 처리 (스캔 사이클 try/catch, 페이지당 치환 상한)',
  '   - 모듈 경계: `matcher.js` 는 DOM 을 몰라야 한다 (SPEC §8.1)',
  '   더 넓게 훑고 싶으면 `/code-review` 스킬을 쓰세요.',
  '',
  '3. 마무리 — 고친 것과 리뷰 결과를 2~3줄로 보고하고 턴을 끝냅니다. 문제가 없으면 "리뷰 통과"라고만 해도 됩니다.'
].join('\n');

process.stdout.write(JSON.stringify({ decision: 'block', reason }));
