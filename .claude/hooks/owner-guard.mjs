#!/usr/bin/env node
// PostToolUse(Write|Edit)
// 남의 소유 파일을 고쳤을 때 흔적을 남긴다.
//
// 이 훅은 "막는" 훅이 아니다. 막는 것은 settings.local.json 의 deny 가 한다.
// 이 훅은 deny 를 풀고 고쳤을 때(급해서, 또는 통합자라서)
// CHANGELOG-INBOX/ 에 쪽지를 자동으로 남긴다.
//
//   하네스는 금지가 아니라 추적이다.
//
// 내 레인은 KOJA_LANE 으로 정한다. .claude/lane-templates/<레인>.json 을
// .claude/settings.local.json 으로 복사하면 env 에 들어간다.
// 레인이 없으면 아무 일도 하지 않는다 — 훅이 남의 작업을 막으면 안 된다.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative, sep, isAbsolute } from 'node:path';

const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();

function readJSON(p) {
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}

// 내 레인 — env 우선, 없으면 settings.local.json 에서 직접 읽는다
function myLane() {
  if (process.env.KOJA_LANE) return process.env.KOJA_LANE;
  const local = readJSON(join(ROOT, '.claude', 'settings.local.json'));
  return local?.env?.KOJA_LANE || null;
}

// 'data/**' 같은 패턴 매칭. owners.json 의 패턴은 '정확한 경로' 아니면 '접두사/**' 둘뿐이라
// 정규식이 필요 없다. glob 을 흉내내다 이스케이프에서 조용히 틀리는 것보다 이쪽이 안전하다.
function matches(pattern, relPosix) {
  const star = pattern.indexOf('**');
  if (star === -1) return pattern === relPosix;
  const head = pattern.slice(0, star);          // 'data/**' -> 'data/'
  return relPosix.startsWith(head);
}

const lane = myLane();
if (!lane) process.exit(0);           // 레인 미설정 → 조용히 통과

const owners = readJSON(join(ROOT, '.claude', 'owners.json'));
if (!owners?.lanes?.[lane]) process.exit(0);

let event = {};
try { event = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { process.exit(0); }

const filePath = event?.tool_response?.filePath || event?.tool_input?.file_path || '';
if (!filePath || !isAbsolute(filePath)) process.exit(0);

const rel = relative(ROOT, filePath);
if (!rel || rel.startsWith('..')) process.exit(0);   // 프로젝트 밖은 관심 없다
const relPosix = rel.split(sep).join('/');

// 아무나 고쳐도 되는 곳
if ((owners.free || []).some(f => relPosix === f || relPosix.startsWith(f + '/'))) process.exit(0);

// 내 소유면 정상 작업
if ((owners.lanes[lane].owns || []).some(p => matches(p, relPosix))) process.exit(0);

// 여기 왔다 = 내 소유 밖을 고쳤다. 주인을 찾는다
let ownerLane = null;
for (const [l, info] of Object.entries(owners.lanes)) {
  if ((info.owns || []).some(p => matches(p, relPosix))) { ownerLane = l; break; }
}
if (!ownerLane && (owners.docs || []).includes(relPosix)) ownerLane = owners.integrator;

const who = ownerLane
  ? `${ownerLane}(@${owners.lanes[ownerLane].github})`
  : '주인 없음 — OWNERS.md 에 한 줄 추가해야 한다';

const me = `${lane}(@${owners.lanes[lane].github})`;
const d = new Date();
const p2 = n => String(n).padStart(2, '0');
const stamp = `${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}`;

const inbox = join(ROOT, 'CHANGELOG-INBOX');
mkdirSync(inbox, { recursive: true });
const noteName = `${stamp}-${lane}.md`;
const note = join(inbox, noteName);

if (!existsSync(note)) {
  writeFileSync(note, [
    `# ${me} 가 남의 소유 파일을 고쳤습니다 (${stamp})`,
    '',
    '> 이 쪽지는 자동으로 만들어졌습니다.',
    '> **아래 빈칸을 채우고, 담당자에게 알리세요.**',
    '',
    '## 고친 파일',
    '',
    `- \`${relPosix}\` → 주인 ${who}`,
    '',
    '## 왜 고쳤나',
    '',
    '(한 줄: 무슨 문제 때문에 급했는지)',
    '',
    '## 되돌리는 법',
    '',
    '(한 줄: 원래대로 돌리려면 무엇을 지우면 되는지)',
    '',
    '## 담당자 확인',
    '',
    '- [ ] 담당자에게 알렸다 (PR 본문 / 이슈)',
    '- [ ] 담당자가 확인했다',
    '',
  ].join('\n'), 'utf8');
} else {
  // 같은 분에 여러 파일을 고쳤으면 목록에만 덧붙인다
  let text = readFileSync(note, 'utf8');
  if (!text.includes(`\`${relPosix}\``)) {
    text = text.replace('\n\n## 왜 고쳤나', `\n- \`${relPosix}\` → 주인 ${who}\n\n## 왜 고쳤나`);
    writeFileSync(note, text, 'utf8');
  }
}

// exit 2 = stderr 가 Claude 에게 전달된다. Claude 가 읽고 사용자에게 안내한다.
console.error(
  `[소유권 알림] ${relPosix} 은(는) ${who} 의 소유입니다. 나는 ${me} 입니다.\n` +
  `쪽지를 만들었습니다: CHANGELOG-INBOX/${noteName}\n` +
  `사용자에게 (1) 쪽지의 '왜 고쳤나'·'되돌리는 법'을 채우고 (2) OWNERS.md 의 담당자에게 알리라고 안내하세요.`
);
process.exit(2);
