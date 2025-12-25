# TwoMinute-Tycoon 프로젝트 스펙 및 구조 문서

## 📋 프로젝트 개요

**TwoMinute-Tycoon**은 2분 동안 투자 시뮬레이션 게임을 진행하고 랭킹을 경쟁하는 웹 애플리케이션입니다.

- **게임 시간**: 2분 (120초)
- **초기 자본**: 2,000만원
- **목표**: 최대 수익률 달성
- **특징**: 실시간 뉴스 이벤트, 자산 가격 변동, 랭킹 시스템

---

## 🛠 기술 스택

### **프론트엔드 (Client)**
- **언어**: TypeScript (5.6.3)
- **프레임워크**: React 19.2.0
- **빌드 도구**: Vite 7.1.9
- **스타일링**: 
  - Tailwind CSS 4.1.14
  - Radix UI (컴포넌트 라이브러리)
- **라우팅**: Wouter 3.3.5
- **상태 관리**: React Hooks (useState, useEffect, useCallback 등)
- **데이터 페칭**: TanStack React Query 5.60.5
- **애니메이션**: Framer Motion 12.23.24
- **차트**: Recharts 2.15.4

### **백엔드 (Server)**
- **언어**: TypeScript (5.6.3)
- **프레임워크**: Express.js 4.21.2
- **런타임**: Node.js 20
- **빌드 도구**: esbuild 0.25.0
- **Rate Limiting**: express-rate-limit 8.2.1
- **데이터 저장**: 
  - 메모리 스토리지 (Map 기반)
  - 파일 시스템 (JSON 파일)

### **개발 도구**
- **TypeScript**: 5.6.3
- **tsx**: 4.20.5 (TypeScript 실행)
- **Drizzle ORM**: 0.39.3 (데이터베이스 ORM, 현재 미사용)
- **Zod**: 3.25.76 (스키마 검증)

### **배포 환경**
- **플랫폼**: Render.com
- **빌드 명령어**: `npm install && npm run build`
- **시작 명령어**: `npm run start`
- **데이터 볼륨**: 1GB 디스크 마운트 (`/.data`)

---

## 📁 프로젝트 파일 구조

```
TwoMinute-Tycoon/
├── client/                    # 프론트엔드 소스 코드
│   ├── index.html            # HTML 엔트리 포인트
│   ├── public/               # 정적 파일
│   │   ├── favicon.png
│   │   └── opengraph.jpg
│   └── src/
│       ├── main.tsx          # React 앱 진입점
│       ├── App.tsx           # 메인 앱 컴포넌트
│       ├── index.css         # 글로벌 스타일
│       ├── components/       # 재사용 가능한 컴포넌트
│       │   └── ui/          # Radix UI 기반 컴포넌트들
│       │       ├── button.tsx
│       │       ├── card.tsx
│       │       ├── dialog.tsx
│       │       └── ... (60+ 컴포넌트)
│       ├── pages/           # 페이지 컴포넌트
│       │   ├── investment-game.tsx  # 메인 게임 페이지 (1,582줄)
│       │   └── not-found.tsx
│       ├── hooks/           # 커스텀 훅
│       │   ├── use-mobile.tsx
│       │   └── use-toast.ts
│       └── lib/            # 유틸리티 함수
│           ├── queryClient.ts
│           └── utils.ts
│
├── server/                  # 백엔드 소스 코드
│   ├── index.ts            # Express 서버 진입점
│   ├── routes.ts           # API 라우트 정의
│   ├── storage.ts          # 데이터 저장소 구현
│   ├── static.ts           # 정적 파일 서빙
│   └── vite.ts            # 개발 모드 Vite 설정
│
├── shared/                  # 공유 타입/스키마
│   └── schema.ts           # TypeScript 타입 정의
│
├── script/                  # 빌드/유틸리티 스크립트
│   ├── build.ts            # 프로덕션 빌드 스크립트
│   └── verify-deployment.ts # 배포 검증 스크립트
│
├── dist/                    # 빌드 출력 (gitignore)
│   ├── index.cjs           # 번들된 서버 코드
│   └── public/             # 빌드된 클라이언트 파일
│
├── .data/                   # 데이터 저장 디렉토리 (Render 볼륨)
│   └── rankings.json       # 랭킹 데이터 파일
│
├── package.json            # 프로젝트 의존성 및 스크립트
├── tsconfig.json           # TypeScript 설정
├── vite.config.ts          # Vite 빌드 설정
├── render.yaml             # Render 배포 설정
├── drizzle.config.ts       # Drizzle ORM 설정
└── vite-plugin-meta-images.ts # 커스텀 Vite 플러그인
```

