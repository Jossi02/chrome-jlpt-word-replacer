# KoJa 구현 계획 (plan.md)

> **작업자에게:** 이 문서는 [SPEC.md](SPEC.md)와 **함께** 읽는다. 계획은 SPEC을 근거로 논증하므로 SPEC이 정답이다. 둘이 어긋나면 SPEC이 이긴다.
> 각 단계는 체크박스(`- [ ]`)다. 잘게 쪼갠 실행용 목록은 [tasks.md](tasks.md)에 있다.

**목표:** 한국어 웹페이지의 명사를 일본어(한자+후리가나)로 결정적으로 치환해, 3일 뒤 §9.1 발표 대본 6단계를 재현 가능하게 시연한다.

**아키텍처:** MV3 선언형 콘텐츠 스크립트 6개를 순서대로 로드해 `window.KOJA` 전역 하나에 모듈을 붙인다. 매칭 로직(`matcher.js`)은 DOM을 모르는 순수 함수로 격리해 `node --test`로 검증하고, DOM 조작(`scope`/`replacer`/`tooltip`)과 오케스트레이션(`content.js`)이 그 위에 얹힌다. 상태는 `chrome.storage.local` 4개 키뿐이고 화면은 매번 결정론적으로 재계산된다.

**기술 스택:** Chrome MV3 · 브라우저 전역 스크립트(ES 모듈 금지) · `node --test` (Node 24) · Python 3 (사전 빌드 전용)

**SPEC:** [SPEC.md](SPEC.md) v2.1 — 사전 확정 648개

---

## 인원 3인 · 역할

SPEC §10 D1 표를 3일 전체로 확장한 것이다. **역할은 곧 파일 소유권이다** — 자기 파일만 고친다. 남의 파일을 고쳐야 하면 소유자에게 말한다. 이 규칙 하나가 3인 병렬의 충돌을 없앤다.

| | 이름 | 역할 | 소유 파일 | 한 문장 |
|---|---|---|---|---|
| **A** | | **로직** | `src/matcher.js` · `tests/*.mjs` | 문자열이 들어가 매치 목록이 나온다. DOM을 모른다. |
| **B** | | **DOM** | `src/scope.js` · `src/replacer.js` · `src/tooltip.js` · `src/content.js` | 매치 목록을 화면에 넣고 무손실로 되돌린다. |
| **C** | | **데이터·셸·UI** | `manifest.json` · `src/popup.html` · `src/popup.js` · `src/content.css` · `demo/**` · `data/**` · `tools/**` | 확장이 로드되고, 팝업이 설정을 쓰고, 시연할 페이지가 있다. |

**공유 파일은 없다.** `src/content.js`는 B 소유지만 D2-1에서만 A·B가 함께 앉아 쓴다.

---

## 전 구간 제약 (Global Constraints)

모든 태스크의 요구사항에 이 절이 암묵적으로 포함된다. SPEC에서 값을 그대로 옮겼다.

| # | 제약 | 근거 |
|---|---|---|
| G1 | **`import` / `export` 금지.** 선언형 콘텐츠 스크립트는 ES 모듈을 지원하지 않는다. 쓰면 **조용히** 아무것도 안 된다 | §8.3-(1) |
| G2 | 모듈은 `window.KOJA` 전역 하나에 붙인다. `manifest.json`의 `js` 배열 **순서가 곧 의존 순서**다 | §8.3-(1) |
| G3 | 사전은 `.js` 번들(`window.KOJA_DICT`)로 읽는다. `fetch` / `web_accessible_resources` 금지 | §8.3-(2) |
| G4 | 런타임 네트워크 호출 0건. 번역 API·LLM 금지. 사전은 전량 로컬 | §3.5 |
| G5 | 경계 문자는 **숫자와 영문을 포함**한다: `/[가-힣ㄱ-ㅎㅏ-ㅣ0-9A-Za-z]/`. 숫자를 빼면 「2시간」이 「2」+時間이 된다 | §5.1 규칙3 |
| G6 | 밀도·레벨 선택은 **결정적**이다. `Math.random()` 금지. 같은 페이지 → 항상 같은 결과 | §F2 |
| G7 | `textarea` `input` `select` `[contenteditable]` 안의 텍스트는 **절대** 건드리지 않는다 | §6.1 |
| G8 | 팝업↔콘텐츠 통신은 `chrome.storage.onChanged` 구독 **하나로 단일화**. `chrome.tabs.sendMessage` 금지 | §F4 |
| G9 | `data/dictionary.js` · `data/substring-pairs.json`은 **자동 생성물**이다. 직접 편집 금지 | §8.1 |
| G10 | 표면형은 한글+공백만이다(불변식 8). 따라서 정규식 메타문자 이스케이프가 **불필요**하다 | `build_dictionary.py` `HANGUL` |
| G11 | 페이지당 치환 상한 **200개**. 스캔 사이클 전체를 `try/catch`로 감싼다 | §8.5 |
| G12 | 테스트는 **인자 없이** `node --test`. 디렉터리를 주면 Node가 모듈로 로드하려다 실패한다 | §11.2 |
| G13 | 코드 수정 후 **확장 새로고침 + 페이지 새로고침 둘 다**. "고쳤는데 안 바뀐다"의 90%가 이것이다 | §8.3-(4) |

---

## 인터페이스 계약 — 착수 전 3인이 동시에 읽는다

병렬 개발이 성립하는 유일한 근거다. **P0에서 이 시그니처대로 빈 껍데기를 먼저 커밋하고**, D1에는 각자 내용만 채운다. 시그니처를 바꾸려면 3인 합의가 필요하다.

```js
// ─────────────────────────────────────────────────────────────
// window.KOJA — 전역 네임스페이스. 모든 src/*.js 가 이 줄로 시작한다
//   window.KOJA = window.KOJA || {};
// ─────────────────────────────────────────────────────────────

// A 소유 ── src/matcher.js  (순수 함수. DOM · chrome API 접근 금지)
KOJA.matcher.findMatches(text, entries, { maxLevel })
  //=> [{ start: number, length: number, surface: string, entry: Entry }]
  //   start   : text 안에서 표면형이 시작하는 인덱스 (조사 제외)
  //   length  : 표면형 길이 (조사 제외)
  //   surface : 페이지에 실제로 있던 표면형. 별칭이면 별칭 그대로 (§4.3)
  //   결과는 문서 순서이고 서로 겹치지 않는다

KOJA.matcher.densityStep(density)
  //=> number    100→1, 50→2, 25→4, 0→Infinity

// B 소유 ── src/scope.js
KOJA.scope.getRoot(doc)              //=> Element | null   본문 루트. 못 찾으면 null (§6.2)
KOJA.scope.eachTextNode(root, fn)    //=> void             제외 영역을 건너뛰며 fn(textNode) 호출 (§6.1)

// B 소유 ── src/replacer.js
KOJA.replacer.applyMatches(textNode, picks)  //=> number   picks ⊆ findMatches 결과. 삽입한 span 수
KOJA.replacer.restoreAll(root)               //=> number   .koja-word 를 원문으로 되돌리고 normalize. 복원 수

// B 소유 ── src/tooltip.js
KOJA.tooltip.init()                  //=> void    document 에 이벤트 위임 리스너 1쌍 등록 (멱등)

// B 소유 ── src/content.js           오케스트레이션. 외부에 아무것도 노출하지 않는다

// C 소유 ── 설정 스키마. chrome.storage.local 의 최상위 키 4개
//   enabled  : boolean                    기본 true
//   furigana : boolean                    기본 true
//   level    : 'N5'|'N4'|'N3'|'N2'|'N1'   기본 'N5'   (누적)
//   density  : number 0~100 정수          기본 100

// C 소유 ── 치환 마크업 (§8.4). B 가 생성하고 C 가 스타일링한다
// <span class="koja-word" data-ko="생선" data-kana="さかな"><ruby>魚<rt>さかな</rt></ruby></span>
// <span class="koja-word" data-ko="버스" data-kana="バス">バス</span>          <!-- ruby:false -->
```

**`surface`를 돌려주는 것이 계약의 핵심이다.** 툴팁과 복원이 둘 다 "페이지에 실제로 있던 글자"를 써야 하기 때문이다(§4.3, §8.4). 「생선」을 잡았으면 툴팁도 `data-ko`도 「물고기」가 아니라 **「생선」**이다.

---

## 최종 파일 구조

```
manifest.json                    MV3 · C
package.json                     { "test": "node --test" } · C
SPEC.md / plan.md / tasks.md     문서

data/dictionary.json             648 엔트리 · 정본(사람이 편집) · C
data/dictionary.js               window.KOJA_DICT · 82.6 KB · 자동생성 · 편집금지
data/substring-pairs.json        74쌍 · 자동생성 · 편집금지
tools/build_dictionary.py        불변식 8종 검증 + 위 두 파일 생성 · C

src/matcher.js                   표면형 최장일치 + 조사 + 경계 + 밀도 step · A
src/scope.js                     본문 루트 결정 + 제외 규칙 TreeWalker · B
src/replacer.js                  텍스트 노드 분할 · span 삽입 · 무손실 복원 · B
src/tooltip.js                   재사용 div 1개 + 이벤트 위임 + 뷰포트 플립 · B
src/content.js                   오케스트레이션 · 3회 지연스캔 · MutationObserver · B
src/content.css                  ruby · 툴팁 · 하이라이트 · 후리가나 토글 · C
src/popup.html                   토글 2개 + 레벨 select + 밀도 slider · C
src/popup.js                     storage.local 읽기/쓰기 · C

tests/dictionary.test.mjs        불변식 8종 + 생성물 정합 · A
tests/matcher.test.mjs           §5.3 케이스 + 74쌍 자동전개 · A

demo/sample.html                 시연 지지대 (#koja-demo-body) · C
demo/backup/                     시연 3사이트 로컬 저장본 · C
```

---

## 진행 방식

- **브랜치**: `main` + `feat/a-matcher` · `feat/b-dom` · `feat/c-shell`. 반나절마다 `main`에 머지한다.
- **커밋 단위**: 태스크 하나 = 커밋 하나 이상. **테스트가 초록일 때만** 커밋한다.
- **눈으로 확인(✅)**: 모든 태스크 끝에 있다. **"됐다"고 말하기 전에 그 화면을 실제로 본다.** 못 봤으면 안 끝난 것이다.
- **30분 규칙**: 30분 막히면 §10.1 축소 순서를 꺼낸다. 혼자 붙들지 않는다.
- **자동 훅**: `.claude/settings.json`의 `PostToolUse` 훅이 편집 즉시 문법을 검사하고, `Stop` 훅이 `node --test` 전체를 돌린다. 훅이 빨간색이면 커밋하지 않는다.

---

# P0 — 착수 전 (전원 · 약 60분)

**이 단계를 건너뛰면 D1 전체가 무너진다.** 세 사람이 같은 화면을 보며 같이 한다.

### P0-1: 저장소 골격 · 인터페이스 껍데기 · git

**담당:** C 주도, 전원 배석
**선행:** 없음
**파일:**
- 이동: `build_dictionary.py` → `tools/build_dictionary.py`
- 이동: `dictionary.json` `dictionary.js` `substring-pairs.json` → `data/`
- 생성: `package.json`, `src/` 껍데기 6개, `tests/` `demo/backup/` 디렉터리

