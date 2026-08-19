# KoJa 작업 체크리스트 (tasks.md)

> [plan.md](plan.md)를 잘게 쪼갠 실행용 목록이다. **코드와 근거는 plan.md에 있다** — 막히면 그쪽을 본다.
> 규칙: ① 자기 담당(**A**/**B**/**C**) 항목만 체크한다 ② `✅` 줄을 **눈으로 본 뒤에** 체크한다 ③ 🚩 게이트는 3인이 같이 통과한다.

**담당** — **A** 로직(`matcher.js`, `tests/`) · **B** DOM(`scope`/`replacer`/`tooltip`/`content`) · **C** 데이터·셸·UI(`manifest`/`popup`/`css`/`demo`/`data`/`tools`)

## 진행판

| 구간 | 항목 | A | B | C | 게이트 |
|---|---|---|---|---|---|
| P0 | 12 | | | | ☐ P0 완료 |
| D1 | 46 | ☐ A1 ☐ A2 ☐ A3 ☐ A4 | ☐ B1 ☐ B2 ☐ B3 ☐ B4 | ☐ C1 ☐ C2 ☐ C3 ☐ C4 | ☐ **D1 게이트** |
| D2 | 26 | | ☐ 2-1 ☐ 2-2 ☐ 2-3 ☐ 2-4 ☐ 2-5 | | ☐ **D2 게이트** |
| D3 | 33 | | | | ☐ **출하** |

---

# P0 — 착수 전 (전원 · 60분)

## P0-1 저장소 골격 · 인터페이스 껍데기 — **C** 주도, 전원 배석

- [x] `mkdir -p data tools src tests demo/backup` · `git init`
- [x] `build_dictionary.py` → `tools/` 로 이동 *(안 옮기면 `ROOT` 계산이 깨져 사전을 못 찾는다)*
- [x] `dictionary.json` · `dictionary.js` · `substring-pairs.json` → `data/` 로 이동
- [x] `package.json` 생성 — `"scripts": { "test": "node --test" }`, **`"type": "module"` 넣지 않기**
- [x] `.gitignore` 생성
- [x] `src/matcher.js` 스텁 커밋 *(B가 이 위에서 바로 시작한다)*
- [x] `src/scope.js` · `replacer.js` · `tooltip.js` · `content.js` · `content.css` 빈 껍데기 커밋
- [x] **3인이 plan.md「인터페이스 계약」절을 같이 읽고 시그니처에 합의**
- [x] `git commit -m "chore: SPEC 8.1 파일 구조로 정리 + 인터페이스 껍데기"`
- [x] ✅ `ls data src tools tests demo` 가 SPEC §8.1 트리와 같다 · `node --check src/matcher.js` 조용히 통과

## P0-2 사전 파이프라인 — **C**

> ⚠️ **이 PC에 Python이 없다** (`python` → Store 스텁, exit 9009). 단, 생성물 3종은 정본과 **완전히 정합**하다(648/680/544/104/74 · 82.6 KB).

- [ ] 경로 A: `winget install -e --id Python.Python.3.12` → 새 터미널에서 `python --version` 이 `3.12.x`
- [ ] `PYTHONIOENCODING=utf-8 python tools/build_dictionary.py` 실행
- [ ] 경로 B(설치 실패 시): **"경로 B 채택 — 사전 편집 금지"** 를 plan.md에 적고 3인 서명. 안전망은 D1-A1이 대신한다
- [ ] 재생성됐으면 `git add data/ && git commit`
- [ ] ✅ 터미널에 `OK — 불변식 8종 전부 통과` + `엔트리 : 648`

## P0-3 함정 낭독 · 로드 리허설 · 시연 페이지 — **전원**

