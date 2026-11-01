# v1.9.3 검증 결과

| 검사 | 결과 | 실제 의미 |
|---|---|---|
| Node 자동 테스트 | **155/155 통과** | 게임 규칙 및 GLB/관절 규칙을 코드에서 확인 |
| 게임 JS 문법 | 통과 | `node --check` 기반 |
| GLB 바이너리 | 통과 | glTF 2.0, 임베디드 PBR 기본색 및 노멀 이미지, UV 포함 |
| 실제 GLB 4방향 오프라인 렌더 | 통과 | VTK GLTFImporter로 정면·45도·측면·후면 생성 |
| 실제 GLB 360° 회전 캡처 | 통과 | VTK 오프스크린 18프레임 GIF |
| 착석 골반·발 기하 검사 | 통과 | 정적인 리그 회전 좌표 검사; **게임 플레이 검증 아님** |
| 동작별 정적 메시 렌더 | 생성됨 | 착석·기타·무전·걷기 |
| npm 의존성 설치 | 차단 | npm 레지스트리 DNS 오류 `EAI_AGAIN` |
| **Three.js 브라우저 실제 화면** | **미검증** | 이 환경의 npm / GPU 브라우저 제한 |
| **승인 이미지 100% 동일 여부** | **미달성** | 첨부 시각 비교에서 조형·재질 차이 확인 |
| **출시 판정** | **미합격** | 프리미엄 디자인 기준 및 실브라우저 모션 확인 필요 |

## 재현

```bash
npm install
npm test
npm run dev
# http://localhost:5173/character.html
# http://localhost:5173/?characterqa=1

# 오프라인 실제 GLB 형상 및 포즈 비교 (Python trimesh/vtk 필요)
python3 scripts/render_v193_premium_qa.py
python3 scripts/render_turntable_v193.py
python3 scripts/render_motion_qa_v190.py
python3 scripts/verify_seat_geometry_v190.py
```

실제 GLB와 승인 이미지의 차이는 `docs/qa/V193_APPROVED_VS_GLB_FRONT.jpg`와 `V193_BEFORE_AFTER_3D_RENDER.jpg`에 명확하게 보인다. 테스트 통과를 디자인 품질 승인으로 해석하면 안 된다.
