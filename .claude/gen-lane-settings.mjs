#!/usr/bin/env node
// .claude/owners.json 에서 레인별 settings.local.json 템플릿을 만든다.
//
//   node .claude/gen-lane-settings.mjs
//
// 손으로 deny 목록을 쓰지 않는 이유는 두 가지다.
//  1. 파일이 하나 늘 때마다 세 사람 몫을 다 고쳐야 한다 → 반드시 어긋난다
//  2. deny 문법은 조용히 실패한다. 오타가 나도 에러가 없고 그 규칙만 무시된다

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const owners = JSON.parse(readFileSync(join(HERE, 'owners.json'), 'utf8'));
const OUT = join(HERE, 'lane-templates');
mkdirSync(OUT, { recursive: true });

// deny 규칙은 `Edit(경로)` 형태만 쓴다.
//  - Write(...) 로 경로를 쓰면 Claude Code 가 받아주기만 하고 참조하지 않는다 (시작 시 경고만)
//  - Edit 규칙 하나가 Edit·Write·NotebookEdit 를 전부 덮는다
//  - Read 는 절대 막지 않는다. 남의 코드는 읽어야 하고, Read deny 는 같은 경로의 Edit 까지 막는다
const edit = (p) => `Edit(${p})`;

for (const [lane, info] of Object.entries(owners.lanes)) {
  const isIntegrator = lane === owners.integrator;

  const settings = {
    $schema: 'https://json.schemastore.org/claude-code-settings.json',
    _comment:
      `레인 ${lane} (${info.role} · @${info.github}) 용. ` +
      `.claude/settings.local.json 으로 복사해서 쓴다. 이 파일은 커밋되지 않는다.`,
    _generated: 'node .claude/gen-lane-settings.mjs — 손으로 고치지 말고 owners.json 을 고친다',
    env: { KOJA_LANE: lane },
    permissions: {},
  };

  if (isIntegrator) {
    // 통합자는 모든 파일을 고쳐야 한다. 막는 대신 훅이 전부 기록한다 → 그게 통합 리포트다.
    settings._comment += ' 통합자라 deny 가 없다. 대신 훅이 모든 수정을 기록한다.';
    settings.permissions.deny = [];
  } else {
    const others = Object.entries(owners.lanes)
      .filter(([l]) => l !== lane)
      .flatMap(([, i]) => i.owns);
    settings.permissions.deny = [...owners.docs, ...others].map(edit);
  }

  const path = join(OUT, `${lane}.json`);
  writeFileSync(path, JSON.stringify(settings, null, 2) + '\n');
  console.log(`${lane} → ${path}  (deny ${settings.permissions.deny.length}개)`);
}
