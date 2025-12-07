import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  LineChart,
  HelpCircle,
  X,
  ChevronRight,
  ChevronLeft,
  Trophy,
  Medal
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, YAxis, XAxis, CartesianGrid } from "recharts";

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
    description: "고위험, 고수익.\n±10~30% 변동성."
  },
  { 
    id: "stock", 
    name: "주식 (Stock)", 
    icon: TrendingUp, 
    volatility: [0.05, 0.15], 
    color: "text-blue-500",
    description: "균형 잡힌 투자.\n±5~15% 변동성."
  },
  { 
    id: "real_estate", 
    name: "부동산 (Real Estate)", 
    icon: Building2, 
    volatility: [0.02, 0.06], 
    color: "text-green-500",
    description: "안정적인 자산.\n±2~6% 변동성."
  },
];

const GAME_DURATION = 120; // seconds
const INITIAL_CAPITAL = 20000000; // 20 million KRW

// News Events
const NEWS_EVENTS = [
  // 호재 (Good News)
  { text: "정부, 해당 자산 규제 완화 발표!", impact: 1.15, type: "good" },
  { text: "대형 기관 투자자 매수세 유입", impact: 1.10, type: "good" },
  { text: "기술적 반등 구간 진입", impact: 1.08, type: "good" },
  { text: "깜짝 실적/업데이트 발표", impact: 1.25, type: "good" },
  { text: "유명 인플루언서의 긍정적 언급", impact: 1.12, type: "good" },
  { text: "신규 기술 개발 성공 소식", impact: 1.20, type: "good" },
  { text: "글로벌 투자은행 매수 추천", impact: 1.18, type: "good" },
  { text: "대형 M&A 소식, 시장 기대감 상승", impact: 1.22, type: "good" },
  { text: "주요 국가 승인 및 라이선스 획득", impact: 1.16, type: "good" },
  { text: "파트너십 체결, 협력 확대 발표", impact: 1.13, type: "good" },
  { text: "분기 실적 시장 기대치 초과 달성", impact: 1.19, type: "good" },
  { text: "신제품 출시, 시장 반응 긍정적", impact: 1.14, type: "good" },
  { text: "대형 펀드의 대규모 투자 유입", impact: 1.21, type: "good" },
  { text: "정부 지원 정책 발표", impact: 1.17, type: "good" },
  { text: "전문가들, 상승 전망 제시", impact: 1.11, type: "good" },
  { text: "유동성 공급 확대 소식", impact: 1.09, type: "good" },
  { text: "주요 거래소 상장 확정", impact: 1.24, type: "good" },
  { text: "기관 투자자들의 적극적 매수", impact: 1.15, type: "good" },
  { text: "글로벌 기업과의 전략적 제휴", impact: 1.20, type: "good" },
  { text: "시장 리더십 강화 발표", impact: 1.18, type: "good" },
  
  // 악재 (Bad News)
  { text: "글로벌 경제 위기 우려 확산", impact: 0.85, type: "bad" },
  { text: "차익 실현 매물 쏟아짐", impact: 0.90, type: "bad" },
  { text: "해킹/보안 이슈 발생!", impact: 0.75, type: "bad" },
  { text: "주요국 금리 인상 발표", impact: 0.88, type: "bad" },
  { text: "경영진 비리 의혹 제기", impact: 0.80, type: "bad" },
  { text: "규제 강화 우려 확산", impact: 0.82, type: "bad" },
  { text: "대형 투자자들의 대량 매도", impact: 0.78, type: "bad" },
  { text: "경쟁사 신제품 출시, 시장 점유율 위협", impact: 0.86, type: "bad" },
  { text: "주요 고객사와의 계약 해지 소식", impact: 0.83, type: "bad" },
  { text: "분기 실적 시장 기대치 하회", impact: 0.79, type: "bad" },
  { text: "기술적 하락 추세 전환", impact: 0.87, type: "bad" },
  { text: "전문가들, 하락 전망 제시", impact: 0.84, type: "bad" },
  { text: "유동성 부족 우려 확산", impact: 0.81, type: "bad" },
  { text: "주요 거래소 상장 철회 소식", impact: 0.72, type: "bad" },
  { text: "대규모 손실 발생 보고", impact: 0.76, type: "bad" },
  { text: "정부 규제 강화 법안 통과", impact: 0.83, type: "bad" },
  { text: "경쟁사가 더 나은 기술 공개", impact: 0.88, type: "bad" },
  { text: "주요 파트너와의 관계 악화", impact: 0.85, type: "bad" },
  { text: "시장 과열 우려, 조정 필요성 제기", impact: 0.89, type: "bad" },
  { text: "글로벌 경제 침체 우려 확산", impact: 0.77, type: "bad" },
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

// --- Sound Effects (Web Audio API) ---
const playSound = (type: 'buy' | 'sell') => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  if (type === 'buy') {
    // "Cha-ching" like ascending major third
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.1); // E5
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } else {
    // "Sell" mechanical/descending sound
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }
};