- [ ] SPEC §0 결정 4건 · §8.3 함정 4건 · §10.1 축소 순서를 **소리 내어** 같이 읽기 (10분)
- [x] `chrome://extensions` → 개발자 모드 ON → 압축해제 로드 → `C:\chrome-jlpt-word-replacer` *(경로가 `c:\wordprogram`에서 바뀌었다 — 리포 구조 정리 이후 실제 로드 위치로 갱신)*
- [x] 확장 세부정보 → **"파일 URL에 대한 액세스 허용" ON**
- [x] `npx --yes http-server -p 8000 .` 로 로컬 서버를 기본 경로로 확정 *(`http://localhost:8000/demo/sample.html` 정상 렌더링 확인)*
- [ ] 시연 사이트 2번(위키백과) URL 확정 → `demo/backup/wiki.html` 로 저장 *(Ctrl+S → 웹페이지, 완전)*
- [ ] 시연 사이트 3번(블로그/뉴스) URL 확정 → `demo/backup/blog.html` 로 저장
- [ ] **심사 평가 기준표가 있는지 교수에게 확인** *(있으면 그것이 §9를 대체한다 — 3일의 성공 기준이 바뀐다)*
- [ ] ✅ KoJa 카드에 오류 배지 없음 · 파일 URL 허용 ON · `demo/backup/` 에 HTML 2개 *(카드 상태는 확인됨, backup 2종만 남음)*

### 🚩 P0 게이트 — 3인 전원 위 항목 체크 완료

---

# D1 — 병렬 개발 (3레인 동시 · 서로 기다리지 않는다)

## 레인 A — 로직

### D1-A1 테스트 하네스 + 사전 불변식 — **A**

- [ ] `tests/dictionary.test.mjs` 작성 — 규모(648 / N5 328·N4 105·N3 95·N2 70·N1 50)
- [ ] 불변식 1·2 — 한국어 표제어 · 일본어 표기 중복 0
- [ ] 불변식 3·4·5·6 — 앞뒤 공백 · `reading` 가나 · `korean` 한글 · 복수뜻/괄호 0
- [ ] 불변식 7 — `ruby` 플래그 정합 (544 / 104)
- [ ] 불변식 8 — `match` 에 대표 포함 · 한 글자 표면형 0 · 전역 충돌 0 · 총 680
- [ ] **생성물 정합** — `dictionary.js` 가 `dictionary.json` 과 같다 *(경로 B의 안전망)*
- [ ] **생성물 정합** — `substring-pairs.json` 이 재계산과 같다 (74쌍)
- [ ] `node --test` → `# fail 0`
- [ ] `git commit -m "test: 사전 불변식 8종 + 생성물 정합"`
- [ ] ✅ `# pass 7` · 일부러 `korean` 을 중복시키면 불변식 1이 **빨갛게 실패**한다(확인 후 되돌리기)

### D1-A2 최장 일치 매처 — **A** *(선행: A1)*

- [ ] `tests/matcher.test.mjs` 에 `loadMatcher()` 관용구 작성 — `globalThis.window = globalThis; new Function(src)()`
- [ ] §5.3 케이스 8개 작성 — 경제가 / 경제학 / 신경제 / 2시간 / 아주머니 / 할아버지에게 / 수요일에 / 물고기를
- [ ] 별칭 케이스 — `생선을` → `surface:'생선'` · `entry.kanji:'魚'` · `entry.korean:'물고기'`
- [ ] 붙여 쓴 형태 — `이번달` → `今月` · 공백 표제어 `다음 주에`
- [ ] `start`/`length` 가 조사를 뺀 표면형만 가리키는지
- [ ] 레벨 누적 필터 — N5에서 N3 단어가 안 잡힌다
- [ ] `densityStep` — 100→1 · 50→2 · 25→4 · 0→Infinity
- [ ] `node --test` → **실패를 눈으로 확인** (스텁이므로 실패가 정상)
- [ ] `src/matcher.js` 전면 교체 — `ORDER` / `BAD`(숫자·영문 포함) / `JOSA`(긴 것부터) / `compile` 캐시
- [ ] `pairs.sort(길이 내림차순)` — 최장 우선 alternation
- [ ] `findMatches` — `re.lastIndex = 0` · zero-length 방어 · `m.index`/`m[1].length`
- [ ] `node --test` → `# fail 0`
- [ ] `git commit -m "feat(matcher): 최장 일치 + 조사 + 경계 규칙"`
- [ ] ✅ 콘솔 한 줄 실행으로 `아주머니가 왔다 → 아주머니→おばさん` / `경제학 개론 → (없음)` / `2시간 걸렸다 → (없음)` 를 **직접 눈으로**

