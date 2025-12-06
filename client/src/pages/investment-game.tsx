import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Briefcase, 
  Building2, 
  Bitcoin, 
  Play, 
  RotateCcw,
  AlertCircle,
  Wallet,
  Newspaper,
  ArrowUpRight,
  ArrowDownRight,
  LineChart
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, YAxis, XAxis, Tooltip as RechartsTooltip, CartesianGrid } from "recharts";

// --- Game Constants & Types ---

type AssetType = "coin" | "stock" | "real_estate";

interface AssetConfig {
  id: AssetType;
  name: string;
  icon: React.ElementType;
  volatility: [number, number]; // min %, max %
  color: string;
  description: string;
}

const ASSETS: AssetConfig[] = [
  { 
    id: "coin", 
    name: "암호화폐 (Coin)", 
    icon: Bitcoin, 
    volatility: [0.10, 0.30], 
    color: "text-yellow-500",
    description: "하이 리스크, 하이 리턴. ±10~30% 변동성."
  },
  { 
    id: "stock", 
    name: "주식 (Stock)", 
    icon: TrendingUp, 
    volatility: [0.05, 0.15], 
    color: "text-blue-500",
    description: "균형 잡힌 투자. ±5~15% 변동성."
  },
  { 
    id: "real_estate", 
    name: "부동산 (Real Estate)", 
    icon: Building2, 
    volatility: [0.02, 0.06], 
    color: "text-green-500",
    description: "안정적인 자산. ±2~6% 변동성."
  },
];

const GAME_DURATION = 120; // seconds
const INITIAL_CAPITAL = 10000000; // 10 million KRW
const TRADE_COOLDOWN = 3000; // 3 seconds

// News Events
const NEWS_EVENTS = [
  { text: "정부, 해당 자산 규제 완화 발표!", impact: 1.15, type: "good" },
  { text: "글로벌 경제 위기 우려 확산", impact: 0.85, type: "bad" },
  { text: "대형 기관 투자자 매수세 유입", impact: 1.10, type: "good" },
  { text: "차익 실현 매물 쏟아짐", impact: 0.90, type: "bad" },
  { text: "기술적 반등 구간 진입", impact: 1.08, type: "good" },
  { text: "해킹/보안 이슈 발생!", impact: 0.75, type: "bad" },
  { text: "깜짝 실적/업데이트 발표", impact: 1.25, type: "good" },
];

interface NewsItem {
  id: number;
  time: number;
  text: string;
  type: string;
  impact: number;
}

// --- Helper Functions ---

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(amount);
};

const getRandomPrice = () => Math.floor(Math.random() * (9000000 - 5000000 + 1)) + 5000000;

// --- Components ---

