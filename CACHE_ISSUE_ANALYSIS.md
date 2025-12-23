# Render 배포 캐시 문제 분석 및 해결 방안

## 🔍 문제 현상 분석

### 발생한 문제
- 배포 완료 후 옛날 상태의 화면이 표시됨
- 12시간 후 자동으로 최신 상태로 복구
- GitHub에는 최신 코드가 정상적으로 존재

### 원인 분석

#### 1. CDN 캐시 문제 ⚠️ (가장 가능성 높음)

**Render의 CDN 동작 방식:**
- Render는 자체 CDN을 통해 정적 파일을 서빙합니다
- CDN은 성능 최적화를 위해 파일을 캐시합니다
- 현재 설정에서는 `index.html`과 해시가 없는 파일들이 오래 캐시될 수 있습니다

**문제점:**
```typescript
// server/static.ts - 현재 설정
app.use(express.static(distPath));
// Cache-Control 헤더가 명시적으로 설정되지 않음
```

**Express.static() 기본 동작:**
- 기본적으로 `max-age=0` 또는 짧은 캐시 시간을 설정
- 하지만 Render CDN이 이를 무시하거나 다른 정책을 적용할 수 있음
- `index.html`은 해시가 없어서 CDN이 오래된 버전을 캐시할 수 있음

#### 2. Render 빌드/배포 동작 방식

**가능한 시나리오:**
1. **빌드 캐시 문제**: Render가 이전 빌드 결과물을 재사용
2. **배포 타이밍**: 빌드는 완료되었지만 CDN에 반영되는 데 시간이 걸림
3. **파일 교체 지연**: 새 파일이 업로드되었지만 CDN이 이전 파일을 계속 서빙

**확인 필요 사항:**
- Render 대시보드에서 실제 빌드 로그 확인
- 배포 시간과 실제 반영 시간의 차이

#### 3. 브라우저 캐시 또는 Service Worker

**확인 결과:**
- ✅ Service Worker 없음 (확인 완료)
- ⚠️ 브라우저 캐시 가능성 있음

**브라우저 캐시 동작:**
- `index.html`이 `Cache-Control` 헤더 없이 서빙되면 브라우저가 자체 캐시 정책 적용
- 일부 브라우저는 `index.html`을 최대 1시간까지 캐시할 수 있음
- 하지만 12시간은 브라우저 캐시로 설명하기 어려움

## 🛠️ 해결 방안

### 1. 서버 측 캐시 헤더 설정 (필수)

**수정 파일: `server/static.ts`**

```typescript
import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // 정적 파일 서빙 (JS, CSS, 이미지 등 - 해시가 있는 파일)
  app.use(
    express.static(distPath, {
      maxAge: "1y", // 해시가 있는 파일은 1년 캐시 (안전)
      immutable: true, // 파일이 변경되지 않음을 명시
      etag: true, // ETag 사용으로 변경 감지
      lastModified: true, // Last-Modified 헤더 사용
    }),
  );

  // index.html은 항상 최신 버전을 가져오도록 설정
  app.get("/", (_req, res, next) => {
    res.set({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    });
    res.sendFile(path.resolve(distPath, "index.html"));
  });

  // SPA 라우팅을 위한 fallback (모든 경로에서 index.html 반환)
  app.use("*", (req, res) => {
    // index.html도 캐시하지 않음
    res.set({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    });
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
```

### 2. Vite 빌드 설정 개선

**수정 파일: `vite.config.ts`**

```typescript
export default defineConfig({
  // ... 기존 설정 ...
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // 파일명에 해시 추가 보장
        entryFileNames: "assets/[name].[hash].js",
        chunkFileNames: "assets/[name].[hash].js",
        assetFileNames: "assets/[name].[hash].[ext]",
      },
    },
    // 빌드 시마다 고유한 해시 생성 보장
    manifest: true,
  },
});
```

### 3. Render 설정 개선

**수정 파일: `render.yaml`**

```yaml
services:
  - type: web
    name: two-minute-tycoon
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm run start
    envVars:
      - key: NODE_ENV
        value: production
    healthCheckPath: /
    disk:
      name: data-volume
      mountPath: /.data
      sizeGB: 1
    # 빌드 캐시 비활성화 (선택사항 - 빌드 시간이 길어질 수 있음)
    # buildCacheEnabled: false
```

