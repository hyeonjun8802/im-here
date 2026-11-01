# AFTERDAY v1.5 — 실행/리소스 검증 상태

- `npm test`: **117/117 PASS** (게임 기존 검증 112개 + v1.5 회귀 5개).
- `node --check src/*.js scripts/*.mjs`: 전체 통과.
- 새 배경 3D 인필: **PC 825개 / 모바일 329개**, 기존 건물까지 합산 **PC 985개 / 모바일 417개** (설계/메시 개수, 실제 픽셀 렌더 입증 아님).
- 새 PBR 옥상 3맵: **2048×2048 크기 확인**. 직선 격자 제거 여부는 `docs/qa/roof_material_before_after_v150.jpg` 참고.
- GLB 바이너리 검증: 기존 AFTERDAY 전용 3종 GLB 파일 유지, Node 자동 테스트에 형식 검사 포함.
- 오프라인 VTK 3D: **기존 GLB 3개 실제 로드/렌더**, 변경된 도시 좌표 대표 샘플과 단독 옥상을 렌더한 `docs/qa/offline_3d_asset_review_v150.png` 존재. **이 캡처는 게임 실행 화면이 아니며** WebGL 셰이더/후처리/카메라를 그대로 재현하지 않음.
- Playwright/Chromium 실제 브라우저: 로컬 HTTP, file://, data: 모두 `net::ERR_BLOCKED_BY_ADMINISTRATOR`. **실제 WebGL 스크린샷 확보 실패.**
- Vite/npm 설치: 외부 npm 저장소 도메인 DNS/통신 불가. **빌드/실행 검증 미완료.**
- 모바일 GPU FPS: **미검증**.

설명: 기능에 대한 정적/로직 테스트가 통과해도 셰이더와 실제 GPU 화면이 정확하다는 의미는 아니다.