> **왜 이동이 필수인가:** `build_dictionary.py`가 `ROOT`를 *자기 파일 경로의 부모의 부모*로 계산한다([build_dictionary.py:16](tools/build_dictionary.py#L16)). `tools/` 안에 있지 않으면 `data/dictionary.json`을 영원히 못 찾는다.

- [ ] **1. 디렉터리 이동**

```bash
mkdir -p data tools src tests demo/backup
git init
mv build_dictionary.py                                 tools/build_dictionary.py
mv dictionary.json dictionary.js substring-pairs.json  data/
```

- [ ] **2. `package.json` 생성**

```json
{
  "name": "koja",
  "version": "0.1.0",
  "private": true,
  "description": "KoJa — 웹서핑 중 일본어 단어 노출 Chrome 확장",
  "scripts": { "test": "node --test" }
}
```

> `"type": "module"`을 **넣지 않는다.** `src/*.js`는 브라우저 전역 스크립트여야 하고, 훅의 `node --check`가 오탐하지 않는다. 테스트는 `.mjs`라 무관하다.

- [ ] **3. `.gitignore` 생성**

```
node_modules/
.DS_Store
demo/backup/*_files/
```

- [ ] **4. 인터페이스 껍데기 커밋 — 이게 병렬의 출발선이다**

`src/matcher.js` — **A가 D1에 전면 교체한다. 지금은 B가 당장 쓸 수 있는 최소 동작을 넣는다.**

```js
// src/matcher.js — 표면형 매칭 (순수 함수. DOM/chrome 접근 금지)
window.KOJA = window.KOJA || {};
(function () {
  'use strict';

  // P0 walking skeleton: 3단어만 단순 검색. D1-A2 에서 전면 교체된다.
  var STUB = ['경제', '시간', '학교'];

  function findMatches(text, entries, opts) {
    var out = [];
    for (var i = 0; i < STUB.length; i++) {
      var pos = text.indexOf(STUB[i]);
      if (pos < 0) continue;
      var e = null;
      for (var k = 0; k < entries.length; k++) {
        if (entries[k].korean === STUB[i]) { e = entries[k]; break; }
      }
      if (e) out.push({ start: pos, length: STUB[i].length, surface: STUB[i], entry: e });
    }
    return out.sort(function (a, b) { return a.start - b.start; });
  }

  function densityStep(density) {
    if (density >= 100) return 1;
    if (density <= 0) return Infinity;
    return Math.max(1, Math.round(100 / density));
  }

  KOJA.matcher = { findMatches: findMatches, densityStep: densityStep };
})();
```

나머지 4개(`scope.js` `replacer.js` `tooltip.js` `content.js`)는 아래 형태로. `content.css`는 빈 파일.

```js
// src/scope.js
window.KOJA = window.KOJA || {};
(function () {
  'use strict';
  function getRoot(doc) { return doc.body; }          // D1-B1
  function eachTextNode(root, fn) { }                  // D1-B1
  KOJA.scope = { getRoot: getRoot, eachTextNode: eachTextNode };
})();
```

- [ ] **5. 커밋**

```bash
git add -A
git commit -m "chore: SPEC 8.1 파일 구조로 정리 + 인터페이스 껍데기"
```

**✅ 눈으로 확인:** `ls data src tools tests demo`가 SPEC §8.1과 같은 트리를 보여준다. `node --check src/matcher.js`가 조용히(출력 없이) 통과한다.

---

### P0-2: 사전 파이프라인 재현 — **이 PC에는 Python이 없다**

**담당:** C
**선행:** P0-1

> **실측 결과 (2026-08-19).** `python`이 Microsoft Store 스텁으로 잡히고 실행하면 **exit 9009**(명령 없음)다.
> SPEC §10 D0의 `python tools/build_dictionary.py` 게이트가 여기서 막힌다.
>
> 동시에 확인한 것: **생성물 3종은 이미 정본과 완전히 정합하다.**
> `dictionary.js` 82.6 KB · 648 엔트리 · 680 표면형 · ruby 544 / 가나 104 · 74쌍 — SPEC 수치와 전부 일치한다.
> 즉 **막힌 것은 "재생성" 뿐이고 "현재 상태"는 건강하다.**

- [ ] **1. 경로 A(권장) — Python 3 설치**

```powershell
winget install -e --id Python.Python.3.12
# 새 터미널을 열고
python --version        # "Python 3.12.x" 가 나와야 한다. "Python " 만 나오면 아직 스텁이다
```

- [ ] **2. 빌드 실행 — SPEC §10 D0 게이트**

```bash
PYTHONIOENCODING=utf-8 python tools/build_dictionary.py
```

기대 출력:

```
OK — 불변식 8종 전부 통과
  엔트리      : 648  (N5 328 / N4 105 / N3 95 / N2 70 / N1 50)
  매칭 표면형 : 680  (대표 648 + 별칭 32)
  ruby 대상   : 544  / 가나 전용 104
  → data/dictionary.js (82.6 KB)
  → data/substring-pairs.json

부분 문자열 쌍 74 건 — 최장 일치가 긴 쪽을 먼저 잡아야 하는 지점
```

- [ ] **3. 경로 B(대안) — 설치가 막히면**

**사전을 편집하지 않는 한 경로 B로 3일을 완주할 수 있다.** 생성물이 이미 정합하기 때문이다.
안전망은 **D1-A1의 `dictionary.test.mjs`가 대신한다** — 불변식 8종 + 생성물 정합을 Node만으로 재검사한다.
단, 이 경우 **`data/dictionary.json`을 수정하면 안 된다.** D3에서 오탐 단어를 빼야 할 수 있으므로 경로 A를 권장한다.
경로 B를 택했다면 이 줄 아래에 **"경로 B 채택 — 사전 편집 금지"** 라고 적고 3인이 이름을 적는다.

- [ ] **4. 재생성됐다면 커밋**

```bash
git add data/ && git commit -m "chore: 사전 재빌드 — 불변식 8종 통과 (648/680)"
```

**✅ 눈으로 확인:** 터미널에 `OK — 불변식 8종 전부 통과`와 `엔트리 : 648`이 보인다. (경로 B면 이 확인을 D1-A1 통과로 대체한다.)

---

### P0-3: SPEC 함정 낭독 · 확장 로드 리허설 · 시연 페이지 확정

**담당:** 전원
**선행:** P0-1

- [ ] **1. 소리 내어 같이 읽기 (10분)** — SPEC §0 결정 4건, §8.3 MV3 함정 4건, §10.1 축소 순서
- [ ] **2. 지금 당장 확장을 한 번 로드해 본다** (내용이 비어 있어도 된다 — 로드 경로를 몸으로 익히는 게 목적)
  - `chrome://extensions` → 우상단 **개발자 모드** ON → **압축해제된 확장 프로그램을 로드** → `C:\chrome-jlpt-word-replacer`
  - 해당 확장 카드 → **세부정보** → **"파일 URL에 대한 액세스 허용" ON** ← §8.3-(3)
- [ ] **3. 로컬 http 서버를 기본 경로로 정한다** (파일 URL보다 안전하다)

```bash
npx --yes http-server -p 8000 .
# → http://localhost:8000/demo/sample.html
```

- [ ] **4. 시연 3사이트 확정 + 로컬 저장** — SPEC §12 미결 1번을 여기서 닫는다

| # | 확정 URL (직접 적는다) | 로컬 저장 |
|---|---|---|
| 1 | `demo/sample.html` | (자체) |
| 2 | 한국어 위키백과 문서: | `demo/backup/wiki.html` |
| 3 | 광고·로그인 적은 블로그/뉴스: | `demo/backup/blog.html` |

Chrome에서 `Ctrl+S` → **웹페이지, 완전** 으로 저장한다. 사이트 DOM이 바뀌거나 네트워크가 말썽일 때의 백업 시나리오다(§9.3).

- [ ] **5. SPEC §12 미결 2번을 지금 처리** — 심사 평가 기준표가 있는지 담당 교수에게 확인한다. **있으면 그것이 §9를 대체한다.** 3일 전체의 성공 기준이 바뀌므로 지금 묻는다.

**✅ 눈으로 확인:** `chrome://extensions`에 KoJa 카드가 보이고 오류 배지가 없다. "파일 URL에 대한 액세스 허용"이 켜져 있다. `demo/backup/`에 HTML 2개가 저장돼 있다.

---

# D1 — 병렬 개발 (3레인 동시)

**D1 종료 조건 (SPEC §10): 확장이 로드되고 콘솔 에러가 0이다.** 여기 못 가면 D2에 기능을 줄인다.
세 레인은 서로를 기다리지 않는다. B는 P0-1의 스텁 matcher 위에서, C는 아무것도 없이 시작한다.

---

## 레인 A — 로직 (`src/matcher.js`)

### D1-A1: 테스트 하네스 + 사전 불변식 테스트

**담당:** A
**선행:** P0-1
**파일:** 생성 `tests/dictionary.test.mjs`

> **가장 먼저 해결할 문제:** `src/matcher.js`는 G1 때문에 `export`가 없다. 테스트가 어떻게 불러오는가?
> 답: 파일을 읽어 `new Function(src)()`로 실행하면 `globalThis.KOJA`에 붙는다. 이 한 줄이 하루를 아낀다.

**인터페이스:**
- Consumes: `data/dictionary.json`, `data/dictionary.js`, `data/substring-pairs.json`
- Produces: 없음 (테스트 전용). 단 아래 `loadMatcher()` 관용구를 D1-A2가 그대로 재사용한다

- [ ] **1. 실패하는 테스트를 먼저 쓴다**

```js
// tests/dictionary.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const dict  = JSON.parse(read('../data/dictionary.json'));
const pairs = JSON.parse(read('../data/substring-pairs.json'));

const KANJI  = /[\u4E00-\u9FFF]/;
const KANA   = /^[\u3040-\u309F\u30A0-\u30FF\u30FCー]+$/;
const HANGUL = /^[가-힣][가-힣 ]*$/;

test('사전 규모 — SPEC 4.1', () => {
  assert.equal(dict.length, 648);
  const lv = {};
  for (const e of dict) lv[e.level] = (lv[e.level] || 0) + 1;
  assert.deepEqual(lv, { N5: 328, N4: 105, N3: 95, N2: 70, N1: 50 });
});

test('불변식 1·2 — 한국어 표제어 · 일본어 표기 중복 0', () => {
  assert.equal(new Set(dict.map(e => e.korean)).size, dict.length);
  assert.equal(new Set(dict.map(e => e.kanji)).size,  dict.length);
});

test('불변식 3·4·5·6 — 공백 · 가나 · 한글 · 복수뜻', () => {
  for (const e of dict) {
    for (const f of ['kanji', 'reading', 'korean']) {
      assert.ok(e[f].trim() && e[f] === e[f].trim(), `${e.id} ${f} 공백`);
    }
    assert.match(e.reading, KANA,   `${e.id} reading 이 가나가 아님`);
    assert.match(e.korean,  HANGUL, `${e.id} korean 에 한글 외 문자`);
    assert.ok(!e.korean.includes(',') && !e.korean.includes('('), `${e.id} 복수뜻/괄호`);
  }
});

test('불변식 7 — ruby 플래그가 kanji 와 정합', () => {
  for (const e of dict) assert.equal(e.ruby, KANJI.test(e.kanji), `${e.id} ${e.kanji}`);
  assert.equal(dict.filter(e => e.ruby).length, 544);
  assert.equal(dict.filter(e => !e.ruby).length, 104);
});

test('불변식 8 — match 배열 · 한 글자 금지 · 전역 충돌 0', () => {
  const surf = new Map();
  for (const e of dict) {
    assert.ok(Array.isArray(e.match) && e.match.length, `${e.id} match 없음`);
    assert.ok(e.match.includes(e.korean), `${e.id} match 에 대표 표제어 없음`);
    for (const m of e.match) {
      assert.ok(m.replace(/ /g, '').length >= 2, `한 글자 표면형 '${m}'`);
      assert.match(m, HANGUL, `표면형에 한글 외 문자 '${m}'`);
      assert.ok(!surf.has(m), `표면형 충돌 '${m}'`);
      surf.set(m, e.id);
    }
  }
  assert.equal(surf.size, 680);
});

// 경로 B(Python 미설치) 대비 — 생성물이 정본과 어긋나면 즉시 잡는다
test('생성물 정합 — dictionary.js 가 dictionary.json 과 같다', () => {
  const js = read('../data/dictionary.js');
  const m = js.match(/window\.KOJA_DICT = ([\s\S]*);\s*$/);
  assert.ok(m, 'window.KOJA_DICT 할당을 찾지 못함');
  assert.deepEqual(JSON.parse(m[1]), dict);
});

test('생성물 정합 — substring-pairs.json 이 재계산과 같다 (74쌍)', () => {
  const keys = dict.flatMap(e => e.match).sort((a, b) => a.length - b.length);
  const calc = [];
  for (const s of keys) for (const t of keys) if (s !== t && t.includes(s)) calc.push({ short: s, long: t });
  assert.deepEqual(calc, pairs);
  assert.equal(pairs.length, 74);
});
```

- [ ] **2. 실행해서 실패를 확인한다**

```bash
node --test
```

기대: 경로가 틀렸거나 값이 어긋나면 실패. **모두 통과하면 그것도 정상이다** — 사전이 이미 확정됐기 때문이다. 이 테스트의 목적은 앞으로의 회귀 방지다.

- [ ] **3. 통과 확인 후 커밋**

```bash
node --test
git add tests/dictionary.test.mjs package.json
git commit -m "test: 사전 불변식 8종 + 생성물 정합 (Node 재검증)"
```

**✅ 눈으로 확인:** 터미널에 `# pass 7` / `# fail 0`이 보인다. `data/dictionary.json`에서 아무 엔트리의 `korean`을 옆 엔트리와 같게 고쳐 저장하면 **불변식 1이 빨갛게 실패**한다 — 확인했으면 되돌린다.

---

### D1-A2: 최장 일치 매처 — §5.3 케이스 8개

**담당:** A
**선행:** D1-A1
**파일:** 생성 `tests/matcher.test.mjs` · 수정 `src/matcher.js` (스텁 전면 교체)

**인터페이스:**
- Consumes: `data/dictionary.json`
- Produces: `KOJA.matcher.findMatches(text, entries, { maxLevel })` — B의 `content.js`와 D2 전체가 여기에 의존한다

- [ ] **1. 실패하는 테스트를 먼저 쓴다 — SPEC §5.3의 8케이스 전부**

```js
// tests/matcher.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const dict = JSON.parse(read('../data/dictionary.json'));

// G1 때문에 matcher.js 에는 export 가 없다. 읽어서 실행해 globalThis 에 붙인다.
function loadMatcher() {
  const src = read('../src/matcher.js');
  globalThis.window = globalThis;          // matcher.js 첫 줄의 window.KOJA 를 위해
  new Function(src)();
  return globalThis.KOJA.matcher;
}
const matcher = loadMatcher();

// 헬퍼: 매칭 결과를 '표면형/조사' 문자열 배열로 압축한다
const hit = (text, level = 'N1') =>
  matcher.findMatches(text, dict, { maxLevel: level }).map(m => m.surface);

test('§5.3-1 경제가 나빠졌다 → 경제', () => {
  assert.deepEqual(hit('경제가 나빠졌다'), ['경제']);
});

test('§5.3-2 경제학 개론 → 없음 (규칙4 뒷 경계)', () => {
  assert.deepEqual(hit('경제학 개론'), []);
});

test('§5.3-3 신경제 정책 → 없음 (규칙3 앞 경계)', () => {
  assert.deepEqual(hit('신경제 정책'), []);
});

test('§5.3-4 2시간 걸렸다 → 없음 (규칙3 앞 글자가 숫자)', () => {
  assert.deepEqual(hit('2시간 걸렸다'), []);
});

test('§5.3-5 아주머니가 왔다 → 아주머니 (주머니로 쪼개지지 않음)', () => {
  assert.deepEqual(hit('아주머니가 왔다'), ['아주머니']);
});

test('§5.3-6 할아버지에게 → 할아버지 (조사 에게)', () => {
  assert.deepEqual(hit('할아버지에게'), ['할아버지']);
});

test('§5.3-7 수요일에 만나자 → 수요일 (수요 아님)', () => {
  assert.deepEqual(hit('수요일에 만나자'), ['수요일']);
});

test('§5.3-8 물고기를 잡았다 → 물고기 (고기로 쪼개지지 않음)', () => {
  assert.deepEqual(hit('물고기를 잡았다'), ['물고기']);
});

test('§4.3-c 생선을 구웠다 → 별칭 생선이 魚 로', () => {
  const ms = matcher.findMatches('생선을 구웠다', dict, { maxLevel: 'N1' });
  assert.equal(ms.length, 1);
  assert.equal(ms[0].surface, '생선');        // 툴팁이 쓸 값
  assert.equal(ms[0].entry.kanji, '魚');
  assert.equal(ms[0].entry.korean, '물고기'); // 대표 표제어는 그대로
});

test('§4.3-b 이번달 목표 → 붙여 쓴 형태가 今月 로', () => {
  const ms = matcher.findMatches('이번달 목표', dict, { maxLevel: 'N1' });
  assert.equal(ms[0].surface, '이번달');
  assert.equal(ms[0].entry.kanji, '今月');
});

test('§5.3-9 다음 주에 보자 → 공백 표제어가 다음 으로 쪼개지지 않음', () => {
  assert.deepEqual(hit('다음 주에 보자'), ['다음 주']);
});

test('start/length 가 표면형만 가리킨다 (조사 제외)', () => {
  const [m] = matcher.findMatches('오늘 경제가 좋다', dict, { maxLevel: 'N1' })
                     .filter(x => x.surface === '경제');
  assert.equal('오늘 경제가 좋다'.slice(m.start, m.start + m.length), '경제');
});

test('레벨 누적 필터 — N5 에서는 N3 단어가 안 잡힌다', () => {
  const n3 = dict.find(e => e.level === 'N3');
  assert.equal(matcher.findMatches(n3.korean, dict, { maxLevel: 'N5' }).length, 0);
  assert.equal(matcher.findMatches(n3.korean, dict, { maxLevel: 'N3' }).length, 1);
});

test('densityStep — 결정적 (§F2)', () => {
  assert.equal(matcher.densityStep(100), 1);
  assert.equal(matcher.densityStep(50),  2);
  assert.equal(matcher.densityStep(25),  4);
  assert.equal(matcher.densityStep(0),   Infinity);
});
```

- [ ] **2. 실행해서 실패를 확인한다**

```bash
node --test
```

기대: 스텁이라 `§5.3-5 아주머니` 등이 FAIL. 몇 개가 어떻게 실패하는지 눈으로 본다.

- [ ] **3. `src/matcher.js`를 전면 교체한다**

```js
// src/matcher.js — 표면형 매칭 (순수 함수. DOM/chrome 접근 금지)
window.KOJA = window.KOJA || {};
(function () {
  'use strict';

  var ORDER = { N5: 0, N4: 1, N3: 2, N2: 3, N1: 4 };

  // §5.1 규칙3·4 — 숫자와 영문이 반드시 들어간다. 빼면 「2시간」이 깨진다
  var BAD = '가-힣ㄱ-ㅎㅏ-ㅣ0-9A-Za-z';

  var JOSA = ['에서는','으로는','에게는','에게서','으로써','으로서','이라고','부터는','까지는',
              '에서','에게','한테','으로','이랑','라고','까지','부터','조차','마저','처럼',
              '보다','밖에','만큼','이나','이란',
              '와','과','은','는','이','가','을','를','에','도','만','로','의','랑','나']
             .sort(function (a, b) { return b.length - a.length; });

  // entries 배열 아이덴티티 -> { maxLevel: {re, index} }. 사전마다 슬롯이 분리된다.
  // maxLevel 만 키로 쓰면 다른 사전을 같은 레벨로 부를 때 앞 호출 결과가 영구히 남는다.
  var cache = new WeakMap();

  function compile(entries, maxLevel) {
    var byLevel = cache.get(entries);
    if (!byLevel) { byLevel = Object.create(null); cache.set(entries, byLevel); }
    if (byLevel[maxLevel]) return byLevel[maxLevel];

    var pairs = [];
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (ORDER[e.level] > ORDER[maxLevel]) continue;   // 누적 레벨 필터
      for (var j = 0; j < e.match.length; j++) pairs.push([e.match[j], e]);
    }
    // 최장 우선. JS 정규식 교체는 leftmost-first 라 긴 것을 앞에 두면 최장 일치가 된다
    pairs.sort(function (a, b) { return b[0].length - a[0].length; });

    // G10: 표면형은 한글+공백뿐이므로 이스케이프가 필요 없다
    var re = new RegExp(
      '(?<![' + BAD + '])' +
      '(' + pairs.map(function (p) { return p[0]; }).join('|') + ')' +
      '(' + JOSA.join('|') + ')?' +
      '(?![' + BAD + '])',
      'g'
    );

    var index = new Map();
    for (var k = 0; k < pairs.length; k++) {
      if (!index.has(pairs[k][0])) index.set(pairs[k][0], pairs[k][1]);
    }
    byLevel[maxLevel] = { re: re, index: index };
    return byLevel[maxLevel];
  }

  function findMatches(text, entries, opts) {
    // 폴백 정책은 이 한 줄뿐이다. ORDER 에 없는 값(소문자·오타·인덱스 숫자·'constructor'
    // 같은 프로토타입 키)은 '전 레벨 통과' 가 아니라 가장 안전한 N5 로 떨어진다
    var want = opts && opts.maxLevel;
    var maxLevel = (typeof ORDER[want] === 'number') ? want : 'N5';
    var c = compile(entries, maxLevel);
    var out = [], m;
    c.re.lastIndex = 0;                       // 'g' 정규식 재사용 시 필수
    while ((m = c.re.exec(text)) !== null) {
      // 표면형이 비면 유령 매치다. pairs 가 비어 그룹1이 '' 로 매치된 경우이고,
      // 조사 그룹이 붙으면 m[0] 은 비지 않아 m[0] 기준 가드를 통과해 버린다
      if (m[1].length === 0) {
        if (m[0].length === 0) c.re.lastIndex++;   // 빈 매치 무한 루프 방지
        continue;
      }
      // 앞쪽 lookbehind 가 zero-width 이므로 m.index 가 곧 그룹1의 시작이다
      out.push({ start: m.index, length: m[1].length, surface: m[1], entry: c.index.get(m[1]) });
    }
    return out;
  }

  function densityStep(density) {
    if (density >= 100) return 1;
    if (density <= 0) return Infinity;
    return Math.max(1, Math.round(100 / density));
  }

  window.KOJA.matcher = {
    compile: compile,
    findMatches: findMatches,
    densityStep: densityStep
  };
})();
```

- [x] **4. 통과 확인**

```bash
node --test
```

기대: `matcher.test.mjs` 전부 PASS. (PR #4로 병합됨 — `npm test` **31 pass / 0 fail**, 2026-08-19)

> **갱신 이력 (PR #4 리뷰, 2026-08-19):** 위 코드 블록은 D1-A2 실제 병합본으로 교체했다. 최초 초안과 3곳이 달라졌다 — ① `Object.create(null)` 단일 캐시 → `WeakMap` (entries 배열 아이덴티티별 슬롯 분리. 빈 사전으로 먼저 부른 뒤 정상 사전이 와도 캐시가 오염되지 않는다) ② `(opts && opts.maxLevel) || 'N5'` → `typeof ORDER[want] === 'number'` 가드 (소문자·오타·`'constructor'` 같은 값이 "전 레벨 통과"로 새지 않고 N5로 떨어진다 — fail-open이 아니라 fail-safe) ③ 가드가 `m[0].length===0`이 아니라 `m[1].length===0` + 조건부 `lastIndex++` (사전이 비어 그룹1이 빈 문자열로 매치되는 "유령 매치"를 막는다). `KOJA.matcher =` 도 `window.KOJA.matcher =`로 고쳤다 — 파일 최상단과 일치시킨다.
> **더 이상 "그대로 옮겨 적으면 통과한다"가 아니다.** 위 블록은 이미 병합된 코드 그대로이므로 그대로 옮기면 통과하지만, 이 문서를 근거로 자체 구현을 새로 짤 경우 최초 초안(캐시가 `Object.create(null)`인 버전)으로는 27/30만 통과한다 — 반드시 위 최신 블록을 기준으로 삼는다.

> **여기서 막히면 볼 곳.** ① `c.re.lastIndex = 0`을 빼면 두 번째 호출부터 결과가 사라진다.
> ② lookbehind `(?<!...)`는 Node 24·Chrome 모두 지원한다 — 문법 오류가 나면 정규식 조립이 깨진 것이다.
> ③ 「경제학」이 잡히면 뒤 lookahead가 조사 뒤가 아니라 표면형 뒤에 붙은 것이다.
> ④ `compile`은 `KOJA.matcher`에 공개돼 있지만 **B·C는 직접 호출하지 않는다** — `findMatches`만 쓴다. 인터페이스 계약(§ 인터페이스 계약, `OWNERS.md`)에는 `findMatches`/`densityStep`만 정식으로 등재돼 있고, `compile`은 테스트가 캐시 무효화를 직접 검증하기 위한 내부 헬퍼다. `compile`을 직접 부르면 `maxLevel` 가드가 없어 잘못된 레벨 문자열이 그대로 캐시 슬롯 키가 된다(`findMatches`를 거치면 안전하다).

- [ ] **5. 커밋**

```bash
git add src/matcher.js tests/matcher.test.mjs
git commit -m "feat(matcher): 최장 일치 + 조사 + 경계 규칙 — SPEC 5.3 케이스 통과"
```

**✅ 눈으로 확인:** `node --test` 출력에 `§5.3-5 아주머니가 왔다`가 초록으로 지나간다. 그리고 아래를 직접 쳐서 눈으로 본다.

```bash
node -e "
const fs=require('fs');globalThis.window=globalThis;
new Function(fs.readFileSync('src/matcher.js','utf8'))();
const d=JSON.parse(fs.readFileSync('data/dictionary.json','utf8'));
for (const t of ['아주머니가 왔다','경제학 개론','2시간 걸렸다','생선을 구웠다'])
  console.log(t.padEnd(14), '→', KOJA.matcher.findMatches(t,d,{maxLevel:'N1'}).map(m=>m.surface+'→'+m.entry.kanji).join(', ')||'(없음)');
"
```

---

### D1-A3: 74쌍 자동 전개 — 사전이 바뀌면 테스트도 따라온다

**담당:** A
**선행:** D1-A2
**파일:** 수정 `tests/matcher.test.mjs`

> SPEC §4.5: **부분 문자열 쌍 74건은 오류가 아니라 테스트 케이스다.** 하드코딩하지 않고 파일에서 읽어 전개한다. 사전이 바뀌면 `substring-pairs.json`이 바뀌고 케이스도 자동으로 따라온다.

- [ ] **1. 테스트 추가**

```js
// tests/matcher.test.mjs 끝에 이어 붙인다
const pairs = JSON.parse(read('../data/substring-pairs.json'));

test(`부분 문자열 ${pairs.length}쌍 — 항상 긴 쪽이 이긴다 (§4.5)`, () => {
  for (const { short, long } of pairs) {
    const ms = matcher.findMatches(long, dict, { maxLevel: 'N1' });
    assert.equal(ms.length, 1, `'${long}' 에서 매치가 ${ms.length}개 (1개여야 함)`);
    assert.equal(ms[0].surface, long, `'${long}' 이 '${ms[0].surface}' 로 쪼개짐 (짧은 쪽: ${short})`);
  }
});

test('74쌍 — 조사가 붙어도 긴 쪽이 이긴다', () => {
  for (const { short, long } of pairs) {
    const text = long + '를';
    const ms = matcher.findMatches(text, dict, { maxLevel: 'N1' });
    assert.equal(ms[0] && ms[0].surface, long, `'${text}' → '${ms[0] && ms[0].surface}' (짧은 쪽: ${short})`);
  }
});
```

- [ ] **2. 실행**

```bash
node --test
```

- [ ] **3. 실패하면 고친다.** 이 테스트가 잡아내는 것은 딱 하나다 — `pairs.sort(길이 내림차순)`이 빠졌거나 정규식 alternation 순서가 틀렸다.
- [ ] **4. 커밋**

```bash
git add tests/matcher.test.mjs
git commit -m "test(matcher): substring-pairs.json 74쌍 자동 전개 (2가지 형태)"
```

**✅ 눈으로 확인:** 테스트 이름에 `부분 문자열 74쌍` 이라는 **숫자가 찍혀** 초록으로 지나간다. 74가 아닌 숫자가 보이면 사전이 바뀐 것이다.

---

### D1-A4: 밀도 선택기 — 결정적 동작의 심장

**담당:** A
**선행:** D1-A3
**파일:** 수정 `tests/matcher.test.mjs`

> **가장 놓치기 쉬운 설계 결정.** `index % step === 0`의 `index`는 **텍스트 노드 안의 인덱스가 아니라 페이지 전체를 관통하는 러닝 카운터**여야 한다. 노드마다 0부터 세면 모든 노드의 첫 매치가 항상 통과해서 밀도 슬라이더가 사실상 동작하지 않는다. 카운터는 `content.js`(D2-3)가 들고 있고, matcher는 `step`만 준다.

- [ ] **1. 러닝 카운터 시맨틱을 테스트로 못 박는다**

```js
test('밀도 — 러닝 카운터 기준 균등 간격 (노드별 0 리셋이 아니다)', () => {
  const step = matcher.densityStep(50);
  assert.equal(step, 2);
  // content.js 가 하는 일을 그대로 재현한다
  let seq = 0;
  const picked = [];
  for (const node of [['a', 'b'], ['c'], ['d', 'e', 'f']]) {   // 3개 노드, 후보 6개
    for (const cand of node) if (seq++ % step === 0) picked.push(cand);
  }
  assert.deepEqual(picked, ['a', 'c', 'e']);   // 노드별 리셋이면 ['a','c','d'] 가 되어 틀린다
});

test('밀도 — 같은 입력이면 항상 같은 출력 (§F2 결정성)', () => {
  const run = () => {
    let seq = 0, out = [];
    const step = matcher.densityStep(33);
    for (let i = 0; i < 20; i++) if (seq++ % step === 0) out.push(i);
    return out;
  };
  assert.deepEqual(run(), run());
  assert.deepEqual(run(), [0, 3, 6, 9, 12, 15, 18]);
});
```

- [ ] **2. 실행 → 통과 확인**

```bash
node --test
```

- [ ] **3. 커밋**

```bash
git add tests/matcher.test.mjs
git commit -m "test(matcher): 밀도 러닝 카운터 시맨틱 + 결정성 고정"
```

**✅ 눈으로 확인:** `밀도 — 러닝 카운터` 테스트가 초록이다. **B에게 이 시맨틱을 말로 전달한다** — D2-3에서 `content.js`가 이대로 구현해야 한다.

---

## 레인 B — DOM (`scope` / `replacer` / `content`)

### D1-B1: `scope.js` — 본문 루트 + 제외 규칙

**담당:** B
**선행:** P0-1
**파일:** 수정 `src/scope.js`

**인터페이스:**
- Consumes: 없음 (순수 DOM)
- Produces: `KOJA.scope.getRoot(doc)`, `KOJA.scope.eachTextNode(root, fn)`

> **G7이 여기에 산다.** `textarea`/`input`/`contenteditable` 제외는 편의가 아니라 **안전**이다. 사용자가 입력한 텍스트가 일본어로 바뀌어 전송되면 사고다(§6.1).

- [ ] **1. 구현**

```js
// src/scope.js — 본문 영역 결정 + 제외 규칙 (§6.1 · §6.2)
window.KOJA = window.KOJA || {};
(function () {
  'use strict';

  // §6.1 — 이 안에 들어 있는 텍스트는 절대 건드리지 않는다
  var SKIP_TAGS = { SCRIPT:1, STYLE:1, NOSCRIPT:1, PRE:1, CODE:1, KBD:1, SAMP:1,
                    TEXTAREA:1, INPUT:1, SELECT:1, OPTION:1, BUTTON:1, NAV:1,
                    SVG:1, MATH:1, RUBY:1, RT:1 };

  // §6.2 — 사이트별 본문 선택자. 위에서부터 먼저 맞는 것을 쓴다
  var SITE_ROOTS = [
    { host: /(^|\.)news\.naver\.com$/,  sel: ['#dic_area', '#newsct_article'] },
    { host: /(^|\.)ko\.wikipedia\.org$/, sel: ['.mw-parser-output'] }
  ];
  var FALLBACK = ['#koja-demo-body', 'article', 'main', '[role="main"]', 'body'];

  // 위키백과 추가 제외 (§6.2)
  var WIKI_SKIP = '.infobox, .navbox, .reference, .mw-editsection, #toc, .hatnote, table';

  function getRoot(doc) {
    var host = doc.location && doc.location.hostname || '';
    var i, j, el;
    for (i = 0; i < SITE_ROOTS.length; i++) {
      if (!SITE_ROOTS[i].host.test(host)) continue;
      for (j = 0; j < SITE_ROOTS[i].sel.length; j++) {
        el = doc.querySelector(SITE_ROOTS[i].sel[j]);
        if (el) return el;
      }
    }
    for (i = 0; i < FALLBACK.length; i++) {
      el = doc.querySelector(FALLBACK[i]);
      if (el) return el;
    }
    return null;
  }

  function isSkipped(el, doc) {
    var host = doc.location && doc.location.hostname || '';
    var extra = /(^|\.)ko\.wikipedia\.org$/.test(host) ? WIKI_SKIP : null;
    for (var n = el; n && n.nodeType === 1; n = n.parentElement) {
      if (SKIP_TAGS[n.nodeName]) return true;
      if (n.isContentEditable) return true;                       // §6.1 안전 필수
      if (n.getAttribute && n.getAttribute('aria-hidden') === 'true') return true;
      if (n.classList && n.classList.contains('koja-word')) return true;  // 재치환 방지
      if (extra && n.matches && n.matches(extra)) return true;
    }
    return false;
  }

  function eachTextNode(root, fn) {
    var doc = root.ownerDocument;
    var walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (isSkipped(node.parentElement, doc)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    // 순회 중 DOM 을 바꾸므로 먼저 전부 모은 뒤 호출한다 (TreeWalker 무효화 방지)
    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    for (var i = 0; i < nodes.length; i++) fn(nodes[i]);
  }

  KOJA.scope = { getRoot: getRoot, eachTextNode: eachTextNode, isSkipped: isSkipped };
})();
```

> **`nodes` 배열에 먼저 모으는 이유:** `fn` 안에서 텍스트 노드를 span으로 쪼개면 순회 중인 TreeWalker가 방금 만든 노드를 다시 방문하거나 순회가 어긋난다. 무한 루프의 흔한 원인이다.

- [ ] **2. 브라우저 콘솔에서 즉석 확인** (아직 확장 로드 전이라도 된다)

한국어 위키백과 문서를 열고 F12 콘솔에 `src/scope.js` 내용을 통째로 붙여 넣은 뒤:

```js
const root = KOJA.scope.getRoot(document);
console.log(root.className);                       // "mw-parser-output" 이 나와야 한다
let n = 0; KOJA.scope.eachTextNode(root, () => n++); console.log('텍스트 노드', n);
```

- [ ] **3. 커밋**

```bash
git add src/scope.js && git commit -m "feat(scope): 본문 루트 결정 + 제외 규칙 TreeWalker"
```

**✅ 눈으로 확인:** 위키백과 콘솔에서 `mw-parser-output`과 세 자리 이상의 텍스트 노드 수가 찍힌다. 같은 페이지의 **검색창을 클릭해 한글을 입력한 뒤 다시 세도 개수가 늘지 않는다**(입력 텍스트가 제외되고 있다는 증거).

---

### D1-B2: `replacer.js` — 치환

**담당:** B
**선행:** D1-B1
**파일:** 수정 `src/replacer.js`

**인터페이스:**
- Consumes: `findMatches` 결과 형태 `{ start, length, surface, entry }`
- Produces: `KOJA.replacer.applyMatches(textNode, picks) -> number`

- [ ] **1. 구현**

```js
// src/replacer.js — 텍스트 노드 분할 · span 삽입 · 무손실 복원 (§8.4)
window.KOJA = window.KOJA || {};
(function () {
  'use strict';

  function makeSpan(doc, surface, entry) {
    var span = doc.createElement('span');
    span.className = 'koja-word';
    span.setAttribute('data-ko', surface);        // 페이지에 실제로 있던 표면형 (§4.3 · §8.4)
    span.setAttribute('data-kana', entry.reading);
    if (entry.ruby) {
      var ruby = doc.createElement('ruby');
      ruby.appendChild(doc.createTextNode(entry.kanji));
      var rt = doc.createElement('rt');
      rt.appendChild(doc.createTextNode(entry.reading));
      ruby.appendChild(rt);
      span.appendChild(ruby);
    } else {
      span.appendChild(doc.createTextNode(entry.kanji));   // 가나 전용 104개
    }
    return span;
  }

  // picks 는 start 오름차순 · 서로 겹치지 않아야 한다
  function applyMatches(textNode, picks) {
    if (!picks || !picks.length) return 0;
    var doc = textNode.ownerDocument;
    var text = textNode.nodeValue;
    var frag = doc.createDocumentFragment();
    var cursor = 0, i, p;

    for (i = 0; i < picks.length; i++) {
      p = picks[i];
      if (p.start < cursor) continue;                      // 겹치면 버린다 (방어)
      if (p.start > cursor) frag.appendChild(doc.createTextNode(text.slice(cursor, p.start)));
      frag.appendChild(makeSpan(doc, p.surface, p.entry));
      cursor = p.start + p.length;
    }
    if (cursor < text.length) frag.appendChild(doc.createTextNode(text.slice(cursor)));

    textNode.parentNode.replaceChild(frag, textNode);
    return picks.length;
  }

  KOJA.replacer = { applyMatches: applyMatches };   // restoreAll 은 D1-B3
})();
```

- [ ] **2. 확인** — 콘솔에서 `matcher.js` + `scope.js` + `replacer.js` + `data/dictionary.js`를 순서대로 붙여 넣고:

```js
const root = KOJA.scope.getRoot(document);
let done = 0;
KOJA.scope.eachTextNode(root, (n) => {
  if (done) return;
  const ms = KOJA.matcher.findMatches(n.nodeValue, KOJA_DICT, { maxLevel: 'N5' });
  if (ms.length) done += KOJA.replacer.applyMatches(n, [ms[0]]);
});
console.log('치환', done);
```

- [ ] **3. 커밋**

```bash
git add src/replacer.js && git commit -m "feat(replacer): 텍스트 노드 분할 + ruby span 삽입"
```

**✅ 눈으로 확인:** 위키백과 본문에서 **한국어 단어 하나가 한자로 바뀌어 있고, 그 위에 작은 가나가 얹혀 있다.** SPEC §10 D1의 B 완료 기준 절반이 여기서 충족된다.

---

### D1-B3: `replacer.restoreAll` — 무손실 복원

**담당:** B
**선행:** D1-B2
**파일:** 수정 `src/replacer.js`

> **`normalize()`를 빼면 켜기/끄기를 반복할수록 DOM이 파편화되고 어절 경계가 어긋난다**(§8.4). 3회 반복 후 원문이 어긋나는 버그의 원인이 정확히 이것이다.

- [ ] **1. 구현 — `replacer.js`에 추가**

```js
  function restoreAll(root) {
    var spans = root.querySelectorAll('.koja-word');
    var parents = new Set();
    for (var i = 0; i < spans.length; i++) {
      var s = spans[i];
      var parent = s.parentNode;
      if (!parent) continue;
      parent.replaceChild(s.ownerDocument.createTextNode(s.getAttribute('data-ko')), s);
      parents.add(parent);
    }
    // §8.4 — 안 하면 켜기/끄기를 반복할수록 DOM 이 파편화된다
    parents.forEach(function (p) { p.normalize(); });
    return spans.length;
  }

  KOJA.replacer = { applyMatches: applyMatches, restoreAll: restoreAll };
```

- [ ] **2. 콘솔에서 3회 왕복 확인**

```js
const root = KOJA.scope.getRoot(document);
const before = root.textContent;
for (let i = 0; i < 3; i++) {
  let n = 0;
  KOJA.scope.eachTextNode(root, (t) => {
    const ms = KOJA.matcher.findMatches(t.nodeValue, KOJA_DICT, { maxLevel: 'N3' });
    if (ms.length) n += KOJA.replacer.applyMatches(t, ms);
  });
  const restored = KOJA.replacer.restoreAll(root);
  console.log(`${i + 1}회차: 치환 ${n} / 복원 ${restored} / 원문 일치 ${root.textContent === before}`);
}
```

- [ ] **3. 커밋**

```bash
git add src/replacer.js && git commit -m "feat(replacer): 무손실 복원 + normalize (§8.4)"
```

**✅ 눈으로 확인:** 콘솔에 `원문 일치 true`가 **3줄 연속** 찍힌다. SPEC §9.2의 "복원 후 원본과 텍스트가 일치한다(3회 반복해도)"가 여기서 통과된다. 화면도 원래 한국어 그대로다.

---

### D1-B4: `content.js` — 3회 지연 스캔

**담당:** B
**선행:** D1-B3, D1-C1(manifest)
**파일:** 수정 `src/content.js`

> SPEC §0.2: **3회 지연 스캔이 기본 경로다.** `MutationObserver`는 D2에 그 위에 얹는다. 순서를 바꾸면 안 된다.

- [ ] **1. 구현 (D1 버전 — 설정 배선은 D2-2)**

```js
// src/content.js — 오케스트레이션 (§8.2)
window.KOJA = window.KOJA || {};
(function () {
  'use strict';

  var MAX_REPLACEMENTS = 200;          // §8.5 · G11
  var SCAN_DELAYS = [0, 1000, 2000];   // §7 1단계 — 로드 직후 + 1s + 2s

  var state = {
    root: null,
    seenIds: new Set(),   // §F1 단어당 첫 등장만. 재스캔 사이에도 유지
    candSeq: 0,           // §F2 밀도용 러닝 카운터 (D1-A4 시맨틱)
    total: 0,
    settings: { enabled: true, furigana: true, level: 'N5', density: 100 }
  };

  function scan() {
    try {
      if (!state.settings.enabled) return;
      if (!state.root) state.root = KOJA.scope.getRoot(document);
      if (!state.root) { console.warn('[KoJa] 본문을 찾지 못했다'); return; }   // §8.5

      var step = KOJA.matcher.densityStep(state.settings.density);

      KOJA.scope.eachTextNode(state.root, function (node) {
        if (state.total >= MAX_REPLACEMENTS) return;
        var ms = KOJA.matcher.findMatches(node.nodeValue, window.KOJA_DICT,
                                          { maxLevel: state.settings.level });
        if (!ms.length) return;

        var picks = [];
        for (var i = 0; i < ms.length; i++) {
          if (state.seenIds.has(ms[i].entry.id)) continue;      // 첫 등장만
          if (state.candSeq++ % step !== 0) continue;           // 결정적 밀도
          if (state.total + picks.length >= MAX_REPLACEMENTS) break;
          state.seenIds.add(ms[i].entry.id);
          picks.push(ms[i]);
        }
        if (picks.length) state.total += KOJA.replacer.applyMatches(node, picks);
      });
    } catch (err) {
      console.error('[KoJa] 스캔 실패 — 페이지는 그대로 둔다', err);   // §8.5
    }
  }

  function scheduleScans() {
    for (var i = 0; i < SCAN_DELAYS.length; i++) setTimeout(scan, SCAN_DELAYS[i]);
  }

  KOJA.content = { scan: scan, state: state };   // 디버깅·D2 배선용
  scheduleScans();
})();
```

> **`state.candSeq`가 D1-A4에서 못 박은 러닝 카운터다.** 노드 안에서 0으로 리셋하지 않는다.
> **`state.seenIds`는 재스캔 사이에 유지되고, 끄기→켜기 때만 초기화된다**(§F1, D2-2).

- [ ] **2. 확장 새로고침 + 페이지 새로고침** (G13 — **둘 다** 한다)
- [ ] **3. 커밋**

```bash
git add src/content.js && git commit -m "feat(content): 3회 지연 스캔 + 첫등장/밀도/상한"
```

**✅ 눈으로 확인:** 위키백과를 열면 **아무것도 안 해도** 일본어 단어가 여러 개 보인다. 콘솔에서 `KOJA.content.state.total`을 치면 숫자가, `KOJA.content.state.seenIds.size`를 치면 같은 숫자가 나온다. **콘솔에 빨간 줄이 하나도 없다.**

---

## 레인 C — 데이터 · 셸 · UI

### D1-C1: `manifest.json` — 확장이 로드된다

**담당:** C
**선행:** P0-1
**파일:** 생성 `manifest.json`

**인터페이스:**
- Produces: 콘텐츠 스크립트 로드 순서(G2). B의 모든 작업이 이 순서에 의존한다

- [ ] **1. 작성 — `js` 배열 순서가 곧 의존 순서다**

```json
{
  "manifest_version": 3,
  "name": "KoJa",
  "version": "0.1.0",
  "description": "한국어 웹페이지의 명사를 일본어로 치환해 노출량을 만든다",
  "permissions": ["storage"],
  "action": { "default_popup": "src/popup.html" },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["data/dictionary.js", "src/matcher.js", "src/scope.js",
           "src/replacer.js", "src/tooltip.js", "src/content.js"],
    "css": ["src/content.css"],
    "run_at": "document_idle"
  }]
}
```

> **아이콘은 넣지 않는다.** 없어도 로드된다(§12-3). 에셋 제작은 범위 밖(§3.5)이다.
> **`host_permissions`도 넣지 않는다.** 선언형 콘텐츠 스크립트만 쓰면 불필요하다(§8.6).

- [ ] **2. 로드 + 확인**
  - `chrome://extensions` → **압축해제된 확장 프로그램을 로드** → `C:\chrome-jlpt-word-replacer`
  - 카드에 **오류 배지가 없어야 한다.** 있으면 눌러서 메시지를 읽는다
  - 아무 페이지에서 F12 → 콘솔 → `KOJA_DICT.length` → **648**
- [ ] **3. 커밋**

```bash
git add manifest.json && git commit -m "feat: MV3 manifest — 콘텐츠 스크립트 6개 순서 고정"
```

**✅ 눈으로 확인:** 아무 웹페이지 콘솔에서 `KOJA_DICT.length` → `648`, `Object.keys(KOJA)` → `['matcher','scope','replacer',...]`. 사전 82.6 KB가 실제로 페이지에 들어와 있다는 증거다.

---

### D1-C2: `demo/sample.html` — 반드시 동작하는 지지대

**담당:** C
**선행:** D1-C1
**파일:** 생성 `demo/sample.html`

> §9.3: 이 페이지는 **반드시 동작해야 하는 지지대**다. 위키백과가 무너져도 여기는 살아 있어야 한다.
> 그러므로 §5.3의 함정 케이스를 **일부러 본문에 심어 둔다** — 오탐이 생기면 시연 중이 아니라 여기서 먼저 보인다.

- [ ] **1. 작성**

```html
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>KoJa 데모</title>
  <style>
    body { font: 17px/2 system-ui, sans-serif; max-width: 42em; margin: 3em auto; padding: 0 1em; }
    h1 { font-size: 1.4em; } h2 { font-size: 1.05em; margin-top: 2em; color: #666; }
    .trap { background: #fff8e1; padding: .8em 1em; border-left: 3px solid #fc0; }
    input, textarea { width: 100%; padding: .5em; font: inherit; margin: .3em 0; }
  </style>
</head>
<body>
<h1>KoJa 데모 페이지</h1>

<div id="koja-demo-body">
  <h2>1. 평범한 문장 — 여기가 치환된다</h2>
  <p>오늘 아침에 학교 앞 카페에서 친구를 만났다. 시간이 없어서 커피만 마시고
     바로 회사로 갔다. 다음 주에 시험이 있어서 도서관에서 공부할 계획이다.</p>
  <p>어제는 백화점에서 쇼핑을 했다. 가방과 우산을 샀고, 저녁에는 가족과 식사를 했다.
     날씨가 좋아서 공원을 산책했고, 사진도 많이 찍었다.</p>
  <p>내년에는 일본으로 여행을 갈 생각이다. 비행기 표와 호텔을 미리 예약해야 한다.
     지하철과 버스를 타고 다니면서 음식을 먹어 볼 예정이다.</p>

  <h2>2. 최장 일치 함정 — 여기가 쪼개지면 버그다 (§4.5)</h2>
  <p class="trap">
    아주머니가 물고기를 샀다. 할아버지는 수요일에 화장실을 고쳤다.
    나이프로 소고기를 썰었다. 대학생과 고등학생이 노래방에 갔다.
    할머니가 여름방학에 목소리를 높였다.
  </p>

  <h2>3. 경계 함정 — 여기가 치환되면 버그다 (§5.1)</h2>
  <p class="trap">
    경제학 개론 수업은 2시간 걸렸다. 신경제 정책과 10년간의 기록,
    3주말 연속 근무, 반의사 결정.
  </p>

  <h2>4. 별칭 · 붙여 쓴 형태 (§4.3)</h2>
  <p class="trap">생선을 구웠다. 이번달 목표. 빨래를 널었다. 찻집에서 만나자. 다음 주에 보자.</p>

  <h2>5. 제외 영역 — 여기는 절대 안 바뀐다 (§6.1)</h2>
  <p>아래 입력창에 <b>시간</b>, <b>학교</b>를 직접 쳐 보고 글자가 그대로인지 본다.</p>
  <input type="text" placeholder="여기에 시간 학교 경제 를 입력해 보세요">
  <textarea rows="3">여기 있는 시간과 학교와 경제는 절대 바뀌면 안 된다.</textarea>
  <pre>pre 안의 시간 학교 경제 도 바뀌면 안 된다</pre>
  <p><code>code 안의 시간 학교</code> 도 마찬가지다.</p>
  <div contenteditable="true" style="border:1px solid #ccc;padding:.5em">
    contenteditable 안의 시간 학교 경제 — 바뀌면 안 된다
  </div>
</div>
</body>
</html>
```

- [ ] **2. 서버로 연다**

```bash
npx --yes http-server -p 8000 .
# http://localhost:8000/demo/sample.html
```

- [ ] **3. 커밋**

```bash
git add demo/sample.html && git commit -m "feat(demo): 샘플 페이지 — 함정 케이스 내장"
```

**✅ 눈으로 확인:** `http://localhost:8000/demo/sample.html`에서 **1번 문단의 단어들이 일본어로 바뀌어 있고**, 3번 노란 상자의 「경제학」「2시간」은 **한국어 그대로**이고, 5번의 입력창·textarea·pre·contenteditable은 **전부 한국어 그대로**다.

---

### D1-C3: `popup.html` / `popup.js` — 설정이 저장된다

**담당:** C
**선행:** D1-C1
**파일:** 생성 `src/popup.html`, `src/popup.js`

**인터페이스:**
- Produces: `chrome.storage.local`의 `{ enabled, furigana, level, density }` 4키. D2-2에서 `content.js`가 구독한다

- [ ] **1. `src/popup.html`**

```html
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <style>
    body { font: 14px/1.6 system-ui, sans-serif; width: 240px; margin: 0; padding: 14px; }
    h1 { font-size: 15px; margin: 0 0 12px; }
    .row { display: flex; align-items: center; justify-content: space-between; margin: 10px 0; }
    .row label { user-select: none; }
    input[type=range] { width: 100%; }
    select { font: inherit; }
    .val { color: #888; font-variant-numeric: tabular-nums; }
    hr { border: 0; border-top: 1px solid #eee; margin: 12px 0; }
  </style>
</head>
<body>
  <h1>KoJa</h1>

  <div class="row">
    <label for="enabled">치환 켜기</label>
    <input type="checkbox" id="enabled">
  </div>
  <div class="row">
    <label for="furigana">후리가나 표시</label>
    <input type="checkbox" id="furigana">
  </div>

  <hr>

  <div class="row">
    <label for="level">레벨 (누적)</label>
    <select id="level">
      <option value="N5">N5 · 328</option>
      <option value="N4">N4 · 433</option>
      <option value="N3">N3 · 528</option>
      <option value="N2">N2 · 598</option>
      <option value="N1">N1 · 648</option>
    </select>
  </div>

  <div class="row">
    <label for="density">밀도</label>
    <span class="val" id="density-val">100%</span>
  </div>
  <input type="range" id="density" min="0" max="100" step="5">

  <script src="popup.js"></script>
</body>
</html>
```

> **인라인 `<script>`는 MV3 CSP에서 실행되지 않는다.** 반드시 별도 파일(`popup.js`)로 뺀다.

- [ ] **2. `src/popup.js`**

```js
// src/popup.js — 설정 읽기/쓰기. 통신은 storage 단일 경로다 (G8)
'use strict';

var DEFAULTS = { enabled: true, furigana: true, level: 'N5', density: 100 };

var el = {
  enabled:  document.getElementById('enabled'),
  furigana: document.getElementById('furigana'),
  level:    document.getElementById('level'),
  density:  document.getElementById('density'),
  densityVal: document.getElementById('density-val')
};

chrome.storage.local.get(DEFAULTS, function (s) {
  el.enabled.checked  = s.enabled;
  el.furigana.checked = s.furigana;
  el.level.value      = s.level;
  el.density.value    = s.density;
  el.densityVal.textContent = s.density + '%';
});

function save(patch) { chrome.storage.local.set(patch); }

el.enabled.addEventListener('change',  function () { save({ enabled:  el.enabled.checked }); });
el.furigana.addEventListener('change', function () { save({ furigana: el.furigana.checked }); });
el.level.addEventListener('change',    function () { save({ level:    el.level.value }); });
el.density.addEventListener('input',   function () {
  el.densityVal.textContent = el.density.value + '%';
  save({ density: Number(el.density.value) });
});
```

- [ ] **3. 확인** — 확장 아이콘 클릭 → 값 조작 → 팝업 닫았다 다시 열기 → **값이 유지된다**
- [ ] **4. 커밋**

```bash
git add src/popup.html src/popup.js
git commit -m "feat(popup): 토글2 + 레벨 + 밀도 → storage.local"
```

**✅ 눈으로 확인:** 팝업에서 밀도를 40%로 내리고 레벨을 N3으로 바꾼 뒤 팝업을 닫았다 다시 연다. **40%와 N3이 그대로 있다.** 페이지 콘솔에서 `chrome.storage.local.get(console.log)`를 치면 `{density: 40, enabled: true, furigana: true, level: "N3"}`가 찍힌다.

---

### D1-C4: `content.css` — 후리가나가 제대로 보인다

**담당:** C
**선행:** D1-B2
**파일:** 수정 `src/content.css`

> **`rt`에 `display: revert`와 `visibility: visible`을 강제하는 이유:** 많은 사이트가 리셋 CSS로 `rt { display: none }`을 걸어 둔다. 그러면 후리가나가 조용히 사라진다.

- [ ] **1. 작성**

```css
/* src/content.css — §8.4 */
.koja-word {
  border-bottom: 1px dotted currentColor;
  cursor: help;
}
.koja-word ruby {
  ruby-position: over;
  line-height: 1;
}
.koja-word rt {
  font-size: .55em;
  line-height: 1;
  display: revert;         /* 사이트 리셋 CSS 가 rt 를 숨기는 것을 되돌린다 */
  opacity: 1;
  visibility: visible;
  color: inherit;
}
/* §F4 후리가나 토글 — CSS 클래스 하나로 즉시 반영 */
html.koja-no-furigana .koja-word rt { display: none; }

/* 툴팁 (D2-4 에서 tooltip.js 가 사용한다) */
#koja-tip {
  position: fixed;
  z-index: 2147483647;
  max-width: 260px;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(28, 28, 30, .96);
  color: #fff;
  font: 13px/1.5 system-ui, sans-serif;
  pointer-events: none;         /* 툴팁이 마우스를 가로채면 깜빡인다 */
  white-space: nowrap;
  box-shadow: 0 4px 16px rgba(0, 0, 0, .3);
  display: none;
}
#koja-tip .koja-tip-ko   { font-weight: 600; }
#koja-tip .koja-tip-kana { opacity: .75; font-size: .92em; }
```

- [ ] **2. 확장 새로고침 + 페이지 새로고침** (G13)
- [ ] **3. 커밋**

```bash
git add src/content.css && git commit -m "feat(css): ruby · 후리가나 토글 · 툴팁 스타일"
```

**✅ 눈으로 확인:** 데모 페이지에서 치환된 단어에 **점선 밑줄**이 있고 **한자 위에 작은 가나**가 얹혀 있다. 콘솔에서 `document.documentElement.classList.add('koja-no-furigana')`를 치면 **가나가 즉시 사라지고**, `remove`하면 즉시 돌아온다.

---

### 🚩 D1 종료 게이트 (전원 · 15분)

**SPEC §10: 확장이 로드되고 콘솔 에러가 0이다.** 여기 못 가면 D2에 기능을 줄인다.

- [ ] `node --test` → `# fail 0`
- [ ] `chrome://extensions` KoJa 카드에 오류 배지 없음
- [ ] `demo/sample.html`에서 1번 문단이 일본어로 치환됨
- [ ] 3번 노란 상자의 「경제학」「2시간」이 **한국어 그대로**
- [ ] 5번 입력창·textarea·pre·contenteditable이 **한국어 그대로**
- [ ] 페이지 콘솔에 **빨간 줄 0개**
- [ ] 3개 브랜치를 `main`에 머지

---

# D2 — 통합 + UI

**SPEC §10 D2를 그대로 따른다.** 오전 통합 / 오후 UI / 저녁 관찰자.

### D2-1: 실제 matcher 결합 + 스텁 제거

**담당:** A + B (같이 앉는다)
**선행:** D1 종료 게이트
**파일:** 확인만 — `src/content.js`가 이미 `KOJA.matcher.findMatches`를 부른다

- [ ] **1. `src/matcher.js`에 `STUB` 문자열이 남아 있지 않은지 확인한다**

```bash
grep -n "STUB" src/matcher.js && echo "!!! 스텁이 남아 있다" || echo "OK"
```

- [ ] **2. 데모 페이지에서 치환 개수를 센다**

```js
document.querySelectorAll('.koja-word').length
```

- [ ] **3. 함정 3종을 눈으로 훑는다** — 데모 2·3·4번 상자
- [ ] **4. 커밋**

```bash
git commit -am "chore: matcher 스텁 제거 확인 — 실제 매처 결합"
```

**✅ 눈으로 확인:** 데모 페이지의 `.koja-word` 개수가 **8개 이상**이다(§9.2 기준). 2번 상자에서 「아주머니」「물고기」「할아버지」「수요일」「화장실」이 **통째로** 일본어가 됐다 — 쪼개진 것이 하나도 없다.

---

### D2-2: 설정 배선 — 토글 · 레벨이 즉시 반영된다

**담당:** B
**선행:** D2-1, D1-C3
**파일:** 수정 `src/content.js`

> **G8: 통신은 `chrome.storage.onChanged` 하나뿐이다.** `chrome.tabs.sendMessage`를 쓰면 콘텐츠 스크립트가 아직 안 뜬 탭에서 에러가 나고, 그 에러를 삼키는 코드가 또 늘어난다.

- [ ] **1. `content.js`에 설정 로드 · 구독 · 리셋을 추가한다**

```js
  var DEFAULTS = { enabled: true, furigana: true, level: 'N5', density: 100 };

  function applyFurigana(on) {
    document.documentElement.classList.toggle('koja-no-furigana', !on);
  }

  // 페이지를 원상 복구하고 카운터를 초기화한다 (§F1 — 끄기→켜기 시 초기화)
  function reset() {
    if (state.root) KOJA.replacer.restoreAll(state.root);
    state.seenIds.clear();
    state.candSeq = 0;
    state.total = 0;
  }

  function rerender() {
    reset();
    if (state.settings.enabled) scan();
  }

  chrome.storage.local.get(DEFAULTS, function (s) {
    state.settings = s;
    applyFurigana(s.furigana);
    if (s.enabled) scheduleScans();
  });

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'local') return;
    var needRerender = false;
    for (var k in changes) {
      state.settings[k] = changes[k].newValue;
      if (k === 'furigana') applyFurigana(changes[k].newValue);       // CSS 클래스만. 재스캔 불필요
      if (k === 'enabled' || k === 'level' || k === 'density') needRerender = true;
    }
    if (needRerender) rerender();
  });
```

> 파일 끝의 `scheduleScans();` 단독 호출을 **지운다.** 이제 설정을 읽은 뒤에만 스캔한다.
> **`furigana`는 재스캔하지 않는다** — CSS 클래스 하나로 끝난다(§F4). 재스캔하면 느리고 깜빡인다.

- [ ] **2. 확장 새로고침 + 페이지 새로고침** (G13)
- [ ] **3. 커밋**

```bash
git add src/content.js && git commit -m "feat(content): storage.onChanged 단일 경로 배선 + 무손실 리셋"
```

**✅ 눈으로 확인 — SPEC §9.1 대본 2·4·6단계가 여기서 완성된다:**
데모 페이지를 띄운 채 팝업을 연다.
① **치환 켜기를 껐다 → 화면이 즉시 한국어로 돌아간다.** 새로고침하지 않았다.
② 다시 켰다 → 즉시 일본어로 바뀐다.
③ 레벨을 N5 → N3으로 올린다 → **치환된 단어 수가 눈에 띄게 늘어난다.**
④ 이 왕복을 3번 반복해도 본문 글자가 깨지지 않는다.

---

### D2-3: 밀도 슬라이더 — 시연에서 가장 강한 장면

**담당:** B (A가 옆에서 러닝 카운터 시맨틱을 검증)
**선행:** D2-2
**파일:** 확인 — `content.js`의 `state.candSeq`

> D1-B4에 이미 들어 있다. 이 태스크는 **구현이 아니라 검증**이다. 여기서 틀리면 §9.1 대본 5단계가 무너진다.

- [ ] **1. 러닝 카운터가 노드 안에서 리셋되지 않는지 코드로 확인한다**

```bash
grep -n "candSeq" src/content.js
```

기대: `state.candSeq = 0`은 `reset()` 안에만 있고, `eachTextNode` 콜백 안에는 `state.candSeq++`만 있다.

- [ ] **2. 결정성을 손으로 측정한다** — 데모 페이지에서 밀도 100 → 50 → 25 → 100

```js
// 각 단계마다 콘솔에서 실행해 목록을 적어 둔다
[...document.querySelectorAll('.koja-word')].map(s => s.dataset.ko).join(' ')
```

기대: 100%로 되돌아왔을 때 **처음 100%의 목록과 글자까지 완전히 같다.**

- [ ] **3. 새로고침 3회 결정성** — F5를 3번 누르고 매번 위 목록을 비교한다. **3번 다 같아야 한다**(§9.2).
- [ ] **4. 커밋 (수정이 있었다면)**

```bash
git commit -am "fix(content): 밀도 러닝 카운터 결정성 확보"
```

**✅ 눈으로 확인 — SPEC §9.1 대본 5단계:** 팝업의 밀도 슬라이더를 **천천히 끌면 화면의 일본어가 눈앞에서 줄고 늘어난다.** 100%로 되돌리면 처음과 **글자 하나까지 같은** 상태로 돌아온다.

---

### D2-4: 툴팁

**담당:** B
**선행:** D2-2, D1-C4
**파일:** 수정 `src/tooltip.js`

> §F3: 내용은 **원본 한국어 + 후리가나 두 줄이 전부다.** 영어 뜻(원본에 오류 4건), 로마자, 예문, 품사, JLPT 배지는 **넣지 않는다** — §1의 정보량 최소 원칙이다.
> 단어마다 리스너를 다는 것도 금지다. **재사용 `div` 하나 + 이벤트 위임.**

- [ ] **1. 구현**

```js
// src/tooltip.js — 재사용 div 1개 + 이벤트 위임 (§F3)
window.KOJA = window.KOJA || {};
(function () {
  'use strict';

  var tip = null, inited = false;

  function ensure() {
    if (tip) return tip;
    tip = document.createElement('div');
    tip.id = 'koja-tip';
    tip.innerHTML = '<div class="koja-tip-ko"></div><div class="koja-tip-kana"></div>';
    // body 는 사이트가 통째로 갈아 끼울 수 있다. documentElement 가 안전하다
    document.documentElement.appendChild(tip);
    return tip;
  }

  function show(span) {
    var t = ensure();
    t.querySelector('.koja-tip-ko').textContent   = span.getAttribute('data-ko');
    t.querySelector('.koja-tip-kana').textContent = span.getAttribute('data-kana');
    t.style.display = 'block';

    var r = span.getBoundingClientRect();
    var b = t.getBoundingClientRect();
    var gap = 8;

    // 위가 좁으면 아래로 뒤집는다
    var top = r.top - b.height - gap;
    if (top < 4) top = r.bottom + gap;

    // 오른쪽이 좁으면 왼쪽으로 민다
    var left = r.left;
    if (left + b.width > window.innerWidth - 4) left = window.innerWidth - b.width - 4;
    if (left < 4) left = 4;

    t.style.top = top + 'px';
    t.style.left = left + 'px';
  }

  function hide() { if (tip) tip.style.display = 'none'; }

  function init() {
    if (inited) return;                 // 멱등 — 재스캔마다 호출돼도 리스너는 1쌍뿐
    inited = true;
    document.addEventListener('mouseover', function (e) {
      var span = e.target.closest && e.target.closest('.koja-word');
      if (span) show(span);
    }, true);
    document.addEventListener('mouseout', function (e) {
      var span = e.target.closest && e.target.closest('.koja-word');
      if (span) hide();
    }, true);
    window.addEventListener('scroll', hide, true);
  }

  KOJA.tooltip = { init: init, hide: hide };
})();
```

- [ ] **2. `content.js`의 설정 로드 콜백 안에서 `KOJA.tooltip.init();`을 호출한다**
- [ ] **3. 확장 새로고침 + 페이지 새로고침**
- [ ] **4. 커밋**

```bash
git add src/tooltip.js src/content.js
git commit -m "feat(tooltip): 이벤트 위임 + 뷰포트 플립 (2행)"
```

**✅ 눈으로 확인 — SPEC §9.1 대본 3단계:** 데모 4번 상자의 **「생선」이 바뀐 자리에 마우스를 올리면 툴팁 1행이 「물고기」가 아니라 「생선」**이다(§4.3). 화면 **맨 위** 단어에 올리면 툴팁이 아래로, **맨 오른쪽** 단어에 올리면 왼쪽으로 밀려 잘리지 않는다. 지연 없이 즉시 뜬다.

---

### D2-5: `MutationObserver` — 끌 수 있는 형태로

**담당:** B
**선행:** D2-4
**파일:** 수정 `src/content.js`

> §0.2: **관찰자 무한 루프는 페이지를 얼어붙게 만들 수 있는 유일한 버그다.** 그러므로 처음부터 한 줄로 끌 수 있게 만든다. 30분 안에 안정화 안 되면 **`USE_OBSERVER = false`로 두고 넘어간다** — 이게 §10.1 축소 순서 1번이다.

- [ ] **1. 구현 — `content.js`에 추가**

```js
  var USE_OBSERVER = true;    // §0.2 · §10.1 — 문제가 생기면 false 한 줄로 1단계만 남는다
  var DEBOUNCE_MS = 300;

  var pending = null;
  var observer = null;

  function startObserver() {
    if (!USE_OBSERVER || observer || !state.root) return;
    observer = new MutationObserver(function (records) {
      // 확장이 삽입한 노드는 무시한다 — 이게 없으면 무한 루프다 (§7)
      var meaningful = false;
      for (var i = 0; i < records.length && !meaningful; i++) {
        var added = records[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType === 1 && (n.classList.contains('koja-word') ||
                                   n.closest('.koja-word'))) continue;
          if (n.nodeType === 3 && n.parentElement &&
              n.parentElement.closest('.koja-word')) continue;
          meaningful = true;
          break;
        }
      }
      if (!meaningful) return;

      clearTimeout(pending);
      pending = setTimeout(function () {
        // 관찰을 잠시 끊고 스캔한다 — 자기 삽입이 다시 자기를 깨우지 않게
        observer.disconnect();
        try { scan(); } finally {
          observer.observe(state.root, { childList: true, subtree: true });
        }
      }, DEBOUNCE_MS);
    });
    observer.observe(state.root, { childList: true, subtree: true });
  }
```

`scheduleScans()` 마지막 지연 뒤에 `startObserver()`를 호출하고, `reset()`에서 `observer && observer.disconnect(); observer = null;`을 넣는다.

- [ ] **2. 무한 스크롤 페이지에서 확인** — 아무 커뮤니티/뉴스 목록 페이지를 끝까지 내린다
- [ ] **3. 🚨 터지면 즉시 `USE_OBSERVER = false`로 바꾸고 커밋한다.** 붙들고 있지 않는다.
- [ ] **4. 커밋**

```bash
git add src/content.js
git commit -m "feat(content): MutationObserver 300ms 디바운스 + 킬스위치"
```

**✅ 눈으로 확인:** 무한 스크롤 페이지를 아래로 계속 내리면 **새로 로드된 영역에도 일본어가 나타난다.** 그리고 **탭이 멈추지 않는다** — CPU가 100%로 붙어 있거나 스크롤이 끊기면 즉시 `false`로 되돌린다.

---

### 🚩 D2 종료 게이트 (전원 · 20분)

- [ ] `node --test` → `# fail 0`
- [ ] **§9.1 대본 6단계를 데모 페이지에서 처음부터 끝까지 1회 완주**
- [ ] 콘솔 에러 0
- [ ] `main`에 머지

여기까지 왔으면 **제품이 존재한다.** D3은 정확도와 리허설이다.

---

# D3 — 정확도 + 리허설

### D3-1: 3사이트 실측 — 오탐을 종이에 적는다

**담당:** 전원 (A=데모+위키, B=위키+블로그, C=블로그+데모 — 교차 확인)
**선행:** D2 종료 게이트
**파일:** 생성 `docs/misfires.md` (또는 종이)

> §9.2: **명백한 오치환이 0건이어야 한다. 정확도가 개수보다 중요하다.**
> §13.3이 예고한 잔여 위험이 여기서 실물로 나온다.

- [ ] **1. 각자 배정된 사이트를 레벨 N1 · 밀도 100%로 열고 끝까지 읽는다** (가장 많이 치환되는 설정)
- [ ] **2. 이상한 것을 전부 적는다.** 판정하지 말고 일단 적는다

| 유형 | 예 | 처리 담당 |
|---|---|---|
| 오탐(엉뚱한 곳이 치환됨) | 「해당 지역」의 해당 | C — 사전에서 제외 |
| 미탐(당연히 될 것이 안 됨) | 「학생들이」 ← 복수 「들」 | A — 조사 목록 검토 |
| 레이아웃 깨짐 | ruby 때문에 줄 높이가 튐 | C — `content.css` |
| 콘솔 에러 | | B |

- [ ] **3. 레이아웃 깨짐은 사진을 찍어 둔다** (발표 때 "이건 이렇게 고쳤다"의 재료)

**✅ 눈으로 확인:** 3사이트 각각에 대해 오탐 목록이 종이/파일에 적혀 있고, 각 항목에 **담당자 이름**이 붙어 있다.

---

### D3-2: 오탐 제거

**담당:** A(규칙) · C(사전)
**선행:** D3-1
**파일:** 수정 `src/matcher.js` 또는 `data/dictionary.json`

> **두 가지 고치는 방법이 있고, 사전 쪽이 항상 더 안전하다.**
> 규칙을 고치면 74쌍 테스트와 §5.3 케이스가 통째로 흔들린다. 단어 하나를 빼면 아무것도 안 흔들린다.
> **원칙: 오탐 하나 = 단어 하나 제외.** 규칙 변경은 같은 유형이 3건 이상 모였을 때만.

- [ ] **1. C — 사전에서 단어를 뺀다**

```bash
# data/dictionary.json 에서 해당 엔트리를 통째로 지운다 (id 는 비어도 된다)
PYTHONIOENCODING=utf-8 python tools/build_dictionary.py
node --test
```

> **P0-2에서 경로 B(Python 미설치)를 택했다면 여기서 막힌다.** 그 경우 지금이라도 Python을 설치하거나, 오탐 단어를 `matcher.js`의 제외 목록으로 우회한다(차선책).

- [ ] **2. A — 규칙을 고쳐야 한다면, 반드시 테스트를 먼저 추가한다**

```js
// tests/matcher.test.mjs — 실측에서 나온 오탐을 케이스로 고정한다
test('실측 오탐 — <여기에 실제 문장>', () => {
  assert.deepEqual(hit('<실제 문장>'), []);
});
```

- [ ] **3. 전체 테스트 통과 확인**

```bash
node --test        # 74쌍과 §5.3 케이스가 여전히 초록인지 반드시 본다
```

- [ ] **4. 커밋**

```bash
git commit -am "fix: 실측 오탐 N건 제거 — 사전 M개 제외"
```

**✅ 눈으로 확인:** D3-1에서 적은 오탐 목록의 항목을 하나씩 지워 나가고, 마지막에 3사이트를 다시 훑어 **명백한 오치환이 0건**이다. `node --test`는 여전히 `# fail 0`이다.

---

### D3-3: 안전성 회귀 테스트 — 절대 버리지 않는 것

**담당:** B
**선행:** D3-2
**파일:** 없음 (수동 검증)

> §10.1: **절대 버리지 않는 것** — 입력창 보호, off 시 무손실 복원, 결정적 동작, 콘솔 에러 0.
> 이 네 가지는 D3 마지막까지 살아 있어야 한다. 순서대로 손으로 확인한다.

- [ ] **1. 입력창 보호 (§9.2 · §11.1-7)** — 3사이트 각각에서 검색창에 「시간 학교 경제」를 입력한다. **글자가 변형되지 않는다.** 데모 5번 상자의 textarea·pre·code·contenteditable도 확인한다
- [ ] **2. 무손실 복원 3회 (§9.2)** — 각 사이트에서 팝업 on/off를 3번 반복한 뒤 본문을 읽는다. **어절이 붙거나 벌어진 곳이 하나도 없다**
- [ ] **3. 결정성 3회 (§9.2)** — F5를 3번 누르고 매번 아래를 실행해 결과가 **완전히 같은지** 본다

```js
[...document.querySelectorAll('.koja-word')].map(s => s.dataset.ko).join(' ')
```

- [ ] **4. 콘솔 에러 0 (§9.2)** — 3사이트 각각에서 F12 콘솔을 처음부터 끝까지 확인한다
- [ ] **5. 한 눈에 8개 이상 (§9.2)** — 각 사이트 첫 화면에서 치환된 단어를 센다
- [ ] **6. 레이아웃 (§9.2)** — 3사이트 모두 ruby 때문에 줄 간격이 튀거나 요소가 겹치지 않는다

**✅ 눈으로 확인:** 위 6개 항목이 **3사이트 × 6 = 18칸 표에 전부 ○**로 채워져 있다. 하나라도 ×면 D3-4로 가기 전에 고친다.

---

### D3-4: 발표 대본 리허설 2회

**담당:** 전원
**선행:** D3-3

> §9: **체크리스트가 아니라 대본이 기준이다.** 그리고 **1회는 반드시 시연할 노트북 그대로** 한다 — 다른 PC에서 되는 것은 증거가 아니다.

- [ ] **1. 1회차 — 개발 PC에서 §9.1 대본 6단계를 말하면서 실행한다**

| 단계 | 동작 | 하는 말 |
|---|---|---|
| 1 | 원본 페이지를 연다 | "평소 보는 한국어 페이지입니다" |
| 2 | 확장 on | "단어가 일본어로 바뀝니다. 한자 위 후리가나가 핵심입니다 — 한국인은 뜻은 알지만 읽는 법을 모릅니다(§0.1)" |
| 3 | 마우스 오버 | "툴팁은 원본 단어와 읽기, 두 줄이 전부입니다. 뜻을 계속 보여주면 번역 경로를 강화하니까요(§1)" |
| 4 | 레벨 N5→N3 | "328개에서 528개로 늘어납니다" |
| 5 | 밀도 슬라이더 | "Nation의 95~98% 커버리지 임계선을 사용자가 직접 정합니다(§1.1)" |
| 6 | off | "완전히 원본으로 돌아옵니다" |

- [ ] **2. 2회차 — 시연할 노트북에서 처음부터.** 확장 로드 · 파일 URL 액세스 허용 · http 서버까지 전부 다시 한다
- [ ] **3. 백업 경로 확인** — 네트워크를 끄고 `demo/backup/wiki.html`을 로컬로 열어 시연이 되는지 본다
- [ ] **4. 소요 시간을 잰다.** 6단계가 3분을 넘으면 4·5단계를 줄인다

**✅ 눈으로 확인:** 시연 노트북에서 6단계가 **끊김 없이** 흘러가고, 네트워크를 끊어도 백업 페이지로 같은 시연이 된다.

---

### D3-5: 발표 자료 — 세 가지 방어선

**담당:** C 주도(전원 검토)
**선행:** D3-4

> §9의 남는 시간에 하는 일이다. **§1.1 포지셔닝 + §4.7 데이터 정직성 + §8.6 권한 설명** 세 가지가 심사 질문에 대한 방어선이다. 지적당한 뒤에 말하면 변명이 되고, 먼저 말하면 방어가 된다(§13).

- [ ] **1. 슬라이드 3장 — 반드시 들어가는 것**

| 장 | 내용 | 근거 |
|---|---|---|
| 1 | **학습은 약속이 아니라 부작용이다.** 기록·복습·통계가 없다. 이건 결함이 아니라 선택이다 | §1.1 · §13.1 |
| 2 | **등급 표기는 추정치다.** JLPT는 2010년부터 공식 목록을 공개하지 않는다. 어휘 목록은 선정 참고용으로만 봤고 표기·후리가나·표제어·레벨은 직접 작성했다 | §4.7 · §13.2 |
| 3 | **"모든 웹사이트의 데이터를 읽고 변경" 경고에 대해.** 텍스트 치환에 필요하며 어떤 데이터도 외부로 나가지 않는다(런타임 네트워크 호출 0) | §8.6 |

- [ ] **2. 예상 질문 3개에 대한 답을 한 줄씩 적는다**

| 질문 | 답의 뼈대 |
|---|---|
| "Toucan이 이미 있는데?" | **한자어 보너스** — 한국어 사용자에게만 존재하는 출발선. 영어권 도구는 활용할 수 없다 (§1.2 · §13.4) |
| "이게 학습을 어떻게 돕나?" | 우연적 학습. 이미 이해한 문맥 안에서 형태–의미 연결. 그리고 **추적하지 않는다고 먼저 말한다** (§1.1) |
| "다음 단계는?" | 부록 C 로드맵 — 방향 반전(일→한), 어휘 체크 목록, 뉘앙스 복원 |

- [ ] **3. 최종 커밋 + 태그**

```bash
git add -A
git commit -m "docs: 발표 자료 + 최종 검증"
git tag v0.1.0
```

**✅ 눈으로 확인:** 슬라이드 3장이 존재하고, 팀원 3명이 각자 예상 질문 하나씩을 **보지 않고** 답할 수 있다.

---

## 부록 — 막혔을 때 먼저 볼 곳

| 증상 | 원인 | §  |
|---|---|---|
| 아무 일도 안 일어난다 | `import`/`export`를 썼다. **조용히** 죽는다 | G1 · §8.3-(1) |
| 고쳤는데 안 바뀐다 | 확장만 새로고침했다. **페이지도** 새로고침한다 | G13 · §8.3-(4) |
| `file://`에서 아무 일도 없다 | "파일 URL에 대한 액세스 허용"이 꺼져 있다 | §8.3-(3) |
| 「아주머니」가 「아」+ポケット | `pairs.sort(길이 내림차순)`이 빠졌다 | §4.5 · D1-A3 |
| 「2시간」이 「2」+時間 | 경계 정규식에서 `0-9`를 뺐다 | G5 · §5.1 규칙3 |
| 두 번째 스캔부터 매칭이 사라진다 | `re.lastIndex = 0`을 안 했다 | D1-A2 |
| 밀도 슬라이더가 거의 안 먹는다 | 러닝 카운터를 노드마다 0으로 리셋했다 | D1-A4 |
| 켜기/끄기를 반복하면 글자가 붙는다 | 복원 후 `normalize()`를 안 했다 | §8.4 · D1-B3 |
| 탭이 얼어붙는다 | 관찰자 무한 루프. **즉시 `USE_OBSERVER=false`** | §0.2 · §7 |
| 후리가나가 안 보인다 | 사이트 리셋 CSS가 `rt`를 숨겼다. `display: revert` | §8.4 · D1-C4 |
| 팝업이 아무 동작도 안 한다 | 인라인 `<script>`를 썼다. MV3 CSP가 막는다 | D1-C3 |
| 테스트가 모듈 로드 실패 | `node --test`에 **인자를 줬다** | G12 · §11.2 |

## 부록 — 기능을 줄여야 할 때 (§10.1)

위에서부터 먼저 버린다. **버리는 것은 부끄러운 일이 아니다. 대본이 안 돌아가는 것이 부끄러운 일이다.**

1. `MutationObserver` → `USE_OBSERVER = false` (D2-5)
2. 밀도 슬라이더 → 팝업에서 숨기고 항상 100% (D2-3)
3. 후리가나 토글 → 항상 켜짐 고정 (D2-2)
4. 툴팁 → 대본 1·2·6단계는 그래도 성립한다 (D2-4)

**절대 버리지 않는 것**: 입력창 보호(G7) · off 시 무손실 복원(§8.4) · 결정적 동작(G6) · 콘솔 에러 0
