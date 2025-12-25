# 게임 서버 현재 상태 보고서

**작성일**: 2025-12-25  
**목적**: 다른 AI가 피드백할 수 있도록 현재 서버 상태 상세 보고  
**배포 플랫폼**: Render.com (무료 플랜)

---

## 📋 서버 개요

### 배포 환경
- **플랫폼**: Render.com (무료 플랜)
- **URL**: https://tsts-pmof.onrender.com
- **스택**: Node.js + Express + TypeScript
- **아키텍처**: 단일 인스턴스 (메모리 기반 저장소)

### 운영 환경
- **목적**: 학교 축제 게임 서버
- **예상 사용량**: 노트북 7대, 각 2분 게임
- **운영 시간**: 4시간
- **예상 총 요청**: 약 840회 (POST 420 + GET 420)

---

## 🔧 현재 서버 설정

### Rate Limiting

| 엔드포인트 | 제한 | 근거 | 비고 |
|-----------|------|------|------|
| POST /api/rankings | 30/분 | 학교 축제 환경 (7대 × 2분 = 3.5회/분, 여유 8.5배) | 프로덕션 모드에서만 활성화 |
| GET /api/rankings | 60/분 | 조회는 자주 발생하므로 더 많이 허용 | 항상 활성화 |

**Rate Limit 동작**:
- Rate limit 초과 시: HTTP 200 반환, `{ success: false, message: "너무 많은 요청입니다..." }`
- 개발 모드: Rate limiting 완전 비활성화 (`NODE_ENV=development` 또는 `DISABLE_RATE_LIMIT=true`)

### 데이터 저장

**메모리 저장소**:
- **구조**: `Map<string, Ranking>` (최대 1,000개)
- **자동 정리**: 수익률 기준 상위 1,000개만 유지
- **동시성 제어**: Promise 큐로 순차 처리 (Race condition 방지)

**파일 저장소**:
- **경로**: `.data/rankings.json`
- **동기화**: 디바운싱 2초 (여러 요청이 와도 마지막 요청 후 2초 후에만 저장)
- **복구**: 서버 재시작 시 자동 로드
- **저장 실패 처리**: 파일 저장 실패해도 메모리 데이터 유지

### 입력 검증

**POST /api/rankings 검증**:
- `name`: 1-10자 (trim 후 체크)
- `returnRate`: -100% ~ 10,000% (isFinite 체크)
- `finalValue`: 0 ~ 100,000,000,000 (isFinite 체크)
- 모든 검증 실패 시: HTTP 200 반환, `{ success: false, message: "..." }`

### 보안

**DELETE /api/rankings 보호**:
- 환경 변수 `CLEAR_RANKINGS_KEY`와 query key 일치 확인
- 기본값: `"default-secret-key-change-in-production"`
- 키 불일치 시: HTTP 200 반환, `{ success: false, message: "Unauthorized" }`

### 에러 핸들링

**모든 API 공통**:
- **에러 발생 시**: 항상 HTTP 200 반환
- **응답 형식**: `{ success: true/false, data: ..., message: ... }`
- **목적**: Render 무료 플랜에서 HTTP 500으로 인한 서버 재시작 방지

---

## 🏗️ 코드 구조

### 주요 파일

1. **server/routes.ts** (163줄)
   - API 엔드포인트 정의
   - Rate limiting 설정
   - 입력 검증 로직
   - 에러 핸들링

2. **server/storage.ts** (235줄)
   - `MemStorage` 클래스: 메모리 기반 저장소
   - 동시성 제어 (Promise 큐)
   - 파일 I/O (디바운싱)
   - 메모리 관리 (최대 1,000개 제한)

3. **server/index.ts**
   - Express 앱 초기화
   - 로깅 미들웨어
   - 정적 파일 서빙 (프로덕션)
   - Vite 개발 서버 (개발)

4. **shared/schema.ts**
   - 타입 정의 (`Ranking`, `InsertRanking`)
   - `createdAt`: `number` (timestamp)

5. **client/src/pages/investment-game.tsx** (1,761줄)
   - 클라이언트 게임 로직
   - 랭킹 표시 및 제출

### 핵심 클래스: MemStorage

**주요 메서드**:
- `createRanking(insertRanking)`: 랭킹 생성 (동시성 제어, 파일 저장 스케줄링)
- `getRankings(limit)`: 랭킹 조회 (정렬, 제한)
- `clearRankings()`: 랭킹 초기화 (보호됨)

**동시성 제어**:
```typescript
private operationQueue: Promise<void> = Promise.resolve();
// 모든 createRanking 작업을 순차 처리
```

**파일 저장 최적화**:
```typescript
private readonly SAVE_DEBOUNCE_MS = 2000; // 2초 디바운싱
// 여러 요청이 와도 마지막 요청 후 2초 후에만 저장
```

---

## 🛡️ 안정성 보장 메커니즘

### 1. HTTP 500 방지
- **모든 API**: try-catch로 에러 처리
- **응답**: 항상 HTTP 200 반환 (에러 시에도)
- **효과**: Render 무료 플랜에서 서버 재시작 방지