### D1-A3 74쌍 자동 전개 — **A** *(선행: A2)*

- [ ] `substring-pairs.json` 을 읽어 케이스로 전개 — 긴 쪽이 이기고 매치가 정확히 1개
- [ ] 조사가 붙은 형태(`long + '를'`)에서도 긴 쪽이 이긴다
- [ ] `node --test` → `# fail 0`
- [ ] 실패하면: `pairs.sort` 누락 또는 alternation 순서 확인
- [ ] `git commit -m "test(matcher): substring-pairs 74쌍 자동 전개"`
- [ ] ✅ 테스트 이름에 **`부분 문자열 74쌍`** 이라는 숫자가 찍혀 초록으로 지나간다

### D1-A4 밀도 결정성 — **A** *(선행: A3)*

- [ ] 러닝 카운터 시맨틱 테스트 — 노드 3개·후보 6개, step 2 → `['a','c','e']` *(노드별 리셋이면 `['a','c','d']` 가 되어 틀린다)*
- [ ] 같은 입력이면 항상 같은 출력 (결정성)
- [ ] `node --test` → `# fail 0`
- [ ] `git commit -m "test(matcher): 밀도 러닝 카운터 + 결정성 고정"`
- [ ] **B에게 러닝 카운터 시맨틱을 말로 전달** *(D2-3에서 `content.js`가 이대로 구현해야 한다)*
- [ ] ✅ `밀도 — 러닝 카운터` 테스트 초록

## 레인 B — DOM

### D1-B1 `scope.js` 본문 루트 + 제외 규칙 — **B**

- [ ] `SKIP_TAGS` — script/style/noscript/pre/code/kbd/samp/textarea/input/select/option/button/nav/svg/math/ruby/rt
- [ ] `isSkipped` 에 `isContentEditable` · `aria-hidden="true"` · `.koja-word` 추가 *(안전 필수)*
- [ ] `SITE_ROOTS` — 네이버뉴스 `#dic_area`/`#newsct_article` · 위키 `.mw-parser-output`
- [ ] `FALLBACK` — `#koja-demo-body` → `article` → `main` → `[role="main"]` → `body`
- [ ] 위키 추가 제외 — `.infobox, .navbox, .reference, .mw-editsection, #toc, .hatnote, table`
- [ ] `eachTextNode` — TreeWalker로 **먼저 전부 모은 뒤** 콜백 호출 *(순회 중 DOM 변경 방어)*
- [ ] `git commit -m "feat(scope): 본문 루트 결정 + 제외 규칙 TreeWalker"`
- [ ] ✅ 위키백과 콘솔에서 `getRoot().className` → `mw-parser-output` · 텍스트 노드 수가 세 자리
- [ ] ✅ **검색창에 한글을 입력한 뒤 다시 세도 개수가 늘지 않는다** *(입력 텍스트 제외 증거)*

### D1-B2 `replacer.applyMatches` — **B** *(선행: B1)*

- [ ] `makeSpan` — `class="koja-word"` · `data-ko`(실제 표면형) · `data-kana`
- [ ] `entry.ruby === true` → `<ruby>漢<rt>かな</rt></ruby>` · `false` → `kanji` 텍스트만 *(가나 전용 104개)*
- [ ] `applyMatches` — DocumentFragment 조립 · `cursor` 진행 · 겹침 방어 · `replaceChild`
- [ ] `git commit -m "feat(replacer): 텍스트 노드 분할 + ruby span 삽입"`
- [ ] ✅ 위키백과 본문에서 **한국어 단어 하나가 한자로 바뀌고 그 위에 작은 가나가 얹혀 있다**

### D1-B3 `replacer.restoreAll` 무손실 복원 — **B** *(선행: B2)*

