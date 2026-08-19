// src/content.js — 오케스트레이션 (§8.2)
window.KOJA = window.KOJA || {};
(function () {
  'use strict';

  var MAX_REPLACEMENTS = 200;          // §8.5 · G11
  var SCAN_DELAYS = [0, 1000, 2000];   // §7 1단계 — 로드 직후 + 1s + 2s

  var state = {
    root: null,
    seenIds: new Set(),   // §F1 단어당 첫 등장만. 재스캔 사이에도 유지된다
    candSeq: 0,           // §F2 밀도용 러닝 카운터 (D1-A4 시맨틱 — 노드마다 리셋하지 않는다)
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

  window.KOJA.content = { scan: scan, state: state };   // 디버깅 · D2 배선용
  scheduleScans();
})();
