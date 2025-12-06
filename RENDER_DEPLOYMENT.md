# Render 배포 가이드

## 🚀 Render란?

Render는 Express 서버를 포함한 Node.js 애플리케이션을 쉽게 배포할 수 있는 플랫폼입니다. 무료 플랜도 제공합니다!

---

## 📋 사전 준비

### 1. GitHub 저장소 준비
Render는 GitHub와 연동되므로 먼저 GitHub에 코드를 푸시해야 합니다.

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

## 🎨 Render 배포 단계

### 1단계: Render 계정 생성

1. [Render](https://render.com) 접속
2. "Get Started for Free" 클릭
3. GitHub 계정으로 로그인/회원가입

### 2단계: 새 Web Service 생성

1. Render 대시보드에서 **"New +"** 클릭
2. **"Web Service"** 선택
3. GitHub 저장소 연결
   - "Connect account" 클릭 (아직 안 했다면)
   - 저장소 선택 (`TwoMinute-Tycoon`)

### 3단계: 서비스 설정

**기본 설정:**
- **Name**: `two-minute-tycoon` (원하는 이름)
- **Region**: `Singapore` (한국에서 가장 가까움)
- **Branch**: `main` (또는 기본 브랜치)
- **Root Directory**: (비워두기 - 루트에서 실행)

**빌드 및 시작 명령어:**
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start`

**환경 변수 (Environment Variables):**
- `NODE_ENV`: `production`
- `PORT`: (비워두기 - Render가 자동 할당)

### 4단계: 배포

1. **"Create Web Service"** 클릭
2. Render가 자동으로 배포 시작
3. **"Events"** 탭에서 배포 진행 상황 확인
4. 배포 완료 후 공개 URL 생성됨
   - 예: `https://two-minute-tycoon.onrender.com`

---

## ⚙️ 설정 파일

### `render.yaml` (선택사항)
- 이미 생성되어 있음
- Render 대시보드에서 "Apply render.yaml"로 자동 설정 가능

### `package.json` 확인
- ✅ `start` 스크립트: `node dist/index.cjs`
- ✅ `build` 스크립트: `npx tsx script/build.ts`

---

## 🔧 문제 해결

### 빌드 실패
**증상**: 배포가 실패함

**해결책**:
1. Render 로그 확인 (Events → View Logs)
2. `package.json`의 빌드 스크립트 확인
3. Node.js 버전 확인 (20 필요)
4. Build Command에 `NODE_ENV=production` 추가

### 서버가 시작되지 않음
**증상**: 배포는 성공했지만 접속 불가

**해결책**:
1. Render 로그 확인
2. `PORT` 환경 변수 확인 (Render가 자동 할당)
3. `start` 스크립트 확인
4. Health Check Path 확인

### 랭킹이 작동하지 않음
**증상**: 랭킹 등록/조회 실패

**해결책**:
1. `.data/` 폴더가 생성되는지 확인
2. Render 로그에서 파일 시스템 에러 확인
3. Render는 영구 스토리지를 제공하므로 데이터는 유지됨

### 무료 플랜 Sleep 모드
**증상**: 15분간 비활성화 시 sleep 모드

**해결책**:
- 첫 접속 시 약간의 지연 (cold start)
- 또는 유료 플랜 사용 ($7/월)

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

## 💡 Render 장점

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
- 무료 제공
- 15분 비활성화 시 sleep 모드 (첫 접속 시 지연)

---

## 🎯 축제 당일 체크리스트

### 시작 전
- [ ] Render 대시보드에서 서버 상태 확인
- [ ] 공개 URL 접속 테스트 (cold start 대기)
- [ ] 랭킹 초기화 (필요시)
- [ ] QR 코드 확인

### 축제 중
- [ ] Render 대시보드 모니터링
- [ ] 로그 확인 (문제 발생 시)
- [ ] 첫 접속 시 cold start 대기 (약 30초)

---

## 🔄 업데이트 방법

코드를 수정한 후:
1. GitHub에 푸시
   ```bash
   git add .
   git commit -m "Update"
   git push
   ```
2. Render가 자동으로 재배포
3. 몇 분 후 새 버전 적용됨

---

## 📊 모니터링

Render 대시보드에서:
- **Metrics**: CPU, 메모리 사용량
- **Logs**: 실시간 로그 확인
- **Events**: 배포 이력

---

## ⚠️ 무료 플랜 제한사항

### Sleep 모드
- 15분간 비활성화 시 sleep 모드
- 첫 접속 시 약 30초 cold start
- 해결: 유료 플랜 ($7/월) 또는 **UptimeRobot** 사용 (무료)

#### UptimeRobot 설정 방법
1. [UptimeRobot](https://uptimerobot.com) 접속 및 회원가입 (무료)
2. "Add New Monitor" 클릭
3. 설정:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: Two Minute Tycoon
   - **URL**: Render 공개 URL (예: `https://two-minute-tycoon.onrender.com`)
   - **Monitoring Interval**: 5 minutes (무료 플랜 최소)
4. "Create Monitor" 클릭
5. 5분마다 자동으로 핑을 보내서 sleep 모드 방지

### 리소스 제한
- CPU: 제한적
- 메모리: 512MB
- 이 프로젝트는 충분함

---

## 🎉 완료!

Render로 배포하면:
- ✅ Express 서버 완벽 작동
- ✅ 랭킹 시스템 정상 작동
- ✅ 자동 배포
- ✅ 무료 호스팅

축제 부스에서 사용하기에 완벽합니다!

---

## 💰 비용

**무료 플랜:**
- 무료
- Sleep 모드 있음

**스타터 플랜 ($7/월):**
- Sleep 모드 없음
- 더 빠른 응답
- 축제 당일에는 이 플랜 권장

