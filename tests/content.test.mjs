import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/content.js', import.meta.url), 'utf8');

function loadContent(initial) {
  const timers = [];
  const observers = [];
  let onChanged;
  const root = {};

  class FakeMutationObserver {
    constructor(callback) {
      this.callback = callback;
      this.observeCount = 0;
      this.disconnectCount = 0;
      observers.push(this);
    }
    observe() { this.observeCount++; }
    disconnect() { this.disconnectCount++; }
  }

  const context = {
    console,
    document: { documentElement: { classList: { toggle() {} } } },
    MutationObserver: FakeMutationObserver,
    setTimeout(callback, delay) {
      timers.push({ callback, delay });
      return timers.length;
    },
    clearTimeout() {},
    chrome: {
      storage: {
        local: {
          get(defaults, callback) { callback({ ...defaults, ...initial }); }
        },
        onChanged: {
          addListener(listener) { onChanged = listener; }
        }
      }
    },
    KOJA: {
      scope: { getRoot: () => root, eachTextNode() {} },
      matcher: { shouldSelect: () => true, findMatches: () => [] },
      replacer: { applyMatches: () => 0, restoreAll: () => 0 },
      tooltip: { init() {} }
    },
    KOJA_DICT: []
  };
  context.window = context;
  vm.runInNewContext(source, context);

  return {
    timers,
    observers,
    changeEnabled(value) {
      onChanged({ enabled: { newValue: value } }, 'local');
    }
  };
}

test('disabled 전환 뒤 예약된 observer가 시작되지 않는다', () => {
  const app = loadContent({ enabled: true });
  assert.equal(app.timers.length, 4, 'scan 3회와 observer 시작이 예약돼야 한다');

  app.timers[0].callback(); // 첫 scan이 root를 정한다
  app.changeEnabled(false);
  app.timers[3].callback(); // 이미 예약돼 있던 startObserver

  assert.equal(app.observers.length, 0);
});

test('disabled 상태에서 enabled로 바꾸면 observer가 정상 시작된다', () => {
  const app = loadContent({ enabled: false });
  assert.equal(app.observers.length, 0);

  app.changeEnabled(true);

  assert.equal(app.observers.length, 1);
  assert.equal(app.observers[0].observeCount, 1);
});
