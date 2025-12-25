/**
 * 학교 축제 실제 상황 시뮬레이션 스크립트
 * 노트북 7대, 각 2분 게임을 실제 상황과 유사하게 시뮬레이션
 * Rate limiting을 고려하여 실제 운영 환경과 동일한 부하 테스트
 * 
 * 사용법: 
 *   로컬: npx tsx script/festival-simulation.ts
 *   Render: API_URL=https://tsts-pmof.onrender.com npx tsx script/festival-simulation.ts
 */

import { setTimeout as sleep } from "timers/promises";

const API_BASE_URL_DEFAULT = "http://localhost:5000";
const API_BASE_URL = process.env.API_URL || API_BASE_URL_DEFAULT;

// 실제 운영 환경 설정
const NUM_LAPTOPS = 7; // 노트북 7대
const GAME_DURATION = 120; // 게임 시간 2분 (초)
const FESTIVAL_DURATION = 4 * 60 * 60; // 축제 시간 4시간 (초)
const SIMULATION_SPEED = 60; // 시뮬레이션 속도 (60배 = 2분 게임을 2초로)

// 빠른 테스트를 위한 설정 (환경 변수로 제어)
const QUICK_TEST = process.env.QUICK_TEST === "true";
const QUICK_TEST_GAMES = 10; // 빠른 테스트: 노트북당 10게임만

// Rate limiting 고려
const POST_RATE_LIMIT = 30; // 분당 30회
const POST_INTERVAL_MS = (60 * 1000) / POST_RATE_LIMIT; // 요청 간 최소 간격 (2초)

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
  if (state.cash < state.currentPrice) return false;
  
  // 가격이 10% 이상 하락하면 매수 (반등 기대)
  if (priceChange < -0.10) return true;
  
  // 현재 가격이 평균 매수가보다 5% 이상 낮으면 매수
  if (state.averageBuyPrice > 0 && state.currentPrice < state.averageBuyPrice * 0.95) return true;
  
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

// 단일 게임 시뮬레이션 (2분 게임을 시뮬레이션)
async function simulateGame(gameId: number): Promise<{ name: string; returnRate: number; finalValue: number } | null> {
  const state: GameState = {
    cash: INITIAL_CAPITAL,
    holdings: 0,
    currentPrice: getRandomPrice(),
    averageBuyPrice: 0
  };

  // 게임 시뮬레이션 (2분 = 120초를 시뮬레이션 속도로 압축)
  // SIMULATION_SPEED = 60이면 120초를 2초로 압축 (60배)
  const simulationSteps = 12; // 12번의 가격 변동으로 게임 시뮬레이션
  let previousPrice = state.currentPrice;

  for (let step = 0; step < simulationSteps; step++) {
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

    // 빠른 테스트 모드에서는 딜레이 제거
    if (!QUICK_TEST) {
      await sleep(100); // 100ms = 실제 1초
    }
  }

  // 최종 자산 계산
  const finalValue = state.cash + (state.holdings * state.currentPrice);
  const returnRate = ((finalValue - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100;

  // 랭킹 제출 (Rate limiting 고려)
  const playerName = `플레이어${gameId}`;
  
  // Rate limiting을 고려한 재시도 로직
  const maxRetries = 5;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/rankings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: playerName,
          returnRate: returnRate,
          finalValue: Math.floor(finalValue)
        })
      });

      const result = await response.json();
      if (result.success) {
        return { name: playerName, returnRate, finalValue: Math.floor(finalValue) };
      } else {
        // Rate limit 등으로 실패한 경우 재시도
        if (retryCount < maxRetries - 1) {
          const waitTime = POST_INTERVAL_MS * (retryCount + 1); // 지수 백오프
          console.log(`  ⏳ Rate limit 대기: ${waitTime}ms`);
          await sleep(waitTime);
          retryCount++;
          continue;
        }
        console.error(`  ❌ 게임${gameId} 랭킹 제출 실패 (${retryCount + 1}회 시도):`, result.message);
        return null;
      }
    } catch (error) {
      if (retryCount < maxRetries - 1) {
        const waitTime = POST_INTERVAL_MS * (retryCount + 1);
        await sleep(waitTime);
        retryCount++;
        continue;
      }
      console.error(`  ❌ 게임${gameId} 랭킹 제출 중 오류 (${retryCount + 1}회 시도):`, error);
      return null;
    }
  }
  
  return null;
}

