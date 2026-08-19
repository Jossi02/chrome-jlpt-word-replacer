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

// 헬퍼: 매칭 결과를 '표면형' 문자열 배열로 압축한다
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

// ── 수정 라운드 1 — 리뷰 Important 1·2·3 ────────────────────────────────

test('Important2 — compile 캐시는 entries 배열마다 분리된다', () => {
  const only경제 = [dict.find(e => e.korean === '경제')];   // N4 한 개짜리 사전
  const text = '경제가 시간이';
  // 같은 maxLevel 이라도 사전 배열이 다르면 결과가 달라야 한다
  assert.equal(matcher.findMatches(text, only경제, { maxLevel: 'N1' }).length, 1);
  assert.equal(matcher.findMatches(text, dict,     { maxLevel: 'N1' }).length, 2);
  // 순서를 바꿔도 같다 (캐시가 앞 호출에 오염되지 않는다)
  assert.equal(matcher.findMatches(text, only경제, { maxLevel: 'N1' }).length, 1);
});

test('Important2 — 빈 사전으로 먼저 불러도 정상 사전이 영구 오염되지 않는다', () => {
  // content.js 가 KOJA_DICT 로딩 전에 첫 호출을 하는 상황
  assert.equal(matcher.findMatches('경제가', [],   { maxLevel: 'N2' }).length, 0);
  assert.equal(matcher.findMatches('경제가', dict, { maxLevel: 'N2' }).length, 1);
});

test('Important1 — 빈 사전은 유령 매치를 만들지 않는다', () => {
  // pairs 가 비면 정규식 그룹1이 빈 문자열로 매치되고, 조사 그룹만 붙어
  // m[0] 은 비지 않으므로 m[0].length 가드를 통과해 버린다
  assert.deepEqual(matcher.findMatches('나 는 좋다', [], { maxLevel: 'N1' }), []);
});

test('Important1 — 모든 매치는 surface 가 비지 않고 entry 가 있다', () => {
  const texts = ['나 는 좋다', '를 을 에서', '경제가 시간이', '', '   '];
  for (const entries of [[], dict]) {
    for (const text of texts) {
      for (const m of matcher.findMatches(text, entries, { maxLevel: 'N1' })) {
        assert.ok(m.length > 0, `'${text}' 에서 length 0 매치 (start ${m.start})`);
        assert.ok(m.surface.length > 0, `'${text}' 에서 빈 surface 매치`);
        assert.ok(m.entry, `'${text}' 의 '${m.surface}' 에 entry 가 없다`);
      }
    }
  }
});

test('Important3 — 오염된 maxLevel 은 전 레벨 통과가 아니라 N5 로 떨어진다', () => {
  const text = '경제';                    // 경제 = N4. N5 에서는 잡히면 안 된다
  assert.equal(matcher.findMatches(text, dict, { maxLevel: 'N4' }).length, 1);  // 정상값
  assert.equal(matcher.findMatches(text, dict, { maxLevel: 'N5' }).length, 0);  // 정상 폴백 기준
  // 아래는 전부 N5 로 떨어져야 한다 (현재는 필터가 통째로 죽어 N4 가 통과한다)
  assert.equal(matcher.findMatches(text, dict, { maxLevel: 'n1' }).length, 0, '소문자');
  assert.equal(matcher.findMatches(text, dict, { maxLevel: '쓰레기' }).length, 0, '미지의 문자열');
  assert.equal(matcher.findMatches(text, dict, { maxLevel: 3 }).length, 0, '인덱스 숫자');
  assert.equal(matcher.findMatches(text, dict, { maxLevel: 'constructor' }).length, 0, '프로토타입 키');
  assert.equal(matcher.findMatches(text, dict, {}).length, 0, 'maxLevel 없음');
  assert.equal(matcher.findMatches(text, dict).length, 0, 'opts 없음');
});

// D3-2 실측 오탐 — 위키백과 「국호」 단락에서 발견 (docs/misfires.md 1-1)
test('실측 오탐 — 관용구 "-는 바람에" 는 바람(날씨)으로 치환되지 않는다', () => {
  assert.ok(!hit('잘못 기록하는 바람에 나라 이름이 되었다').includes('바람'));
});

test('바람(날씨)은 관용구가 아니면 정상적으로 치환된다', () => {
  assert.deepEqual(hit('바람이 분다'), ['바람']);
  assert.ok(hit('복숭아 향기가 바람을 타고 흘러왔다').includes('바람'));
});
