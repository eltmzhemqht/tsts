/**
 * 자동 부하 테스트 스크립트
 * 서버를 시작하고 200개 봇으로 테스트를 실행합니다.
 */

import { spawn } from "child_process";
import { setTimeout as sleep } from "timers/promises";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// 일반 setTimeout을 위한 헬퍼 함수
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const API_BASE_URL = "http://localhost:5000";
const TOTAL_BOTS = 200;
const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES = 100;

interface RankingData {
  name: string;
  returnRate: number;
  finalValue: number;
}

// 랜덤 수익률 생성
function generateRandomReturnRate(): number {
  const rand = Math.random();
  if (rand < 0.7) {
    return Math.random() * 50;
  } else if (rand < 0.9) {
    return 50 + Math.random() * 50;
  } else if (rand < 0.98) {
    return 100 + Math.random() * 50;
  } else {
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

// 단일 봇 시뮬레이션
async function simulateBot(botNumber: number): Promise<boolean> {
  const returnRate = generateRandomReturnRate();
  const initialCapital = 20000000;
  const finalValue = initialCapital * (1 + returnRate / 100);
  const name = generateRandomName(botNumber);

  const rankingData: RankingData = {
    name: name,
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
  return results.filter((r) => r).length;
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

// 브라우저 열기
async function openBrowser(url: string) {
  const platform = process.platform;
  let command: string;

  if (platform === "win32") {
    command = `start "" "${url}"`;
  } else if (platform === "darwin") {
    command = `open "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }

  try {
    await execAsync(command);
    console.log(`\n🌐 브라우저에서 랭킹 페이지를 엽니다: ${url}\n`);
  } catch (error) {
    console.log(`\n⚠️  브라우저를 자동으로 열 수 없습니다. 수동으로 열어주세요: ${url}\n`);
  }
}

// 메인 실행 함수
async function runLoadTest(showInBrowser: boolean = true) {
  console.log("🚀 부하 테스트 시작!");
  console.log(`📊 총 봇 수: ${TOTAL_BOTS}개\n`);

  // 브라우저 열기 (자동 새로고침 모드)
  if (showInBrowser) {
    await openBrowser(`${API_BASE_URL}?auto=true`);
    await sleep(2000); // 브라우저가 열릴 시간
    console.log("💡 팁: 브라우저에서 랭킹이 실시간으로 업데이트됩니다!\n");
  }

  const startTime = Date.now();
  let totalSuccess = 0;
  const totalBatches = Math.ceil(TOTAL_BOTS / BATCH_SIZE);

  for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
    const successCount = await runBatch(batchNum, BATCH_SIZE);
    totalSuccess += successCount;

    const progress = ((batchNum + 1) / totalBatches) * 100;
    process.stdout.write(
      `\r📦 진행률: ${progress.toFixed(0)}% (${totalSuccess}/${TOTAL_BOTS} 성공)`
    );

    if (batchNum < totalBatches - 1) {
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  const totalDuration = Date.now() - startTime;
  console.log("\n\n" + "=".repeat(50));
  console.log("📊 테스트 결과");
  console.log("=".repeat(50));
  console.log(`✅ 성공: ${totalSuccess}개`);
  console.log(`❌ 실패: ${TOTAL_BOTS - totalSuccess}개`);
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

// 서버 시작
function startServer(): Promise<{ process: any; port: number }> {
  return new Promise((resolve, reject) => {
    console.log("🔧 서버 시작 중...\n");

    const serverProcess = spawn("npm", ["run", "dev"], {
      shell: true,
      stdio: "pipe",
    });

    let serverReady = false;

    serverProcess.stdout?.on("data", (data: Buffer) => {
      const output = data.toString();
      if (output.includes("serving on port") || output.includes("port 5000")) {
        if (!serverReady) {
          serverReady = true;
          resolve({ process: serverProcess, port: 5000 });
        }
      }
    });

    serverProcess.stderr?.on("data", (data: Buffer) => {
      const output = data.toString();
      if (output.includes("serving on port") || output.includes("port 5000")) {
        if (!serverReady) {
          serverReady = true;
          resolve({ process: serverProcess, port: 5000 });
        }
      }
    });

    serverProcess.on("error", (error) => {
      reject(error);
    });

    // 30초 후에도 서버가 시작되지 않으면 타임아웃
    const timeoutId = setTimeout(() => {
      if (!serverReady) {
        reject(new Error("서버 시작 타임아웃"));
      }
    }, 30000);
    
    // 서버가 시작되면 타임아웃 취소
    serverProcess.stdout?.on("data", () => {
      if (serverReady) {
        clearTimeout(timeoutId);
      }
    });
  });
}

// 메인 실행
(async () => {
  let serverProcess: any = null;

  try {
    // 서버가 이미 실행 중인지 확인
    console.log("🔍 서버 연결 확인 중...");
    const serverAlreadyRunning = await checkServer(3, 500);

    if (!serverAlreadyRunning) {
      // 서버 시작
      const { process } = await startServer();
      serverProcess = process;

      // 서버가 완전히 시작될 때까지 대기
      console.log("\n⏳ 서버 시작 대기 중...");
      const serverReady = await checkServer(30, 1000);

      if (!serverReady) {
        console.error("\n❌ 서버를 시작할 수 없습니다!");
        process.exit(1);
      }

      console.log("\n✅ 서버 시작 완료!\n");
      await sleep(2000); // 추가 안정화 시간
    } else {
      console.log("✅ 서버가 이미 실행 중입니다!\n");
      console.log("⚠️  주의: 이 스크립트는 서버가 이미 실행 중일 때는 테스트를 실행하지 않습니다.");
      console.log("   서버를 종료하고 다시 실행하거나, 별도 터미널에서 실행하세요.\n");
      process.exit(0);
    }

    // 부하 테스트 실행
    await runLoadTest(true); // 브라우저에서 보기

    // 서버 종료 (우리가 시작한 경우에만)
    if (serverProcess) {
      console.log("\n🛑 서버 종료 중...");
      serverProcess.kill();
      await sleep(1000);
    }
  } catch (error: any) {
    console.error("\n❌ 오류 발생:", error.message);
    if (serverProcess) {
      serverProcess.kill();
    }
    process.exit(1);
  }
})();