- [ ] `.koja-word` → `data-ko` 텍스트 노드로 치환
- [ ] **부모마다 `normalize()` 호출** *(빼면 on/off 반복 시 어절 경계가 어긋난다)*
- [ ] 콘솔에서 치환↔복원 3회 왕복 스크립트 실행
- [ ] `git commit -m "feat(replacer): 무손실 복원 + normalize"`
- [ ] ✅ 콘솔에 **`원문 일치 true` 가 3줄 연속** · 화면도 원래 한국어 그대로

### D1-B4 `content.js` 3회 지연 스캔 — **B** *(선행: B3, C1)*

- [ ] `MAX_REPLACEMENTS = 200` · `SCAN_DELAYS = [0, 1000, 2000]`
- [ ] `state` — `root` / `seenIds`(Set) / `candSeq`(러닝 카운터) / `total` / `settings`
- [ ] `scan()` 전체를 `try/catch` 로 감싼다 · 본문 못 찾으면 `console.warn` 만 하고 조용히 종료
- [ ] 첫 등장 검사 — `seenIds.has(entry.id)` 면 스킵
- [ ] 밀도 — `state.candSeq++ % step !== 0` 이면 스킵 *(노드 안에서 리셋 금지)*
- [ ] 상한 200 도달 시 중단
- [ ] `scheduleScans()` — `setTimeout` 3회
- [ ] **확장 새로고침 + 페이지 새로고침 둘 다**
- [ ] `git commit -m "feat(content): 3회 지연 스캔 + 첫등장/밀도/상한"`
- [ ] ✅ 위키백과를 열면 **아무 조작 없이** 일본어 단어가 여러 개 보인다 · `KOJA.content.state.total` 에 숫자 · **콘솔 빨간 줄 0**

## 레인 C — 데이터 · 셸 · UI

### D1-C1 `manifest.json` — **C**

- [x] MV3 · `permissions: ["storage"]` · `action.default_popup`
- [x] `js` 배열 **순서 고정**: `data/dictionary.js` → `matcher` → `scope` → `replacer` → `tooltip` → `content`
- [x] `css: ["src/content.css"]` · `run_at: "document_idle"` · `matches: ["<all_urls>"]`
- [x] 아이콘·`host_permissions` **넣지 않는다**
- [x] 압축해제 로드 → 카드에 **오류 배지 없음**
- [ ] `git commit -m "feat: MV3 manifest"`
- [x] ✅ 아무 페이지 콘솔에서 `KOJA_DICT.length` → **648** · `Object.keys(KOJA)` 에 모듈 이름들

### D1-C2 `demo/sample.html` — **C** *(선행: C1)*

- [x] `#koja-demo-body` 래퍼 + 평범한 문단 3개 *(치환이 잘 되는 구간)*
- [x] 함정 상자 2 — 최장 일치: 아주머니 · 물고기 · 할아버지 · 수요일 · 화장실 · 나이프 · 소고기 · 대학생 · 노래방 · 여름방학 · 목소리
- [x] 함정 상자 3 — 경계: 경제학 · 2시간 · 신경제 · 10년간 · 3주말
- [x] 함정 상자 4 — 별칭/붙여쓰기: 생선 · 이번달 · 빨래 · 찻집 · 다음 주
- [x] 제외 영역 상자 5 — `input` · `textarea` · `pre` · `code` · `contenteditable`
- [x] `npx --yes http-server -p 8000 .` 로 확인
- [ ] `git commit -m "feat(demo): 샘플 페이지 — 함정 케이스 내장"`
- [ ] ✅ 1번 문단은 일본어로 · 3번 상자의 「경제학」「2시간」은 **한국어 그대로** · 5번 상자 전부 **한국어 그대로** *(matcher/scope/replacer가 아직 스텁이라 현재는 미치환 — A·B 완료 후 재확인)*

### D1-C3 `popup.html` / `popup.js` — **C** *(선행: C1)*

