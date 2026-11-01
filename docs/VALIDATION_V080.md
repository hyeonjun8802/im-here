# AFTERDAY v0.8 검증 결과

## 이 환경에서 실제 통과한 항목

- Node.js `--check`: `src/*.js`, `tests/*.mjs` 및 `scripts/*.mjs` 구문 검사 통과.
- `npm test`: 기존 날짜/생존/재난/단독 옥상 검사 + 신규 리소스·시네마틱 검증 **54/54 통과**.
- `python scripts/audit_hero_glb.py`: **3/3 실제 GLB 포맷 파싱** 및 메시·삼각형·사이즈·PBR 텍스처 확인 통과 (19,988 triangles).
- PNG/JPEG: 새 2048px 바닥 텍스처, 512px 구름, 1024px equirectangular 환경광 프로브가 정상 디코딩됨.
- GitHub 저장소 MIT 라이선스 및 원본 모델 경로를 확인했고 기존 출처 문서를 보존함.

## 실패·미검증 항목

- `npm install --offline` → `ENOTCACHED`: `three`와 `vite` 패키지가 이 환경 캐시에 없어 설치·프로덕션 빌드를 수행하지 못함.
- 실제 WebGL2 브라우저 렌더링·게임 화면 캡처: **미검증**.
- Mac Safari/Android Chrome의 FPS와 텍스처 품질: **미검증**.
- 원본 GitHub GLB 83종 다운로드: 네트워크 차단으로 **미검증**. 이번에 생성한 **전용 GLB 3종은 ZIP에 포함**.

그러므로 이 ZIP은 로컬에서 `npm install` 이후 실행할 수 있도록 구성한 **개발 소스 및 실제 3D 자산 패키지**다. 실기기 렌더링·UX·상용화 품질이 모두 완료됐다는 의미가 아니다.
