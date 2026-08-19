# OWNERS — 누가 무엇을 소유하나

> KoJa 팀 (3인) · 근거: `plan.md`「인원 3인 · 역할」 + 「최종 파일 구조」
> **이 파일은 통합자(C)만 수정한다.** 바꿀 게 있으면 GitHub 이슈나 PR로 요청한다.

## 소유권 지도

**폴더가 아니라 파일 단위다.** `src/` 를 셋이 나눠 쓰기 때문이다 (`plan.md`「최종 파일 구조」).
그래서 **공유 파일은 없다** — 모든 파일에 주인이 하나씩 있다.

| 레인 | 담당 | 소유 파일 | 한 문장 |
|------|------|-----------|---------|
| **A** 로직 | @kimminje2 | `src/matcher.js`<br>`tests/*.mjs` ⏳ | 문자열이 들어가 매치 목록이 나온다. DOM을 모른다. |
| **B** DOM | @hersmen98 | `src/scope.js`<br>`src/replacer.js`<br>`src/tooltip.js`<br>`src/content.js` | 매치 목록을 화면에 넣고 무손실로 되돌린다. |
| **C** 데이터·셸·UI<br>**= 통합자** | @Jossi02 | `manifest.json` ⏳ · `package.json`<br>`src/popup.html` ⏳ · `src/popup.js` ⏳<br>`src/content.css`<br>`data/**` · `tools/**` · `demo/**`<br>`.claude/**` | 확장이 로드되고, 팝업이 설정을 쓰고, 시연할 페이지가 있다. |

⏳ = 아직 저장소에 없는 파일. 만들 사람이 정해져 있다는 뜻이다.

**통합자 = C(@Jossi02).** 3인 팀이라 전담을 두지 않고 레인 C가 겸임한다.
통합자만 고치는 것: `CLAUDE.md` · `OWNERS.md` · `SPEC.md` · `plan.md`.
`tasks.md` 는 **각자 자기 항목만 체크**한다 (내용은 안 고친다).

> `src/content.js` 는 B 소유다. 단 **D2-1에서만 A·B가 함께 앉아** 쓴다 (`plan.md` D2-1).

> `.claude/**` 는 **3인 전원에게 동시에 걸리는** 하네스다 (`CLAUDE.md`「하네스」).
> `settings.json` 을 한 줄 고치면 세 사람의 훅이 같이 바뀐다. **통합자만 고친다.**
> 나만 끄고 싶으면 `.claude/settings.local.json` 에 쓴다 — `.gitignore` 에 있어 커밋되지 않는다.

### 새 파일을 만들면

파일 단위 소유권이라 **새 파일은 주인이 없는 상태로 태어난다.**
`src/` 나 `tests/` 에 파일을 추가하면 **이 표에 한 줄 추가하도록 통합자에게 요청**한다.
표에 없는 파일은 아무도 리뷰하지 않는다.

## 규칙 3줄

1. **내 소유 밖은 읽기만.** 고칠 게 있으면 담당자에게 GitHub 이슈로 부탁한다.
2. 루트 `CLAUDE.md`·`SPEC.md`·`plan.md`는 **통합자만.** 내 레인 규칙은 별도로 쓰지 말고 이 표를 따른다.
3. 그래도 뚫었으면 → 훅이 `CHANGELOG-INBOX/` 에 쪽지를 만든다. **빈칸을 채우고 담당자에게 통보**한다.

## 하네스 켜기 — clone 후 처음 한 번

**이걸 안 하면 위 규칙이 글로만 존재한다.** 자기 레인 템플릿을 복사한다.

```
cp .claude/lane-templates/A.json .claude/settings.local.json    # A/B/C 중 자기 것
```

| 레인 | 파일 | 들어 있는 것 |
|------|------|--------------|
| A @kimminje2 | `.claude/lane-templates/A.json` | `deny` 17개 + `KOJA_LANE=A` |
| B @hersmen98 | `.claude/lane-templates/B.json` | `deny` 15개 + `KOJA_LANE=B` |
| C @Jossi02 (통합자) | `.claude/lane-templates/C.json` | `deny` 없음 + `KOJA_LANE=C` |

C 에 `deny` 가 없는 것은 실수가 아니다. **통합자는 모든 파일을 고쳐야 한다.**
막는 대신 훅이 C 의 소유 밖 수정을 전부 기록한다 — 그게 통합 리포트다.

복사한 뒤 Claude Code 를 재시작하고 **`/permissions` 로 규칙이 살아 있는지 눈으로 본다.**
`deny` 는 문법이 틀려도 에러가 안 난다. 경고 한 줄 뜨고 그 규칙만 조용히 무시된다.
**목록에 없으면 = 안 막히고 있는 것이다.** 확인했으면 한 번 일부러 어겨 본다.

### 세 층 중 어디까지 걸리나

| 층 | 무엇 | 뚫리나 |
|----|------|--------|
| 글 | `OWNERS.md` — `CLAUDE.md` 의 `@OWNERS.md` 로 자동 로드된다 | 안 읽으면 뚫림 |
| 권한 | `settings.local.json` 의 `deny` | **부탁하면 풀림.** 잠금장치가 아니라 안전벨트 |
| 훅 | `.claude/hooks/owner-guard.mjs` | **안 뚫림.** 대신 막지 않고 기록만 남김 |

### 소유권이 바뀌면

`.claude/owners.json` 이 기계용 원본이다. 훅과 템플릿이 이걸 읽는다.
이 문서의 표를 고쳤으면 **거기도 같이** 고치고 템플릿을 다시 만든다.

