# KoJa — 팀 공통 규칙

> 이 파일은 통합자만 수정한다. 기능별 세부 지침은 여기에 늘리지 않고 `plan.md`와 `tasks.md`에 둔다.

## 기준 문서

- `SPEC.md`: 제품 요구사항과 기술 결정의 단일 진실 공급원
- `plan.md`: 파일 구조, 인터페이스 계약, 구현·검증 방법
- `tasks.md`: 실행 순서와 담당별 체크리스트
- 충돌 시 `SPEC.md` → `plan.md` → `tasks.md` 순으로 따른다.

## 프로젝트

한국어 웹페이지의 일부 명사를 일본어 표기와 후리가나로 치환하는 Chrome MV3 확장이다.
런타임 네트워크 호출, 번역 API, LLM, 학습 기록·복습 기능은 범위 밖이다.
사전은 646개 엔트리와 677개 표면형이며 `data/dictionary.json`이 정본이다.
(D3-2 실측 오탐 제거로 648/680에서 줄었다 — `SPEC.md` v2.2, `docs/misfires.md`)

## 현재 상태

- P0-1 구조와 `window.KOJA` 인터페이스 껍데기가 준비돼 있다.
- `src/matcher.js`는 3단어 walking skeleton이며 D1-A2에서 교체한다.
- 나머지 `src/` 파일은 담당 단계에서 구현할 스텁이다.
- `tests/`는 아직 비어 있어 `npm test` 결과가 현재 0 tests다.
- 이 PC에는 Python이 없어 사전 빌드는 실행하지 못한다. 설치 전에는 사전 정본을 수정하지 않는다.

## 소유권

소유권 지도는 다음 줄로 **이 파일과 함께 자동으로 읽힌다.** 정본은 그쪽이다.

@OWNERS.md

| 레인 | 담당 | 소유 파일 |
|---|---|---|
| A — 로직 | @kimminje2 | `src/matcher.js`, `tests/**` |
| B — DOM | @hersmen98 | `src/scope.js`, `src/replacer.js`, `src/tooltip.js`, `src/content.js` |
| C — 데이터·셸·UI<br>= 통합자 | @Jossi02 | `manifest.json`, `package.json`, `src/popup.*`, `src/content.css`, `data/**`, `tools/**`, `demo/**`, `.claude/**` |

- 작업 전 `OWNERS.md` 의 소유권 지도에서 담당을 확인한다. 선행 조건은 `tasks.md`.
- 담당 밖 파일은 읽기만 하고 변경은 소유자에게 요청한다.
- `CLAUDE.md`, `OWNERS.md`, `SPEC.md`, `plan.md`는 통합자만 수정한다.
- `tasks.md`는 자기 담당 항목만, 검증 출력을 직접 확인한 뒤 체크한다.
- 인터페이스 계약을 바꾸기 전에는 3인 합의를 받는다.
- 기계용 원본은 `.claude/owners.json` 이다. 소유권이 바뀌면 `OWNERS.md` 와 **같이** 고친다.

## 필수 제약

- 콘텐츠 스크립트에서 `import`/`export`를 쓰지 않고 `window.KOJA`에 붙인다.
- `manifest.json`의 로드 순서는 dictionary → matcher → scope → replacer → tooltip → content다.
- 사전은 `window.KOJA_DICT` 번들로 읽으며 `fetch()`하지 않는다.
- `data/dictionary.js`와 `data/substring-pairs.json`은 자동 생성물이므로 직접 편집하지 않는다.
- 매칭 경계에는 한글·숫자·영문을 포함하고, 가장 긴 표면형을 먼저 매칭한다.
- 밀도와 레벨 선택은 결정적이어야 하며 `Math.random()`을 쓰지 않는다.
- 입력 요소, 코드, `contenteditable`, 숨김·제외 영역은 절대 치환하지 않는다.
- 설정 통신은 `chrome.storage.onChanged` 하나로 통일하고 `tabs.sendMessage`를 쓰지 않는다.
- 페이지당 치환은 200개 이하이며 스캔 전체를 `try/catch`로 보호한다.
- 복원 뒤 부모를 `normalize()`해 원문을 무손실로 되돌린다.
- MutationObserver는 자기 변경을 무시하고 끌 수 있는 상수로 둔다.

## 인터페이스 계약

