// src/popup.js — 설정 읽기/쓰기. 통신은 storage 단일 경로다 (G8)
'use strict';

var DEFAULTS = { enabled: true, furigana: true, level: 'N5', density: 100 };

var el = {
  enabled:  document.getElementById('enabled'),
  furigana: document.getElementById('furigana'),
  level:    document.getElementById('level'),
  density:  document.getElementById('density'),
  densityVal: document.getElementById('density-val')
};

chrome.storage.local.get(DEFAULTS, function (s) {
  el.enabled.checked  = s.enabled;
  el.furigana.checked = s.furigana;
  el.level.value      = s.level;
  el.density.value    = s.density;
  el.densityVal.textContent = s.density + '%';
  // 첫 실행이면 storage가 비어 있다 — 여기서 실제로 기록해 둔다.
  // 안 쓰면 content.js가 첫 실행에 density/level 을 undefined로 읽어
  // densityStep(undefined) === NaN 이 되고, 확장이 켜져 있는데도
  // 콘솔 에러 없이 아무것도 치환되지 않는 무증상 실패로 이어진다.
  chrome.storage.local.set(s);
});

function save(patch) { chrome.storage.local.set(patch); }

el.enabled.addEventListener('change',  function () { save({ enabled:  el.enabled.checked }); });
el.furigana.addEventListener('change', function () { save({ furigana: el.furigana.checked }); });
el.level.addEventListener('change',    function () { save({ level:    el.level.value }); });
el.density.addEventListener('input',   function () {
  el.densityVal.textContent = el.density.value + '%';
  save({ density: Number(el.density.value) });
});
