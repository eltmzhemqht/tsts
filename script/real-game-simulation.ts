/**
 * 실제 게임 플레이 시뮬레이션 스크립트
 * 게임 로직을 재현하여 2분 동안 실제로 게임을 플레이합니다.
 */

import { setTimeout as sleep } from "timers/promises";

// 환경 변수 또는 명령줄 인자로 서버 URL 설정
// 사용법:
//   API_URL=https://tsts-pmof.onrender.com npm run test:real
//   또는
//   npm run test:real -- --url https://tsts-pmof.onrender.com
const API_BASE_URL = 
  process.env.API_URL || 
  process.env.DEPLOYMENT_URL || 
  process.env.RENDER_EXTERNAL_URL ||
  (process.argv.includes("--url") 
    ? process.argv[process.argv.indexOf("--url") + 1]
    : "http://localhost:5000");

const NUM_LAPTOPS = 7; // 7대 노트북
const BOTS_PER_LAPTOP = 100; // 각 노트북당 100개 봇
const TOTAL_BOTS = NUM_LAPTOPS * BOTS_PER_LAPTOP; // 총 700개 봇
const GAME_DURATION = 120; // 2분 (120초)
const INITIAL_CAPITAL = 20000000; // 20,000,000원
const CONCURRENT_BATCH_SIZE = 50; // 동시에 실행할 봇 수 (서버 부하 관리)

// 뉴스 이벤트 (게임과 동일)
const NEWS_EVENTS = [
  { text: "미국 연준, 기준금리 동결 결정", impact: 1.15, type: "good" },
  { text: "트럼프 대통령, 자산 규제 완화 발표", impact: 1.20, type: "good" },
  { text: "바이든 대통령, 인프라 투자 확대 계획 발표", impact: 1.18, type: "good" },
  { text: "유럽중앙은행(ECB), 양적완화 정책 지속", impact: 1.12, type: "good" },
  { text: "일본은행, 저금리 정책 유지 발표", impact: 1.10, type: "good" },
  { text: "중국 인민은행, 유동성 공급 확대", impact: 1.16, type: "good" },
  { text: "아마존, 분기 실적 시장 기대치 초과 달성", impact: 1.22, type: "good" },
  { text: "테슬라, 신기술 개발 성공 발표", impact: 1.25, type: "good" },
  { text: "애플, 신제품 출시로 주가 상승", impact: 1.19, type: "good" },
  { text: "구글, 대형 M&A 발표로 시장 기대감 상승", impact: 1.21, type: "good" },
  { text: "마이크로소프트, 클라우드 사업 호조 발표", impact: 1.17, type: "good" },
  { text: "나스닥, 신기록 고점 달성", impact: 1.14, type: "good" },
  { text: "S&P 500, 연일 상승세 지속", impact: 1.13, type: "good" },
  { text: "골드만삭스, 해당 자산 매수 추천", impact: 1.18, type: "good" },
  { text: "JP모건, 긍정적 전망 보고서 발표", impact: 1.15, type: "good" },
  { text: "블랙록, 대규모 투자 유입 발표", impact: 1.20, type: "good" },
  { text: "워렌 버핏, 해당 자산 대량 매수", impact: 1.24, type: "good" },
  { text: "중국 정부, 디지털 자산 규제 완화", impact: 1.16, type: "good" },
  { text: "EU, 암호화폐 규제 완화 법안 통과", impact: 1.19, type: "good" },
  { text: "한국은행, 기준금리 동결 유지", impact: 1.11, type: "good" },
  { text: "네이버, 클라우드 사업 대규모 수주 성공", impact: 1.17, type: "good" },
  { text: "삼성전자, 반도체 수요 급증으로 실적 호조", impact: 1.20, type: "good" },
  { text: "SK하이닉스, 메모리 반도체 가격 상승으로 수익성 개선", impact: 1.18, type: "good" },
  { text: "미국 연준, 기준금리 0.5%p 인상 발표", impact: 0.88, type: "bad" },
  { text: "트럼프 대통령, 자산 규제 강화 발표", impact: 0.82, type: "bad" },
  { text: "바이든 대통령, 증세 정책 발표", impact: 0.85, type: "bad" },
  { text: "유럽중앙은행(ECB), 금리 인상 발표", impact: 0.87, type: "bad" },
  { text: "일본은행, 통화정책 전환 검토", impact: 0.89, type: "bad" },
  { text: "중국 인민은행, 금리 인상 결정", impact: 0.86, type: "bad" },
  { text: "아마존, 분기 실적 시장 기대치 하회", impact: 0.79, type: "bad" },
  { text: "테슬라, 리콜 발표로 주가 하락", impact: 0.76, type: "bad" },
  { text: "애플, 공급망 차질로 생산 지연", impact: 0.83, type: "bad" },
  { text: "구글, 규제 당국 조사 착수", impact: 0.80, type: "bad" },
  { text: "마이크로소프트, 보안 이슈 발생", impact: 0.78, type: "bad" },
  { text: "나스닥, 급락세 시작", impact: 0.85, type: "bad" },
  { text: "S&P 500, 조정 국면 진입", impact: 0.88, type: "bad" },
  { text: "골드만삭스, 해당 자산 매도 추천", impact: 0.82, type: "bad" },
  { text: "JP모건, 부정적 전망 보고서 발표", impact: 0.84, type: "bad" },
  { text: "블랙록, 대규모 매도 결정", impact: 0.77, type: "bad" },
  { text: "워렌 버핏, 해당 자산 대량 매도", impact: 0.75, type: "bad" },
  { text: "중국 정부, 디지털 자산 규제 강화", impact: 0.81, type: "bad" },
  { text: "EU, 암호화폐 규제 강화 법안 통과", impact: 0.83, type: "bad" },
  { text: "한국은행, 기준금리 인상 발표", impact: 0.87, type: "bad" },
  { text: "글로벌 경제 침체 우려 확산", impact: 0.80, type: "bad" },
  { text: "인플레이션 우려로 시장 불안 확산", impact: 0.86, type: "bad" },
];

