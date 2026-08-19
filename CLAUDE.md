# KoJa — 팀 공통 규칙

> **이 파일은 통합자만 고친다.**
> 기능을 추가한다고 여기에 줄을 더하지 않는다. 여기 남는 것은 **3인 전원 공통 사실**뿐이다.
> 내 레인에만 해당하는 규칙은 그 레인 폴더의 `CLAUDE.md`에 쓴다.

## 이 프로젝트

한국어 웹페이지를 서핑하는 중 일부 명사를 일본어(한자+후리가나)로 치환해 노출시키는 Chrome 확장(MV3).
목표는 의도적 암기가 아니라 **우연적 학습(incidental learning)** — 학습 기록·복습 기능은 의도적으로 없다.

- 실행: `chrome://extensions` → 압축해제된 확장 로드 → 데모는 `python -m http.server`로 띄운 페이지에서 확인
- 검증: `node --test`

**단일 진실 공급원은 [`SPEC.md`](SPEC.md)다.** 구현 판단이 SPEC과 충돌하면 SPEC을 따른다.
근거 코드와 파일 구조는 [`plan.md`](plan.md), 잘게 쪼갠 체크리스트는 [`tasks.md`](tasks.md)에 있다.
막히면 tasks.md → plan.md → SPEC.md 순으로 내려간다.

## 작업 시작 규칙 (중요)

**파일을 고치기 전에, 그 파일의 담당을 `tasks.md`「담당」절에서 확인한다.**
그 파일이 든 폴더에 `CLAUDE.md`가 있으면 **그것도 먼저 읽는다.** 안 읽고 고치면 팀 약속을 어긴다.

## 소유권

| 레인 | 담당 파일 |
|------|-----------|
| **A** 로직 | `src/matcher.js`, `tests/**` |
| **B** DOM | `src/scope.js`, `src/replacer.js`, `src/tooltip.js`, `src/content.js` |
| **C** 데이터·셸·UI | `manifest.json`, `package.json`, `src/popup.html`, `src/popup.js`, `src/content.css`, `data/**`, `tools/**`, `demo/**` |

- **내 담당 밖은 읽기만** 한다. 고칠 게 있으면 담당자에게 요청한다
- 이 파일과 `SPEC.md`·`plan.md`는 **통합자만** 고친다. `tasks.md`는 각자 자기 항목만 체크한다
- 그래도 뚫었으면 → `CHANGELOG-INBOX/`에 쪽지를 남기고 담당자에게 통보한다 (훅이 쪽지를 자동 생성한다)

## 공통 약속

`plan.md`「인터페이스 계약」의 시그니처를 **그대로** 따른다. 병렬 개발이 성립하는 유일한 근거다.
**바꾸려면 3인 합의가 필요하다** — 고치기 전에 사람에게 물어본다.

| 약속 | 지금 값 |
|------|---------|
| 전역 네임스페이스 | 모든 `src/*.js`가 `window.KOJA = window.KOJA \|\| {};`로 시작 |
| 매칭 | `KOJA.matcher.findMatches(text, entries, { maxLevel })` → `[{ start, length, surface, entry }]` |
| 밀도 | `KOJA.matcher.densityStep(density)` → `number` (100→1, 50→2, 25→4, 0→Infinity) |
| 본문 영역 | `KOJA.scope.getRoot(doc)` · `KOJA.scope.eachTextNode(root, fn)` |
| 치환·복원 | `KOJA.replacer.applyMatches(textNode, picks)` · `KOJA.replacer.restoreAll(root)` |
| 툴팁 | `KOJA.tooltip.init()` (멱등) |
| 설정 스키마 | `chrome.storage.local` 최상위 4키 — `enabled` · `furigana` · `level` · `density` |
| 치환 마크업 | `<span class="koja-word" data-ko data-kana>` (§8.4) |

`surface`를 돌려주는 것이 계약의 핵심이다 — 툴팁과 복원이 둘 다 "페이지에 실제로 있던 글자"를 써야 한다.

## 기술 스택 · 제약 (전원 공통)

- **Chrome Manifest V3**, 선언형 콘텐츠 스크립트만 사용(`host_permissions` 불필요, `<all_urls>` 경고는 발표에서 선제 설명).
- 선언형 콘텐츠 스크립트는 **ES 모듈(`import`/`export`)을 지원하지 않는다.** 파일을 `manifest.json`의
  `js` 배열에 순서대로 나열하고 `window.KOJA` 전역에 붙여 공유한다.
- 사전은 `fetch()`가 아니라 `.js` 번들로 읽는다 — 비동기·`web_accessible_resources` 문제를 피하기 위함.
- `file://` 페이지에서는 콘텐츠 스크립트가 기본 비활성 — 데모는 반드시 HTTP로 띄운다.
- 코드 수정 후에는 **확장 새로고침 + 페이지 새로고침 둘 다** 필요하다 (탭에는 옛 스크립트가 남는다).
- 로직은 순수 함수로 뺀다(`matcher.js` 등). DOM/확장 API에 붙는 부분은 얇은 껍질로 남기고 테스트 대상에서 제외한다.
- `data/dictionary.json`이 정본이고 `data/dictionary.js`·`data/substring-pairs.json`은
  `tools/build_dictionary.py`가 자동 생성한다 — **`.js`와 `.json`을 손으로 동시에 고치지 않는다.**
- 사전 648개는 감사를 통과해 확정됐다(SPEC §0.3) — 임의로 항목을 더하거나 빼지 않는다. 불변식 8종은 SPEC §4.5.
- 테스트는 `node --test`. `build_dictionary.py`는 실행 전 로컬 Python 유무를 확인한다 —
  **이 PC에는 Python이 없다**(plan.md P0-2의 경로 B 케이스).

## 현재 상태 — 착수 전 (P0)

`tasks.md` 진행판이 전부 미체크다. `src/`·`data/`·`tools/`·`tests/`·`demo/`가 아직 없고 사전 산출물만
저장소 루트에 평평하게 놓여 있다. **P0-1(저장소 골격 잡기)이 첫 작업이다** — plan.md「최종 파일 구조」대로
파일을 옮기고 인터페이스 계약대로 빈 껍데기를 만든다.

## 서브에이전트 · 훅

`.claude/agents/implementer.md` — 태스크 하나를 TDD로 구현한다. 주의: 그 문서는 소문자 `spec.md`를
참조하지만 실제 파일명은 **`SPEC.md`**다.

- `PostToolUse`(Write|Edit): `post-edit-check.mjs` 문법 검사 · `owner-guard.mjs` 소유권 쪽지(사람마다 로컬 설정)
- `Stop`: `stop-review-gate.mjs` 테스트 + 리뷰 게이트(180s). 세션을 끝낼 때 자동으로 돈다 — 실패하면 고친다

## 하지 말 것

- 이 파일(`CLAUDE.md`), `SPEC.md`, `plan.md` 수정 (통합자만)
- 내 담당 밖 파일 수정 (위 소유권 표)
- 자동 생성물(`data/dictionary.js`, `data/substring-pairs.json`) 직접 편집
- 새 라이브러리 추가 — 먼저 사람에게 물어본다
- SPEC §12는 미결이다. 임의로 확정하지 말고 가장 좁고 되돌리기 쉬운 선택을 한 뒤 가정을 명시한다
- 3인·3일(18~27 인시) 제약이다. 기능을 줄여야 하면 tasks.md 맨 아래 "기능을 줄여야 할 때"를 따른다
