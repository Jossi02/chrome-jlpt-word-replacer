# KoJa — 팀 공통 규칙

> 2026-08-19의 팀 규칙을 바탕으로 현재 동작과 검증 명령만 유지한다. 당시 세부 실행 기록은
> `plan.md`와 `tasks.md`에 historical artifact로 남긴다.

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

- matcher, DOM scope/replacer/tooltip, content orchestration, popup이 구현돼 있다.
- `npm test`는 현재 39개 계약을 검증한다.
- Python 3.12 dictionary builder는 646 엔트리, 677 표면형, ruby 542, 부분 문자열 74쌍을 재생성한다.
- `plan.md`와 `tasks.md`는 2026-08-19 해커톤의 historical development artifact다.

## 해커톤 당시 구현 ownership

`OWNERS.md`는 당시 3인 병렬 작업의 파일 분담과 협업 tooling을 보존한다. 현재 유지보수를 강제하는
정책은 아니며, 실제 authorship은 Git/PR history와 함께 본다.

| 레인 | 담당 | 소유 파일 |
|---|---|---|
| A — 로직 | @kimminje2 | `src/matcher.js`, `tests/**` |
| B — DOM | @hersmen98 | `src/scope.js`, `src/replacer.js`, `src/tooltip.js`, `src/content.js` |
| C — 데이터·셸·UI<br>= 통합자 | @Jossi02 | `manifest.json`, `package.json`, `src/popup.*`, `src/content.css`, `data/**`, `tools/**`, `demo/**`, `docs/**`, 통합·유지보수 |

초기 Claude collaboration harness와 icon에는 @kimminje2의 실질 기여가 있다. `.claude/**`의 당시
maintenance ownership과 original authorship을 같은 의미로 쓰지 않는다.

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
KOJA.matcher.shouldSelect(candidateIndex, density) -> boolean
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
tests/   사전·매처·content lifecycle·manifest Node 테스트
demo/    자체 시연 페이지와 historical Wikipedia backup
icon/    확장 아이콘 (svg 원본 + png 4종, 256은 웹스토어용)
docs/    실측 기록·스크린샷·발표 덱
.claude/ 팀 공용 하네스 — 아래 참조
```

## 하네스 (`.claude/`)

현재 공용 `.claude/settings.json`은 일반적인 두 hook만 활성화한다.

- `PostToolUse`(Write|Edit) → `post-edit-check.mjs`: 편집한 JavaScript 문법 검사
- `Stop` → `stop-review-gate.mjs`: `npm test`와 review gate 실행

`owner-guard.mjs`, `owners.json`, `lane-templates/`, `CHANGELOG-INBOX/`는 2026-08-19의 3인 lane
협업 tooling과 provenance를 보존한다. current shared settings에는 owner guard나 lane별 permission이
등록돼 있지 않으며, 새 clone의 일반 유지보수에 3인 ownership을 강제하지 않는다.

## 검증과 완료 기준

- 기본 검증: `npm test` 및 변경한 JavaScript에 `node --check <파일>`
- 사전 변경 시: `PYTHONIOENCODING=utf-8 python tools/build_dictionary.py` 후 `npm test`
- 브라우저 변경 시: 확장과 페이지를 모두 새로고침하고 콘솔 오류를 확인한다.
- 입력창 보호, 결정성, 첫 등장만 치환, 3회 무손실 복원은 기능보다 우선한다.
- 막히면 `tasks.md`의 30분 규칙과 기능 축소 순서를 따른다.
- 완료 보고에는 변경 파일, 실행한 검증 명령, 실제 결과, 남은 미검증 영역을 적는다.
- 커밋·푸시·배포는 사용자가 명시적으로 요청할 때만 한다.
