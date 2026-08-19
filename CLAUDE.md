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
사전은 648개 엔트리와 680개 표면형으로 확정됐으며 `data/dictionary.json`이 정본이다.

## 현재 상태

- P0-1 구조와 `window.KOJA` 인터페이스 껍데기가 준비돼 있다.
- `src/matcher.js`는 3단어 walking skeleton이며 D1-A2에서 교체한다.
- 나머지 `src/` 파일은 담당 단계에서 구현할 스텁이다.
- `tests/`는 아직 비어 있어 `npm test` 결과가 현재 0 tests다.
- 이 PC에는 Python이 없어 사전 빌드는 실행하지 못한다. 설치 전에는 사전 정본을 수정하지 않는다.

## 소유권

| 레인 | 소유 파일 |
|---|---|
| A — 로직 | `src/matcher.js`, `tests/**` |
| B — DOM | `src/scope.js`, `src/replacer.js`, `src/tooltip.js`, `src/content.js` |
| C — 데이터·셸·UI | `manifest.json`, `package.json`, `src/popup.*`, `src/content.css`, `data/**`, `tools/**`, `demo/**` |

- 작업 전 `tasks.md`에서 담당과 선행 조건을 확인한다.
- 담당 밖 파일은 읽기만 하고 변경은 소유자에게 요청한다.
- `CLAUDE.md`, `SPEC.md`, `plan.md`는 통합자만 수정한다.
- `tasks.md`는 자기 담당 항목만, 검증 출력을 직접 확인한 뒤 체크한다.
- 인터페이스 계약을 바꾸기 전에는 3인 합의를 받는다.

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
data/   사전 정본과 생성물
tools/  사전 검증·빌드
src/    콘텐츠 스크립트, 팝업, CSS
tests/  사전·매처 Node 테스트
demo/   시연 페이지와 로컬 백업
agents/ 위임용 에이전트 정의
hooks/  문법 검사와 종료 리뷰 게이트 소스
```

훅 설정 예시는 `settings.example.json`이다. Claude Code에서 활성화할 때만 `.claude/settings.json`으로 복사한다.

## 검증과 완료 기준

- 기본 검증: `npm test` 및 변경한 JavaScript에 `node --check <파일>`
- 사전 변경 시: `PYTHONIOENCODING=utf-8 python tools/build_dictionary.py` 후 `npm test`
- 브라우저 변경 시: 확장과 페이지를 모두 새로고침하고 콘솔 오류를 확인한다.
- 입력창 보호, 결정성, 첫 등장만 치환, 3회 무손실 복원은 기능보다 우선한다.
- 막히면 `tasks.md`의 30분 규칙과 기능 축소 순서를 따른다.
- 완료 보고에는 변경 파일, 실행한 검증 명령, 실제 결과, 남은 미검증 영역을 적는다.
- 커밋·푸시·배포는 사용자가 명시적으로 요청할 때만 한다.