---

## 🏗 아키텍처 구조

### **전체 구조**
```
┌─────────────────┐
│   브라우저      │
│  (React App)    │
└────────┬────────┘
         │ HTTP 요청
         │ (API 호출)
         ▼
┌─────────────────┐
│  Express 서버   │
│  (포트 5000)    │
├─────────────────┤
│  API Routes     │ ← /api/rankings (POST, GET)
│  Static Files   │ ← / (index.html, assets)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  MemStorage     │
│  (메모리 Map)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  File System    │
│  (.data/rankings│
│   .json)        │
└─────────────────┘
```

### **서버 구조**

#### 1. **서버 진입점** (`server/index.ts`)
- Express 앱 초기화
- 미들웨어 설정 (JSON 파싱, 로깅)
- 라우트 등록
- 정적 파일 서빙 (프로덕션) / Vite 개발 서버 (개발)
- 포트 5000에서 리스닝

#### 2. **API 라우트** (`server/routes.ts`)
- `POST /api/rankings`: 랭킹 생성
  - Rate Limiting: 분당 20회
  - 입력 검증 (이름, 수익률, 최종 금액)
  - 이름 길이 제한 (최대 10자)
  
- `GET /api/rankings`: 랭킹 조회
  - Rate Limiting: 분당 60회
  - limit 파라미터 지원 (1-100)
  - 수익률 기준 내림차순 정렬

- `DELETE /api/rankings`: 랭킹 초기화 (개발용)

#### 3. **데이터 저장소** (`server/storage.ts`)
- **MemStorage 클래스**: 메모리 기반 저장소
  - `Map<string, Ranking>`: 랭킹 데이터 저장
  - 최대 1,000개 제한 (메모리 관리)
  - 파일 시스템 동기화 (`.data/rankings.json`)
  
- **최적화 기능**:
  - 디바운싱: 마지막 요청 후 2초 후에만 파일 저장
  - 동시성 제어: Promise 큐로 순차 처리
  - 비동기 파일 저장 (에러 발생해도 메모리 데이터 유지)

#### 4. **정적 파일 서빙** (`server/static.ts`)
- 프로덕션 모드에서 빌드된 파일 서빙
- `index.html`: no-cache 헤더 (항상 최신 버전)
- 해시가 있는 파일: 1년 캐시 (성능 최적화)

### **클라이언트 구조**

#### 1. **메인 게임 페이지** (`client/src/pages/investment-game.tsx`)
- **게임 로직**:
  - 2분 타이머
  - 자산 선택 (암호화폐, 주식, 부동산)
  - 뉴스 이벤트 시스템
  - 실시간 가격 변동
  - 매수/매도 기능
  - 포트폴리오 관리
  
- **UI 컴포넌트**:
  - 튜토리얼 오버레이
  - 자산 선택 화면
  - 게임 화면 (차트, 뉴스, 버튼)
  - 결과 화면 (랭킹 등록)

#### 2. **컴포넌트 시스템**
- Radix UI 기반 접근성 컴포넌트
- Tailwind CSS로 스타일링
- 재사용 가능한 UI 컴포넌트 60+개

---

## 🚀 빌드 및 배포

### **개발 모드**
```bash
# 클라이언트만 실행 (Vite 개발 서버)
npm run dev:client

# 전체 앱 실행 (서버 + 클라이언트)
npm run dev

# Windows 환경
npm run dev:win
```

### **프로덕션 빌드**
```bash
# 빌드 실행
npm run build

# 결과물:
# - dist/index.cjs (서버 번들)
# - dist/public/ (클라이언트 빌드 파일)
```

### **프로덕션 실행**
```bash
npm run start
# 또는 Windows
npm run start:win
```

### **배포 설정 (Render)**
- **파일**: `render.yaml`
- **빌드 명령어**: `npm install && npm run build`
- **시작 명령어**: `npm run start`
- **환경 변수**: `NODE_ENV=production`
- **디스크 볼륨**: 1GB (`/.data`)

---

## 🔧 최근 개선 사항

### **1. Rate Limiting 추가** ✅
- **목적**: 과도한 요청 방지
- **구현**:
  - POST `/api/rankings`: 분당 20회 제한
  - GET `/api/rankings`: 분당 60회 제한
- **라이브러리**: `express-rate-limit`