const GameHome = ({ onStart }: { onStart: (asset: AssetType) => void }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="text-center space-y-2">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
          2분 투자 챌린지
        </h1>
        <p className="text-slate-400 text-lg max-w-md mx-auto">
          2분 동안 최고의 수익률을 올려보세요.<br/>
          뉴스를 읽고, 타이밍을 잡아 대박을 노리세요!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        {ASSETS.map((asset) => (
          <Card 
            key={asset.id} 
            className="group hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-slate-900/50 backdrop-blur border-slate-800"
            onClick={() => onStart(asset.id)}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-slate-800 p-4 rounded-full mb-4 group-hover:bg-slate-700 transition-colors">
                <asset.icon className={`w-10 h-10 ${asset.color}`} />
              </div>
              <CardTitle className="text-xl">{asset.name}</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-slate-400">{asset.description}</p>
              <Button className="mt-6 w-full bg-slate-800 hover:bg-blue-600" variant="outline">
                선택하기
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

const GamePlay = ({ assetType, onEnd }: { assetType: AssetType, onEnd: (finalCapital: number) => void }) => {
  const assetConfig = ASSETS.find(a => a.id === assetType)!;
  
  // Game State
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [cash, setCash] = useState(INITIAL_CAPITAL);
  const [holdings, setHoldings] = useState(0); // Quantity of asset
  const [currentPrice, setCurrentPrice] = useState(getRandomPrice());
  const [priceHistory, setPriceHistory] = useState<{time: number, price: number}[]>([]);
  const [cooldown, setCooldown] = useState(0);
  const [newsHistory, setNewsHistory] = useState<NewsItem[]>([]);
  
  // Refs for intervals and game loop
  const newsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const historyIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Game
  useEffect(() => {
    // Initial history point
    setPriceHistory([{ time: 0, price: currentPrice }]);

    // Start Timer
    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // History Recording (for Chart) - Record every second
    historyIntervalRef.current = setInterval(() => {
      setPriceHistory(prev => {
        // Keep updating chart so it scrolls even if price is flat
        const newTime = prev.length;
        // Only keep last 60 points to keep chart readable
        const newHistory = [...prev, { time: newTime, price: currentPrice }];
        return newHistory.slice(-60); 
      });
    }, 1000);

    // News Event Generator
    const scheduleNextNews = () => {
      // Random time between 15s and 25s for next news
      const nextNewsTime = Math.random() * (25000 - 15000) + 15000;
      newsIntervalRef.current = setTimeout(() => {
        triggerNews();
        if (timeLeft > 20) scheduleNextNews(); // Only schedule if time remains
      }, nextNewsTime);
    };
    scheduleNextNews();

    return () => {
      clearInterval(timerInterval);
      if (newsIntervalRef.current) clearTimeout(newsIntervalRef.current);
      if (historyIntervalRef.current) clearInterval(historyIntervalRef.current);
    };
  }, []);

  // End Game Effect
  useEffect(() => {
    if (timeLeft === 0) {
      const finalValue = cash + (holdings * currentPrice);
      onEnd(finalValue);
    }
  }, [timeLeft]);

  // Cooldown Timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);


  const triggerNews = () => {
    const news = NEWS_EVENTS[Math.floor(Math.random() * NEWS_EVENTS.length)];
    const newItem: NewsItem = {
      id: Date.now(),
      time: GAME_DURATION - timeLeft,
      text: news.text,
      type: news.type,
      impact: news.impact
    };

    setNewsHistory(prev => [newItem, ...prev]); // Add to top
    
    // Apply immediate price impact
    setCurrentPrice(prev => {
      const newPrice = Math.floor(prev * news.impact);
      // Force update history immediately so the jump is captured instantly in chart
      setPriceHistory(h => [...h, { time: h.length, price: newPrice }].slice(-60));
      return newPrice;
    });
  };

  const handleBuy = () => {
    if (cooldown > 0) return;
    if (cash < currentPrice) return; 
    
    // Buy Max
    const quantity = Math.floor(cash / currentPrice);
    if (quantity === 0) return;

    setHoldings(prev => prev + quantity);
    setCash(prev => prev - (quantity * currentPrice));
    setCooldown(3); // 3 seconds cooldown
  };

  const handleSell = () => {
    if (cooldown > 0) return;
    if (holdings === 0) return;

    // Sell All
    const revenue = holdings * currentPrice;
    setCash(prev => prev + revenue);
    setHoldings(0);
    setCooldown(3);
  };

  const totalValue = cash + (holdings * currentPrice);
  const returnRate = ((totalValue - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100;

  return (
    <div className="max-w-6xl mx-auto p-4 h-screen flex flex-col gap-4">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs uppercase font-bold">남은 시간</p>
              <p className={`text-2xl font-mono font-bold ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </p>
            </div>
            <Clock className="w-8 h-8 text-slate-700" />
          </CardContent>
        </Card>
        
        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs uppercase font-bold">현재 가격</p>
              <p className="text-2xl font-mono font-bold text-blue-400">{formatMoney(currentPrice)}</p>
            </div>
            <assetConfig.icon className={`w-8 h-8 ${assetConfig.color}`} />
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800 md:col-span-2">
          <CardContent className="p-4 flex items-center justify-between">
             <div className="space-y-1">
              <p className="text-slate-400 text-xs uppercase font-bold">총 자산 가치</p>
              <div className="flex items-end gap-3">
                <p className="text-3xl font-mono font-bold text-white">{formatMoney(totalValue)}</p>
                <span className={`text-sm font-bold mb-1 ${returnRate >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {returnRate > 0 ? '+' : ''}{returnRate.toFixed(2)}%
                </span>
              </div>
            </div>
            <Wallet className="w-8 h-8 text-slate-700" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Left Column: News Ticker + Chart */}
        <div className="md:col-span-2 flex flex-col gap-4 min-h-0">
          
          {/* News Ticker (Small) */}
          <Card className="bg-slate-900/80 border-slate-800 shrink-0 h-[80px] overflow-hidden relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
            <CardContent className="p-0 h-full flex items-center">
               {newsHistory.length === 0 ? (
                  <div className="w-full flex items-center justify-center text-slate-500 gap-2 animate-pulse">
                    <AlertCircle className="w-5 h-5" />
                    <span>시장 뉴스를 기다리는 중...</span>
                  </div>
               ) : (
                  <motion.div 
                    key={newsHistory[0].id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full px-6 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      <span className={`
                        shrink-0 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider
                        ${newsHistory[0].type === 'good' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
                      `}>
                        {newsHistory[0].type === 'good' ? '호재' : '악재'}
                      </span>
                      <span className="text-lg md:text-xl font-bold text-white truncate">
                        {newsHistory[0].text}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-slate-500 shrink-0 whitespace-nowrap">
                       방금 전
                    </span>
                  </motion.div>
               )}
            </CardContent>
          </Card>

          {/* Chart Area (Fills remaining space) */}
          <Card className="bg-slate-900/80 border-slate-800 flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-2 border-b border-slate-800">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <LineChart className="w-4 h-4" /> 실시간 시세 차트
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-4 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={priceHistory}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={assetConfig.id === 'coin' ? '#eab308' : assetConfig.id === 'real_estate' ? '#22c55e' : '#3b82f6'} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={assetConfig.id === 'coin' ? '#eab308' : assetConfig.id === 'real_estate' ? '#22c55e' : '#3b82f6'} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    hide={false} 
                    tick={{fill: '#64748b', fontSize: 12}} 
                    tickFormatter={(value) => `${(value/10000).toFixed(0)}만`}
                    width={40}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                    itemStyle={{ color: '#f8fafc' }}
                    formatter={(value: number) => [formatMoney(value), "Price"]}
                    labelFormatter={() => ''}
                  />
                  <Area 
                    type="stepAfter" 
                    dataKey="price" 
                    stroke={assetConfig.id === 'coin' ? '#eab308' : assetConfig.id === 'real_estate' ? '#22c55e' : '#3b82f6'} 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorPrice)" 
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Controls & Portfolio */}
        <div className="flex flex-col gap-4">
          <Card className="bg-slate-900/80 border-slate-800 flex-1">
             <CardHeader className="pb-2 border-b border-slate-800">
              <CardTitle className="text-sm font-medium text-slate-400">포트폴리오</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">보유 현금</span>
                <span className="font-mono font-bold">{formatMoney(cash)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">보유 수량</span>
                <span className="font-mono font-bold">{holdings} 주</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">평가 금액</span>
                <span className="font-mono font-bold">{formatMoney(holdings * currentPrice)}</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-3">
            <Button 
              size="lg" 
              onClick={handleBuy} 
              disabled={cooldown > 0 || cash < currentPrice}
              className="h-16 text-lg font-bold bg-red-600 hover:bg-red-700 text-white transition-all active:scale-95 shadow-lg shadow-red-900/20"
            >
              {cooldown > 0 ? `대기 ${cooldown}s` : "전액 매수 (BUY)"}
            </Button>
            <Button 
              size="lg" 
              onClick={handleSell} 
              disabled={cooldown > 0 || holdings === 0}
              className="h-16 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-95 shadow-lg shadow-blue-900/20"
            >
              {cooldown > 0 ? `대기 ${cooldown}s` : "전액 매도 (SELL)"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const GameResult = ({ finalValue, onRestart }: { finalValue: number, onRestart: () => void }) => {
  const profit = finalValue - INITIAL_CAPITAL;
  const returnRate = (profit / INITIAL_CAPITAL) * 100;
  const isProfit = profit >= 0;

  let message = "";
  if (returnRate > 50) message = "투자천재의 탄생! 워렌 버핏이 형님이라 부르겠네요.";
  else if (returnRate > 20) message = "훌륭한 감각입니다! 야수의 심장을 가지셨군요.";
  else if (returnRate > 0) message = "은행 이자보다는 낫네요! 소소한 수익 축하합니다.";
  else if (returnRate > -20) message = "수업료 냈다고 생각하세요... 다음엔 더 잘할 수 있습니다.";
  else message = "한강 물 온도 체크하러 가야할지도...? 😭";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 animate-in zoom-in duration-500">
      <Card className="w-full max-w-lg bg-slate-900 border-slate-800 shadow-2xl">
        <CardHeader className="text-center space-y-4 pt-10">
          <div className={`mx-auto p-6 rounded-full ${isProfit ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
            {isProfit ? <TrendingUp className="w-16 h-16" /> : <TrendingDown className="w-16 h-16" />}
          </div>
          <CardTitle className="text-3xl font-bold">투자 종료!</CardTitle>
          <CardDescription className="text-lg">{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pb-10">
          <div className="space-y-2 bg-slate-800/50 p-6 rounded-xl border border-slate-800">
            <div className="flex justify-between text-slate-400">
              <span>초기 자본</span>
              <span>{formatMoney(INITIAL_CAPITAL)}</span>
            </div>
            <div className="flex justify-between font-bold text-xl">
              <span>최종 자산</span>
              <span className={isProfit ? 'text-green-400' : 'text-red-400'}>{formatMoney(finalValue)}</span>
            </div>
            <div className="border-t border-slate-700 my-2 pt-2 flex justify-between items-center">
              <span className="text-slate-400">수익률</span>
              <span className={`text-2xl font-mono font-bold ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
                {returnRate > 0 ? '+' : ''}{returnRate.toFixed(2)}%
              </span>
            </div>
          </div>
          
          <Button onClick={onRestart} className="w-full h-12 text-lg font-bold" variant="default">
            <RotateCcw className="mr-2 w-5 h-5" /> 다시 도전하기
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default function InvestmentGame() {
  const [status, setStatus] = useState<"idle" | "playing" | "ended">("idle");
  const [selectedAsset, setSelectedAsset] = useState<AssetType | null>(null);
  const [finalResult, setFinalResult] = useState(0);

  const startGame = (asset: AssetType) => {
    setSelectedAsset(asset);
    setStatus("playing");
  };

  const endGame = (finalVal: number) => {
    setFinalResult(finalVal);
    setStatus("ended");
  };

  const restartGame = () => {
    setStatus("idle");
    setSelectedAsset(null);
    setFinalResult(0);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-blue-500/30 selection:text-blue-200">
      <AnimatePresence mode="wait">
        {status === "idle" && (
          <motion.div 
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <GameHome onStart={startGame} />
          </motion.div>
        )}
        {status === "playing" && selectedAsset && (
           <motion.div 
            key="game"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="h-full"
          >
            <GamePlay assetType={selectedAsset} onEnd={endGame} />
           </motion.div>
        )}
        {status === "ended" && (
          <motion.div 
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <GameResult finalValue={finalResult} onRestart={restartGame} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}