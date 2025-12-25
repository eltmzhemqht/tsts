/**
 * Render 배포 사이트에 랭킹 추가 스크립트
 * 사용법: npx tsx script/add-rankings-to-render.ts
 */

const RENDER_URL = "https://tsts-pmof.onrender.com";
const CLEAR_KEY = "r-f";

const rankings = [
  {
    name: "윤인태",
    returnRate: 436.04,
    finalValue: 107207786
  },
  {
    name: "감민주",
    returnRate: 352.54,
    finalValue: 90508568
  },
  {
    name: "10419 이민준",
    returnRate: -12.95,
    finalValue: 17410664
  }
];

async function clearRankings() {
  try {
    const response = await fetch(`${RENDER_URL}/api/rankings?key=${encodeURIComponent(CLEAR_KEY)}`, {
      method: "DELETE"
    });

    const result = await response.json();
    
    if (result.success) {
      console.log("✅ 기존 랭킹 초기화 완료");
      return true;
    } else {
      console.error("❌ 랭킹 초기화 실패:", result.message);
      return false;
    }
  } catch (error) {
    console.error("❌ 랭킹 초기화 중 오류:", error);
    return false;
  }
}

async function addRanking(name: string, returnRate: number, finalValue: number) {
  try {
    const response = await fetch(`${RENDER_URL}/api/rankings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        returnRate,
        finalValue
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ ${name} 랭킹 추가 성공`);
      return true;
    } else {
      console.error(`❌ ${name} 랭킹 추가 실패:`, result.message);
      return false;
    }
  } catch (error) {
    console.error(`❌ ${name} 랭킹 추가 중 오류:`, error);
    return false;
  }
}

async function main() {
  console.log("🚀 Render 배포 사이트에 랭킹 추가 시작...\n");
  
  // 1. 기존 랭킹 초기화
  console.log("1️⃣ 기존 랭킹 초기화 중...");
  await clearRankings();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 2. 새 랭킹 추가
  console.log("\n2️⃣ 새 랭킹 추가 중...");
  for (const ranking of rankings) {
    await addRanking(ranking.name, ranking.returnRate, ranking.finalValue);
    // API 부하 방지를 위해 1초 대기
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log("\n✨ 랭킹 추가 완료!");
  console.log(`📊 확인: ${RENDER_URL}/api/rankings`);
}

main().catch(console.error);