// 자산 변동성 설정
const ASSET_VOLATILITY: Record<string, [number, number]> = {
  coin: [0.10, 0.30],
  stock: [0.05, 0.15],
  real_estate: [0.02, 0.06],
};

// 랜덤 가격 생성
function getRandomPrice(): number {
  return Math.floor(Math.random() * (9000000 - 5000000 + 1)) + 5000000;
}

// 랜덤 이름 생성
function generateRandomName(botNumber: number): string {
  const names = [
    "김철수", "이영희", "박민수", "최지영", "정대현",
    "강수진", "윤성호", "임동욱", "한소영", "조현우",
    "오지훈", "신유진", "류태현", "배수진", "전민호",
    "홍길동", "이순신", "강감찬", "을지문덕", "세종대왕",
  ];
  const randomName = names[Math.floor(Math.random() * names.length)];
  const maxDigits = 10 - randomName.length;
  const randomNum = Math.floor(Math.random() * Math.pow(10, maxDigits));
  return `${randomName}${randomNum}`;
}

// 봇의 최적 매수/매도 전략
// 게임 메커니즘: 뉴스 발생 → 2.5초 후 가격 변동
// 최선의 전략: 가격 변동 전에 거래하여 이익 극대화

function shouldBuy(
  news: typeof NEWS_EVENTS[0], 
  currentPrice: number, 
  cash: number,
  expectedPriceAfterChange: number
): boolean {
  // 좋은 뉴스: 가격이 오를 예정
  // 가격 변동 전에 매수하면 가격 상승 후 이익
  if (news.type === "good" && cash >= currentPrice) {
    // 예상 수익률 계산 (가격 변동 후 예상 가격)
    const expectedReturn = (expectedPriceAfterChange - currentPrice) / currentPrice;
    // 최소 5% 이상 예상 수익이 있을 때만 매수 (노이즈 필터링)
    return expectedReturn > 0.05;
  }
  return false;
}

function shouldSell(
  news: typeof NEWS_EVENTS[0], 
  holdings: number,
  currentPrice: number,
  expectedPriceAfterChange: number
): boolean {
  // 나쁜 뉴스: 가격이 떨어질 예정
  // 가격 변동 전에 매도하면 손실 방지
  if (news.type === "bad" && holdings > 0) {
    // 예상 손실률 계산
    const expectedLoss = (currentPrice - expectedPriceAfterChange) / currentPrice;
    // 최소 3% 이상 손실 예상 시 매도
    return expectedLoss > 0.03;
  }
  return false;
}

// 추가 전략: 가격 변동 후 추가 변동성을 고려한 최적 타이밍
function shouldBuyAfterPriceChange(
  currentPrice: number,
  previousPrice: number,
  cash: number,
  assetType: "coin" | "stock" | "real_estate"
): boolean {
  // 가격이 크게 하락했다면 반등 기회 포착
  const priceDrop = (previousPrice - currentPrice) / previousPrice;
  if (priceDrop > 0.1 && cash >= currentPrice) {
    // 10% 이상 하락 시 매수 (반등 기대)
    return true;
  }
  return false;
}

