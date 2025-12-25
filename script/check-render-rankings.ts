/**
 * Render 배포 사이트의 랭킹 확인 스크립트
 * 사용법: npx tsx script/check-render-rankings.ts
 */

const RENDER_URL = "https://tsts-pmof.onrender.com";

async function checkRankings() {
  try {
    const response = await fetch(`${RENDER_URL}/api/rankings?limit=100`);
    const result = await response.json();
    
    if (result.success && result.data) {
      console.log(`\n📊 현재 랭킹 개수: ${result.data.length}개\n`);
      
      // 봇 랭킹 확인
      const botRankings = result.data.filter((r: any) => r.name.startsWith("봇"));
      const userRankings = result.data.filter((r: any) => !r.name.startsWith("봇"));
      
      console.log(`🤖 봇 랭킹: ${botRankings.length}개`);
      if (botRankings.length > 0) {
        console.log("   최근 봇 랭킹:");
        botRankings.slice(0, 5).forEach((r: any, i: number) => {
          console.log(`   ${i + 1}. ${r.name} - ${r.returnRate.toFixed(2)}% (${new Date(r.createdAt).toLocaleString()})`);
        });
      }
      
      console.log(`\n👤 사용자 랭킹: ${userRankings.length}개`);
      if (userRankings.length > 0) {
        console.log("   사용자 랭킹:");
        userRankings.slice(0, 10).forEach((r: any, i: number) => {
          console.log(`   ${i + 1}. ${r.name} - ${r.returnRate.toFixed(2)}% (${new Date(r.createdAt).toLocaleString()})`);
        });
      }
      
      // 최근 생성된 랭킹 확인
      const recentRankings = result.data
        .sort((a: any, b: any) => b.createdAt - a.createdAt)
        .slice(0, 10);
      
      console.log(`\n⏰ 최근 생성된 랭킹 (최근 10개):`);
      recentRankings.forEach((r: any, i: number) => {
        const timeAgo = Math.floor((Date.now() - r.createdAt) / 1000);
        const minutesAgo = Math.floor(timeAgo / 60);
        const secondsAgo = timeAgo % 60;
        console.log(`   ${i + 1}. ${r.name} - ${minutesAgo}분 ${secondsAgo}초 전`);
      });
    } else {
      console.log("❌ 랭킹을 가져올 수 없습니다:", result.message);
    }
  } catch (error) {
    console.error("❌ 오류 발생:", error);
  }
}

checkRankings();

