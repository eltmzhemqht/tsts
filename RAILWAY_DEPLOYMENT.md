# Railway 배포 가이드

## 🚀 Railway란?

Railway는 Express 서버를 포함한 Node.js 애플리케이션을 쉽게 배포할 수 있는 플랫폼입니다. 이 프로젝트에 완벽하게 맞습니다!

---

## 📋 사전 준비

### 1. GitHub 저장소 준비
Railway는 GitHub와 연동되므로 먼저 GitHub에 코드를 푸시해야 합니다.

**GitHub에 푸시하기:**
```bash
# Git 초기화 (아직 안 했다면)
git init
git add .
git commit -m "Initial commit"

# GitHub에 새 저장소 생성 후
git remote add origin https://github.com/your-username/TwoMinute-Tycoon.git
git branch -M main
git push -u origin main
```

---

## 🚂 Railway 배포 단계

### 1단계: Railway 계정 생성

1. [Railway](https://railway.app) 접속
2. "Start a New Project" 클릭
3. GitHub 계정으로 로그인/회원가입

### 2단계: 프로젝트 생성

1. **"Deploy from GitHub repo"** 선택
2. GitHub 저장소 선택 (`TwoMinute-Tycoon`)
3. Railway가 자동으로 프로젝트 감지

### 3단계: 환경 변수 설정 (선택사항)

Railway 대시보드에서:
1. 프로젝트 선택
2. **"Variables"** 탭 클릭
3. 다음 변수 추가 (필요시):
   - `PORT`: `5000` (기본값이므로 생략 가능)
   - `NODE_ENV`: `production`

### 4단계: 배포 확인

1. Railway가 자동으로 배포 시작
2. **"Deployments"** 탭에서 배포 상태 확인
3. 배포 완료 후 **"Settings"** → **"Generate Domain"** 클릭
4. 공개 URL 생성됨 (예: `https://your-project.up.railway.app`)

---

## ⚙️ 설정 파일 확인

### `railway.json` (이미 생성됨)
- 빌드 및 시작 명령어 설정
- 자동으로 감지됨

### `package.json` 확인
- `start` 스크립트: `node dist/index.cjs`
- `build` 스크립트: `npx tsx script/build.ts`

---

## 🔧 문제 해결

### 빌드 실패
**증상**: 배포가 실패함

**해결책**:
1. Railway 로그 확인 (Deployments → View Logs)
2. `package.json`의 빌드 스크립트 확인
3. Node.js 버전 확인 (20 필요)

### 서버가 시작되지 않음
**증상**: 배포는 성공했지만 접속 불가

**해결책**:
1. Railway 로그 확인
2. `PORT` 환경 변수 확인
3. `start` 스크립트 확인

### 랭킹이 작동하지 않음
**증상**: 랭킹 등록/조회 실패

**해결책**:
1. `.data/` 폴더가 생성되는지 확인
2. Railway 로그에서 파일 시스템 에러 확인
3. Railway는 영구 스토리지를 제공하므로 데이터는 유지됨

---

## 📱 배포 후 확인 사항

### 1. 공개 URL 접속 테스트
- [ ] 게임 시작 화면 표시
- [ ] 게임 플레이 가능
- [ ] 랭킹 등록 가능
- [ ] 랭킹 조회 가능

### 2. 모바일 테스트
- [ ] 스마트폰에서 접속
- [ ] 게임이 정상 작동

### 3. QR 코드 생성
- 공개 URL로 QR 코드 생성
- 부스에 배치

---

## 💡 Railway 장점

### ✅ 완벽한 호환성
- Express 서버 완벽 지원
- API 엔드포인트 정상 작동
- 랭킹 시스템 작동

### ✅ 자동 배포
- GitHub에 푸시하면 자동 배포
- CI/CD 불필요

### ✅ 영구 스토리지
- `.data/` 폴더 데이터 유지
- 서버 재시작 후에도 랭킹 유지

### ✅ 무료 플랜
- 월 $5 크레딧 제공
- 이 프로젝트는 충분함

---

## 🎯 축제 당일 체크리스트

### 시작 전
- [ ] Railway 대시보드에서 서버 상태 확인
- [ ] 공개 URL 접속 테스트
- [ ] 랭킹 초기화 (필요시)
- [ ] QR 코드 확인

### 축제 중
- [ ] Railway 대시보드 모니터링
- [ ] 로그 확인 (문제 발생 시)

---

## 🔄 업데이트 방법

코드를 수정한 후:
1. GitHub에 푸시
   ```bash
   git add .
   git commit -m "Update"
   git push
   ```
2. Railway가 자동으로 재배포
3. 몇 분 후 새 버전 적용됨

---

## 📊 모니터링

Railway 대시보드에서:
- **Metrics**: CPU, 메모리 사용량
- **Logs**: 실시간 로그 확인
- **Deployments**: 배포 이력

---

## 🎉 완료!

Railway로 배포하면:
- ✅ Express 서버 완벽 작동
- ✅ 랭킹 시스템 정상 작동
- ✅ 자동 배포
- ✅ 안정적인 호스팅

축제 부스에서 사용하기에 완벽합니다!

