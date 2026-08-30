# Third-party material and provenance

이 문서는 KoJa 프로젝트 파일과 해커톤 당시 검증에 사용한 외부 웹페이지 자료를 구분하기 위한
공학적 기록이다. 권리 판단이나 라이선스 허여를 대신하지 않는다.

## Current tree

- `docs/presentation.html`은 2026-08-19 발표용 역사 산출물이다. 당시 수동 검증 화면(위키백과
  페이지 일부 포함)을 내장하며, 문서를 열 때 Google Fonts를 불러온다. 이는 Chrome 확장 런타임의
  네트워크 동작과 별개다.
- `data/dictionary.json`은 현재 런타임 사전의 정본이다. 생성 파이프라인과 불변식 검사는 재현할 수
  있지만, 해커톤 당시 단어 선정에 참고한 외부 어휘 자료의 정확한 URL·revision·license는 현재
  저장소만으로 완전히 재구성되지 않는다.

## Removed from the current tree

- Daum 뉴스 기사 전체 HTML snapshot은 2026-08-30 공개 hardening에서 제거했다.
- 한국어 위키백과 「대한민국」 전체 HTML snapshot과 이를 주로 담은 standalone screenshot은
  2026-08-30 공개 hardening에서 제거했다.

두 자료는 당시 수동 검증에 사용됐다는 기록과 기존 Git history만 보존한다. History rewrite는 하지
않았으며, 외부 페이지 콘텐츠를 프로젝트 팀의 창작물로 주장하지 않는다.

## Open decisions

저장소 전체 라이선스는 아직 명시되어 있지 않다. 공동 기여자 합의, 사전 참고 자료의 provenance,
역사 발표 자료에 남은 외부 화면을 함께 검토한 뒤 별도로 결정해야 한다.
