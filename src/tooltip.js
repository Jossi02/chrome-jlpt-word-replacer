// src/tooltip.js — 재사용 div 1개 + 이벤트 위임 (§F3)
window.KOJA = window.KOJA || {};
(function () {
  'use strict';

  var tip = null, inited = false;

  function ensure() {
    if (tip) return tip;
    tip = document.createElement('div');
    tip.id = 'koja-tip';
    tip.innerHTML = '<div class="koja-tip-ko"></div><div class="koja-tip-kana"></div>';
    // body 는 사이트가 통째로 갈아 끼울 수 있다. documentElement 가 안전하다
    document.documentElement.appendChild(tip);
    return tip;
  }

  // 내용은 원본 한국어 + 후리가나 두 줄이 전부다 (§F3 — 영어 뜻·로마자·예문·품사 금지)
  function show(span) {
    var t = ensure();
    t.querySelector('.koja-tip-ko').textContent   = span.getAttribute('data-ko');
    t.querySelector('.koja-tip-kana').textContent = span.getAttribute('data-kana');
    t.style.display = 'block';

    var r = span.getBoundingClientRect();
    var b = t.getBoundingClientRect();
    var gap = 8;

    // 위가 좁으면 아래로 뒤집는다
    var top = r.top - b.height - gap;
    if (top < 4) top = r.bottom + gap;

    // 오른쪽이 좁으면 왼쪽으로 민다
    var left = r.left;
    if (left + b.width > window.innerWidth - 4) left = window.innerWidth - b.width - 4;
    if (left < 4) left = 4;

    t.style.top = top + 'px';
    t.style.left = left + 'px';
  }

  function hide() { if (tip) tip.style.display = 'none'; }

  function closestWord(target) {
    return (target && target.closest) ? target.closest('.koja-word') : null;
  }

  function init() {
    if (inited) return;                 // 멱등 — 재스캔마다 호출돼도 리스너는 1쌍뿐
    inited = true;
    document.addEventListener('mouseover', function (e) {
      var span = closestWord(e.target);
      if (span) show(span);
    }, true);
    document.addEventListener('mouseout', function (e) {
      if (closestWord(e.target)) hide();
    }, true);
    window.addEventListener('scroll', hide, true);
  }

  window.KOJA.tooltip = { init: init, hide: hide };
})();
