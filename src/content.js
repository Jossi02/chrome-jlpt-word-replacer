// src/content.js — 오케스트레이션 (§8.2)
window.KOJA = window.KOJA || {};
(function () {
  'use strict';

  var MAX_REPLACEMENTS = 200;          // §8.5 · G11
  var SCAN_DELAYS = [0, 1000, 2000];   // §7 1단계 — 로드 직후 + 1s + 2s
  var USE_OBSERVER = true;             // §0.2 · §10.1 — 문제가 생기면 이 한 줄을 false 로
  var DEBOUNCE_MS = 300;

  var DEFAULTS = { enabled: true, furigana: true, level: 'N5', density: 100 };

  var state = {
    root: null,
    seenIds: new Set(),   // §F1 단어당 첫 등장만. 재스캔 사이에도 유지된다
    candSeq: 0,           // §F2 밀도용 러닝 카운터 (D1-A4 시맨틱 — 노드마다 리셋하지 않는다)
    total: 0,
    settings: { enabled: true, furigana: true, level: 'N5', density: 100 }
  };

  var pending = null;
  var observer = null;

  function scan() {
    try {
      if (!state.settings.enabled) return;
      if (!state.root) state.root = KOJA.scope.getRoot(document);
      if (!state.root) { console.warn('[KoJa] 본문을 찾지 못했다'); return; }   // §8.5

      // 설정이 깨졌으면(undefined·null·문자열) densityStep 이 NaN 이나 Infinity 로 접혀
      // 아무것도 안 바뀌는데 콘솔도 조용하다. 단서를 남기고 멈춘다 (§8.5)
      var density = state.settings.density;
      if (typeof density !== 'number' || !isFinite(density)) {
        console.warn('[KoJa] density 설정이 올바르지 않다 — 치환하지 않는다', density);
        return;
      }

      // §F2 · D1-A4 — JS 에서 0 % Infinity === 0 이라 이 가드가 없으면 밀도 0% 에서
      // 첫 후보가 항상 통과한다. 0% 는 사용자의 정상 선택이므로 조용히 0건으로 끝낸다
      var step = KOJA.matcher.densityStep(density);
      if (!isFinite(step)) return;

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

  // ── D2-5 MutationObserver — 끌 수 있는 형태로 (§7) ────────────────────────
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

  function stopObserver() {
    clearTimeout(pending);
    pending = null;
    if (observer) { observer.disconnect(); observer = null; }
  }

  function scheduleScans() {
    for (var i = 0; i < SCAN_DELAYS.length; i++) setTimeout(scan, SCAN_DELAYS[i]);
    // 마지막 지연과 같은 시각이지만 뒤에 등록했으므로 마지막 스캔 다음에 돈다
    setTimeout(startObserver, SCAN_DELAYS[SCAN_DELAYS.length - 1]);
  }

  // ── D2-2 설정 배선 — 통신은 storage.onChanged 하나뿐이다 (G8) ─────────────
  function applyFurigana(on) {
    document.documentElement.classList.toggle('koja-no-furigana', !on);
  }

  // 페이지를 원상 복구하고 카운터를 초기화한다 (§F1 — 끄기→켜기 시 초기화)
  function reset() {
    stopObserver();                                     // 복원 자체가 관찰자를 깨우지 않게 먼저 끊는다
    if (state.root) KOJA.replacer.restoreAll(state.root);
    state.seenIds.clear();
    state.candSeq = 0;
    state.total = 0;
  }

  function rerender() {
    reset();
    if (state.settings.enabled) { scan(); startObserver(); }
  }

  function boot(s) {
    state.settings = s;
    applyFurigana(s.furigana);
    KOJA.tooltip.init();                                // 멱등 (D2-4)
    if (s.enabled) scheduleScans();
  }

  function onChanged(changes, area) {
    if (area !== 'local') return;
    var needRerender = false;
    for (var k in changes) {
      state.settings[k] = changes[k].newValue;
      if (k === 'furigana') applyFurigana(changes[k].newValue);   // CSS 클래스만. 재스캔 불필요 (§F4)
      if (k === 'enabled' || k === 'level' || k === 'density') needRerender = true;
    }
    if (needRerender) rerender();
  }

  var storage = (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local)
    ? chrome.storage : null;

  if (storage) {
    storage.local.get(DEFAULTS, boot);
    storage.onChanged.addListener(onChanged);
  } else {
    // manifest 에 storage 권한이 없으면 여기로 온다. 조용히 죽지 않고 기본 설정으로 돈다
    console.warn('[KoJa] chrome.storage 를 쓸 수 없다 — 기본 설정으로 동작한다');
    boot({ enabled: DEFAULTS.enabled, furigana: DEFAULTS.furigana,
           level: DEFAULTS.level, density: DEFAULTS.density });
  }

  window.KOJA.content = { scan: scan, state: state };   // 디버깅용
})();