function shouldSellAfterPriceChange(
  currentPrice: number,
  buyPrice: number,
  holdings: number
): boolean {
  // 수익 실현: 20% 이상 수익이면 매도 (이익 확보)
  if (holdings > 0) {
    const profit = (currentPrice - buyPrice) / buyPrice;
    if (profit > 0.20) {
      return true;
    }
  }
  return false;
}

// 실제 게임 플레이 시뮬레이션
async function simulateGamePlay(botNumber: number, assetType: "coin" | "stock" | "real_estate"): Promise<{
  name: string;
  returnRate: number;
  finalValue: number;
}> {
  const name = generateRandomName(botNumber);
  let cash = INITIAL_CAPITAL;
  let holdings = 0;
  let currentPrice = getRandomPrice();
  const startPrice = currentPrice;
  
  let timeElapsed = 0;
  let lastNewsTime = 0;
  const lastNewsTextRef = { current: null as string | null };
  let averageBuyPrice = 0; // 평균 매수가 (수익률 계산용)
  let previousPrice = currentPrice; // 이전 가격 (추세 파악용)
  
  // 게임 시작 시 첫 뉴스
  const firstNews = NEWS_EVENTS[Math.floor(Math.random() * NEWS_EVENTS.length)];
  lastNewsTextRef.current = firstNews.text;
  
  // 2분 동안 게임 진행 (실제 시간으로 시뮬레이션)
  // 실제로는 빠르게 시뮬레이션하되, 로직은 동일하게
  const SIMULATION_SPEED = 10; // 10배 속도 (12초에 2분 시뮬레이션)
  const STEP_MS = 100; // 100ms마다 체크
  const TOTAL_STEPS = (GAME_DURATION * 1000) / STEP_MS / SIMULATION_SPEED;
  
  const pendingPriceChanges: Array<{ time: number; impact: number; news: typeof NEWS_EVENTS[0] }> = [];
  
  for (let step = 0; step < TOTAL_STEPS; step++) {
    const currentTime = (step * STEP_MS * SIMULATION_SPEED) / 1000; // 실제 게임 시간 (초)
    
    // 뉴스 이벤트 발생 (5-8초 간격)
    if (currentTime - lastNewsTime >= 5 + Math.random() * 3) {
      const availableNews = NEWS_EVENTS.filter(news => news.text !== lastNewsTextRef.current);
      const newsPool = availableNews.length > 0 ? availableNews : NEWS_EVENTS;
      const news = newsPool[Math.floor(Math.random() * newsPool.length)];
      lastNewsTextRef.current = news.text;
      lastNewsTime = currentTime;
      
      // 2.5초 후 가격 변동 예약
      const priceChangeTime = currentTime + 2.5;
      if (priceChangeTime < GAME_DURATION) {
        // 예상 가격 계산 (뉴스 impact + 변동성 고려)
        const [minVol, maxVol] = ASSET_VOLATILITY[assetType];
        const avgVolatility = (minVol + maxVol) / 2;
        const expectedPrice = Math.floor(currentPrice * news.impact * (1 + avgVolatility));
        
        pendingPriceChanges.push({ 
          time: priceChangeTime, 
          impact: news.impact,
          news: news
        });
        
        // 최적 전략: 가격 변동 전에 거래 (2.5초 기다리지 않고 즉시)
        // 뉴스를 보고 예상 가격을 계산하여 최적의 타이밍에 거래
        const expectedPriceAfterChange = Math.floor(currentPrice * news.impact);
        
        if (shouldBuy(news, currentPrice, cash, expectedPriceAfterChange)) {
          const quantity = Math.floor(cash / currentPrice);
          if (quantity > 0) {
            holdings += quantity;
            const totalCost = quantity * currentPrice;
            cash -= totalCost;
            // 평균 매수가 업데이트
            if (averageBuyPrice === 0) {
              averageBuyPrice = currentPrice;
            } else {
              averageBuyPrice = (averageBuyPrice * (holdings - quantity) + totalCost) / holdings;
            }
          }
        } else if (shouldSell(news, holdings, currentPrice, expectedPriceAfterChange)) {
          cash += holdings * currentPrice;
          holdings = 0;
          averageBuyPrice = 0;
        }
      }
    }
    
    // 예약된 가격 변동 적용
    const toApply = pendingPriceChanges.filter(p => 
      currentTime >= p.time && currentTime < p.time + (STEP_MS * SIMULATION_SPEED / 1000)
    );
    
    for (const change of toApply) {
      previousPrice = currentPrice;
      currentPrice = Math.floor(currentPrice * change.impact);
      // 변동성 추가 (자산 타입에 따라)
      const [minVol, maxVol] = ASSET_VOLATILITY[assetType];
      const volatility = (Math.random() * (maxVol - minVol) + minVol) * (Math.random() > 0.5 ? 1 : -1);
      currentPrice = Math.floor(currentPrice * (1 + volatility));
      currentPrice = Math.max(1000000, Math.min(20000000, currentPrice)); // 가격 범위 제한
      
      // 가격 변동 후 추가 전략 실행
      // 큰 하락 후 반등 기회 포착
      if (shouldBuyAfterPriceChange(currentPrice, previousPrice, cash, assetType)) {
        const quantity = Math.floor(cash / currentPrice);
        if (quantity > 0) {
          holdings += quantity;
          const totalCost = quantity * currentPrice;
          cash -= totalCost;
          if (averageBuyPrice === 0) {
            averageBuyPrice = currentPrice;
          } else {
            averageBuyPrice = (averageBuyPrice * (holdings - quantity) + totalCost) / holdings;
          }
        }
      }
      
      // 수익 실현 전략
      if (averageBuyPrice > 0 && shouldSellAfterPriceChange(currentPrice, averageBuyPrice, holdings)) {
        cash += holdings * currentPrice;
        holdings = 0;
        averageBuyPrice = 0;
      }
    }
    
    pendingPriceChanges.splice(0, toApply.length);
    
    // 실제 시간으로 약간 대기 (너무 빠르면 서버에 부하)
    if (step % 10 === 0) {
      await sleep(10);
    }
  }
  
  // 최종 자산 계산
  const finalValue = cash + (holdings * currentPrice);
  const returnRate = ((finalValue - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100;
  
  return {
    name,
    returnRate,
    finalValue,
  };
}

// 랭킹 제출
async function submitRanking(data: { name: string; returnRate: number; finalValue: number }): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/rankings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// 랭킹 조회
async function fetchRankings(): Promise<any[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/rankings?limit=20`);
    if (!response.ok) {
      return [];
    }
    return await response.json();
  } catch {
    return [];
  }
}

// 서버 연결 확인
async function checkServer(maxRetries = 30, delay = 1000): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/rankings?limit=1`);
      if (response.ok) {
        return true;
      }
    } catch {
      // 서버가 아직 시작되지 않음
    }
    await sleep(delay);
    process.stdout.write(`\r⏳ 서버 시작 대기 중... (${i + 1}/${maxRetries})`);
  }
  return false;
}

