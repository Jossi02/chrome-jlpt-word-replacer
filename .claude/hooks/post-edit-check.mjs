#!/usr/bin/env node
// PostToolUse(Write|Edit)
// 편집된 파일의 문법을 즉시 검사하고, 소스 파일이면 "리뷰 대기" 목록에 기록한다.
// 테스트 전체 실행과 리뷰 요구는 Stop 훅(stop-review-gate.mjs)이 담당한다.

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, relative, extname, sep } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const STATE = join(ROOT, '.claude', 'state', 'pending-review.json');

const CODE_EXT = new Set(['.js', '.mjs', '.cjs', '.ts', '.json', '.html', '.css']);
const IGNORE_DIRS = ['.claude', 'node_modules', '.git', 'dist', 'build'];

function readStdin() {
  try { return JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { return {}; }
}

const input = readStdin();
const filePath = input?.tool_response?.filePath || input?.tool_input?.file_path || '';
if (!filePath) process.exit(0);

const rel = relative(ROOT, filePath);
if (rel.startsWith('..') || IGNORE_DIRS.some(d => rel.split(sep).includes(d))) process.exit(0);

const ext = extname(filePath).toLowerCase();
if (!CODE_EXT.has(ext) || !existsSync(filePath)) process.exit(0);

// --- 1. 문법 검사 -----------------------------------------------------------
const src = readFileSync(filePath, 'utf8');
let syntaxError = null;

if (ext === '.json') {
  try { JSON.parse(src); } catch (e) { syntaxError = e.message; }
} else if (ext === '.js' || ext === '.mjs' || ext === '.cjs') {
  // node --check 는 기본이 스크립트(CJS) 모드다. ESM 파일은 .mjs 로 넘겨야 오탐이 안 난다.
  const isESM = ext === '.mjs' || /^\s*(import|export)[\s{*]/m.test(src);
  let target = filePath;
  let tmp = null;
  if (isESM && ext !== '.mjs') {
    tmp = join(tmpdir(), `jlv-check-${process.pid}.mjs`);
    writeFileSync(tmp, src);
    target = tmp;
  }
  const r = spawnSync(process.execPath, ['--check', target], { encoding: 'utf8' });
  if (r.status !== 0) {
    syntaxError = String(r.stderr || '').split('\n').slice(0, 12).join('\n').split(target).join(rel);
  }
  if (tmp) { try { unlinkSync(tmp); } catch {} }
}

if (syntaxError) {
  console.error(`[문법 오류] ${rel}\n${syntaxError}\n\n계속하기 전에 이 파일을 고치세요.`);
  process.exit(2); // blocking error → Claude 에게 되먹임
}

// --- 2. 리뷰 대기 목록에 기록 ------------------------------------------------
mkdirSync(dirname(STATE), { recursive: true });
let state = { files: [] };
if (existsSync(STATE)) {
  try { const s = JSON.parse(readFileSync(STATE, 'utf8')); if (Array.isArray(s.files)) state = s; } catch {}
}
const relPosix = rel.split(sep).join('/');
if (!state.files.includes(relPosix)) state.files.push(relPosix);
writeFileSync(STATE, JSON.stringify(state, null, 2));

process.stdout.write(JSON.stringify({ suppressOutput: true }));