// --- Tutorial Types & Data ---

type TutorialStep = {
  id: number;
  title: string;
  description: string;
  target?: string; // CSS selector for highlighting
  position?: "top" | "bottom" | "left" | "right" | "center";
};

// Asset Selection Tutorial Steps
const ASSET_SELECTION_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    title: "자산 선택",
    description: "게임을 시작하기 전에 투자할 자산을 선택하세요. 각 자산은 다른 위험도와 수익률을 가지고 있습니다.",
    position: "center"
  },
  {
    id: 2,
    title: "암호화폐",
    description: "암호화폐는 고위험 고수익 자산입니다. ±10~30% 변동성으로 큰 수익을 올릴 수 있지만 손실 위험도 높습니다.",
    target: "[data-tutorial='asset-coin']",
    position: "bottom"
  },
  {
    id: 3,
    title: "주식",
    description: "주식은 균형 잡힌 투자입니다. ±5~15% 변동성으로 안정적이면서도 수익을 기대할 수 있습니다.",
    target: "[data-tutorial='asset-stock']",
    position: "bottom"
  },
  {
    id: 4,
    title: "부동산",
    description: "부동산은 안정적인 자산입니다. ±2~6% 변동성으로 가장 안전하지만 수익률은 낮을 수 있습니다.",
    target: "[data-tutorial='asset-real_estate']",
    position: "bottom"
  }
];

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    title: "게임 목표",
    description: "2분 동안 초기 자본 2000만원으로 최대한 많은 수익을 올리는 것이 목표입니다!",
    position: "center"
  },
  {
    id: 2,
    title: "뉴스 확인",
    description: "뉴스가 나타나면 호재(초록색)인지 악재(빨간색)인지 확인하세요. 뉴스가 나온 후 1.5초 후에 가격이 변동됩니다.",
    target: "[data-tutorial='news']",
    position: "bottom"
  },
  {
    id: 3,
    title: "가격 차트",
    description: "실시간 가격 차트를 통해 가격 변동 추이를 확인할 수 있습니다.",
    target: "[data-tutorial='chart']",
    position: "left"
  },
  {
    id: 4,
    title: "매수 버튼",
    description: "호재 뉴스가 나오면 매수 버튼을 눌러 자산을 구매하세요. 전액 매수로 모든 현금을 사용합니다.",
    target: "[data-tutorial='buy']",
    position: "left"
  },
  {
    id: 5,
    title: "매도 버튼",
    description: "악재 뉴스가 나오거나 수익을 실현하고 싶을 때 매도 버튼을 눌러 모든 자산을 판매하세요.",
    target: "[data-tutorial='sell']",
    position: "left"
  },
  {
    id: 6,
    title: "포트폴리오",
    description: "보유 현금, 보유 수량, 평가 금액을 확인하세요. 총 자산 가치는 현금 + 평가 금액입니다.",
    target: "[data-tutorial='portfolio']",
    position: "right"
  },
  {
    id: 7,
    title: "시작하기",
    description: "이제 게임을 시작하세요! 뉴스를 빠르게 읽고 타이밍을 잡아 최고의 수익률을 달성하세요!",
    position: "center"
  }
];

// --- Tutorial Component ---