// 배치 처리 함수
async function runBatch(
  batchNumber: number,
  batchSize: number,
  startBotNumber: number
): Promise<number> {
  const batch: Promise<boolean>[] = [];
  
  for (let i = 0; i < batchSize; i++) {
    const botNumber = startBotNumber + batchNumber * batchSize + i;
    if (botNumber > TOTAL_BOTS) break;
    
    const assetTypes: Array<"coin" | "stock" | "real_estate"> = ["coin", "stock", "real_estate"];
    const assetType = assetTypes[Math.floor(Math.random() * assetTypes.length)];
    
    batch.push(
      (async () => {
        try {
          const result = await simulateGamePlay(botNumber, assetType);
          const success = await submitRanking(result);
          
          if (success) {
            process.stdout.write(`\r✅ 봇 ${botNumber}/${TOTAL_BOTS} 완료: ${result.name} - ${result.returnRate.toFixed(2)}%`);
          } else {
            process.stdout.write(`\r❌ 봇 ${botNumber}/${TOTAL_BOTS} 실패: ${result.name}`);
          }
          
          return success;
        } catch (error) {
          process.stdout.write(`\r❌ 봇 ${botNumber}/${TOTAL_BOTS} 오류 발생`);
          return false;
        }
      })()
    );
  }
  
  const results = await Promise.all(batch);
  return results.filter(r => r).length;
}