```
node .claude/gen-lane-settings.mjs
```

## 브랜치 · 합치기

Git을 쓰므로 파일을 주고받지 않는다. **브랜치가 곧 레인이다.**

| 무엇 | 규칙 |
|------|------|
| 기본 브랜치 | `feat/koja-v0.1` |
| 작업 브랜치 | `feat/A-<할일>` · `feat/B-<할일>` · `feat/C-<할일>` |
| 문서 브랜치 | `docs/<할일>` (통합자 검토 필요) |
| 합치기 | **PR로만.** 기본 브랜치에 직접 push 하지 않는다 |
| 리뷰 | 내 레인 밖 파일이 PR에 들어 있으면 **그 파일 담당자의 승인**을 받는다 |
| 시작 전 | 항상 `git pull` 부터. 남의 커밋 위에서 작업한다 |

## 공통 약속 (바꾸려면 3인 합의 → 고치기 전에)

파일을 나눠도 이것만은 겹친다. 말 없이 바꾸면 팀 전체가 멈춘다.
정본은 `plan.md`「인터페이스 계약」이다. 아래는 요약이다.

| 약속 | 지금 값 | 주인 |
|------|---------|------|
| 전역 네임스페이스 | 모든 `src/*.js` 가 `window.KOJA = window.KOJA \|\| {};` 로 시작 | 공통 |
| 사전 전역 | `window.KOJA_DICT` (`data/dictionary.js`) | C |
| 매칭 | `KOJA.matcher.findMatches(text, entries, { maxLevel })`<br>→ `[{ start, length, surface, entry }]` · 문서 순서 · 겹치지 않음 | A |
| 밀도 | `KOJA.matcher.densityStep(density)` → `number` (100→1, 50→2, 25→4, 0→Infinity) | A |
| 본문 영역 | `KOJA.scope.getRoot(doc)` → `Element\|null`<br>`KOJA.scope.eachTextNode(root, fn)` | B |
| 치환·복원 | `KOJA.replacer.applyMatches(textNode, picks)` → `number`<br>`KOJA.replacer.restoreAll(root)` → `number` | B |
| 툴팁 | `KOJA.tooltip.init()` (멱등) | B |
| 설정 스키마 | `chrome.storage.local` 최상위 4키<br>`enabled`(true) · `furigana`(true) · `level`('N5') · `density`(100) | C |
| 팝업↔콘텐츠 통신 | `chrome.storage.onChanged` 구독 **하나로 단일화**. `chrome.tabs.sendMessage` 금지 | C↔B |
| 치환 마크업 | `<span class="koja-word" data-ko="생선" data-kana="さかな">…</span>` | B가 생성 · C가 스타일링 |
| `manifest.json` js 순서 | `dictionary.js` → `matcher.js` → `scope.js` → `replacer.js` → `tooltip.js` → `content.js`<br>**순서가 곧 의존 순서다** | C |

**`surface` 를 돌려주는 것이 계약의 핵심이다.** 툴팁과 `data-ko` 둘 다 "페이지에 실제로 있던 글자"를 써야 한다.
「생선」을 잡았으면 「물고기」가 아니라 **「생선」**이다 (SPEC §4.3).

**바꾸는 순서:** 이슈로 제안 → 관련 담당자 OK → 통합자가 `plan.md` 와 이 표를 갱신 → **그다음에** 코드를 고친다.

## 검증 명령 (합칠 때마다 1번)

`CLAUDE.md`「검증과 완료 기준」과 같은 명령이다. 다르면 `CLAUDE.md` 가 정본이다.

```
npm test                # = node --test. 인자를 주면 Node가 모듈로 로드하려다 실패한다
node --check <파일>      # 고친 JavaScript 하나하나
```

사전(`data/dictionary.json`)을 고쳤을 때만 추가로:

```
PYTHONIOENCODING=utf-8 python tools/build_dictionary.py   # "불변식 8종 전부 통과"
npm test
```

> `PYTHONIOENCODING=utf-8` 을 빼면 Windows 콘솔에서 `UnicodeEncodeError: 'cp949' codec can't encode` 로 죽는다.
> 검증이 아니라 출력에서 죽는 것이라 더 헷갈린다.

확장 동작 확인은 **누가 봐도 같은 절차**로 한다. (`manifest.json`·`demo/sample.html` 이 생긴 뒤부터)

```
python -m http.server 8000        # file:// 로 열면 콘텐츠 스크립트가 안 돈다 (SPEC §8.3-3)
```

1. `chrome://extensions` → 압축해제된 확장 로드 (코드를 고쳤으면 **확장 새로고침 + 페이지 새로고침 둘 다**)
2. `http://localhost:8000/demo/sample.html` 에서 일본어 단어가 보인다
3. 콘솔 빨간 줄 **0**

## 지금 상태 (P0-1 직후)

| | 있다 | 없다 |
|---|---|---|
| A | `src/matcher.js` (3단어 walking skeleton) | `tests/**` — 비어 있어 `npm test` 가 **0 tests** |
| B | `src/scope.js` · `replacer.js` · `tooltip.js` · `content.js` 스텁 | 내용 |
| C | `data/**` · `tools/**` · `package.json` · `src/content.css` · `.claude/**` | `manifest.json` · `src/popup.*` · `demo/sample.html` |

`manifest.json` 이 없으면 **확장을 로드할 수 없다.** 브라우저 검증은 그때까지 못 돈다.
