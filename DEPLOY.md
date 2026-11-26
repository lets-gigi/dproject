# GitHub 업로드 및 Vercel 즉시 배포 가이드

이 프로젝트는 프레임워크·빌드 도구가 전혀 없는 **순수 HTML/CSS/JavaScript 단일 파일(`index.html`)** 구조입니다.

---

## 1. 로컬 실행 (더블 클릭)
- 프로젝트 폴더의 `index.html` 파일을 브라우저에서 더블 클릭하면 별도 서버나 설치 없이 즉시 실행됩니다.

---

## 2. GitHub 저장소 업로드

1. [GitHub](https://github.com)에서 새 저장소(New Repository)를 생성합니다.
2. 프로젝트 루트 폴더에서 아래 명령어를 실행해 푸시합니다.

```bash
git init
git add .
git commit -m "feat: 단일 파일 시험장 전자기기 감지 시뮬레이터"
git branch -M main
git remote add origin https://github.com/<본인_아이디>/<저장소_이름>.git
git push -u origin main
```

---

## 3. Vercel 배포 (빌드 과정 없음)

1. [Vercel Dashboard](https://vercel.com/new)에서 GitHub 저장소를 **Import**합니다.
2. **Framework Preset**은 `Other` (기본값) 그대로 두고, Build Command 및 Output Directory를 별도로 지정할 필요 없이 **Deploy**를 클릭합니다.
3. 루트의 `vercel.json` 설정에 따라 `index.html` 정적 파일이 즉시 배포됩니다.