// 메인 실행 함수
async function main() {
  console.log("🚀 실제 게임 플레이 시뮬레이션 시작!");
  console.log(`🌐 서버 URL: ${API_BASE_URL}`);
  console.log(`💻 노트북 수: ${NUM_LAPTOPS}대`);
  console.log(`🤖 노트북당 봇 수: ${BOTS_PER_LAPTOP}개`);
  console.log(`📊 총 봇 수: ${TOTAL_BOTS}개`);
  console.log(`⏱️  게임 시간: ${GAME_DURATION}초 (2분)`);
  console.log(`🔄 동시 실행 봇 수: ${CONCURRENT_BATCH_SIZE}개`);
  console.log(`\n⚠️  주의: 배포된 서버는 로컬과 다를 수 있습니다:`);
  console.log(`   - 네트워크 지연 (인터넷 연결)`);
  console.log(`   - 서버 리소스 제한 (CPU/메모리)`);
  console.log(`   - Rate Limiting (분당 요청 제한)`);
  console.log(`   - 데이터베이스 성능 차이\n`);

  const startTime = Date.now();
  let totalSuccess = 0;
  const totalBatches = Math.ceil(TOTAL_BOTS / CONCURRENT_BATCH_SIZE);
  
  // 각 노트북별로 봇 그룹화
  for (let laptop = 0; laptop < NUM_LAPTOPS; laptop++) {
    const laptopStartBot = laptop * BOTS_PER_LAPTOP + 1;
    const laptopEndBot = Math.min((laptop + 1) * BOTS_PER_LAPTOP, TOTAL_BOTS);
    const laptopBots = laptopEndBot - laptopStartBot + 1;
    
    console.log(`\n💻 노트북 ${laptop + 1}/${NUM_LAPTOPS} 시작 (봇 ${laptopStartBot}~${laptopEndBot})`);
    
    const laptopBatches = Math.ceil(laptopBots / CONCURRENT_BATCH_SIZE);
    
    for (let batchNum = 0; batchNum < laptopBatches; batchNum++) {
      const batchStartBot = laptopStartBot + batchNum * CONCURRENT_BATCH_SIZE;
      const remainingBots = laptopEndBot - batchStartBot + 1;
      const currentBatchSize = Math.min(CONCURRENT_BATCH_SIZE, remainingBots);
      
      const successCount = await runBatch(batchNum, currentBatchSize, laptopStartBot - 1);
      totalSuccess += successCount;
      
      const progress = ((laptop * BOTS_PER_LAPTOP + (batchNum + 1) * CONCURRENT_BATCH_SIZE) / TOTAL_BOTS) * 100;
      process.stdout.write(
        `\r📦 전체 진행률: ${Math.min(100, progress).toFixed(1)}% (${totalSuccess}/${Math.min(laptopEndBot, laptopStartBot + (batchNum + 1) * CONCURRENT_BATCH_SIZE - 1)} 성공)`
      );
      
      // 배치 간 약간의 지연 (서버 부하 관리)
      if (batchNum < laptopBatches - 1) {
        await sleep(50);
      }
    }
    
    console.log(`\n✅ 노트북 ${laptop + 1} 완료`);
  }

  const totalDuration = Date.now() - startTime;
  console.log("\n\n" + "=".repeat(60));
  console.log("📊 테스트 결과");
  console.log("=".repeat(60));
  console.log(`💻 노트북 수: ${NUM_LAPTOPS}대`);
  console.log(`🤖 총 봇 수: ${TOTAL_BOTS}개`);
  console.log(`✅ 성공: ${totalSuccess}개`);
  console.log(`❌ 실패: ${TOTAL_BOTS - totalSuccess}개`);
  console.log(`⏱️  총 소요 시간: ${(totalDuration / 1000).toFixed(2)}초`);
  console.log(`📈 초당 처리량: ${((totalSuccess / totalDuration) * 1000).toFixed(2)}개/초`);
  console.log(`🎮 평균 게임 시간: ${(totalDuration / totalSuccess / 1000).toFixed(2)}초/봇`);

  // 랭킹 조회
  console.log("\n" + "=".repeat(60));
  console.log("🏆 현재 랭킹 Top 20");
  console.log("=".repeat(60));

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

  console.log("\n✅ 시뮬레이션 완료!");
}

// 실행
(async () => {
  console.log("🔍 서버 연결 확인 중...");
  console.log(`   URL: ${API_BASE_URL}\n`);
  
  const serverReady = await checkServer(3, 500);

  if (!serverReady) {
    console.error("❌ 서버에 연결할 수 없습니다!");
    console.error(`   ${API_BASE_URL} 에서 서버가 실행 중인지 확인하세요.`);
    console.error("\n   로컬 서버 시작: npm run dev");
    console.error(`   배포 서버 테스트: API_URL=https://your-render-url.com npm run test:real`);
    console.error(`   또는: npm run test:real -- --url https://your-render-url.com`);
    process.exit(1);
  }

  console.log("✅ 서버 연결 확인됨!\n");
  await main();
})().catch((error) => {
  console.error("❌ 치명적 오류:", error);
  process.exit(1);
});