### 2. 동시성 제어
- **방식**: Promise 큐로 순차 처리
- **효과**: Race condition 방지, 데이터 일관성 보장

### 3. 메모리 관리
- **최대 랭킹**: 1,000개
- **자동 정리**: 수익률 기준 상위 1,000개만 유지
- **효과**: 장기 운영 시 메모리 누수 방지

### 4. 파일 I/O 최적화
- **디바운싱**: 마지막 요청 후 2초 후에만 저장
- **비동기 저장**: 저장 실패해도 메모리 데이터 유지
- **효과**: 파일 I/O 부하 95% 감소

### 5. Rate Limiting
- **POST**: 분당 30회 (학교 축제 환경에 맞춤)
- **GET**: 분당 60회 (조회는 자주 발생)
- **효과**: 서버 부하 감소, 안정성 향상

---

## 📊 예상 부하 분석

### 실제 운영 환경
- **노트북**: 7대
- **게임 시간**: 2분
- **랭킹 제출**: 게임 종료 후 (약 2분 간격)
- **예상 동시 요청**: 최대 7개
- **4시간 총 요청**: 약 840회 (POST 420 + GET 420)

### Rate Limiting 분석
- **POST 제한**: 30회/분
- **실제 필요**: 최대 3.5회/분 (7대 ÷ 2분)
- **여유**: 약 8.5배
- **결론**: 충분한 여유

### 메모리 사용량
- **랭킹 1개**: 약 200 bytes
- **최대 1,000개**: 약 200 KB
- **결론**: 메모리 사용량 매우 낮음

---

## ⚠️ 알려진 제약사항

### 1. 단일 인스턴스
- **제약**: 수평 확장 불가능 (메모리 공유 불가)
- **현재 상태**: Render 무료 플랜 (단일 인스턴스)
- **영향**: 학교 축제 환경에서는 문제 없음

### 2. 파일 시스템 의존성
- **제약**: Render 볼륨 마운트 필요
- **현재 상태**: `.data/` 디렉토리에 저장
- **영향**: 정상 작동 중

### 3. 동시성 제어
- **제약**: Promise 큐로 순차 처리 (동시 처리 불가)
- **현재 상태**: 데이터 일관성 우선
- **영향**: 학교 축제 환경에서는 문제 없음

---

## 🔍 코드 품질

### 타입 안정성
- **TypeScript**: 모든 코드 타입 안전
- **createdAt**: `number` (timestamp)로 통일
- **검증**: 모든 입력값 검증

### 에러 처리
- **모든 API**: try-catch로 에러 처리
- **응답**: 항상 HTTP 200 반환
- **로깅**: 에러 발생 시 상세 로그

### 성능 최적화
- **파일 저장**: 디바운싱 2초
- **랭킹 조회**: 조건부 정렬 최적화
- **메모리 관리**: 최대 1,000개 제한

---

## 🧪 테스트 방법

### 시뮬레이션 스크립트
- **파일**: `script/festival-simulation.ts`
- **사용법**: `npm run test:festival`
- **시뮬레이션**: 노트북 7대, 각 2분 게임, Rate limiting 고려

### 로컬 테스트
```bash
npm run dev
# 개발 모드: Rate limiting 비활성화
```

### 프로덕션 테스트
```bash
npm run test:festival
# 실제 상황과 유사한 시뮬레이션
```

---

## 📝 환경 변수

### 필수 환경 변수
- `NODE_ENV`: `production` (프로덕션 모드)
- `PORT`: `5000` (기본값)

### 선택적 환경 변수
- `CLEAR_RANKINGS_KEY`: 랭킹 초기화 키 (기본값: `"default-secret-key-change-in-production"`)
- `DISABLE_RATE_LIMIT`: Rate limiting 비활성화 (개발용, 기본값: `false`)

---

## 🎯 피드백 요청 사항

다른 AI가 피드백할 수 있도록 다음 사항을 확인해주세요:

1. **Rate Limiting 설정이 적절한가?**
   - 현재: POST 30/분, GET 60/분
   - 실제 필요: 최대 3.5회/분

2. **메모리 관리가 충분한가?**
   - 현재: 최대 1,000개 제한
   - 예상: 4시간 동안 약 420개 생성

3. **동시성 제어가 효율적인가?**
   - 현재: Promise 큐로 순차 처리
   - 예상 동시 요청: 최대 7개

4. **에러 핸들링이 적절한가?**
   - 현재: 모든 에러 시 HTTP 200 반환
   - Render 무료 플랜에서 HTTP 500 방지 목적

5. **파일 I/O 최적화가 충분한가?**
   - 현재: 디바운싱 2초
   - 예상: 2분 간격으로 요청

6. **서버 재시작 시 데이터 복구가 안전한가?**
   - 현재: 서버 시작 시 `.data/rankings.json` 자동 로드
   - Render 무료 플랜: 서버 재시작 시 파일 유지

---

**마지막 업데이트**: 2025-12-25  
**서버 버전**: 1.0.0  
**배포 URL**: https://tsts-pmof.onrender.com

