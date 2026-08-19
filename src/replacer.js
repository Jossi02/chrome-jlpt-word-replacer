// src/replacer.js — 텍스트 노드 분할 · span 삽입 · 무손실 복원 (§8.4)
window.KOJA = window.KOJA || {};
(function () {
  'use strict';

  function makeSpan(doc, surface, entry) {
    var span = doc.createElement('span');
    span.className = 'koja-word';
    if (entry.falseFriend) span.classList.add('koja-false-friend');  // SPEC §1.2 — 한자음으로 읽으면 틀리는 단어
    span.setAttribute('data-ko', surface);          // 페이지에 실제로 있던 표면형 (§4.3 · §8.4)
    span.setAttribute('data-kana', entry.reading);
    if (entry.ruby) {
      var ruby = doc.createElement('ruby');
      ruby.appendChild(doc.createTextNode(entry.kanji));
      var rt = doc.createElement('rt');
      rt.appendChild(doc.createTextNode(entry.reading));
      ruby.appendChild(rt);
      span.appendChild(ruby);
    } else {
      span.appendChild(doc.createTextNode(entry.kanji));   // 가나 전용 104개
    }
    return span;
  }

  // picks 는 start 오름차순 · 서로 겹치지 않아야 한다. 반환값은 실제로 삽입한 span 수
  function applyMatches(textNode, picks) {
    if (!picks || !picks.length) return 0;
    if (!textNode.parentNode) return 0;
    var doc = textNode.ownerDocument;
    var text = textNode.nodeValue;
    var frag = doc.createDocumentFragment();
    var cursor = 0, inserted = 0, i, p;

    for (i = 0; i < picks.length; i++) {
      p = picks[i];
      if (p.start < cursor) continue;                       // 겹치면 버린다 (방어)
      if (p.start > cursor) frag.appendChild(doc.createTextNode(text.slice(cursor, p.start)));
      frag.appendChild(makeSpan(doc, p.surface, p.entry));
      cursor = p.start + p.length;
      inserted++;
    }
    if (!inserted) return 0;                                // DOM 을 건드리지 않는다
    if (cursor < text.length) frag.appendChild(doc.createTextNode(text.slice(cursor)));

    textNode.parentNode.replaceChild(frag, textNode);
    return inserted;
  }

  function restoreAll(root) {
    var spans = root.querySelectorAll('.koja-word');
    var parents = new Set();
    var restored = 0;
    for (var i = 0; i < spans.length; i++) {
      var s = spans[i];
      var parent = s.parentNode;
      if (!parent) continue;
      parent.replaceChild(s.ownerDocument.createTextNode(s.getAttribute('data-ko')), s);
      parents.add(parent);
      restored++;
    }
    // §8.4 — 안 하면 켜기/끄기를 반복할수록 DOM 이 파편화된다
    parents.forEach(function (p) { p.normalize(); });
    return restored;
  }

  window.KOJA.replacer = {
    applyMatches: applyMatches,
    restoreAll: restoreAll
  };
})();