- [x] `popup.html` — 체크박스 2개(`enabled`/`furigana`) · `select`(N5~N1, 누적 개수 표기) · `range`(0~100, step 5) · 밀도 % 표시
- [x] **인라인 `<script>` 금지** — `popup.js` 별도 파일 *(MV3 CSP)*
- [x] `popup.js` — `DEFAULTS = { enabled:true, furigana:true, level:'N5', density:100 }`
- [x] `chrome.storage.local.get(DEFAULTS, ...)` 로 초기값 복원
- [x] 각 컨트롤 이벤트 → `chrome.storage.local.set` *(`tabs.sendMessage` 금지)*
- [ ] `git commit -m "feat(popup): 토글2 + 레벨 + 밀도 → storage.local"`
- [x] ✅ 밀도 40% · 레벨 N3 으로 바꾸고 팝업을 닫았다 다시 열면 **값이 그대로** · `chrome.storage.local.get(console.log)` 로 4키 확인

### D1-C4 `content.css` — **C** *(선행: B2)*

- [x] `.koja-word` 점선 밑줄 + `cursor: help`
- [x] `.koja-word ruby` — `ruby-position: over` · `line-height: 1`
- [x] `.koja-word rt` — `font-size:.55em` · **`display: revert`** · `opacity:1` · `visibility:visible` *(사이트 리셋 CSS 방어)*
- [x] `html.koja-no-furigana .koja-word rt { display: none }`
- [x] `#koja-tip` — `position:fixed` · `z-index:2147483647` · `pointer-events:none` · `display:none`
- [x] **확장 새로고침 + 페이지 새로고침**
- [ ] `git commit -m "feat(css): ruby · 후리가나 토글 · 툴팁 스타일"`
- [ ] ✅ 점선 밑줄 + 한자 위 가나가 보인다 · 콘솔에서 `documentElement.classList.add('koja-no-furigana')` 하면 **가나가 즉시 사라진다** *(치환된 `.koja-word`가 아직 없어 B의 replacer 연결 후 재확인)*

### 🚩 D1 종료 게이트 — 전원 15분 *(SPEC §10: 여기 못 가면 D2에 기능을 줄인다)*

- [ ] `node --test` → `# fail 0`
- [ ] `chrome://extensions` KoJa 카드 오류 배지 없음
- [ ] `demo/sample.html` 1번 문단 치환됨
- [ ] 3번 상자 「경제학」「2시간」 한국어 그대로
- [ ] 5번 상자(입력창·textarea·pre·contenteditable) 한국어 그대로
- [ ] 콘솔 빨간 줄 0개
- [ ] 3개 브랜치 `main` 머지

---

# D2 — 통합 + UI

## D2-1 실제 matcher 결합 — **A + B** *(같이 앉는다)*

- [ ] `grep -n "STUB" src/matcher.js` → 아무것도 안 나온다
- [ ] 데모에서 `document.querySelectorAll('.koja-word').length` 측정
- [ ] 함정 상자 2·3·4 를 눈으로 훑는다
- [ ] `git commit -am "chore: matcher 스텁 제거 확인"`
- [ ] ✅ `.koja-word` 가 **8개 이상**(§9.2) · 2번 상자에서 「아주머니」「물고기」「할아버지」「수요일」「화장실」이 **통째로** 일본어

## D2-2 설정 배선 — **B** *(선행: D2-1, D1-C3)*

- [ ] `DEFAULTS` 상수 + `chrome.storage.local.get` 으로 초기 로드
- [ ] `applyFurigana(on)` — `documentElement.classList.toggle('koja-no-furigana', !on)`
- [ ] `reset()` — `restoreAll` + `seenIds.clear()` + `candSeq = 0` + `total = 0`
- [ ] `rerender()` — `reset()` 후 `enabled` 면 `scan()`
- [ ] `chrome.storage.onChanged` 구독 — `enabled`/`level`/`density` → 재렌더, **`furigana` 는 CSS만**(재스캔 금지)
- [ ] 파일 끝의 단독 `scheduleScans()` 호출 **제거**
- [ ] **확장 새로고침 + 페이지 새로고침**
- [ ] `git commit -m "feat(content): storage.onChanged 단일 경로 배선 + 무손실 리셋"`
- [ ] ✅ **대본 2·6단계** — 치환 켜기 OFF → **새로고침 없이** 즉시 한국어 복원, ON → 즉시 일본어
- [ ] ✅ **대본 4단계** — 레벨 N5 → N3 으로 올리면 치환 수가 눈에 띄게 늘어난다
- [ ] ✅ on/off 3회 왕복해도 본문 글자가 깨지지 않는다

