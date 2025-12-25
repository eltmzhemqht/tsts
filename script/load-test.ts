/**
 * 부하 테스트 스크립트
 * 200개의 봇이 게임을 시뮬레이션하고 랭킹을 제출합니다.
 */

const API_BASE_URL = "http://localhost:5000";
const TOTAL_BOTS = 200;
const BATCH_SIZE = 50; // 동시에 실행할 봇 수 (rate limiting 비활성화 시)
const DELAY_BETWEEN_BATCHES = 100; // 배치 간 지연 시간 (ms)

interface RankingData {
  name: string;
  returnRate: number;
  finalValue: number;
}

// 랜덤 수익률 생성 (실제 게임과 유사하게)
function generateRandomReturnRate(): number {
  // -50% ~ +200% 범위의 수익률
  // 대부분은 0~50% 사이에 분포
  const rand = Math.random();
  if (rand < 0.7) {
    // 70% 확률로 0~50%
    return Math.random() * 50;
  } else if (rand < 0.9) {
    // 20% 확률로 50~100%
    return 50 + Math.random() * 50;
  } else if (rand < 0.98) {
    // 8% 확률로 100~150%
    return 100 + Math.random() * 50;
  } else {
    // 2% 확률로 150~200%
    return 150 + Math.random() * 50;
  }
}

// 랜덤 이름 생성 (최대 10자 제한)
function generateRandomName(botNumber: number): string {
  const names = [
    "김철수", "이영희", "박민수", "최지영", "정대현",
    "강수진", "윤성호", "임동욱", "한소영", "조현우",
    "오지훈", "신유진", "류태현", "배수진", "전민호",
    "홍길동", "이순신", "강감찬", "을지문덕", "세종대왕",
  ];
  const randomName = names[Math.floor(Math.random() * names.length)];
  // 이름 + 숫자 조합이 10자를 넘지 않도록
  // 예: "김철수123" (6자), "을지문덕12" (7자)
  const maxDigits = 10 - randomName.length;
  const randomNum = Math.floor(Math.random() * Math.pow(10, maxDigits));
  return `${randomName}${randomNum}`;
}

// 랭킹 제출
async function submitRanking(data: RankingData): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/rankings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ 실패 [${data.name}]: ${response.status} - ${errorText}`);
      return false;
    }

    const result = await response.json();
    console.log(`✅ 성공 [${data.name}]: 수익률 ${data.returnRate.toFixed(2)}%`);
    return true;
  } catch (error: any) {
    console.error(`❌ 에러 [${data.name}]:`, error.message);
    return false;
  }
}

// 랭킹 조회
async function fetchRankings(): Promise<any[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/rankings?limit=20`);
    if (!response.ok) {
      throw new Error(`Failed to fetch rankings: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("랭킹 조회 실패:", error.message);
    return [];
  }
}

// 단일 봇 시뮬레이션
async function simulateBot(botNumber: number): Promise<boolean> {
  const returnRate = generateRandomReturnRate();
  const initialCapital = 20000000;
  const finalValue = initialCapital * (1 + returnRate / 100);
  const name = generateRandomName(botNumber);

  const rankingData: RankingData = {
    name: name, // 10자 제한 준수
    returnRate,
    finalValue,
  };

  return await submitRanking(rankingData);
}

// 배치 처리
async function runBatch(batchNumber: number, batchSize: number): Promise<number> {
  const startIndex = batchNumber * batchSize;
  const endIndex = Math.min(startIndex + batchSize, TOTAL_BOTS);
  const batch = [];

  for (let i = startIndex; i < endIndex; i++) {
    batch.push(simulateBot(i + 1));
  }

  const results = await Promise.all(batch);
  const successCount = results.filter((r) => r).length;
  return successCount;
}

// 메인 실행 함수
async function main() {
  console.log("🚀 부하 테스트 시작!");
  console.log(`📊 총 봇 수: ${TOTAL_BOTS}개`);
  console.log(`📦 배치 크기: ${BATCH_SIZE}개`);
  console.log(`⏱️  배치 간 지연: ${DELAY_BETWEEN_BATCHES}ms\n`);

  const startTime = Date.now();
  let totalSuccess = 0;
  let totalFailed = 0;

  const totalBatches = Math.ceil(TOTAL_BOTS / BATCH_SIZE);

  // 배치별로 실행
  for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
    const batchStartTime = Date.now();
    const successCount = await runBatch(batchNum, BATCH_SIZE);
    const batchDuration = Date.now() - batchStartTime;

    totalSuccess += successCount;
    totalFailed += BATCH_SIZE - successCount;

    console.log(
      `📦 배치 ${batchNum + 1}/${totalBatches}: ${successCount}/${BATCH_SIZE} 성공 (${batchDuration}ms)`
    );

    // 마지막 배치가 아니면 지연
    if (batchNum < totalBatches - 1) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }

  const totalDuration = Date.now() - startTime;

  console.log("\n" + "=".repeat(50));
  console.log("📊 테스트 결과");
  console.log("=".repeat(50));
  console.log(`✅ 성공: ${totalSuccess}개`);
  console.log(`❌ 실패: ${totalFailed}개`);
  console.log(`⏱️  총 소요 시간: ${(totalDuration / 1000).toFixed(2)}초`);
  console.log(`📈 초당 처리량: ${((totalSuccess / totalDuration) * 1000).toFixed(2)}개/초`);

  // 랭킹 조회
  console.log("\n" + "=".repeat(50));
  console.log("🏆 현재 랭킹 Top 20");
  console.log("=".repeat(50));

  const rankings = await fetchRankings();
  if (rankings.length > 0) {
    rankings.forEach((ranking, index) => {
      console.log(
        `${(index + 1).toString().padStart(2, " ")}. ${ranking.name.padEnd(20, " ")} - ${ranking.returnRate.toFixed(2)}%`
      );
    });
  } else {
    console.log("랭킹이 없습니다.");
  }

  console.log("\n✅ 부하 테스트 완료!");
}

// 서버 연결 확인
async function checkServer(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/rankings?limit=1`);
    return response.ok;
  } catch {
    return false;
  }
}

// 실행
(async () => {
  console.log("🔍 서버 연결 확인 중...");
  const serverReady = await checkServer();

  if (!serverReady) {
    console.error("❌ 서버에 연결할 수 없습니다!");
    console.error(`   ${API_BASE_URL} 에서 서버가 실행 중인지 확인하세요.`);
    console.error("\n   서버 시작 명령어: npm run dev");
    process.exit(1);
  }

  console.log("✅ 서버 연결 확인됨!\n");
  await main();
})().catch((error) => {
  console.error("❌ 치명적 오류:", error);
  process.exit(1);
});

