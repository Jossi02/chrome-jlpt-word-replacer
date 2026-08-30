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
  // get(DEFAULTS)는 첫 실행도 안전하게 만든다. 해석된 4키를 명시적으로 저장해
  // 이후 팝업과 content script가 같은 schema를 보게 한다.
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
