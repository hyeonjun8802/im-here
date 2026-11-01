# AFTERDAY v1.7 — 검증된 공개 아바타 엔진으로 교체

## 1. 결론

- 사용자 제안 `MyAvatar3D`에 대한 공개 소개는 확인됐지만, 제작자가 링크한 `https://github.com/iefreer/myavatar3d`는 2026-10-31 현재 404입니다. 공개 설치 패키지, 배포 모델 및 상업용 권리를 확인할 수 없어 이 패키지에 사용하지 않았습니다.
- 대신 공식 문서·MIT 라이선스·npm 배포가 확인된 **pixiv `@pixiv/three-vrm` v3.5.5**를 사용합니다. 기존 Three.js 씬에서 `VRMLoaderPlugin`을 통해 VRM 전신 모델을 바로 로드합니다.
- 기본 아바타는 VRoid Studio의 남성 샘플 **Sakurada Fumiriya**로, pixiv 공식 안내에서 CC0로 명시한 기존 VRM 파일입니다. 얼굴과 의상을 도형으로 새로 그리지 않습니다.
- 원래 생존자 전체(기존 도형 얼굴·몸체·중복 디테일)는 VRM 로드 성공 시 숨깁니다. 원본과 함께 겹쳐 그리는 방식이 아닙니다.

## 2. 아바타 모델의 출처 / 권리

- SDK: https://github.com/pixiv/three-vrm — MIT
- SDK 공식 문서: https://pixiv.github.io/three-vrm/docs/
- 아바타 원본 미러: https://github.com/madjin/vrm-samples/blob/master/vroid/beta/Sakurada_Fumiriya.vrm
- 원 제작사의 모델별 CC0 확인: https://vroid.pixiv.help/hc/en-us/articles/360014788554-Sakurada-Fumiriya
- 고정된 원본 파일 크기: 19,342,280바이트 (GitHub 저장소 Git tree)
- 아바타는 원본 그대로 다운로드하며 텍스처·얼굴·복장을 코드로 수정하지 않습니다.
- 원래 목표 디자인과 **동일한 인물이라고 주장하지 않습니다.** 무료 CC0 샘플의 남성 인간형 외형을 우선 적용하는 변경입니다.

## 3. 적용 흐름

1. `npm install`: Three.js / Vite / `@pixiv/three-vrm` 설치
2. `npm run download:assets`: 기존 GitHub 도시 모델과 함께 CC0 샘플 `survivor.vrm` 자동 확보 (또는 `npm run download:avatar`)
3. `GLTFLoader.register(parser => new VRMLoaderPlugin(parser))`로 VRM과 원래의 머티리얼·뼈대·표정 로드
4. 크기만 기존 캐릭터와 동일하게 정규화
5. VRM 모델 로딩 성공 후 기존 절차적 생존자 전체 숨김
6. 생존자 월드 좌표, 자원, 이동, 행동 스케줄링, 캠프 기타 음악 등 기존 기능 유지
7. VRM 뼈대에 최소한의 걷기·서기·앉기·무전 제스처를 연결, 엔진의 머리카락 스프링본·표정 업데이트 유지

## 4. 다른 VRM 모델 교체

`public/assets/avatar/survivor.vrm`을 본인이 합법적으로 사용할 수 있는 VRM 0.x 또는 VRM 1.0 아바타로 덮어쓰기만 하면 됩니다. 코드 수정이 필요 없도록 경로를 고정했습니다. 상용화를 위해서는 새 모델의 사용·배포 조건을 반드시 확인하세요.

## 5. 사실에 근거한 현재 검증 범위

- 소스 문법 및 순수 로직 회귀 테스트는 CI 환경에서 수행 가능
- SDK v3.5.5의 npm 공개 배포와 VRM 공식 문서는 확인
- 이 작업 환경은 npm·VRM 19MB 바이너리를 다운로드할 수 없어 **모델 로딩 완료와 실제 브라우저 화면은 현재 미검증**
- VRM 샘플에는 전신 3D 형태와 리그가 있지만, 게임에 필요한 모든 모션(기타 세부 손가락 모션 등)을 제공한다고 약속하지 않음

## 6. 실행

```bash
npm install
npm run download:assets
npm test
npm run dev
```

브라우저 콘솔 또는 상태에서 `survivorAppearanceStatus.status === 'ready'` 이면 공식 VRM 모델이 로딩된 상태입니다. 실패하면 이전 모델로 안전하게 복귀하고 오류 원인을 기록합니다.

## 7. 이후 MyAvatar3D 사용 가능 조건

제작자가 설치 가능한 공개 SDK 배포 URL, JS API 문서 및 모델 사용 라이선스를 제공하면, `src/officialVRMAvatarV170.js`의 공급자 계층만 교체할 수 있습니다. 확인되지 않은 GitHub 경로를 npm 의존성으로 넣거나 무허가 스크립트를 실행하지 않습니다.

## 8. 실제 브라우저 검수 (개발자 Mac에서 실행)

먼저 `npm run dev` 실행 후 별도 터미널에서:

```bash
npm install -D playwright
npx playwright install chromium
npm run qa:official-avatar
```

정면, 45도, 측면, 기타를 든 착석 자세를 `docs/qa/official_avatar_v170/*.png`로 캡처합니다. 실제 `@pixiv/three-vrm` 모델 로딩 성공·구형 캐릭터 완전 숨김·렌더링 호출을 검사합니다. 이 환경에서는 실행하지 못했으므로 통과했다고 표시하지 않습니다.
