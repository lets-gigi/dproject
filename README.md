# 시험장 전자기기 감지 시뮬레이터

감독관 시점(교탁 고정 55° 시야 및 반경 2.0m 순찰)과 CCTV 시점을 교차 활용하여 시험장 내 전자기기 전파와 특이 행동을 자막으로 감지하고, 즉시 퇴실 또는 보류 후 추후 정밀 검사를 수행할 수 있는 인터랙티브 시뮬레이션 웹 애플리케이션입니다.

## 주요 기능

- **감독관 시점 · 교탁 고정 (55° 시야)**: 고개 회전 방향에 따른 실시간 전파 탐지 및 교실 경계벽 클리핑(우리 교실 한정 검사)
- **감독관 시점 · 순찰 이동 (반경 2.0m)**: 바닥 클릭 및 `WASD`/방향키 이동으로 반경 2m 이내 전파 전방위 감지
- **CCTV 시점 (`CAM-01`)**: 천장 광각 카메라로 학생 특이 행동 추적
- **실시간 자막 & 교차 의심 판정**: 전파 방향/위치 자막, CCTV 행동 자막, 전파+행동 동시 포착 시 `부정행위 의심` 경고
- **보류 및 추후 정밀 검사**: `보류(추후 검사)` 학생 대상 0.5m 초근접 전파 스캔 및 소지품 대면 확인
- **다음 시험 진행**: 교시별 적발/미적발/오인 퇴실 결산 리포트 확인 후 다음 교시 시뮬레이션 시작

## 로컬 실행 및 빌드

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint     # TypeScript 타입 검사
npm run build    # dist/ 프로덕션 빌드
```

## GitHub 업로드 및 Vercel 배포

자세한 업로드 및 배포 절차는 [`DEPLOY.md`](./DEPLOY.md)를 참고하세요.

- **Vercel 설정 파일**: [`vercel.json`](./vercel.json) (`Vite` 프리셋, `npm run build`, 출력 디렉토리 `dist`)
- **GitHub Actions CI**: [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) (`main` 브랜치 푸시/PR 시 자동 `lint` 및 `build` 검증)
- **제품 요구사항 문서**: [`PRD.md`](./PRD.md) · [`PRODUCT_REQUIREMENTS.md`](./PRODUCT_REQUIREMENTS.md)
