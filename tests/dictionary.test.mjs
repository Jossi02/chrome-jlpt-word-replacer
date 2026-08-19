import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const dict  = JSON.parse(read('../data/dictionary.json'));
const pairs = JSON.parse(read('../data/substring-pairs.json'));

const KANJI  = /[一-鿿]/;
const KANA   = /^[぀-ゟ゠-ヿーー]+$/;
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
