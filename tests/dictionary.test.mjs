import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const dict  = JSON.parse(read('../data/dictionary.json'));
const pairs = JSON.parse(read('../data/substring-pairs.json'));

const KANJI  = /[一-鿿]/;
const KANA   = /^[぀-ゟ゠-ヿーー]+$/;
const HANGUL = /^[가-힣][가-힣 ]*$/;

test('사전 규모 — SPEC 4.1 (D3-2 오탐 제거 반영: 646)', () => {
  assert.equal(dict.length, 646);
  const lv = {};
  for (const e of dict) lv[e.level] = (lv[e.level] || 0) + 1;
  assert.deepEqual(lv, { N5: 327, N4: 105, N3: 95, N2: 70, N1: 49 });
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
  assert.equal(dict.filter(e => e.ruby).length, 542);
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
  assert.equal(surf.size, 677);
});

// 경로 B(Python 미설치) 대비 — 생성물이 정본과 어긋나면 즉시 잡는다
test('생성물 정합 — dictionary.js 가 dictionary.json 과 같다', () => {
  const js = read('../data/dictionary.js');
  const m = js.match(/window\.KOJA_DICT = ([\s\S]*);\s*$/);
  assert.ok(m, 'window.KOJA_DICT 할당을 찾지 못함');
  assert.deepEqual(JSON.parse(m[1]), dict);
});

// 위 테스트는 텍스트를 정규식으로 파싱할 뿐이라 "스크립트로 실제 로드되는가" 는 보지 못한다.
// manifest 가 이 파일을 콘텐츠 스크립트로 싣는다 — 실행해서 전역이 붙는지까지 확인한다.
// globalThis 를 더럽히지 않으려고 window 를 인자로 넘겨 샌드박스에 받는다.
test('생성물 로드 — dictionary.js 가 스크립트로 실행돼 window.KOJA_DICT 를 붙인다', () => {
  const sandbox = {};
  new Function('window', read('../data/dictionary.js')).call(sandbox, sandbox);
  assert.ok(Array.isArray(sandbox.KOJA_DICT), 'window.KOJA_DICT 가 배열이 아님');
  assert.equal(sandbox.KOJA_DICT.length, 646);
  assert.deepEqual(sandbox.KOJA_DICT, dict);
});

test('생성물 정합 — substring-pairs.json 이 재계산과 같다 (74쌍)', () => {
  const keys = dict.flatMap(e => e.match).sort((a, b) => a.length - b.length);
  const calc = [];
  for (const s of keys) for (const t of keys) if (s !== t && t.includes(s)) calc.push({ short: s, long: t });
  assert.deepEqual(calc, pairs);
  assert.equal(pairs.length, 74);
});

// D3-2 회귀 방지 — 사전에서 엔트리를 빼면 popup.html 의 누적 개수도 같이 바뀌어야 한다.
// 이 테스트가 없어서 646 으로 줄인 뒤에도 팝업이 648 을 계속 표시했다(스크린샷 작업에서 발견).
test('팝업 레벨 개수가 사전 누적 개수와 정합', () => {
  const html = read('../src/popup.html');
  const ORDER = ['N5', 'N4', 'N3', 'N2', 'N1'];

  const shown = new Map();
  for (const m of html.matchAll(/<option value="(N[1-5])">\s*N[1-5][^\d]*(\d+)\s*<\/option>/g)) {
    shown.set(m[1], Number(m[2]));
  }
  assert.deepEqual([...shown.keys()], ORDER, 'popup.html 의 option 이 N5→N1 순서로 5개가 아니다');

  let acc = 0;
  for (const lv of ORDER) {
    acc += dict.filter(e => e.level === lv).length;
    assert.equal(shown.get(lv), acc, `popup.html 의 ${lv} 표기(${shown.get(lv)})가 실제 누적(${acc})과 다르다`);
  }
});

// 거짓짝 경고(SPEC §1.2, 부록 C-6) — falseFriend 는 선택 필드이므로 있는 엔트리에서만 타입을 본다.
test('불변식 — falseFriend 는 있으면 boolean true 만 (문자열·0·null 금지)', () => {
  for (const e of dict) {
    if (!('falseFriend' in e)) continue;
    assert.equal(e.falseFriend, true, `${e.id}(${e.kanji}) falseFriend 는 true 이거나 필드 자체가 없어야 한다`);
  }
});

test('거짓짝 — 「勉強」(id 296) 이 플래그돼 있다 (SPEC §1.2 예시)', () => {
  const e = dict.find(x => x.id === 296);
  assert.equal(e.kanji, '勉強');
  assert.equal(e.falseFriend, true, '勉強 는 한국식 한자음(면강)으로 읽으면 틀리는 대표 사례인데 플래그가 없다');
});