## D2-3 밀도 슬라이더 검증 — **B** (**A** 배석) *(구현이 아니라 검증)*

- [ ] `grep -n "candSeq" src/content.js` → `= 0` 은 `reset()` 안에만, 콜백 안에는 `++` 만
- [ ] 밀도 100 → 50 → 25 → 100 순서로 조작하며 매번 치환 목록을 기록
- [ ] 100% 로 되돌아왔을 때 **처음 100% 목록과 글자까지 동일**
- [ ] F5 **3회** — 매번 목록이 같다 (§9.2 결정성)
- [ ] ✅ **대본 5단계** — 슬라이더를 끌면 화면의 일본어가 **눈앞에서 줄고 늘어난다**

## D2-4 툴팁 — **B** *(선행: D2-2, D1-C4)*

- [ ] `ensure()` — 재사용 `div#koja-tip` 1개를 **`documentElement`** 에 붙인다 *(body는 갈아 끼워질 수 있다)*
- [ ] 2행 내용 — `data-ko` + `data-kana` **그 외 아무것도 넣지 않는다** *(영어 뜻·로마자·예문·품사·배지 금지)*
- [ ] 뷰포트 플립 — 위가 좁으면 아래로, 오른쪽이 좁으면 왼쪽으로
- [ ] **이벤트 위임** — `document` 에 `mouseover`/`mouseout` 1쌍 *(단어마다 리스너 금지)*
- [ ] `init()` 멱등 처리 (`inited` 플래그) + `scroll` 시 숨김
- [ ] `content.js` 설정 로드 콜백에서 `KOJA.tooltip.init()` 호출
- [ ] `git commit -m "feat(tooltip): 이벤트 위임 + 뷰포트 플립"`
- [ ] ✅ **대본 3단계** — 「생선」 자리에 올리면 툴팁 1행이 「물고기」가 아니라 **「생선」**
- [ ] ✅ 화면 맨 위 단어 → 툴팁이 아래로 · 맨 오른쪽 단어 → 왼쪽으로 밀려 **잘리지 않는다**

## D2-5 `MutationObserver` — **B** *(선행: D2-4)*

- [ ] `USE_OBSERVER = true` · `DEBOUNCE_MS = 300` 상수를 **파일 상단에** 둔다
- [ ] 추가 노드가 `.koja-word` 이거나 그 안이면 무시 *(무한 루프 방지)*
- [ ] 디바운스 후 `observer.disconnect()` → `scan()` → `finally { observe() }`
- [ ] `reset()` 에서 `observer.disconnect(); observer = null`
- [ ] `scheduleScans()` 마지막 지연 뒤 `startObserver()`
- [ ] 무한 스크롤 페이지에서 확인
- [ ] 🚨 **터지거나 느려지면 즉시 `USE_OBSERVER = false` 로 커밋하고 넘어간다** *(§10.1 축소 1번)*
- [ ] `git commit -m "feat(content): MutationObserver 디바운스 + 킬스위치"`
- [ ] ✅ 무한 스크롤을 내리면 **새 영역에도 일본어가 나타난다** · **탭이 멈추지 않는다**

### 🚩 D2 종료 게이트 — 전원 20분

- [ ] `node --test` → `# fail 0`
- [ ] **§9.1 대본 6단계를 데모 페이지에서 처음부터 끝까지 1회 완주**
- [ ] 콘솔 에러 0
- [ ] `main` 머지

---

# D3 — 정확도 + 리허설

## D3-1 3사이트 실측 — **전원** *(A=데모+위키, B=위키+블로그, C=블로그+데모 교차)*

