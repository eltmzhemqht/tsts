/**
 * Render 배포 사이트 로드 테스트 스크립트
 * 약 700개의 봇이 동시에 게임을 플레이하는 시뮬레이션
 * 사용법: npx tsx script/render-load-test.ts
 */

import { setTimeout as sleep } from "timers/promises";

const RENDER_URL = "https://tsts-pmof.onrender.com";
const TOTAL_BOTS = 700;
const CONCURRENT_BATCH_SIZE = 50; // 동시 실행 봇 수 (서버 부하 방지)
const GAME_DURATION = 120; // 2분 (초)
const SIMULATION_SPEED = 10; // 10배 속도 (12초로 시뮬레이션)

// 게임 상수
const INITIAL_CAPITAL = 20000000;
const MIN_PRICE = 5000000;
const MAX_PRICE = 9000000;

interface GameState {
  cash: number;
  holdings: number;
  currentPrice: number;
  averageBuyPrice: number;
}

// 랜덤 가격 생성
function getRandomPrice(): number {
  return Math.floor(Math.random() * (MAX_PRICE - MIN_PRICE + 1)) + MIN_PRICE;
}

// 가격 변동 시뮬레이션 (뉴스 이벤트 영향)
function simulatePriceChange(currentPrice: number): number {
  // ±10~30% 변동성
  const volatility = 0.10 + Math.random() * 0.20;
  const direction = Math.random() > 0.5 ? 1 : -1;
  const change = 1 + (direction * volatility * Math.random());
  const newPrice = Math.floor(currentPrice * change);
  return Math.max(MIN_PRICE, Math.min(MAX_PRICE, newPrice));
}

// 봇 전략: 매수 결정
function shouldBuy(state: GameState, priceChange: number): boolean {
  // 가격이 10% 이상 하락하면 매수 (반등 기대)
  if (priceChange < -0.10) return true;
  
  // 현재 가격이 평균 매수가보다 5% 이상 낮으면 매수
  if (state.averageBuyPrice > 0 && priceChange < -0.05) return true;
  
  return false;
}

// 봇 전략: 매도 결정
function shouldSell(state: GameState, priceChange: number): boolean {
  if (state.holdings === 0) return false;
  
  // 수익률이 20% 이상이면 매도 (이익 실현)
  const profitRate = (state.currentPrice - state.averageBuyPrice) / state.averageBuyPrice;
  if (profitRate >= 0.20) return true;
  
  // 가격이 15% 이상 상승했으면 매도
  if (priceChange > 0.15) return true;
  
  return false;
}

// 단일 봇 게임 시뮬레이션
async function simulateBotGame(botId: number): Promise<{ name: string; returnRate: number; finalValue: number }> {
  const state: GameState = {
    cash: INITIAL_CAPITAL,
    holdings: 0,
    currentPrice: getRandomPrice(),
    averageBuyPrice: 0
  };

  const steps = Math.floor(GAME_DURATION / (SIMULATION_SPEED / 10)); // 시뮬레이션 스텝 수
  let previousPrice = state.currentPrice;

  for (let step = 0; step < steps; step++) {
    // 가격 변동
    const newPrice = simulatePriceChange(state.currentPrice);
    const priceChange = (newPrice - previousPrice) / previousPrice;
    state.currentPrice = newPrice;
    previousPrice = newPrice;

    // 매수/매도 결정
    if (shouldBuy(state, priceChange) && state.cash >= state.currentPrice) {
      const quantity = Math.floor(state.cash / state.currentPrice);
      if (quantity > 0) {
        const cost = quantity * state.currentPrice;
        state.cash -= cost;
        const totalHoldings = state.holdings + quantity;
        state.averageBuyPrice = state.averageBuyPrice === 0
          ? state.currentPrice
          : ((state.averageBuyPrice * state.holdings) + (state.currentPrice * quantity)) / totalHoldings;
        state.holdings = totalHoldings;
      }
    } else if (shouldSell(state, priceChange) && state.holdings > 0) {
      const revenue = state.holdings * state.currentPrice;
      state.cash += revenue;
      state.holdings = 0;
      state.averageBuyPrice = 0;
    }

    // 시뮬레이션 딜레이 (실제 시간 압축)
    await sleep(100); // 100ms = 실제 1초
  }

  // 최종 자산 계산
  const finalValue = state.cash + (state.holdings * state.currentPrice);
  const returnRate = ((finalValue - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100;

  // 랭킹 제출
  const botName = `봇${botId}`;
  try {
    const response = await fetch(`${RENDER_URL}/api/rankings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: botName,
        returnRate: returnRate,
        finalValue: Math.floor(finalValue)
      })
    });

    const result = await response.json();
    if (result.success) {
      return { name: botName, returnRate, finalValue: Math.floor(finalValue) };
    } else {
      console.error(`❌ 봇${botId} 랭킹 제출 실패:`, result.message);
      return { name: botName, returnRate, finalValue: Math.floor(finalValue) };
    }
  } catch (error) {
    console.error(`❌ 봇${botId} 랭킹 제출 중 오류:`, error);
    return { name: botName, returnRate, finalValue: Math.floor(finalValue) };
  }
}

// 배치 단위로 봇 실행
async function runBatch(batchNumber: number, batchSize: number): Promise<void> {
  const startId = batchNumber * batchSize + 1;
  const endId = Math.min(startId + batchSize - 1, TOTAL_BOTS);
  
  console.log(`\n📦 배치 ${batchNumber + 1} 시작: 봇 ${startId} ~ ${endId}`);
  
  const promises = [];
  for (let i = startId; i <= endId; i++) {
    promises.push(simulateBotGame(i));
  }
  
  const results = await Promise.all(promises);
  const successCount = results.filter(r => r !== null).length;
  
  console.log(`✅ 배치 ${batchNumber + 1} 완료: ${successCount}/${batchSize} 성공`);
}

// 메인 함수
async function main() {
  console.log("🚀 Render 배포 사이트 로드 테스트 시작...");
  console.log(`📊 총 ${TOTAL_BOTS}개 봇, 배치 크기: ${CONCURRENT_BATCH_SIZE}\n`);
  console.log("⚠️  주의: 이 스크립트는 한 번만 실행되고 종료됩니다.");
  console.log("   자동으로 반복 실행되지 않습니다.\n");
  
  const startTime = Date.now();
  const totalBatches = Math.ceil(TOTAL_BOTS / CONCURRENT_BATCH_SIZE);
  
  for (let i = 0; i < totalBatches; i++) {
    await runBatch(i, CONCURRENT_BATCH_SIZE);
    
    // 배치 간 대기 (서버 부하 방지)
    if (i < totalBatches - 1) {
      await sleep(2000); // 2초 대기
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✨ 로드 테스트 완료!`);
  console.log(`⏱️  소요 시간: ${duration}초`);
  console.log(`📊 확인: ${RENDER_URL}/api/rankings`);
  console.log(`\n✅ 스크립트가 종료되었습니다. 더 이상 봇이 생성되지 않습니다.`);
  process.exit(0); // 명시적으로 종료
}

main().catch((error) => {
  console.error("❌ 오류 발생:", error);
  process.exit(1);
});