const TutorialOverlay = ({ 
  currentStep, 
  tutorialSteps,
  onNext, 
  onPrev, 
  onSkip, 
  onComplete,
  hideLastButton = false,
  isAssetSelectionTutorial = false
}: { 
  currentStep: number;
  tutorialSteps: TutorialStep[];
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onComplete: () => void;
  hideLastButton?: boolean;
  isAssetSelectionTutorial?: boolean;
}) => {
  const step = tutorialSteps[currentStep - 1];
  const isFirst = currentStep === 1;
  const isLast = currentStep === tutorialSteps.length;
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  
  // Calculate card position to avoid highlighted element
  const getCardPosition = () => {
    if (!highlightRect) {
      // No highlight, use default position
      return {
        top: 'auto',
        bottom: 'auto',
        left: 'auto',
        right: 'auto',
        transform: 'none',
      };
    }
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const cardWidth = 448; // max-w-md ≈ 448px
    const cardHeight = 300; // approximate card height
    const padding = 20;
    
    const highlightCenterX = highlightRect.left + highlightRect.width / 2;
    const highlightCenterY = highlightRect.top + highlightRect.height / 2;
    
    // Check available space in each direction
    const spaceTop = highlightRect.top;
    const spaceBottom = viewportHeight - (highlightRect.top + highlightRect.height);
    const spaceLeft = highlightRect.left;
    const spaceRight = viewportWidth - (highlightRect.left + highlightRect.width);
    
    // Find the best position (most space available)
    const positions = [
      { dir: 'top', space: spaceTop },
      { dir: 'bottom', space: spaceBottom },
      { dir: 'left', space: spaceLeft },
      { dir: 'right', space: spaceRight },
    ];
    
    positions.sort((a, b) => b.space - a.space);
    const bestPosition = positions[0];
    
    let style: React.CSSProperties = {};
    
    if (bestPosition.dir === 'top' && spaceTop >= cardHeight + padding) {
      // Position above highlight
      style = {
        bottom: `${viewportHeight - highlightRect.top + padding}px`,
        left: '50%',
        transform: 'translateX(-50%)',
      };
    } else if (bestPosition.dir === 'bottom' && spaceBottom >= cardHeight + padding) {
      // Position below highlight
      style = {
        top: `${highlightRect.top + highlightRect.height + padding}px`,
        left: '50%',
        transform: 'translateX(-50%)',
      };
    } else if (bestPosition.dir === 'left' && spaceLeft >= cardWidth + padding) {
      // Position to the left
      style = {
        top: '50%',
        right: `${viewportWidth - highlightRect.left + padding}px`,
        transform: 'translateY(-50%)',
      };
    } else if (bestPosition.dir === 'right' && spaceRight >= cardWidth + padding) {
      // Position to the right
      style = {
        top: '50%',
        left: `${highlightRect.left + highlightRect.width + padding}px`,
        transform: 'translateY(-50%)',
      };
    } else {
      // Not enough space, position at corner
      if (highlightCenterX < viewportWidth / 2) {
        // Highlight is on left, put card on right
        style = {
          top: '50%',
          right: padding,
          transform: 'translateY(-50%)',
        };
      } else {
        // Highlight is on right, put card on left
        style = {
          top: '50%',
          left: padding,
          transform: 'translateY(-50%)',
        };
      }
    }
    
    return style;
  };

  useEffect(() => {
    // Highlight target element
    if (step.target) {
      const element = document.querySelector(step.target) as HTMLElement;
      if (element) {
        // Get initial rect immediately to avoid jumping
        const initialRect = element.getBoundingClientRect();
        setHighlightRect(initialRect);
        
        // Increase brightness of the element itself
        const originalStyle = element.style.cssText;
        element.style.cssText += `
          filter: brightness(1.5) contrast(1.1);
          transition: filter 0.3s ease;
        `;
        
        // Scroll into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Update rect after scroll completes
        const scrollTimeout = setTimeout(() => {
          const rect = element.getBoundingClientRect();
          setHighlightRect(rect);
        }, 400);
        
        // Cleanup function
        return () => {
          clearTimeout(scrollTimeout);
          element.style.cssText = originalStyle;
        };
      } else {
        setHighlightRect(null);
      }
    } else {
      setHighlightRect(null);
    }
  }, [currentStep, step.target]);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* 화면 어둡게 하는 오버레이 */}
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          pointerEvents: 'none',
        }}
      />
      
      {/* 밝게 강조되는 하이라이트 */}
      {step.target && highlightRect && (
        <div 
          style={{
            position: 'fixed',
            left: `${highlightRect.left - 8}px`,
            top: `${highlightRect.top - 8}px`,
            width: `${highlightRect.width + 16}px`,
            height: `${highlightRect.height + 16}px`,
            background: 'transparent',
            border: '2px solid #4AB3FF',
            borderRadius: '12px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65), 0 0 15px rgba(74, 179, 255, 0.9)',
            backdropFilter: 'brightness(2.2)',
            WebkitBackdropFilter: 'brightness(2.2)',
            pointerEvents: 'none',
            transition: 'all 0.3s ease',
          }}
        />
      )}

      {/* Tutorial Card */}
      <div className={`absolute inset-0 pointer-events-none ${currentStep === 1 || step.position === "center" ? 'flex items-center justify-center' : ''}`}>
        <motion.div
          layout
          initial={false}
          animate={{ 
            opacity: 1, 
            scale: 1,
          }}
          transition={{ 
            layout: {
              duration: 0.5,
              ease: [0.4, 0, 0.2, 1]
            },
            opacity: {
              duration: 0.3
            },
            scale: {
              duration: 0.3
            }
          }}
          className="pointer-events-auto bg-slate-900 border-2 border-blue-500 rounded-xl shadow-2xl p-5 max-w-sm"
          style={{
            ...(currentStep === 1 || step.position === "center" ? {
              // First step or center position: always center using flexbox parent
              position: 'relative',
            } : {
              position: 'absolute',
              ...(step.target && highlightRect ? getCardPosition() : {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }),
            }),
          }}
        >
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="mb-4">
              <h3 className="text-xl font-bold text-white mb-1">{step.title}</h3>
              <p className="text-sm text-slate-400">
                {currentStep} / {tutorialSteps.length}
              </p>
            </div>
            
            <p className="text-slate-300 mb-6 leading-relaxed">{step.description}</p>

            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                onClick={onPrev}
                disabled={isFirst}
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                이전
              </Button>
              
              {isLast ? (
                hideLastButton ? (
                  <div className="flex-1 text-center text-slate-400 text-sm">
                    자산을 선택하세요
                  </div>
                ) : isAssetSelectionTutorial ? (
                  <Button
                    onClick={onNext}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    다음
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    onClick={onComplete}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    시작하기
                  </Button>
                )
              ) : (
                <Button
                  onClick={onNext}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  다음
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

// --- Components ---

// Asset Selection Component with Tutorial
const AssetSelection = ({ 
  onSelect, 
  showTutorial = false, 
  onTutorialEnd 
}: { 
  onSelect: (asset: AssetType) => void;
  showTutorial?: boolean;
  onTutorialEnd?: () => void;
}) => {
  const [tutorialStep, setTutorialStep] = useState(showTutorial ? 1 : 0);
  const [isTutorialActive, setIsTutorialActive] = useState(showTutorial);
  const [selectedAsset, setSelectedAsset] = useState<AssetType | null>(null);

  const handleAssetSelect = (asset: AssetType) => {
    setSelectedAsset(asset);
    // Always allow selection, tutorial or not
    if (isTutorialActive) {
      // Tutorial complete, proceed to game
      setIsTutorialActive(false);
      setTutorialStep(0);
    }
    onSelect(asset);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-8 relative">
      <div className="text-center space-y-2">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
          2분 투자 챌린지
        </h1>
        <p className="text-slate-400 text-lg max-w-md mx-auto">
          투자할 자산을 선택하세요
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        {ASSETS.map((asset) => (
          <Card 
            key={asset.id} 
            data-tutorial={`asset-${asset.id}`}
            className={`group hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-slate-900/50 backdrop-blur border-slate-800 ${
              selectedAsset === asset.id ? 'border-blue-500' : ''
            }`}
            onClick={() => handleAssetSelect(asset.id)}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-slate-800 p-4 rounded-full mb-4 group-hover:bg-slate-700 transition-colors">
                <asset.icon className={`w-10 h-10 ${asset.color}`} />
              </div>
              <CardTitle className="text-xl">{asset.name}</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-slate-400 whitespace-pre-line">{asset.description}</p>
              <Button className="mt-6 w-full bg-slate-800 hover:bg-blue-600" variant="outline">
                선택하기
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Asset Selection Tutorial Overlay */}
      {isTutorialActive && tutorialStep > 0 && (
        <TutorialOverlay
          currentStep={tutorialStep}
          tutorialSteps={ASSET_SELECTION_TUTORIAL_STEPS}
          isAssetSelectionTutorial={true}
          onNext={() => {
            if (tutorialStep < ASSET_SELECTION_TUTORIAL_STEPS.length) {
              setTutorialStep(prev => prev + 1);
            } else {
              // Last step (4th), automatically proceed to game tutorial with default asset
              setIsTutorialActive(false);
              setTutorialStep(0);
              // Use stock as default asset for tutorial
              onSelect("stock");
            }
          }}
          onPrev={() => {
            if (tutorialStep > 1) {
              setTutorialStep(prev => prev - 1);
            }
          }}
          onSkip={() => {
            setIsTutorialActive(false);
            setTutorialStep(0);
          }}
          onComplete={() => {
            // Last step complete, automatically proceed to game tutorial
            setIsTutorialActive(false);
            setTutorialStep(0);
            // Use stock as default asset for tutorial
            onSelect("stock");
          }}
        />
      )}
    </div>
  );
};

// Ranking Display Component (reusable)
const RankingsDisplay = memo(({ rankings, getRankIcon }: { rankings: Array<{ id: string; name: string; returnRate: number; finalValue: number; createdAt: string }>, getRankIcon: (rank: number) => React.ReactNode }) => {
  return (
    <div className="space-y-2 mt-4">
      {rankings.length === 0 ? (
        <p className="text-center text-slate-400 py-8">아직 등록된 랭킹이 없습니다.</p>
      ) : (
        rankings.map((ranking, index) => {
          const rank = index + 1;
          const isPositive = ranking.returnRate >= 0;
          return (
            <div
              key={ranking.id}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                rank <= 3 ? 'bg-slate-800/80 border border-slate-700' : 'bg-slate-800/50'
              }`}
            >
              <div className="flex items-center justify-center w-8">
                {getRankIcon(rank)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate">{ranking.name}</p>
                <p className="text-xs text-slate-400">
                  {new Date(ranking.createdAt).toLocaleString('ko-KR')}
                </p>
              </div>
              <div className="text-right">
                <p className={`font-mono font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {ranking.returnRate > 0 ? '+' : ''}{ranking.returnRate.toFixed(2)}%
                </p>
                <p className="text-xs text-slate-400">{formatMoney(ranking.finalValue)}</p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
});

const GameHome = ({ onStart, onTutorial, onStartWithTutorial }: { onStart: (asset: AssetType) => void, onTutorial: () => void, onStartWithTutorial: () => void }) => {
  const [rankings, setRankings] = useState<Array<{ id: string; name: string; returnRate: number; finalValue: number; createdAt: string }>>([]);

  const fetchRankings = useCallback(async () => {
    try {
      const response = await fetch("/api/rankings?limit=20");
      if (response.ok) {
        const data = await response.json();
        setRankings(data);
      } else {
        const errorText = await response.text();
        console.error("Failed to fetch rankings:", response.status, errorText);
      }
    } catch (error) {
      console.error("Failed to fetch rankings:", error);
    }
  }, []);

  const getRankIcon = useCallback((rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-slate-400 font-bold w-5 text-center">{rank}</span>;
  }, []);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden">

      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left/Center: Game Start Section */}
        <div className="lg:col-span-3 flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in duration-500">
          <motion.div 
            className="text-center space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.h1 
              className="text-5xl md:text-7xl font-bold tracking-tighter bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent"
              animate={{
                backgroundPosition: ['0%', '100%', '0%'],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: 'linear'
              }}
              style={{
                backgroundSize: '200% auto'
              }}
            >
              2분 투자 챌린지
            </motion.h1>
            <motion.p 
              className="text-slate-300 text-lg md:text-xl max-w-md mx-auto leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              2분 동안 최고의 수익률을 올려보세요.<br/>
              <span className="text-blue-400">뉴스를 읽고, 타이밍을 잡아</span> 대박을 노리세요!
            </motion.p>
            <motion.div 
              className="flex gap-2 justify-center mt-8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                <Button 
                  onClick={onStartWithTutorial}
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white text-lg px-8 py-6 rounded-xl shadow-lg shadow-blue-500/50 relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Play className="w-5 h-5" />
                    게임 시작
                  </span>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-100"
                    initial={false}
                    transition={{ duration: 0.3 }}
                  />
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        {/* Right: Rankings Table */}
        <motion.div 
          className="lg:col-span-2 flex flex-col h-full max-h-[calc(100vh-2rem)]"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-800 shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col h-full min-h-0">
            <CardHeader className="pb-3 border-b border-slate-800 shrink-0">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                현재 랭킹
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto min-h-0">
              {rankings.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">아직 등록된 랭킹이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {rankings.map((ranking, index) => {
                    const rank = index + 1;
                    const isPositive = ranking.returnRate >= 0;
                    return (
                      <motion.div
                        key={ranking.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800/80 transition-all duration-200 cursor-pointer group"
                        whileHover={{ scale: 1.02, x: 4 }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-6">
                            {getRankIcon(rank)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">{ranking.name}</p>
                            <p className="text-xs text-slate-400">{formatMoney(ranking.finalValue)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-mono font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                            {ranking.returnRate > 0 ? '+' : ''}{ranking.returnRate.toFixed(2)}%
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

const GamePlay = ({ assetType, onEnd, showTutorial = false, onTutorialEnd }: { assetType: AssetType, onEnd: (finalCapital: number) => void, showTutorial?: boolean, onTutorialEnd?: () => void }) => {
  const assetConfig = ASSETS.find(a => a.id === assetType)!;
  
  // Tutorial State
  const [tutorialStep, setTutorialStep] = useState(showTutorial ? 1 : 0);
  const [isTutorialActive, setIsTutorialActive] = useState(showTutorial);
  
  // Game State
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [cash, setCash] = useState(INITIAL_CAPITAL);
  const [holdings, setHoldings] = useState(0); // Quantity of asset
  
  // Use refs for mutable state in intervals to avoid stale closures
  const currentPriceRef = useRef(getRandomPrice());
  const [currentPrice, setCurrentPrice] = useState(currentPriceRef.current);
  
  const [priceHistory, setPriceHistory] = useState<{time: number, price: number}[]>([]);
  const [newsHistory, setNewsHistory] = useState<NewsItem[]>([]);
  
  // Refs for intervals and game loop
  const newsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeLeftRef = useRef(timeLeft);

  // Keep timeLeftRef in sync with timeLeft
  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  const triggerNews = useCallback(() => {
    const news = NEWS_EVENTS[Math.floor(Math.random() * NEWS_EVENTS.length)];
    const newItem: NewsItem = {
      id: Date.now(),
      time: GAME_DURATION - timeLeftRef.current,
      text: news.text,
      type: news.type,
      impact: news.impact
    };

    // Show news first - keep only last 10 news items
    setNewsHistory(prev => [newItem, ...prev.slice(0, 9)]);
    
    // Apply price impact after a short delay (1.5 seconds) to give player time to react
    setTimeout(() => {
      // Update both Ref (for intervals) and State (for UI)
      const prevPrice = currentPriceRef.current;
      const newPrice = Math.floor(prevPrice * news.impact);
      
      currentPriceRef.current = newPrice;
      setCurrentPrice(newPrice);

      // Update Chart History ONLY when price changes
      setPriceHistory(prev => {
        const newHistory = [...prev, { time: prev.length, price: newPrice }];
        // Limit history to last 50 points for performance
        return newHistory.slice(-50); 
      });
    }, 1500); // 1.5 second delay for player to read and react
  }, []);

  // Initialize Game
  useEffect(() => {
    // Initial history point
    setPriceHistory([{ time: 0, price: currentPriceRef.current }]);

    // Start Timer
    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => {
        // If tutorial is active, keep time at 2 minutes (120 seconds)
        if (isTutorialActive) {
          return GAME_DURATION; // Keep at 2 minutes during tutorial
        }
        // Normal game: countdown normally
        if (prev <= 1) {
          clearInterval(timerInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // News Event Generator - Faster Frequency (3s - 8s)
    const scheduleNextNews = () => {
      // Random time between 3s and 8s for next news
      const nextNewsTime = Math.random() * (8000 - 3000) + 3000;
      newsIntervalRef.current = setTimeout(() => {
        const currentTime = timeLeftRef.current;
        if (currentTime > 5) {
          triggerNews();
          scheduleNextNews(); // Only schedule if time remains
        }
      }, nextNewsTime);
    };
    // Trigger first news immediately when game starts
    triggerNews();
    scheduleNextNews();

    return () => {
      clearInterval(timerInterval);
      if (newsIntervalRef.current) {
        clearTimeout(newsIntervalRef.current);
        newsIntervalRef.current = null;
      }
    };
  }, [isTutorialActive, triggerNews]);

  // End Game Effect
  useEffect(() => {
    if (timeLeft === 0) {
      const finalValue = cash + (holdings * currentPriceRef.current);
      onEnd(finalValue);
    }
  }, [timeLeft, cash, holdings, onEnd]);

  const handleBuy = useCallback(() => {
    if (cash < currentPrice) return; 
    
    playSound('buy');

    // Buy Max
    const quantity = Math.floor(cash / currentPrice);
    if (quantity === 0) return;

    setHoldings(prev => prev + quantity);
    setCash(prev => prev - (quantity * currentPrice));
  }, [cash, currentPrice]);

  const handleSell = useCallback(() => {
    if (holdings === 0) return;
    
    playSound('sell');

    // Sell All
    const revenue = holdings * currentPrice;
    setCash(prev => prev + revenue);
    setHoldings(0);
  }, [holdings, currentPrice]);

  const totalValue = useMemo(() => cash + (holdings * currentPrice), [cash, holdings, currentPrice]);
  const returnRate = useMemo(() => ((totalValue - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100, [totalValue]);

  // Developer shortcut: Ctrl+Shift+E to end game
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "E") {
        e.preventDefault();
        const finalValue = cash + (holdings * currentPrice);
        onEnd(finalValue);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cash, holdings, currentPrice, onEnd]);

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
          <Card data-tutorial="news" className="bg-slate-900/80 border-slate-800 shrink-0 h-[80px] overflow-hidden relative">
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
          <Card data-tutorial="chart" className="bg-slate-900/80 border-slate-800 flex-1 flex flex-col min-h-0">
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
                    hide={true} 
                    width={0}
                  />
                  {/* Changed back to 'monotone' or 'linear' for a more standard chart look, 
                      'stepAfter' was creating confusion. 'linear' is best for accurate point-to-point representation. */}
                  <Area 
                    type="linear" 
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
          <Card data-tutorial="portfolio" className="bg-slate-900/80 border-slate-800 flex-1">
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
            {/* Original Button Design (commented for easy rollback):
            <Button 
              size="lg" 
              onClick={handleBuy} 
              disabled={cash < currentPrice}
              className="h-16 text-lg font-bold bg-red-600 hover:bg-red-700 text-white transition-all active:scale-95 shadow-lg shadow-red-900/20"
            >
              전액 매수 (BUY)
            </Button>
            <Button 
              size="lg" 
              onClick={handleSell} 
              disabled={holdings === 0}
              className="h-16 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-95 shadow-lg shadow-blue-900/20"
            >
              전액 매도 (SELL)
            </Button>
            */}
            
            {/* Enhanced Button Design */}
            <Button 
              data-tutorial="buy"
              size="lg" 
              onClick={handleBuy} 
              disabled={cash < currentPrice}
              className="h-16 text-lg font-bold text-white transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
              style={{
                background: cash < currentPrice 
                  ? 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
                  : 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
                boxShadow: cash < currentPrice
                  ? '0 4px 14px 0 rgba(0, 0, 0, 0.2)'
                  : '0 8px 24px 0 rgba(239, 68, 68, 0.4), 0 4px 8px 0 rgba(239, 68, 68, 0.2)',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <div className="relative flex items-center justify-center gap-2">
                <TrendingUp className="w-5 h-5" />
                <span>전액 매수 (BUY)</span>
              </div>
            </Button>
            <Button 
              data-tutorial="sell"
              size="lg" 
              onClick={handleSell} 
              disabled={holdings === 0}
              className="h-16 text-lg font-bold text-white transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
              style={{
                background: holdings === 0
                  ? 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
                  : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
                boxShadow: holdings === 0
                  ? '0 4px 14px 0 rgba(0, 0, 0, 0.2)'
                  : '0 8px 24px 0 rgba(59, 130, 246, 0.4), 0 4px 8px 0 rgba(59, 130, 246, 0.2)',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <div className="relative flex items-center justify-center gap-2">
                <TrendingDown className="w-5 h-5" />
                <span>전액 매도 (SELL)</span>
              </div>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Tutorial Overlay */}
      {isTutorialActive && tutorialStep > 0 && (
        <TutorialOverlay
          currentStep={tutorialStep}
          tutorialSteps={TUTORIAL_STEPS}
          onNext={() => {
            if (tutorialStep < TUTORIAL_STEPS.length) {
              setTutorialStep(prev => prev + 1);
            }
          }}
          onPrev={() => {
            if (tutorialStep > 1) {
              setTutorialStep(prev => prev - 1);
            }
          }}
          onSkip={() => {
            setIsTutorialActive(false);
            setTutorialStep(0);
          }}
          onComplete={() => {
            setIsTutorialActive(false);
            setTutorialStep(0);
            // Return to asset selection screen when tutorial ends
            if (onTutorialEnd) {
              onTutorialEnd();
            }
          }}
        />
      )}
    </div>
  );
};

const GameResult = ({ finalValue, onRestart }: { finalValue: number, onRestart: () => void }) => {
  const profit = finalValue - INITIAL_CAPITAL;
  const returnRate = (profit / INITIAL_CAPITAL) * 100;
  const isProfit = profit >= 0;
  
  const [playerName, setPlayerName] = useState("");
  const [isRankingSubmitted, setIsRankingSubmitted] = useState(false);
  const [showRankings, setShowRankings] = useState(false);
  const [rankings, setRankings] = useState<Array<{ id: string; name: string; returnRate: number; finalValue: number; createdAt: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  let message = "";
  if (returnRate > 50) message = "투자천재의 탄생! 워렌 버핏이 형님이라 부르겠네요.";
  else if (returnRate > 20) message = "훌륭한 감각입니다! 야수의 심장을 가지셨군요.";
  else if (returnRate > 0) message = "은행 이자보다는 낫네요! 소소한 수익 축하합니다.";
  else if (returnRate > -20) message = "수업료 냈다고 생각하세요... 다음엔 더 잘할 수 있습니다.";
  else message = "한강 물 온도 체크하러 가야할지도...? 😭";

  const submitRanking = async () => {
    if (!playerName.trim() || playerName.trim().length > 10) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/rankings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: playerName.trim(),
          returnRate,
          finalValue,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("Ranking submitted successfully:", data);
        setIsRankingSubmitted(true);
        await fetchRankings(); // Refresh rankings
      } else {
        let errorMessage = "알 수 없는 오류";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        console.error("Failed to submit ranking:", response.status, errorMessage);
        alert(`랭킹 등록 실패: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Failed to submit ranking:", error);
      alert("랭킹 등록 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchRankings = useCallback(async () => {
    try {
      const response = await fetch("/api/rankings?limit=20");
      if (response.ok) {
        const data = await response.json();
        setRankings(data);
      } else {
        const errorText = await response.text();
        console.error("Failed to fetch rankings:", response.status, errorText);
      }
    } catch (error) {
      console.error("Failed to fetch rankings:", error);
    }
  }, []);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-slate-400 font-bold w-5 text-center">{rank}</span>;
  };

  return (
    <>
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

            {/* Ranking Section */}
            {!isRankingSubmitted ? (
              <div className="space-y-3 bg-slate-800/50 p-4 rounded-xl border border-slate-800">
                <label className="text-sm font-medium text-slate-300">랭킹에 등록하기</label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="학번 이름"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value.slice(0, 10))}
                    maxLength={10}
                    className="flex-1 bg-slate-900 border-slate-700"
                  />
                  <Button
                    onClick={submitRanking}
                    disabled={!playerName.trim() || isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isSubmitting ? "등록 중..." : "등록"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-green-500/20 border border-green-500/50 p-4 rounded-xl text-center">
                <p className="text-green-400 font-medium">랭킹에 등록되었습니다! </p>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  fetchRankings();
                  setShowRankings(true);
                }}
                variant="outline"
                className="flex-1 border-slate-700 hover:bg-slate-800"
              >
                <Trophy className="mr-2 w-4 h-4" />
                랭킹 보기
              </Button>
              <Button onClick={onRestart} className="flex-1 h-12 text-lg font-bold" variant="default">
                <RotateCcw className="mr-2 w-5 h-5" /> 다시 도전하기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rankings Dialog */}
      <Dialog open={showRankings} onOpenChange={setShowRankings}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              랭킹
            </DialogTitle>
          </DialogHeader>
          <RankingsDisplay rankings={rankings} getRankIcon={getRankIcon} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default function InvestmentGame() {
  const [status, setStatus] = useState<"idle" | "assetSelection" | "playing" | "ended">("idle");
  const [selectedAsset, setSelectedAsset] = useState<AssetType | null>(null);
  const [finalResult, setFinalResult] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showAssetSelectionTutorial, setShowAssetSelectionTutorial] = useState(false);

  const startGame = (asset: AssetType) => {
    setSelectedAsset(asset);
    setStatus("playing");
  };

  const startGameWithTutorial = () => {
    // Go to asset selection screen with tutorial
    setShowAssetSelectionTutorial(true);
    setStatus("assetSelection");
  };

  const startTutorial = () => {
    // Start with a default asset for tutorial (old way, for "튜토리얼 보기" button)
    setSelectedAsset("stock");
    setShowTutorial(true);
    setStatus("playing");
  };

  const handleAssetSelected = (asset: AssetType) => {
    // Asset selected from AssetSelection component
    // If coming from tutorial end, start game without tutorial
    // If coming from game start button, start game with tutorial
    setSelectedAsset(asset);
    setShowTutorial(showAssetSelectionTutorial);
    setStatus("playing");
  };

  const endTutorial = () => {
    setShowTutorial(false);
    setSelectedAsset(null);
    // Go to asset selection screen without tutorial
    setShowAssetSelectionTutorial(false);
    setStatus("assetSelection");
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

  const clearRankings = async () => {
    try {
      const response = await fetch("/api/rankings", {
        method: "DELETE",
      });
      if (response.ok) {
        alert("랭킹이 초기화되었습니다.");
      }
    } catch (error) {
      console.error("Failed to clear rankings:", error);
    }
  };

  // Developer shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+R: Clear rankings
      if (e.ctrlKey && e.shiftKey && e.key === "R") {
        e.preventDefault();
        clearRankings();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
            <GameHome onStart={startGame} onTutorial={startTutorial} onStartWithTutorial={startGameWithTutorial} />
          </motion.div>
        )}
        {status === "assetSelection" && (
          <motion.div 
            key="assetSelection"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
          >
            <AssetSelection 
              onSelect={handleAssetSelected}
              showTutorial={showAssetSelectionTutorial}
              onTutorialEnd={() => {
                // Tutorial ended, but asset should already be selected
                // This callback is not needed for asset selection tutorial
              }}
            />
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
            <GamePlay 
              assetType={selectedAsset} 
              onEnd={endGame} 
              showTutorial={showTutorial} 
              onTutorialEnd={endTutorial}
            />
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