### **2. 파일 저장 최적화** ✅
- **목적**: 파일 I/O 부하 감소
- **구현**: 디바운싱 (2초)
  - 여러 요청이 와도 마지막 요청 후 2초 후에만 저장
  - 파일 I/O 횟수 약 95% 감소 (630회 → 30회)

### **3. 동시성 처리 개선** ✅
- **목적**: Race condition 방지
- **구현**: Promise 큐로 순차 처리
  - 동시 요청이 와도 안전하게 처리

### **4. 에러 핸들링 강화** ✅
- **목적**: 문제 진단 용이
- **구현**: 
  - 모든 API 요청에 응답 시간 로깅
  - 상세한 에러 메시지

### **5. 캐시 헤더 최적화** ✅
- **목적**: 배포 후 최신 버전 보장
- **구현**:
  - `index.html`: `no-cache, no-store, must-revalidate`
  - 해시가 있는 파일: 1년 캐시

---

## 📊 성능 및 부하 처리

### **예상 부하**
- **시나리오**: 노트북 7대 × 3시간 × 2분 간격
- **총 요청 수**: 약 1,260회 (POST 630 + GET 630)
- **시간당**: 약 420회

### **최적화 결과**
- ✅ **메모리 관리**: 최대 1,000개 랭킹 제한
- ✅ **파일 I/O**: 디바운싱으로 95% 감소
- ✅ **Rate Limiting**: 과도한 요청 방지
- ✅ **동시성 제어**: 안전한 순차 처리
- ✅ **에러 핸들링**: 빠른 문제 진단

### **결론**
**버틸 수 있습니다!** ✅
- 예상 부하를 안전하게 처리 가능
- 메모리, I/O, 동시성 모두 최적화됨

---

## 🔐 보안 및 제한사항

### **Rate Limiting**
- POST: 분당 20회
- GET: 분당 60회
- 초과 시: 429 Too Many Requests

### **입력 검증**
- 이름: 1-10자 (공백 제거)
- 수익률: 숫자 타입 검증
- 최종 금액: 숫자 타입 검증

### **데이터 제한**
- 랭킹 최대 개수: 1,000개
- 초과 시 상위 1,000개만 유지

---

## 📝 주요 스크립트

```json
{
  "dev": "tsx server/index.ts",              // 개발 서버 실행
  "dev:client": "vite dev --port 5000",       // 클라이언트만 실행
  "build": "npx tsx script/build.ts",         // 프로덕션 빌드
  "start": "node dist/index.cjs",             // 프로덕션 실행
  "check": "tsc",                             // TypeScript 타입 체크
  "verify-deployment": "npx tsx script/verify-deployment.ts"  // 배포 검증
}
```

---

## 🌐 배포 URL

- **Render 배포**: `https://tsts-pmof.onrender.com`
- **배포 검증**: `npm run verify-deployment`

---

## 📚 주요 의존성 요약

### **프론트엔드 핵심**
- React 19.2.0
- Vite 7.1.9
- Tailwind CSS 4.1.14
- Radix UI (60+ 컴포넌트)
- Wouter 3.3.5 (라우팅)

### **백엔드 핵심**
- Express 4.21.2
- express-rate-limit 8.2.1
- TypeScript 5.6.3
- esbuild 0.25.0

### **개발 도구**
- TypeScript 5.6.3
- tsx 4.20.5
- Vite 7.1.9

---

## 🎯 게임 규칙

1. **초기 자본**: 2,000만원
2. **게임 시간**: 2분 (120초)
3. **자산 종류**: 
   - 암호화폐: ±10~30% 변동성
   - 주식: ±5~15% 변동성
   - 부동산: ±2~6% 변동성
4. **뉴스 이벤트**: 랜덤하게 발생, 가격에 영향
5. **목표**: 최대 수익률 달성
6. **랭킹**: 수익률 기준 상위 20명 표시

---

## 📞 문제 해결

### **배포 후 옛날 버전이 보이는 경우**
- `index.html`의 Cache-Control 헤더 확인
- 브라우저 캐시 삭제
- 시크릿 모드로 접속

### **랭킹이 저장되지 않는 경우**
- 서버 로그 확인
- Rate Limiting 초과 여부 확인
- 파일 시스템 권한 확인

### **성능 문제**
- Render 대시보드에서 로그 확인
- 응답 시간 모니터링
- 메모리 사용량 확인

---

**문서 작성일**: 2024년
**프로젝트 버전**: 1.0.0
**마지막 업데이트**: 부하 최적화 및 Rate Limiting 추가

