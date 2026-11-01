# AFTERDAY · 지면 안개 / 밀집 폐허 / 자연 침식 통합

## 구현 위치

- `src/groundMist.js`: 옥상 바닥(높이 16) 아래에 배치하는 깊이 테스트 기반 2~3겹의 고밀도 지면 안개. `public/assets/materials/city/ground_fog_noise.png`을 반복 샘플링하여 모바일 GPU 연산 감소. 기존 Three.js 거리 안개 및 일기 변화와 함께 작동. 화면 전체에 고정된 흰 레이어가 아니며 단일 옥상 위는 가리지 않음.
- `src/cityContraction.js`: 원본 `spatialLayout.js`의 계약과 거리 계획은 그대로 두고, **실행 시** 빌딩 반경을 `166+(r-166)*0.83`으로 압축. `cityMinRadius=166`, `clearZoneRadius=140`, `maxCameraRadius=124` 보존. 빌딩 위치는 날씨 변화와 무관하게 결정적.
- `src/cityInfillPlanV150.js`: 보조 도시 3개 층의 반경을 154–277 / 285–515 / 500–830으로 조정. 보조 건물 개수 825개(모바일 329개) 유지.
- `src/cityReclamation.js`: 실제 3D 외벽 위치에 부착한 덩굴 및 식생, 지붕 모서리의 불규칙한 자연 성장. 개별 메시 수천 개 대신 **InstancedMesh 2개**에 결합하여 추가 draw call 제한. GLB/기본 모델/보조 건물에 같은 처리 적용.
- `src/world.js`, `src/cityInfillV150.js`: 오염·누수·균열을 재질에 직접 합성한 4종의 신규 외벽 텍스처 사용, GLB의 색과 거칠기 조정, 기존 낱개 장식 중 중복된 건물 식생 제거. **기존 원본 facade 4종과 GLB 보존**.
- `scripts/bake_city_reclamation.py`: 원본 텍스처를 손상시키지 않고 신규 아틀라스·덩굴·안개 노이즈 재생성 (Pillow, numpy 필요).

## 안전성 및 검증 결과

- 기존 캐릭터 GLB, 게임 데이터 저장, 시간/날씨 시뮬레이션, 플레이 버튼, UI는 수정하지 않음.
- `node --check` 검사 및 `npm test`: 144/144 통과.
- 원본 제공 `node_modules`는 macOS ARM용. Linux 실행 환경에서 Vite/Rollup 전용 바이너리 부재로 `vite build` 불가.
- 대신 `scripts/build_static_release.py`를 통해 Three.js 0.180 모듈 포함 **독립 웹 배포 폴더 `dist/`** 생성. 실행은 `RUN_STANDALONE_MAC.command` 또는 `node scripts/serve_standalone.mjs`. 프로젝트 개발 실행은 기존과 동일하게 `npm install && npm run dev`.
- `dist/index.html` 등 자산 및 HTTP 응답을 검증했으나, 해당 실행 환경에서 Chromium의 URL 접근이 관리자 정책으로 차단되어 **실제 WebGL 캡처, 시각적 완성도, 실기기 FPS는 미검증**.

## 로컬 실행

```bash
# 다운로드 ZIP 압축 해제 후 프로젝트 최상위 폴더에서 실행
./RUN_STANDALONE_MAC.command
# 웹 브라우저 http://localhost:5173/ 에 접속
```

추가 패키지를 설치하지 않고 실행 가능하며 Node.js만 필요. 파일을 더블 클릭하는 `file://` 방식은 브라우저 ES module 보안 제약 때문에 지원하지 않음.
