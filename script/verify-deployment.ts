/**
 * 배포 검증 스크립트
 * 
 * 사용법:
 *   DEPLOYMENT_URL=https://your-render-url.com npm run verify-deployment
 *   또는
 *   npx tsx script/verify-deployment.ts
 */

const DEPLOYMENT_URL = process.env.DEPLOYMENT_URL || process.env.RENDER_EXTERNAL_URL || "https://tsts-pmof.onrender.com";

async function verifyDeployment() {
  console.log("🔍 배포 검증 시작...\n");
  
  try {
    // 1. 기본 헤더 확인
    console.log("1️⃣ 기본 헤더 확인:");
    const headResponse = await fetch(DEPLOYMENT_URL, { method: "HEAD" });
    console.log(`   - URL: ${DEPLOYMENT_URL}`);
    console.log(`   - Status: ${headResponse.status}`);
    console.log(`   - Content-Type: ${headResponse.headers.get("content-type")}`);
    
    // 2. index.html 헤더 확인
    console.log("\n2️⃣ index.html 캐시 헤더 확인:");
    const indexResponse = await fetch(`${DEPLOYMENT_URL}/index.html`, { method: "HEAD" });
    const cacheControl = indexResponse.headers.get("cache-control");
    const etag = indexResponse.headers.get("etag");
    const lastModified = indexResponse.headers.get("last-modified");
    
    console.log(`   - Cache-Control: ${cacheControl || "없음"}`);
    console.log(`   - ETag: ${etag || "없음"}`);
    console.log(`   - Last-Modified: ${lastModified || "없음"}`);
    
    if (cacheControl?.includes("no-cache") || cacheControl?.includes("no-store")) {
      console.log("   ✅ index.html 캐시 헤더가 올바르게 설정되었습니다");
    } else {
      console.log("   ⚠️  index.html 캐시 헤더가 설정되지 않았습니다");
      console.log("   💡 server/static.ts에서 Cache-Control 헤더를 확인하세요");
    }
    
    // 3. 실제 HTML 내용 확인
    console.log("\n3️⃣ HTML 내용 확인:");
    const htmlResponse = await fetch(DEPLOYMENT_URL);
    const html = await htmlResponse.text();
    
    // Vite 빌드 파일 확인 (해시가 있는 파일)
    const hasViteAssets = /assets\/[^"']+\.[a-f0-9]+\.(js|css)/.test(html);
    if (hasViteAssets) {
      console.log("   ✅ Vite 빌드 파일이 해시와 함께 포함되어 있습니다");
    } else {
      console.log("   ⚠️  Vite 빌드 파일에 해시가 없을 수 있습니다");
    }
    
    // 메인 스크립트 확인
    const mainScriptMatch = html.match(/src="([^"]+main[^"]+)"/);
    if (mainScriptMatch) {
      console.log(`   - Main Script: ${mainScriptMatch[1]}`);
    }
    
    // 4. 정적 파일 캐시 헤더 확인 (해시가 있는 파일)
    if (mainScriptMatch) {
      console.log("\n4️⃣ 정적 파일 캐시 헤더 확인:");
      const assetUrl = `${DEPLOYMENT_URL}${mainScriptMatch[1]}`;
      try {
        const assetResponse = await fetch(assetUrl, { method: "HEAD" });
        const assetCacheControl = assetResponse.headers.get("cache-control");
        console.log(`   - Asset URL: ${assetUrl}`);
        console.log(`   - Cache-Control: ${assetCacheControl || "없음"}`);
        
        if (assetCacheControl?.includes("max-age") || assetCacheControl?.includes("immutable")) {
          console.log("   ✅ 정적 파일 캐시 헤더가 올바르게 설정되었습니다");
        } else {
          console.log("   ⚠️  정적 파일 캐시 헤더가 설정되지 않았습니다");
        }
      } catch (error) {
        console.log(`   ⚠️  정적 파일 확인 실패: ${error}`);
      }
    }
    
    console.log("\n✅ 배포 검증 완료!");
    console.log("\n💡 팁:");
    console.log("   - 문제가 있다면 개발자 도구 Network 탭에서 헤더를 확인하세요");
    console.log("   - 시크릿 모드에서도 테스트해보세요");
    console.log("   - 여러 브라우저에서 확인하세요");
    
  } catch (error) {
    console.error("❌ 배포 검증 실패:", error);
    process.exit(1);
  }
}

verifyDeployment();