**Render 대시보드에서 확인할 사항:**
1. **Auto-Deploy**: GitHub 푸시 시 자동 배포가 활성화되어 있는지 확인
2. **Build Logs**: 실제 빌드가 실행되었는지, 빌드 시간 확인
3. **Deploy Logs**: 배포 완료 시간과 실제 서비스 시작 시간 확인

### 4. 배포 확인 체크리스트

**배포 후 즉시 확인:**

```bash
# 1. 배포된 파일 확인
curl -I https://your-render-url.com/

# 2. index.html의 Cache-Control 헤더 확인
curl -I https://your-render-url.com/index.html

# 3. 해시가 있는 파일의 Cache-Control 헤더 확인
curl -I https://your-render-url.com/assets/main.abc123.js

# 4. 실제 HTML 내용 확인 (최신 버전인지)
curl https://your-render-url.com/ | grep -o "src=\"/src/main.tsx\"" || echo "최신 빌드 확인됨"
```

**브라우저에서 확인:**
1. 개발자 도구 > Network 탭 열기
2. "Disable cache" 체크
3. 페이지 새로고침 (Cmd/Ctrl + Shift + R)
4. `index.html`의 Response Headers 확인:
   - `Cache-Control: no-cache, no-store, must-revalidate` 확인
   - `ETag` 또는 `Last-Modified` 헤더 확인

**배포 검증 스크립트 (선택사항):**

```typescript
// script/verify-deployment.ts
import fetch from "node-fetch";

async function verifyDeployment() {
  const url = process.env.DEPLOYMENT_URL || "https://your-render-url.com";
  
  try {
    const response = await fetch(url, { method: "HEAD" });
    const cacheControl = response.headers.get("cache-control");
    
    console.log("Deployment Verification:");
    console.log(`- URL: ${url}`);
    console.log(`- Status: ${response.status}`);
    console.log(`- Cache-Control: ${cacheControl}`);
    
    if (cacheControl?.includes("no-cache")) {
      console.log("✅ Cache headers correctly set");
    } else {
      console.log("⚠️  Cache headers may need adjustment");
    }
  } catch (error) {
    console.error("❌ Deployment verification failed:", error);
  }
}

verifyDeployment();
```

## 📋 배포 후 체크리스트

### 즉시 확인 (배포 직후)
- [ ] Render 대시보드에서 배포 상태가 "Live"인지 확인
- [ ] 배포 로그에서 빌드 성공 메시지 확인
- [ ] 서비스 헬스 체크 통과 확인

### 5분 후 확인
- [ ] 시크릿 모드/프라이빗 브라우징으로 사이트 접속
- [ ] 개발자 도구 Network 탭에서 `index.html` 헤더 확인
- [ ] 실제 화면이 최신 버전인지 확인 (콘솔 로그, UI 변경사항 등)

### 1시간 후 확인
- [ ] 일반 브라우저에서도 최신 버전이 표시되는지 확인
- [ ] 여러 기기/브라우저에서 테스트

## 🚨 문제 재발 시 대응

1. **즉시 조치:**
   ```bash
   # Render 대시보드에서 "Manual Deploy" 실행
   # 또는 빈 커밋으로 재배포 트리거
   git commit --allow-empty -m "Force redeploy"
   git push origin main
   ```

2. **CDN 캐시 강제 무효화:**
   - Render 대시보드에서 서비스 재시작
   - 또는 Render 지원팀에 CDN 캐시 무효화 요청

3. **긴급 대응:**
   - `index.html`에 버전 쿼리 파라미터 추가
   - 예: `?v=2.0.0` (배포 시마다 증가)

## 📝 추가 권장 사항

### 1. 배포 알림 설정
- Render 웹훅을 사용해 배포 완료 시 알림 받기
- 또는 GitHub Actions로 배포 후 자동 검증

### 2. 버전 정보 표시
```typescript
// client/src/main.tsx 또는 index.html
// 빌드 시 주입되는 버전 정보
const BUILD_VERSION = import.meta.env.VITE_BUILD_VERSION || Date.now();
console.log(`Build Version: ${BUILD_VERSION}`);
```

### 3. 모니터링
- 배포 후 자동으로 헬스 체크 실행
- 주요 기능이 정상 작동하는지 자동 테스트

## 🔗 참고 자료

- [Render Static Site Caching](https://render.com/docs/static-sites#caching)
- [Express Static Files](https://expressjs.com/en/starter/static-files.html)
- [Vite Build Options](https://vitejs.dev/config/build-options.html)
- [HTTP Caching (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)