// 노트북별 게임 실행 (각 노트북은 2분마다 게임 실행)
async function runLaptop(laptopNumber: number): Promise<void> {
  console.log(`\n💻 노트북 ${laptopNumber} 시작`);
  
  // 실제로는 2분마다 게임이 실행되지만, 시뮬레이션에서는 더 빠르게
  // 빠른 테스트 모드: 노트북당 10게임만, 전체 테스트: 4시간 동안 120게임
  const totalGames = QUICK_TEST 
    ? QUICK_TEST_GAMES 
    : Math.floor(FESTIVAL_DURATION / GAME_DURATION); // 4시간 동안 총 게임 수 (120게임)
  
  let gameId = (laptopNumber - 1) * 1000 + 1; // 노트북별 고유 게임 ID
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < totalGames; i++) {
    // 게임 시뮬레이션 (2분 게임을 시뮬레이션 속도로)
    const result = await simulateGame(gameId);
    
    if (result) {
      successCount++;
      console.log(`  ✅ 게임${gameId} 완료: ${result.name} (${result.returnRate.toFixed(2)}%)`);
    } else {
      failCount++;
    }
    
    gameId++;
    
    // 다음 게임까지 대기 (Rate limiting 고려)
    // 빠른 테스트 모드: 최소 간격만, 전체 테스트: 시뮬레이션 속도 고려
    if (QUICK_TEST) {
      // 빠른 테스트: Rate limit만 고려 (2초)
      await sleep(POST_INTERVAL_MS);
    } else {
      // 전체 테스트: 실제 시간 압축
      const nextGameDelay = (GAME_DURATION * 1000) / SIMULATION_SPEED;
      await sleep(nextGameDelay);
    }
  }
  
  console.log(`✅ 노트북 ${laptopNumber} 완료: 성공 ${successCount}/${totalGames}, 실패 ${failCount}`);
}

// 메인 함수
async function main() {
  console.log("🎮 학교 축제 실제 상황 시뮬레이션 시작...");
  if (QUICK_TEST) {
    console.log(`⚡ 빠른 테스트 모드: 노트북당 ${QUICK_TEST_GAMES}게임만 실행`);
  } else {
    console.log(`📊 전체 시뮬레이션: 노트북 ${NUM_LAPTOPS}대, 게임 시간 ${GAME_DURATION}초, 축제 시간 ${FESTIVAL_DURATION / 60}분`);
  }
  console.log(`🌐 API URL: ${API_BASE_URL}`);
  console.log(`⚡ 시뮬레이션 속도: ${SIMULATION_SPEED}배 (2분 게임을 ${(GAME_DURATION / SIMULATION_SPEED).toFixed(1)}초로)`);
  console.log(`🚦 Rate Limit: ${POST_RATE_LIMIT}회/분 (요청 간 최소 간격: ${POST_INTERVAL_MS}ms)\n`);
  
  const startTime = Date.now();
  
  // 노트북별로 병렬 실행 (실제로는 각 노트북이 독립적으로 게임 실행)
  const laptopPromises = [];
  for (let i = 1; i <= NUM_LAPTOPS; i++) {
    laptopPromises.push(runLaptop(i));
  }
  
  await Promise.all(laptopPromises);
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✨ 시뮬레이션 완료!`);
  console.log(`⏱️  소요 시간: ${duration}초`);
  console.log(`📊 확인: ${API_BASE_URL}/api/rankings`);
  process.exit(0);
}

main().catch((error) => {
  console.error("❌ 오류 발생:", error);
  process.exit(1);
});

