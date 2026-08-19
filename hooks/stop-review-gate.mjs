#!/usr/bin/env node
// Stop
// 이번 턴에서 KoJa 소스가 바뀌었으면 테스트 전체를 돌리고,
// 현재 파일 구조와 인터페이스 계약에 대한 리뷰를 마칠 때까지 턴을 막는다.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { resolveRunner } from './_runner.mjs';

const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const STATE = join(
  tmpdir(),
  'koja-hook-state',
  Buffer.from(ROOT).toString('base64url'),
  'pending-review.json'
);

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
        : '   - 변경된 것이 순수 함수라면 `tests/dictionary.test.mjs` 또는 `tests/matcher.test.mjs`를 만들고 `npm test`로 실행합니다.'),
  '',
  '2. 코드 리뷰 — `SPEC.md`, `plan.md`의 인터페이스 계약과 대조합니다. 특히:',
  '   - A 경계: `src/matcher.js`는 DOM·Chrome API를 모르며 최장 일치·조사·경계 규칙을 지키는가',
  '   - B 경계: 입력 요소와 제외 영역을 건드리지 않고, 복원 뒤 `normalize()`로 원문을 보존하는가',
  '   - 오케스트레이션: 첫 등장 Set과 밀도 러닝 카운터가 지연 스캔 사이에 유지되는가',
  '   - 안전성: 페이지당 치환 상한, 스캔 `try/catch`, MutationObserver 무한 루프 방어가 있는가',
  '   - C 경계: 생성물 `data/dictionary.js`와 `data/substring-pairs.json`을 직접 편집하지 않았는가',
  '   - 로딩 순서: `manifest.json`이 dictionary → matcher → scope → replacer → tooltip → content 순서인가',
  '   더 넓게 훑고 싶으면 `/code-review` 스킬을 쓰세요.',
  '',
  '3. 마무리 — 고친 것과 리뷰 결과를 2~3줄로 보고하고 턴을 끝냅니다. 문제가 없으면 "리뷰 통과"라고만 해도 됩니다.'
].join('\n');

process.stdout.write(JSON.stringify({ decision: 'block', reason }));
