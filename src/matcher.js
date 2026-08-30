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
      // D3-2 실측 오탐(docs/misfires.md 1-1) — "-는 바람에"는 관용구(원인)이지 날씨의
      // 바람이 아니다. 일반 규칙으로는 구분할 수 없는 좁은 예외라 이 자리에서만 걸러낸다.
      if (m[1] === '바람' && text.slice(Math.max(0, m.index - 2), m.index) === '는 ' && m[2] === '에') {
        continue;
      }
      // 앞쪽 lookbehind 가 zero-width 이므로 m.index 가 곧 그룹1의 시작이다
      out.push({ start: m.index, length: m[1].length, surface: m[1], entry: c.index.get(m[1]) });
    }
    return out;
  }

  function shouldSelect(candidateIndex, density) {
    if (density <= 0) return false;
    if (density >= 100) return true;
    return Math.ceil((candidateIndex + 1) * density / 100) >
           Math.ceil(candidateIndex * density / 100);
  }

  window.KOJA.matcher = {
    compile: compile,
    findMatches: findMatches,
    shouldSelect: shouldSelect
  };
})();