- [ ] 레벨 **N1** · 밀도 **100%** 로 설정 *(가장 많이 치환되는 조건)*
- [ ] 사이트 1(데모) 끝까지 읽고 이상한 것 전부 기록
- [ ] 사이트 2(위키백과) 끝까지 읽고 기록
- [ ] 사이트 3(블로그/뉴스) 끝까지 읽고 기록
- [ ] 각 항목을 4유형으로 분류 — 오탐(→C) / 미탐(→A) / 레이아웃(→C) / 콘솔에러(→B)
- [ ] 레이아웃 깨짐은 **스크린샷** *(발표 재료)*
- [ ] ✅ 오탐 목록에 **담당자 이름이 전부 붙어 있다**

## D3-2 오탐 제거 — **A**(규칙) · **C**(사전)

> 원칙: **오탐 하나 = 사전에서 단어 하나 제외.** 규칙 변경은 같은 유형이 **3건 이상** 모였을 때만. *(규칙을 건드리면 74쌍과 §5.3이 통째로 흔들린다)*

- [ ] **C** — `data/dictionary.json` 에서 문제 엔트리 제거
- [ ] **C** — `python tools/build_dictionary.py` 재실행 → 불변식 8종 통과 확인
- [ ] **A** — 규칙을 고쳐야 하면 **실측 문장을 테스트 케이스로 먼저 추가**
- [ ] `node --test` → 74쌍과 §5.3이 **여전히 초록**인지 반드시 확인
- [ ] `git commit -am "fix: 실측 오탐 제거"`
- [ ] ✅ 3사이트를 다시 훑어 **명백한 오치환 0건**(§9.2) · `node --test` `# fail 0`

## D3-3 안전성 회귀 — **B** *(§10.1 「절대 버리지 않는 것」)*

3사이트 × 6항목 = 18칸을 전부 ○ 로 채운다.

- [ ] **입력창 보호** — 3사이트 검색창에 「시간 학교 경제」 입력 → 변형 없음
- [ ] **입력창 보호** — 데모 5번 상자의 textarea · pre · code · contenteditable 확인
- [ ] **무손실 복원** — 각 사이트에서 on/off **3회** 후 본문에 붙거나 벌어진 어절 없음
- [ ] **결정성** — F5 **3회**, 매번 `[...document.querySelectorAll('.koja-word')].map(s=>s.dataset.ko).join(' ')` 이 동일
- [ ] **콘솔 에러 0** — 3사이트 각각 F12 처음부터 끝까지
- [ ] **한 눈에 8개 이상** — 각 사이트 첫 화면에서 치환 수 세기
- [ ] **레이아웃** — ruby 때문에 줄 간격이 튀거나 요소가 겹치지 않음
- [ ] ✅ 18칸 표가 **전부 ○** · 하나라도 × 면 D3-4로 넘어가지 않는다

## D3-4 발표 대본 리허설 2회 — **전원**

- [ ] **1회차(개발 PC)** — §9.1 6단계를 **말하면서** 실행
  - [ ] 1 원본 페이지 열기 → "평소 보는 한국어 페이지입니다"
  - [ ] 2 확장 ON → "후리가나가 핵심입니다 — 한국인은 뜻은 알지만 읽는 법을 모릅니다"(§0.1)
  - [ ] 3 마우스 오버 → "툴팁은 두 줄이 전부입니다. 뜻을 계속 보여주면 번역 경로를 강화하니까요"(§1)
  - [ ] 4 레벨 N5→N3 → "328개에서 528개로"
  - [ ] 5 밀도 슬라이더 → "Nation의 95~98% 커버리지 임계선을 사용자가 직접 정합니다"(§1.1)
  - [ ] 6 OFF → "완전히 원본으로 돌아옵니다"
- [ ] **2회차(시연할 노트북)** — 확장 로드 · 파일 URL 허용 · http 서버까지 **전부 다시**
- [ ] **백업 경로** — 네트워크를 끄고 `demo/backup/wiki.html` 로 같은 시연이 되는지
- [ ] 소요 시간 측정 — 3분 초과 시 4·5단계 축약
- [ ] ✅ 시연 노트북에서 6단계가 **끊김 없이** 흐르고, 네트워크를 끊어도 백업으로 시연된다

