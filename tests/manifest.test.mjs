import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'));

test('manifest — MV3 권한과 모든 참조 경로·로드 순서가 유효하다', () => {
  const expectedScripts = [
    'data/dictionary.js',
    'src/matcher.js',
    'src/scope.js',
    'src/replacer.js',
    'src/tooltip.js',
    'src/content.js'
  ];
  const content = manifest.content_scripts[0];

  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.deepEqual(content.matches, ['<all_urls>']);
  assert.deepEqual(content.js, expectedScripts);

  const referenced = [
    ...content.js,
    ...content.css,
    manifest.action.default_popup,
    ...Object.values(manifest.icons),
    ...Object.values(manifest.action.default_icon)
  ];
  for (const path of referenced) assert.ok(existsSync(resolve(root, path)), `없는 manifest 경로: ${path}`);
});
