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

  var cache = Object.create(null);   // maxLevel -> {re, index}. 페이지당 최대 5개

  function compile(entries, maxLevel) {
    if (cache[maxLevel]) return cache[maxLevel];

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
    cache[maxLevel] = { re: re, index: index };
    return cache[maxLevel];
  }

  function findMatches(text, entries, opts) {
    var maxLevel = (opts && opts.maxLevel) || 'N5';
    var c = compile(entries, maxLevel);
    var out = [], m;
    c.re.lastIndex = 0;                       // 'g' 정규식 재사용 시 필수
    while ((m = c.re.exec(text)) !== null) {
      if (m[0].length === 0) { c.re.lastIndex++; continue; }   // 무한 루프 방지
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
