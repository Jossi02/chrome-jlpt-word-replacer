# -*- coding: utf-8 -*-
"""
build_dictionary.py — KoJa 사전 검증 · 빌드

입력  : data/dictionary.json   (사람이 편집하는 정본. 648 엔트리)
출력  : data/dictionary.js     (확장이 읽는 번들. window.KOJA_DICT)
        stdout 에 부분 문자열 쌍 목록 (matcher 테스트 케이스)

불변식을 하나라도 위반하면 파일을 쓰지 않고 종료 코드 1 로 끝난다.
사용: PYTHONIOENCODING=utf-8 python tools/build_dictionary.py
"""
import json, os, re, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "data", "dictionary.json")
OUT_JS = os.path.join(ROOT, "data", "dictionary.js")
OUT_PAIRS = os.path.join(ROOT, "data", "substring-pairs.json")

KANJI = re.compile(r"[\u4E00-\u9FFF]")
KANA = re.compile(r"^[\u3040-\u309F\u30A0-\u30FF\u30FCー]+$")
HANGUL = re.compile(r"^[가-힣][가-힣 ]*$")
LEVELS = ["N5", "N4", "N3", "N2", "N1"]

errors, warnings = [], []


def fail(msg):
    errors.append(msg)


def main():
    entries = json.load(open(SRC, encoding="utf-8"))

    # ---------- 엔트리 단위 검사 ----------
    seen_id, seen_ko, seen_ja = set(), {}, {}
    for e in entries:
        tag = "id=%s(%s)" % (e.get("id"), e.get("kanji"))

        for f in ("id", "kanji", "reading", "korean", "level", "pos"):
            if f not in e:
                fail("%s: 필수 필드 누락 '%s'" % (tag, f))
        if errors:
            continue

        if e["id"] in seen_id:
            fail("%s: id 중복" % tag)
        seen_id.add(e["id"])

        if e["level"] not in LEVELS:
            fail("%s: 알 수 없는 level '%s'" % (tag, e["level"]))
        if e["pos"] != "noun":
            fail("%s: pos 가 noun 이 아님 '%s'" % (tag, e["pos"]))

        # --- 불변식 1: 한국어 표제어 중복 0
        if e["korean"] in seen_ko:
            fail("%s: 한국어 표제어 중복 '%s' (id=%s 와)" % (tag, e["korean"], seen_ko[e["korean"]]))
        seen_ko[e["korean"]] = e["id"]

        # --- 불변식 2: 일본어 표기 중복 0
        if e["kanji"] in seen_ja:
            fail("%s: 일본어 표기 중복 (id=%s 와)" % (tag, seen_ja[e["kanji"]]))
        seen_ja[e["kanji"]] = e["id"]

        # --- 불변식 3: 빈 값 · 앞뒤 공백 0
        for f in ("kanji", "reading", "korean"):
            if not e[f].strip() or e[f] != e[f].strip():
                fail("%s: '%s' 가 비었거나 앞뒤 공백" % (tag, f))

        # --- 불변식 4: reading 은 가나만
        if not KANA.fullmatch(e["reading"]):
            fail("%s: reading 이 가나가 아님 '%s'" % (tag, e["reading"]))

        # --- 불변식 5: 한국어는 한글(+공백)만
        if not HANGUL.fullmatch(e["korean"]):
            fail("%s: korean 에 한글 외 문자 '%s'" % (tag, e["korean"]))

        # --- 불변식 6: 복수 뜻 표제어 금지 (원본의 "발, 다리" 형태)
        if "," in e["korean"] or "(" in e["korean"]:
            fail("%s: 복수 뜻/괄호 표제어 '%s' — 분리하거나 하나만 남길 것" % (tag, e["korean"]))

        # --- 불변식 7: ruby 플래그가 kanji 필드와 정합
        expect = bool(KANJI.search(e["kanji"]))
        if "ruby" not in e:
            fail("%s: ruby 플래그 없음" % tag)
        elif e["ruby"] != expect:
            fail("%s: ruby=%s 인데 kanji='%s' (기대값 %s)" % (tag, e["ruby"], e["kanji"], expect))

        # --- 불변식 8: match 표면형
        if "match" not in e or not isinstance(e["match"], list) or not e["match"]:
            fail("%s: match 배열 없음" % tag)
            continue
        if e["korean"] not in e["match"]:
            fail("%s: match 에 대표 표제어 '%s' 가 없음" % (tag, e["korean"]))
        for m in e["match"]:
            if len(m.replace(" ", "")) < 2:
                fail("%s: 한 글자 표면형 '%s' 금지" % (tag, m))
            if not HANGUL.fullmatch(m):
                fail("%s: 표면형에 한글 외 문자 '%s'" % (tag, m))

    if errors:
        report()
        sys.exit(1)

    # ---------- 표면형 전역 검사 ----------
    surf = {}
    for e in entries:
        for m in e["match"]:
            if m in surf:
                fail("표면형 충돌 '%s' — id=%s 와 id=%s" % (m, surf[m], e["id"]))
            surf[m] = e["id"]

    if errors:
        report()
        sys.exit(1)

    # ---------- 부분 문자열 쌍 (오류 아님 · 테스트 케이스) ----------
    keys = sorted(surf, key=len)
    pairs = [(s, t) for s in keys for t in keys if s != t and s in t]

    # ---------- 출력 ----------
    js = ("// 자동 생성됨 — 직접 편집하지 말 것. tools/build_dictionary.py 를 실행할 것\n"
          "window.KOJA_DICT = " +
          json.dumps(entries, ensure_ascii=False, separators=(",", ":")) + ";\n")
    open(OUT_JS, "w", encoding="utf-8").write(js)

    # 테스트가 그대로 읽어 쓰는 최장 일치 케이스 목록
    json.dump([{"short": s, "long": t} for s, t in pairs],
              open(OUT_PAIRS, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    lv = collections.Counter(e["level"] for e in entries)
    print("OK — 불변식 8종 전부 통과")
    print("  엔트리      : %d  (%s)" % (len(entries), " / ".join("%s %d" % (l, lv[l]) for l in LEVELS)))
    print("  매칭 표면형 : %d  (대표 %d + 별칭 %d)" % (len(surf), len(entries), len(surf) - len(entries)))
    print("  ruby 대상   : %d  / 가나 전용 %d" % (sum(1 for e in entries if e["ruby"]),
                                                  sum(1 for e in entries if not e["ruby"])))
    print("  → %s (%.1f KB)" % (os.path.relpath(OUT_JS, ROOT), len(js.encode()) / 1024))
    print("  → %s" % os.path.relpath(OUT_PAIRS, ROOT))
    print()
    print("부분 문자열 쌍 %d 건 — 최장 일치가 긴 쪽을 먼저 잡아야 하는 지점" % len(pairs))
    print("(오류가 아니다. 그대로 tests/matcher.test.mjs 케이스가 된다)")
    for s, t in pairs:
        print("  %-10s ⊂ %s" % (s, t))
    report()


def report():
    for w in warnings:
        print("경고: " + w, file=sys.stderr)
    for e in errors:
        print("오류: " + e, file=sys.stderr)
    if errors:
        print("\n%d 건의 위반 — dictionary.js 를 쓰지 않았다." % len(errors), file=sys.stderr)


if __name__ == "__main__":
    main()
