// src/matcher.js — 표면형 매칭 (순수 함수. DOM/chrome 접근 금지)
window.KOJA = window.KOJA || {};
(function () {
  'use strict';

  // P0 walking skeleton: 3단어만 단순 검색. D1-A2에서 전면 교체된다.
  var STUB = ['경제', '시간', '학교'];

  function findMatches(text, entries, opts) {
    var out = [];
    for (var i = 0; i < STUB.length; i++) {
      var pos = text.indexOf(STUB[i]);
      if (pos < 0) continue;
      var entry = null;
      for (var k = 0; k < entries.length; k++) {
        if (entries[k].korean === STUB[i]) {
          entry = entries[k];
          break;
        }
      }
      if (entry) {
        out.push({
          start: pos,
          length: STUB[i].length,
          surface: STUB[i],
          entry: entry
        });
      }
    }
    return out.sort(function (a, b) { return a.start - b.start; });
  }

  function densityStep(density) {
    if (density >= 100) return 1;
    if (density <= 0) return Infinity;
    return Math.max(1, Math.round(100 / density));
  }

  window.KOJA.matcher = {
    findMatches: findMatches,
    densityStep: densityStep
  };
})();
