# GitHub 업로드 및 Vercel 배포 가이드

이 프로젝트는 Vite + React 기반의 정적 웹 애플리케이션(SPA)으로 별도의 백엔드 서버 없이 GitHub에 업로드하고 Vercel에서 바로 배포할 수 있습니다.

---

## 1. 사전 확인

프로젝트 루트에 아래 파일들이 준비되어 있는지 확인합니다.
- `package.json` (`"build": "vite build"`, `"lint": "tsc --noEmit"`)
- `vercel.json` (Vite 빌드 및 SPA 라우팅 설정 포함)
- `.gitignore` (`node_modules/`, `dist/`, `.env*`, `.vercel` 제외 설정)

로컬에서 빌드가 정상 동작하는지 먼저 테스트할 수 있습니다.

```bash
npm install
npm run lint
npm run build
```

---

## 2. GitHub 저장소 업로드

1. [GitHub](https://github.com)에서 새 저장소(New Repository)를 생성합니다. (예: `exam-device-detector-sim`)
2. 프로젝트 루트 디렉토리에서 아래 명령어를 순서대로 실행합니다.

```bash
git init
git add .
git commit -m "feat: 시험장 전자기기 감지 시뮬레이터 초기 구현"
git branch -M main
git remote add origin https://github.com/<본인_아이디>/<저장소_이름>.git
git push -u origin main
```

---

## 3. Vercel 배포

### 방법 A. Vercel 웹 대시보드에서 연동 (권장)
1. [Vercel Dashboard](https://vercel.com/new)에 접속하여 **Continue with GitHub**로 로그인합니다.
2. **Import Git Repository** 목록에서 방금 푸시한 저장소를 선택하고 **Import**를 클릭합니다.
3. 설정값을 확인합니다 (`vercel.json`이 자동으로 인식됩니다):
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Deploy** 버튼을 클릭하면 약 30초~1분 내에 배포 URL이 발급됩니다.
5. 이후 `main` 브랜치에 `git push`할 때마다 Vercel이 자동으로 재배포합니다.

### 방법 B. Vercel CLI로 터미널에서 바로 배포
```bash
npm i -g vercel
vercel login
vercel --prod
```
