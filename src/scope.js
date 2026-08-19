// src/scope.js — 본문 영역 결정 + 제외 규칙
window.KOJA = window.KOJA || {};
(function () {
  'use strict';

  function getRoot(doc) {
    return doc.body;
  }

  function eachTextNode(root, fn) {
    // D1-B1에서 구현한다.
  }

  window.KOJA.scope = {
    getRoot: getRoot,
    eachTextNode: eachTextNode
  };
})();
