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
    { host: /(^|\.)news\.naver\.com$/,   sel: ['#dic_area', '#newsct_article'] },
    { host: /(^|\.)ko\.wikipedia\.org$/, sel: ['.mw-parser-output'] }
  ];
  var FALLBACK = ['#koja-demo-body', 'article', 'main', '[role="main"]', 'body'];

  // 위키백과 추가 제외 (§6.2)
  var WIKI_SKIP = '.infobox, .navbox, .reference, .mw-editsection, #toc, .hatnote, table';

  function getRoot(doc) {
    var host = (doc.location && doc.location.hostname) || '';
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
    var host = (doc.location && doc.location.hostname) || '';
    var extra = /(^|\.)ko\.wikipedia\.org$/.test(host) ? WIKI_SKIP : null;
    for (var n = el; n && n.nodeType === 1; n = n.parentElement) {
      if (SKIP_TAGS[n.nodeName]) return true;
      if (n.isContentEditable) return true;                                // §6.1 안전 필수
      if (n.getAttribute) {
        // isContentEditable 을 구현하지 않는 환경(테스트 하네스 등)을 위한 이중 방어
        var ce = n.getAttribute('contenteditable');
        if (ce !== null && ce !== 'false') return true;
        if (n.getAttribute('aria-hidden') === 'true') return true;
      }
      if (n.classList && n.classList.contains('koja-word')) return true;   // 재치환 방지
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

  window.KOJA.scope = {
    getRoot: getRoot,
    eachTextNode: eachTextNode,
    isSkipped: isSkipped
  };
})();