## D3-5 발표 자료 — **C** 주도(전원 검토)

- [ ] 슬라이드 1 — **학습은 약속이 아니라 부작용이다.** 기록·복습·통계 없음은 결함이 아니라 선택(§1.1·§13.1)
- [ ] 슬라이드 2 — **등급 표기는 추정치다.** JLPT 공식 목록은 2010년부터 비공개. 표기·후리가나·표제어·레벨은 직접 작성(§4.7·§13.2)
- [ ] 슬라이드 3 — **권한 경고 선제 설명.** 텍스트 치환에 필요하며 외부 전송 0(§8.6)
- [ ] 예상 질문 답변 — "Toucan이 이미 있는데?" → **한자어 보너스**(§1.2·§13.4)
- [ ] 예상 질문 답변 — "학습을 어떻게 돕나?" → 우연적 학습 + **추적하지 않는다고 먼저 말한다**(§1.1)
- [ ] 예상 질문 답변 — "다음 단계는?" → 부록 C 로드맵(방향 반전 · 어휘 체크 목록 · 뉘앙스 복원)
- [ ] `git commit -m "docs: 발표 자료 + 최종 검증"` · `git tag v0.1.0`
- [ ] ✅ 슬라이드 3장 존재 · **3명이 각자 예상 질문 하나씩을 보지 않고 답한다**

---

# 최종 출하 체크 — SPEC §9.2 그대로

- [ ] 새로고침·재실행 시 **매번 동일한 단어**가 치환된다
- [ ] 서로 다른 유형의 사이트 **3곳 이상**에서 레이아웃이 깨지지 않는다
- [ ] **명백한 오치환 0건**
- [ ] 화면 한 눈에 **8개 이상** 치환
- [ ] 입력창·검색창 텍스트 변형 없음
- [ ] 복원 후 원본과 텍스트 일치 (**3회 반복해도**)
- [ ] 후리가나 토글 즉시 반영
- [ ] 무한 스크롤 새 영역도 치환 (`USE_OBSERVER=true` 일 때)
- [ ] 콘솔에 처리되지 않은 에러 없음

---

# 기능을 줄여야 할 때 — 위에서부터 버린다 (§10.1)

- [ ] 1순위 버림: `MutationObserver` → `USE_OBSERVER = false`
- [ ] 2순위 버림: 밀도 슬라이더 → 팝업에서 숨기고 100% 고정
- [ ] 3순위 버림: 후리가나 토글 → 항상 켜짐
- [ ] 4순위 버림: 툴팁 → 대본 1·2·6단계는 그래도 성립

**절대 버리지 않는 것** — 입력창 보호 · off 시 무손실 복원 · 결정적 동작 · 콘솔 에러 0

---

# 막혔을 때 (30분 규칙)

| 증상 | 원인 |
|---|---|
| 아무 일도 안 일어난다 | `import`/`export` 를 썼다 — **조용히** 죽는다 |
| 고쳤는데 안 바뀐다 | 확장만 새로고침했다. **페이지도** 새로고침 |
| `file://` 에서 무반응 | "파일 URL에 대한 액세스 허용" OFF |
| 「아주머니」가 쪼개진다 | `pairs.sort(길이 내림차순)` 누락 |
| 「2시간」이 치환된다 | 경계 정규식에서 `0-9` 빠짐 |
| 두 번째 스캔부터 매칭 없음 | `re.lastIndex = 0` 누락 |
| 밀도가 거의 안 먹는다 | 러닝 카운터를 노드마다 리셋했다 |
| on/off 반복 시 글자가 붙는다 | 복원 후 `normalize()` 누락 |
| 탭이 얼어붙는다 | 관찰자 무한 루프 → **즉시 `USE_OBSERVER=false`** |
| 후리가나가 안 보인다 | 사이트 리셋 CSS → `rt { display: revert }` |
| 팝업이 무반응 | 인라인 `<script>` — MV3 CSP가 막는다 |
| 테스트가 모듈 로드 실패 | `node --test` 에 **인자를 줬다** |