```text
KOJA.matcher.findMatches(text, entries, { maxLevel }) -> [{ start, length, surface, entry }]
KOJA.matcher.densityStep(density) -> 100:1, 50:2, 25:4, 0:Infinity
KOJA.scope.getRoot(doc) -> Element|null
KOJA.scope.eachTextNode(root, fn) -> void
KOJA.replacer.applyMatches(textNode, picks) -> number
KOJA.replacer.restoreAll(root) -> number
KOJA.tooltip.init() -> void (멱등)
```

`surface`는 페이지에서 실제로 매칭된 문자열이며 툴팁의 `data-ko`와 복원에 그대로 사용한다.

## 디렉터리

```text
data/    사전 정본과 생성물
tools/   사전 검증·빌드
src/     콘텐츠 스크립트, 팝업, CSS
tests/   사전·매처 Node 테스트
demo/    시연 페이지와 로컬 백업
.claude/ 팀 공용 하네스 — 아래 참조
```

## 하네스 (`.claude/`)

경로가 `.claude/` 밖이면 Claude Code는 쳐다보지 않는다 — **파일을 옮기지 않는다.**

```text
.claude/settings.json         훅 배선 + 공통 ask. 팀 공용, 커밋한다
.claude/settings.local.json   내 레인의 deny + KOJA_LANE. 커밋하지 않는다 ← 각자 만든다
.claude/lane-templates/       위 파일로 복사할 레인별 템플릿 (A·B·C)
.claude/owners.json           소유권 지도 기계용 원본. 훅과 템플릿이 이걸 읽는다
.claude/gen-lane-settings.mjs owners.json → lane-templates 재생성
.claude/hooks/                훅 소스
.claude/agents/               위임용 에이전트 정의
```

### 처음 한 번 — 내 레인 켜기

**이걸 안 하면 소유권 층이 통째로 꺼져 있다.** clone 직후 자기 레인으로 한 번 복사한다.

```
cp .claude/lane-templates/A.json .claude/settings.local.json    # A/B/C 중 자기 것
```

Claude Code를 재시작한 뒤 `/permissions` 로 규칙이 실제로 살아 있는지 확인한다.
**목록에 없으면 무시된 것이다.** 그다음 한 번 일부러 어겨 본다.

### 세 층

| 층 | 무엇 | 강제되나 |
|---|---|---|
| 글 | `OWNERS.md` (위 `@` import 로 자동 로드) | 읽어야 걸린다 |
| 권한 | `settings.local.json` 의 `deny` | Claude Code가 강제한다. **단 "풀어줘" 하면 풀린다** |
| 훅 | `owner-guard.mjs` | 안 뚫린다. 대신 막지 않고 **기록만** 남긴다 |

> `CLAUDE.md` 는 Claude가 **무엇을 하려 할지**를 바꾸지만, **무엇이 허용되는지**는 바꾸지 못한다.
> 그래서 세 층이 다 필요하다. 하네스는 금지가 아니라 추적이다.

### 훅 3개

- `PostToolUse`(Write|Edit) → `post-edit-check.mjs` 편집한 파일의 문법을 즉시 검사한다
- `PostToolUse`(Write|Edit) → `owner-guard.mjs` 내 소유 밖을 고치면 `CHANGELOG-INBOX/` 에 쪽지를 만든다
- `Stop` → `stop-review-gate.mjs` 세션을 끝낼 때 `npm test` 전체 + 리뷰 게이트(180s)를 돌린다

`.claude/agents/implementer.md` 는 태스크 하나를 TDD로 구현하는 서브에이전트다.

`settings.json` 을 고치면 **3인 전원에게 걸린다. 통합자만 고친다.**
나만 바꾸고 싶으면 `settings.local.json` 에 쓴다 — 커밋되지 않는다.

## 검증과 완료 기준

- 기본 검증: `npm test` 및 변경한 JavaScript에 `node --check <파일>`
- 사전 변경 시: `PYTHONIOENCODING=utf-8 python tools/build_dictionary.py` 후 `npm test`
- 브라우저 변경 시: 확장과 페이지를 모두 새로고침하고 콘솔 오류를 확인한다.
- 입력창 보호, 결정성, 첫 등장만 치환, 3회 무손실 복원은 기능보다 우선한다.
- 막히면 `tasks.md`의 30분 규칙과 기능 축소 순서를 따른다.
- 완료 보고에는 변경 파일, 실행한 검증 명령, 실제 결과, 남은 미검증 영역을 적는다.
- 커밋·푸시·배포는 사용자가 명시적으로 요청할 때만 한다.
