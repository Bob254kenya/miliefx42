import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { derivApi, type MarketSymbol } from '@/services/deriv-api';
import { copyTradingService } from '@/services/copy-trading-service';
import { getLastDigit } from '@/services/analysis';
import { useAuth } from '@/contexts/AuthContext';
import { useLossRequirement } from '@/hooks/useLossRequirement';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Play, StopCircle, Trash2, Scan,
  Home, RefreshCw, Shield, TrendingUp, DollarSign, X, Volume2, VolumeX, Eye, EyeOff
} from 'lucide-react';

// ============================================
// NOTIFICATION SYSTEM - COMPACT CENTERED POPUP (300px x 200px)
// ============================================

// Animation Styles
const notificationStyles = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUpCenter {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes slideDownCenter {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(20px) scale(0.9);
  }
}

@keyframes float {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 0.25;
  }
  90% {
    opacity: 0.25;
  }
  100% {
    transform: translateY(-100px) rotate(360deg);
    opacity: 0;
  }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scrollRightToLeft {
  from { transform: translateX(0); }
  to { transform: translateX(-100%); }
}

@keyframes scrollUpFast {
  0% {
    transform: translateY(0);
    opacity: 1;
  }
  100% {
    transform: translateY(-100%);
    opacity: 0;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes voiceWave {
  0% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 0.7; }
}

@keyframes blinkRed {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.05); background-color: rgba(239, 68, 68, 0.3); }
}

@keyframes blinkGreen {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); background-color: rgba(16, 185, 129, 0.3); }
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes scrollMarkets {
  0% { transform: translateY(0); }
  100% { transform: translateY(-50%); }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out forwards;
}

.animate-slide-up-center {
  animation: slideUpCenter 0.3s cubic-bezier(0.34, 1.2, 0.64, 1) forwards;
}

.animate-slide-down-center {
  animation: slideDownCenter 0.2s ease-out forwards;
}

.animate-float {
  animation: float linear infinite;
}

.animate-bounce {
  animation: bounce 0.4s ease-in-out 2;
}

.animate-pulse-slow {
  animation: pulse 1s ease-in-out infinite;
}

.animate-slideIn {
  animation: slideIn 0.3s ease-out;
}

.animate-scroll-right-to-left {
  animation: scrollRightToLeft 12s linear infinite;
}

.animate-scroll-up-fast {
  animation: scrollUpFast 3s linear infinite;
}

.animate-fadeInUp {
  animation: fadeInUp 0.3s ease-out forwards;
}

.animate-gradient {
  background-size: 200% 200%;
  animation: gradientShift 3s ease infinite;
}

.animate-voice-wave {
  animation: voiceWave 1.5s ease-in-out infinite;
}

.animate-blink-red {
  animation: blinkRed 0.5s ease-in-out 3;
}

.animate-blink-green {
  animation: blinkGreen 0.5s ease-in-out 3;
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}

.animate-scroll-markets {
  animation: scrollMarkets 20s linear infinite;
}

.animate-scroll-markets-slow {
  animation: scrollMarkets 45s linear infinite;
}
`;

// Helper function to show notification
export const showTPNotification = (type: 'tp' | 'sl', message: string, amount?: number) => {
  if (typeof window !== 'undefined' && (window as any).showTPNotification) {
    (window as any).showTPNotification(type, message, amount);
  }
};

// Compact Notification Component
const NotificationPopup = () => {
  const [notification, setNotification] = useState<{ type: 'tp' | 'sl'; message: string; amount?: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    (window as any).showTPNotification = (type: 'tp' | 'sl', message: string, amount?: number) => {
      setNotification({ type, message, amount });
      setIsVisible(true);
      setIsExiting(false);
      
      const timeout = setTimeout(() => {
        handleClose();
      }, 8000);
      
      return () => clearTimeout(timeout);
    };
    
    return () => {
      delete (window as any).showTPNotification;
    };
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      setNotification(null);
      setIsExiting(false);
    }, 300);
  };

  if (!isVisible || !notification) return null;

  const isTP = notification.type === 'tp';
  const amount = notification.amount;

  const backgroundIcons = () => {
    const icons = [];
    const iconCount = 12;
    const colors = isTP 
      ? ['#10b981', '#34d399', '#6ee7b7', '#059669']
      : ['#f43f5e', '#fb7185', '#fda4af', '#e11d48'];
    
    for (let i = 0; i < iconCount; i++) {
      const size = 12 + Math.random() * 20;
      const left = Math.random() * 100;
      const delay = Math.random() * 12;
      const duration = 6 + Math.random() * 8;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const icon = isTP ? '💰' : '😢';
      
      icons.push(
        <div
          key={i}
          className="absolute animate-float"
          style={{
            left: `${left}%`,
            bottom: '-30px',
            fontSize: `${size}px`,
            opacity: 0.25,
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
            color: color,
            filter: 'drop-shadow(0 0 2px currentColor)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          {icon}
        </div>
      );
    }
    return icons;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div 
        className={`
          pointer-events-auto w-[350px] h-[350px] rounded-xl shadow-2xl overflow-hidden
          ${isExiting ? 'animate-slide-down-center' : 'animate-slide-up-center'}
        `}
      >
        <div className={`
          relative w-full h-full overflow-hidden
          ${isTP 
            ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' 
            : 'bg-gradient-to-br from-rose-500 to-rose-700'
          }
        `}>
          <div className="absolute inset-0 overflow-hidden">
            {backgroundIcons()}
          </div>
          
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
          
          <div className="relative w-full h-full flex flex-col p-3 z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center text-xl
                ${isTP 
                  ? 'bg-emerald-400/30' 
                  : 'bg-rose-400/30'
                }
                shadow-lg backdrop-blur-sm
                animate-pulse-slow
                flex-shrink-0
              `}>
                {isTP ? '🎉' : '😢'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-sm font-bold text-white truncate`}>
                  {isTP ? 'TAKE PROFIT!' : 'STOP LOSS!'}
                </h3>
                <p className="text-[8px] text-white/70">
                  {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center text-center mb-2">
              <p className="text-white text-xs font-medium leading-tight">
                {notification.message}
              </p>
              {amount && (
                <p className={`text-xl font-bold mt-1 ${isTP ? 'text-emerald-200' : 'text-rose-200'} animate-bounce`}>
                  {isTP ? '+' : '-'}${Math.abs(amount).toFixed(2)}
                </p>
              )}
            </div>
            
            <button
              onClick={handleClose}
              className={`
                w-full py-1.5 rounded-lg font-semibold text-xs transition-all duration-200
                ${isTP 
                  ? 'bg-white/95 text-emerald-600 hover:bg-white hover:scale-[1.02]' 
                  : 'bg-white/95 text-rose-600 hover:bg-white hover:scale-[1.02]'
                }
                transform active:scale-[0.98]
                shadow-lg backdrop-blur-sm
              `}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// PRO SCANNER BOT
// ============================================

const SCANNER_MARKETS: { symbol: string; name: string; color: string }[] = [
  { symbol: 'R_10', name: 'Vol 10', color: 'from-emerald-500 to-teal-500' },
  { symbol: 'R_25', name: 'Vol 25', color: 'from-cyan-500 to-blue-500' },
  { symbol: 'R_50', name: 'Vol 50', color: 'from-indigo-500 to-purple-500' },
  { symbol: 'R_75', name: 'Vol 75', color: 'from-rose-500 to-pink-500' },
  { symbol: 'R_100', name: 'Vol 100', color: 'from-amber-500 to-orange-500' },
  { symbol: '1HZ10V', name: 'V10 1s', color: 'from-emerald-400 to-green-500' },
  { symbol: '1HZ15V', name: 'V15 1s', color: 'from-sky-400 to-blue-500' },
  { symbol: '1HZ25V', name: 'V25 1s', color: 'from-violet-400 to-purple-500' },
  { symbol: '1HZ30V', name: 'V30 1s', color: 'from-fuchsia-400 to-pink-500' },
  { symbol: '1HZ50V', name: 'V50 1s', color: 'from-orange-400 to-red-500' },
  { symbol: '1HZ75V', name: 'V75 1s', color: 'from-teal-400 to-emerald-500' },
  { symbol: '1HZ90V', name: 'V90 1s', color: 'from-blue-400 to-indigo-500' },
  { symbol: '1HZ100V', name: 'V100 1s', color: 'from-purple-400 to-fuchsia-500' },
  { symbol: 'JD10', name: 'Jump 10', color: 'from-red-400 to-rose-500' },
  { symbol: 'JD25', name: 'Jump 25', color: 'from-yellow-400 to-amber-500' },
  { symbol: 'RDBEAR', name: 'Bear', color: 'from-slate-400 to-gray-500' },
  { symbol: 'RDBULL', name: 'Bull', color: 'from-green-400 to-emerald-500' },
];

type BotStatus = 'idle' | 'trading_m1' | 'recovery' | 'waiting_pattern' | 'pattern_matched' | 'reconnecting';
type M1StrategyType = 
  | 'over0_under9_1'
  | 'over0_under9_2' 
  | 'over0_under9_3' 
  | 'over0_under9_4' 
  | 'over1_under8_2' 
  | 'over1_under8_3'
  | 'over1_under8_4' 
  | 'over2_under7_2' 
  | 'over2_under7_3' 
  | 'over2_under7_4' 
  | 'over2_under7_5'
  | 'over3_under6_4' 
  | 'over4_under5_4'
  | 'over4_under5_5' 
  | 'over4_under5_6' 
  | 'over4_under5_7' 
  | 'disabled';

type M2RecoveryType = 
  | 'odd_even_3'
  | 'odd_even_4' 
  | 'odd_even_5' 
  | 'odd_even_6' 
  | 'odd_even_7' 
  | 'odd_even_8' 
  | 'odd_even_9' 
  | 'over4_under5_5' 
  | 'over4_under5_6' 
  | 'over4_under5_7' 
  | 'over4_under5_8' 
  | 'over4_under5_9' 
  | 'over3_under6_5' 
  | 'over3_under6_7' 
  | 'same_direction_3'
  | 'same_direction_4'
  | 'same_direction_5'
  | 'same_direction_6'
  | 'same_direction_7'
  | 'same_direction_8'
  | 'same_direction_9'
  | 'same_direction_10'
  | 'disabled';

interface LogEntry {
  id: number;
  time: string;
  market: 'M1' | 'M2';
  symbol: string;
  contract: string;
  stake: number;
  martingaleStep: number;
  exitDigit: string;
  result: 'Win' | 'Loss' | 'Pending' | 'Failed';
  pnl: number;
  balance: number;
  switchInfo: string;
}

interface DetectedPattern {
  symbol: string;
  name: string;
  patternType: string;
  timestamp: number;
  digits: number[];
  contractType?: string;
  result?: 'Win' | 'Loss';
  stake?: number;
  pnl?: number;
  last15Ticks?: number[];
}

interface MarketStats {
  symbol: string;
  name: string;
  color: string;
  evenCount: number;
  oddCount: number;
  over4Count: number;
  under5Count: number;
  totalTicks: number;
  evenPercentage: number;
  oddPercentage: number;
  over4Percentage: number;
  under5Percentage: number;
  strength: number;
  lastUpdate: number;
  dominantSignal: 'EVEN' | 'ODD' | 'OVER' | 'UNDER' | null;
}

// Constants
const MAX_SCAN_ATTEMPTS = 100;
const SCAN_INTERVAL = 100;
const CONNECTION_CHECK_INTERVAL = 3000;
const DATA_STALENESS_THRESHOLD = 8000;
const HEARTBEAT_INTERVAL = 15000;
const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;
const DEBUG = true;
const BALANCE_SYNC_INTERVAL = 1000;
const IMMEDIATE_BALANCE_SYNC_DELAY = 50;
const MARKET_SCROLL_INTERVAL = 25000;
const PATTERN_DISPLAY_DURATION = 4000;
const STATS_UPDATE_INTERVAL = 1000;
const STRONG_MARKET_THRESHOLD = 55;

const logDebug = (...args: any[]) => {
  if (DEBUG) console.log('[DEBUG]', new Date().toISOString(), ...args);
};

function waitForNextTick(symbol: string): Promise<{ quote: number }> {
  return new Promise((resolve) => {
    let unsub: (() => void) | null = null;
    const timeout = setTimeout(() => {
      if (unsub) unsub();
      resolve({ quote: 0 });
    }, 5000);
    
    unsub = derivApi.onMessage((data: any) => {
      if (data.tick && data.tick.symbol === symbol) { 
        clearTimeout(timeout);
        if (unsub) unsub(); 
        resolve({ quote: data.tick.quote }); 
      }
    });
  });
}

const sameDirectionTickMapRef = new Map<string, number[]>();

const updateSameDirectionTickStorage = (symbol: string, digit: number) => {
  let arr = sameDirectionTickMapRef.get(symbol);
  if (!arr) {
    arr = [];
    sameDirectionTickMapRef.set(symbol, arr);
  }
  arr.push(digit);
  if (arr.length > 15) arr.shift();
};

const getSameDirectionRecentDigits = (symbol: string, count: number): number[] => {
  const digits = sameDirectionTickMapRef.get(symbol) || [];
  return digits.slice(-count);
};

const getLast15Ticks = (symbol: string): number[] => {
  const digits = sameDirectionTickMapRef.get(symbol) || [];
  return digits.slice(-15);
};

const getSameDirectionSignal = (ticks: number[], requiredTicks: number): 'even' | 'odd' | null => {
  if (ticks.length < requiredTicks) return null;
  
  const lastNTicks = ticks.slice(-requiredTicks);
  const allEven = lastNTicks.every(d => d % 2 === 0);
  const allOdd = lastNTicks.every(d => d % 2 !== 0);
  
  if (allEven) return 'even';
  if (allOdd) return 'odd';
  return null;
};

const checkSameDirectionPattern = (symbol: string, requiredTicks: number): { matched: boolean; contractType?: string; patternDigits?: string } => {
  const digits = getSameDirectionRecentDigits(symbol, requiredTicks);
  if (digits.length < requiredTicks) return { matched: false };
  
  const signal = getSameDirectionSignal(digits, requiredTicks);
  
  if (signal === 'even') {
    return { matched: true, contractType: 'DIGITEVEN', patternDigits: digits.join(',') };
  }
  if (signal === 'odd') {
    return { matched: true, contractType: 'DIGITODD', patternDigits: digits.join(',') };
  }
  
  return { matched: false };
};

const findSameDirectionMatch = (selectedStrategy: M2RecoveryType): { symbol: string; contractType: string; tickLength: number; patternDigits: string; last15Ticks: number[] } | null => {
  const tickLength = parseInt(selectedStrategy.split('_')[2]);
  if (isNaN(tickLength) || tickLength < 3 || tickLength > 10) return null;
  
  for (const market of SCANNER_MARKETS) {
    const result = checkSameDirectionPattern(market.symbol, tickLength);
    if (result.matched && result.contractType) {
      const last15Ticks = getLast15Ticks(market.symbol);
      logDebug(`[Same Direction] ✅ PATTERN FOUND on ${market.symbol} (${tickLength} ticks): ${result.patternDigits} -> ${result.contractType}`);
      return {
        symbol: market.symbol,
        contractType: result.contractType,
        tickLength,
        patternDigits: result.patternDigits || '',
        last15Ticks
      };
    }
  }
  return null;
};

const playPatternVoice = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.3);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    // Audio not supported
  }
};

export default function ProScannerBot() {
  const { isAuthorized, balance: apiBalance, activeAccount, refreshBalance } = useAuth();
  const { recordLoss } = useLossRequirement();

  // Toggle states for UI sections
  const [showPatternDetection, setShowPatternDetection] = useState(false);
  const [showLiveMarkets, setShowLiveMarkets] = useState(false);
  const [showStrongestMarkets, setShowStrongestMarkets] = useState(false);

  // Local balance tracking
  const [localBalance, setLocalBalance] = useState(apiBalance);
  const localBalanceRef = useRef(apiBalance);
  const [netProfit, setNetProfit] = useState(0);
  const netProfitRef = useRef(0);
  const balanceSyncPromiseRef = useRef<Promise<void> | null>(null);

  // Market statistics
  const [marketStats, setMarketStats] = useState<MarketStats[]>([]);
  const [strongestMarkets, setStrongestMarkets] = useState<MarketStats[]>([]);
  const marketTickCountersRef = useRef<Map<string, { even: number; odd: number; over4: number; under5: number; total: number }>>(new Map());
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const forceImmediateBalanceUpdate = useCallback(async (expectedPnl?: number): Promise<number> => {
    if (!refreshBalance) return localBalanceRef.current;
    
    try {
      await refreshBalance();
      const newBalance = apiBalance;
      setLocalBalance(newBalance);
      localBalanceRef.current = newBalance;
      
      if (expectedPnl !== undefined) {
        const previousBalance = localBalanceRef.current - expectedPnl;
        const balanceChange = newBalance - previousBalance;
        logDebug(`Balance sync complete - New: $${newBalance}, Expected change: $${expectedPnl}, Actual change: $${balanceChange}`);
      } else {
        logDebug(`Balance sync complete - New balance: $${newBalance}`);
      }
      
      return newBalance;
    } catch (error) {
      logDebug('Balance sync error:', error);
      return localBalanceRef.current;
    }
  }, [apiBalance, refreshBalance]);

  // Sync local balance with API balance
  useEffect(() => {
    const syncBalance = async () => {
      if (refreshBalance) {
        await refreshBalance();
      }
      const newBalance = apiBalance;
      setLocalBalance(newBalance);
      localBalanceRef.current = newBalance;
      logDebug(`Balance synced: $${newBalance}`);
    };
    
    syncBalance();
    const interval = setInterval(syncBalance, BALANCE_SYNC_INTERVAL);
    return () => clearInterval(interval);
  }, [apiBalance, refreshBalance]);

  useEffect(() => {
    setLocalBalance(apiBalance);
    localBalanceRef.current = apiBalance;
    logDebug(`Balance updated instantly: $${apiBalance}`);
  }, [apiBalance]);

  // Update market statistics from tick data
  const updateMarketStats = useCallback((symbol: string, digit: number) => {
    const counter = marketTickCountersRef.current.get(symbol);
    if (!counter) {
      marketTickCountersRef.current.set(symbol, { even: 0, odd: 0, over4: 0, under5: 0, total: 0 });
    }
    
    const current = marketTickCountersRef.current.get(symbol)!;
    current.total++;
    
    if (digit % 2 === 0) {
      current.even++;
    } else {
      current.odd++;
    }
    
    if (digit >= 5) {
      current.over4++;
    }
    if (digit <= 4) {
      current.under5++;
    }
    
    const evenPercentage = (current.even / current.total) * 100;
    const oddPercentage = (current.odd / current.total) * 100;
    const over4Percentage = (current.over4 / current.total) * 100;
    const under5Percentage = (current.under5 / current.total) * 100;
    
    const directionStrength = Math.max(evenPercentage, oddPercentage);
    const barrierStrength = Math.max(over4Percentage, under5Percentage);
    const strength = Math.max(directionStrength, barrierStrength);
    
    let dominantSignal: 'EVEN' | 'ODD' | 'OVER' | 'UNDER' | null = null;
    if (strength >= STRONG_MARKET_THRESHOLD) {
      if (directionStrength >= barrierStrength) {
        dominantSignal = evenPercentage > oddPercentage ? 'EVEN' : 'ODD';
      } else {
        dominantSignal = over4Percentage > under5Percentage ? 'OVER' : 'UNDER';
      }
    }
    
    const marketInfo = SCANNER_MARKETS.find(m => m.symbol === symbol);
    if (marketInfo) {
      setMarketStats(prev => {
        const existing = prev.find(s => s.symbol === symbol);
        if (existing) {
          return prev.map(s => s.symbol === symbol ? {
            ...s,
            evenCount: current.even,
            oddCount: current.odd,
            over4Count: current.over4,
            under5Count: current.under5,
            totalTicks: current.total,
            evenPercentage,
            oddPercentage,
            over4Percentage,
            under5Percentage,
            strength,
            lastUpdate: Date.now(),
            dominantSignal
          } : s);
        } else {
          return [...prev, {
            symbol,
            name: marketInfo.name,
            color: marketInfo.color,
            evenCount: current.even,
            oddCount: current.odd,
            over4Count: current.over4,
            under5Count: current.under5,
            totalTicks: current.total,
            evenPercentage,
            oddPercentage,
            over4Percentage,
            under5Percentage,
            strength,
            lastUpdate: Date.now(),
            dominantSignal
          }];
        }
      });
    }
  }, []);

  const updateStrongestMarkets = useCallback(() => {
    setMarketStats(currentStats => {
      const sorted = [...currentStats].sort((a, b) => b.strength - a.strength);
      const strong = sorted.filter(m => m.strength >= STRONG_MARKET_THRESHOLD && m.totalTicks >= 100);
      setStrongestMarkets(strong.slice(0, 5));
      return currentStats;
    });
  }, []);

  useEffect(() => {
    statsIntervalRef.current = setInterval(() => {
      updateStrongestMarkets();
    }, STATS_UPDATE_INTERVAL);
    
    return () => {
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    };
  }, [updateStrongestMarkets]);

  /* ── Market 1 config ── */
  const [m1Enabled, setM1Enabled] = useState(true);
  const [m1StrategyType, setM1StrategyType] = useState<M1StrategyType>('over1_under8_2');

  /* ── Market 2 config ── */
  const [m2Enabled, setM2Enabled] = useState(true);
  const [m2RecoveryType, setM2RecoveryType] = useState<M2RecoveryType>('same_direction_4');

  /* ── Risk ── */
  const [stake, setStake] = useState('0.6');
  const [martingaleOn, setMartingaleOn] = useState(true);
  const [martingaleMultiplier, setMartingaleMultiplier] = useState('2.0');
  const [martingaleMaxSteps, setMartingaleMaxSteps] = useState('5');
  const [takeProfit, setTakeProfit] = useState('5');
  const [stopLoss, setStopLoss] = useState('30');

  /* ── Strategy Enabled Flags ── */
  const [strategyM1Enabled, setStrategyM1Enabled] = useState(true);
  const [strategyM2Enabled, setStrategyM2Enabled] = useState(true);

  /* ── Scanner ── */
  const [scannerActive, setScannerActive] = useState(true);
  
  /* ── Detected Patterns for Display ── */
  const [detectedPatterns, setDetectedPatterns] = useState<DetectedPattern[]>([]);
  
  /* ── Active Pattern for Trade Display ── */
  const [activePattern, setActivePattern] = useState<DetectedPattern | null>(null);
  const [tradeResult, setTradeResult] = useState<{ result: 'Win' | 'Loss'; pnl: number } | null>(null);
  
  /* ── Scanner Voice & Animation State ── */
  const [isScannerVoiceActive, setIsScannerVoiceActive] = useState(false);
  const [scannerMarkers, setScannerMarkers] = useState<typeof SCANNER_MARKETS>([]);
  const scannerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const scrollingContainerRef = useRef<HTMLDivElement>(null);
  const [scrollSpeed, setScrollSpeed] = useState<'normal' | 'slow'>('slow');

  /* ── Bot state ── */
  const [botStatus, setBotStatus] = useState<BotStatus>('idle');
  const [isRunning, setIsRunning] = useState(false);
  const runningRef = useRef(false);
  const [currentMarket, setCurrentMarket] = useState<1 | 2>(1);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [failedTrades, setFailedTrades] = useState(0);
  const [totalStaked, setTotalStaked] = useState(0);
  const [currentStake, setCurrentStakeState] = useState(0);
  const [martingaleStep, setMartingaleStepState] = useState(0);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);
  
  const lastTradeTimeRef = useRef<Map<string, number>>(new Map());
  const lastPatternDigitsRef = useRef<Map<string, string>>(new Map());
  const lastTradeOverallRef = useRef<number>(0);
  const lastTickTimeRef = useRef<Map<string, number>>(new Map());
  const subscriptionStatusRef = useRef<Map<string, boolean>>(new Map());
  const connectionRetryCountRef = useRef<number>(0);
  const MAX_CONNECTION_RETRIES = 3;
  const isReconnectingRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Store bot state for recovery after reconnection
  const botStateRef = useRef<{
    cStake: number;
    mStep: number;
    inRecovery: boolean;
    currentNetProfit: number;
    currentLocalBalance: number;
    baseStake: number;
    waitingForPatternAfterLoss: boolean;
    lastPatternSymbol?: string;
    lastPatternDigits?: string;
  } | null>(null);

  const tickMapRef = useRef<Map<string, number[]>>(new Map());

  const tpNotifiedRef = useRef(false);
  const slNotifiedRef = useRef(false);
  const lastPnlRef = useRef(0);

  useEffect(() => {
    if (activePattern) {
      const timer = setTimeout(() => {
        setActivePattern(null);
      }, PATTERN_DISPLAY_DURATION);
      return () => clearTimeout(timer);
    }
  }, [activePattern]);

  useEffect(() => {
    if (tradeResult) {
      const timer = setTimeout(() => {
        setTradeResult(null);
      }, PATTERN_DISPLAY_DURATION);
      return () => clearTimeout(timer);
    }
  }, [tradeResult]);

  useEffect(() => {
    const initVoice = () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.type = 'sine';
        oscillator.frequency.value = 880;
        gainNode.gain.value = 0;
        oscillator.start();
        
        voiceAudioRef.current = {
          play: () => {
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.5);
          }
        } as any;
      } catch (e) {
        console.log('Audio not supported');
      }
    };
    
    initVoice();
    
    return () => {
      if (scannerIntervalRef.current) clearInterval(scannerIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    const initialStats: MarketStats[] = SCANNER_MARKETS.map(market => ({
      symbol: market.symbol,
      name: market.name,
      color: market.color,
      evenCount: 0,
      oddCount: 0,
      over4Count: 0,
      under5Count: 0,
      totalTicks: 0,
      evenPercentage: 0,
      oddPercentage: 0,
      over4Percentage: 0,
      under5Percentage: 0,
      strength: 0,
      lastUpdate: Date.now(),
      dominantSignal: null,
    }));
    setMarketStats(initialStats);
    
    const shuffled = [...SCANNER_MARKETS];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setScannerMarkers(shuffled);
    
    scannerIntervalRef.current = setInterval(() => {
      setScannerMarkers(prev => {
        if (prev.length === 0) return [...SCANNER_MARKETS];
        const newMarkers = [...prev];
        const first = newMarkers.shift();
        if (first) newMarkers.push(first);
        return newMarkers;
      });
    }, MARKET_SCROLL_INTERVAL);
    
    return () => {
      if (scannerIntervalRef.current) clearInterval(scannerIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    setIsScannerVoiceActive(isRunning);
  }, [isRunning]);

  // IMPROVED CONNECTION MANAGEMENT WITH STATE PERSISTENCE
  const ensureConnection = useCallback(async (): Promise<boolean> => {
    // Check if already connected and has fresh data
    if (derivApi.isConnected) {
      // Verify we're getting fresh data
      let hasFreshData = false;
      for (const market of SCANNER_MARKETS.slice(0, 5)) {
        const lastTickTime = lastTickTimeRef.current.get(market.symbol);
        if (lastTickTime && Date.now() - lastTickTime < DATA_STALENESS_THRESHOLD) {
          hasFreshData = true;
          break;
        }
      }
      
      if (hasFreshData) {
        connectionRetryCountRef.current = 0;
        reconnectAttemptsRef.current = 0;
        isReconnectingRef.current = false;
        return true;
      } else {
        logDebug('Connection active but no fresh data, resubscribing...');
        // Resubscribe to all markets
        await Promise.allSettled(
          SCANNER_MARKETS.map(async (market) => {
            try {
              if (subscriptionStatusRef.current.get(market.symbol)) {
                await derivApi.unsubscribeTicks?.(market.symbol as MarketSymbol);
              }
              await derivApi.subscribeTicks(market.symbol as MarketSymbol, () => {});
              subscriptionStatusRef.current.set(market.symbol, true);
            } catch (e) {
              logDebug(`Failed to resubscribe to ${market.symbol}:`, e);
            }
          })
        );
        
        // Wait for data to come in
        await new Promise(r => setTimeout(r, 3000));
        
        // Verify we have data now
        for (const market of SCANNER_MARKETS.slice(0, 5)) {
          const lastTickTime = lastTickTimeRef.current.get(market.symbol);
          if (lastTickTime && Date.now() - lastTickTime < DATA_STALENESS_THRESHOLD) {
            return true;
          }
        }
        
        // Still no data, disconnect and reconnect
        derivApi.disconnect?.();
      }
    }

    // Prevent multiple reconnection attempts
    if (isReconnectingRef.current) {
      logDebug('Already reconnecting, skipping...');
      return false;
    }

    isReconnectingRef.current = true;
    setBotStatus('reconnecting');
    
    for (let i = 0; i < MAX_RECONNECT_ATTEMPTS; i++) {
      try {
        logDebug(`Connection attempt ${i + 1}/${MAX_RECONNECT_ATTEMPTS}`);
        
        // Disconnect if already connected
        if (derivApi.isConnected) {
          derivApi.disconnect?.();
          await new Promise(r => setTimeout(r, 1000));
        }
        
        await derivApi.connect();
        await new Promise(r => setTimeout(r, 2000));
        
        if (derivApi.isConnected) {
          // Subscribe to all markets
          await Promise.allSettled(
            SCANNER_MARKETS.map(async (market) => {
              try {
                await derivApi.subscribeTicks(market.symbol as MarketSymbol, () => {});
                subscriptionStatusRef.current.set(market.symbol, true);
                logDebug(`✅ Subscribed to ${market.symbol}`);
              } catch (error) {
                logDebug(`❌ Failed to subscribe to ${market.symbol}:`, error);
                subscriptionStatusRef.current.set(market.symbol, false);
              }
            })
          );
          
          await new Promise(r => setTimeout(r, 3000));
          
          // Restore bot state after successful reconnection
          if (runningRef.current && botStateRef.current) {
            logDebug('Restoring bot state after reconnection...', botStateRef.current);
            setCurrentStakeState(botStateRef.current.cStake);
            setMartingaleStepState(botStateRef.current.mStep);
            setNetProfit(botStateRef.current.currentNetProfit);
            netProfitRef.current = botStateRef.current.currentNetProfit;
            setLocalBalance(botStateRef.current.currentLocalBalance);
            localBalanceRef.current = botStateRef.current.currentLocalBalance;
            
            // Resume trading with restored state
            setBotStatus(botStateRef.current.inRecovery ? 'recovery' : 'trading_m1');
          } else {
            setBotStatus(runningRef.current ? 'trading_m1' : 'idle');
          }
          
          connectionRetryCountRef.current = 0;
          reconnectAttemptsRef.current = 0;
          isReconnectingRef.current = false;
          logDebug('Reconnection successful');
          return true;
        }
      } catch (error) {
        logDebug(`Reconnection attempt ${i + 1} failed:`, error);
        await new Promise(r => setTimeout(r, RECONNECT_DELAY));
      }
    }
    
    setBotStatus('idle');
    isReconnectingRef.current = false;
    logDebug('Reconnection failed after all attempts');
    
    // If we're supposed to be running but reconnection failed, stop the bot
    if (runningRef.current) {
      logDebug('Stopping bot due to connection failure');
      stopBot();
    }
    
    return false;
  }, []);

  // Improved connection monitoring with automatic resumption
  useEffect(() => {
    let connectionChecker: NodeJS.Timeout;
    let dataStalenessChecker: NodeJS.Timeout;
    
    if (isRunning) {
      connectionChecker = setInterval(async () => {
        if (!derivApi.isConnected && !isReconnectingRef.current && runningRef.current) {
          logDebug('Connection lost, attempting to reconnect...');
          const reconnected = await ensureConnection();
          if (!reconnected && runningRef.current) {
            // If reconnection fails and bot should be running, stop the bot
            logDebug('Failed to reconnect, stopping bot...');
            stopBot();
          }
        } else if (derivApi.isConnected && runningRef.current && !isReconnectingRef.current) {
          // Verify we're getting data
          let hasFreshData = false;
          for (const market of SCANNER_MARKETS.slice(0, 5)) {
            const lastTickTime = lastTickTimeRef.current.get(market.symbol);
            if (lastTickTime && Date.now() - lastTickTime < DATA_STALENESS_THRESHOLD) {
              hasFreshData = true;
              break;
            }
          }
          if (!hasFreshData) {
            logDebug('No fresh data, refreshing connection...');
            await ensureConnection();
          }
        }
      }, CONNECTION_CHECK_INTERVAL);
      
      dataStalenessChecker = setInterval(async () => {
        if (derivApi.isConnected && !isReconnectingRef.current && runningRef.current) {
          let staleCount = 0;
          for (const market of SCANNER_MARKETS) {
            const lastTickTime = lastTickTimeRef.current.get(market.symbol);
            if (!lastTickTime || Date.now() - lastTickTime > DATA_STALENESS_THRESHOLD) {
              staleCount++;
            }
          }
          if (staleCount > SCANNER_MARKETS.length / 2) {
            logDebug(`Data staleness detected (${staleCount}/${SCANNER_MARKETS.length} markets stale), refreshing subscriptions...`);
            await ensureConnection();
          }
        }
      }, 10000);
    }
    
    return () => {
      if (connectionChecker) clearInterval(connectionChecker);
      if (dataStalenessChecker) clearInterval(dataStalenessChecker);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [isRunning, ensureConnection]);

  // Heartbeat mechanism
  useEffect(() => {
    if (!derivApi.isConnected || !isRunning) return;
    
    const heartbeat = setInterval(() => {
      if (!derivApi.isConnected && runningRef.current) {
        logDebug('Heartbeat failed, attempting reconnect...');
        ensureConnection();
      }
    }, HEARTBEAT_INTERVAL);
    
    return () => clearInterval(heartbeat);
  }, [isRunning, ensureConnection]);

  const stopBot = useCallback(() => {
    logDebug('Stopping bot...');
    runningRef.current = false;
    setIsRunning(false);
    setBotStatus('idle');
    setIsScannerVoiceActive(false);
    botStateRef.current = null;
    
    // Clear any pending timeouts/intervals
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
    }
    
    logDebug('Bot stopped successfully');
  }, []);

  // Initial subscription and tick handler
  useEffect(() => {
    let active = true;
    let reconnectTimeout: NodeJS.Timeout;
    
    const setupSubscriptions = async () => {
      if (!derivApi.isConnected) {
        const connected = await derivApi.connect();
        if (!connected && active) {
          reconnectTimeout = setTimeout(setupSubscriptions, 5000);
          return;
        }
      }
      if (active && derivApi.isConnected) {
        await Promise.allSettled(
          SCANNER_MARKETS.map(async (market) => {
            try {
              await derivApi.subscribeTicks(market.symbol as MarketSymbol, () => {});
              subscriptionStatusRef.current.set(market.symbol, true);
            } catch (error) {
              logDebug(`Failed to subscribe to ${market.symbol}:`, error);
              subscriptionStatusRef.current.set(market.symbol, false);
            }
          })
        );
      }
    };
    
    const handler = (data: any) => {
      if (!data.tick || !active) return;
      
      const sym = data.tick.symbol as string;
      const quote = data.tick.quote;
      const digit = getLastDigit(quote);
      
      if (typeof digit !== 'number' || isNaN(digit) || digit < 0 || digit > 9) {
        return;
      }
      
      lastTickTimeRef.current.set(sym, Date.now());
      updateMarketStats(sym, digit);
      
      const map = tickMapRef.current;
      let arr = map.get(sym);
      if (!arr) {
        arr = [];
        map.set(sym, arr);
      }
      arr.push(digit);
      if (arr.length > 200) arr.shift();
      
      updateSameDirectionTickStorage(sym, digit);
      
      if (!subscriptionStatusRef.current.get(sym)) {
        subscriptionStatusRef.current.set(sym, true);
      }
    };
    
    const unsub = derivApi.onMessage(handler);
    setupSubscriptions();
    
    return () => { 
      active = false; 
      unsub();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      SCANNER_MARKETS.forEach(m => {
        derivApi.unsubscribeTicks?.(m.symbol as MarketSymbol).catch(() => {});
      });
    };
  }, [updateMarketStats]);

  // Monitor TP/SL and show notifications
  useEffect(() => {
    const tpValue = parseFloat(takeProfit);
    const slValue = parseFloat(stopLoss);
    const prevPnl = lastPnlRef.current;
    
    if (netProfit >= tpValue && prevPnl < tpValue && netProfit > 0) {
      showTPNotification('tp', `Take Profit Target Hit!`, netProfit);
      tpNotifiedRef.current = true;
      slNotifiedRef.current = false;
    }
    
    if (netProfit <= -slValue && prevPnl > -slValue && netProfit < 0) {
      showTPNotification('sl', `Stop Loss Target Hit!`, Math.abs(netProfit));
      slNotifiedRef.current = true;
      tpNotifiedRef.current = false;
    }
    
    if (netProfit > -slValue && netProfit < tpValue) {
      tpNotifiedRef.current = false;
      slNotifiedRef.current = false;
    }
    
    lastPnlRef.current = netProfit;
  }, [netProfit, takeProfit, stopLoss]);

  const isDataFresh = useCallback((symbol: string): boolean => {
    const lastTickTime = lastTickTimeRef.current.get(symbol);
    if (!lastTickTime) {
      return false;
    }
    const isFresh = Date.now() - lastTickTime < DATA_STALENESS_THRESHOLD;
    if (!isFresh && derivApi.isConnected) {
      derivApi.subscribeTicks(symbol as MarketSymbol, () => {}).catch(() => {});
    }
    return isFresh;
  }, []);

  const getRecentDigits = useCallback((symbol: string, count: number): number[] => {
    const digits = tickMapRef.current.get(symbol) || [];
    return digits.slice(-count);
  }, []);

  // M1 Pattern Checker
  const checkM1Pattern = useCallback((symbol: string): { matched: boolean; contractType?: string; barrier?: string; patternDigits?: string } => {
    if (!isDataFresh(symbol)) {
      return { matched: false };
    }
    
    const digits = getRecentDigits(symbol, 10);
    if (digits.length === 0) return { matched: false };
    
    switch (m1StrategyType) {
      case 'over0_under9_1': {
        const last1 = digits.slice(-1);
        const patternKey = `${last1.join(',')}`;
        
        if (last1[0] === 0) {
          return { matched: true, contractType: 'DIGITOVER', barrier: '0', patternDigits: patternKey };
        }
        if (last1[0] === 9) {
          return { matched: true, contractType: 'DIGITUNDER', barrier: '9', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      case 'over0_under9_2': {
        if (digits.length < 2) return { matched: false };
        const last2 = digits.slice(-2);
        const patternKey = `${last2.join(',')}`;
        
        if (last2[0] === 0 && last2[1] === 0) {
          return { matched: true, contractType: 'DIGITOVER', barrier: '0', patternDigits: patternKey };
        }
        if (last2[0] === 9 && last2[1] === 9) {
          return { matched: true, contractType: 'DIGITUNDER', barrier: '9', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      case 'over0_under9_3': {
        if (digits.length < 3) return { matched: false };
        const last3 = digits.slice(-3);
        const patternKey = `${last3.join(',')}`;
        const allZeros = last3.every(d => d === 0);
        const allNines = last3.every(d => d === 9);
        
        if (allZeros) {
          return { matched: true, contractType: 'DIGITOVER', barrier: '0', patternDigits: patternKey };
        }
        if (allNines) {
          return { matched: true, contractType: 'DIGITUNDER', barrier: '9', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      case 'over0_under9_4': {
        if (digits.length < 4) return { matched: false };
        const last4 = digits.slice(-4);
        const patternKey = `${last4.join(',')}`;
        const allZeros = last4.every(d => d === 0);
        const allNines = last4.every(d => d === 9);
        
        if (allZeros) {
          return { matched: true, contractType: 'DIGITOVER', barrier: '0', patternDigits: patternKey };
        }
        if (allNines) {
          return { matched: true, contractType: 'DIGITUNDER', barrier: '9', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      case 'over1_under8_2': {
        if (digits.length < 2) return { matched: false };
        const last2 = digits.slice(-2);
        const patternKey = `${last2.join(',')}`;
        
        if (last2[0] === 0 && last2[1] === 0) {
          return { matched: true, contractType: 'DIGITOVER', barrier: '1', patternDigits: patternKey };
        }
        if (last2[0] === 9 && last2[1] === 9) {
          return { matched: true, contractType: 'DIGITUNDER', barrier: '8', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      case 'over1_under8_3': {
        if (digits.length < 3) return { matched: false };
        const last3 = digits.slice(-3);
        const patternKey = `${last3.join(',')}`;
        const allZeros = last3.every(d => d === 0);
        const allNines = last3.every(d => d === 9);
        
        if (allZeros) {
          return { matched: true, contractType: 'DIGITOVER', barrier: '1', patternDigits: patternKey };
        }
        if (allNines) {
          return { matched: true, contractType: 'DIGITUNDER', barrier: '8', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      case 'over1_under8_4': {
        if (digits.length < 4) return { matched: false };
        const last4 = digits.slice(-4);
        const patternKey = `${last4.join(',')}`;
        const allZeros = last4.every(d => d === 0);
        const allNines = last4.every(d => d === 9);
        
        if (allZeros) {
          return { matched: true, contractType: 'DIGITOVER', barrier: '1', patternDigits: patternKey };
        }
        if (allNines) {
          return { matched: true, contractType: 'DIGITUNDER', barrier: '8', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      case 'over2_under7_2': {
        if (digits.length < 2) return { matched: false };
        const last2 = digits.slice(-2);
        const patternKey = `${last2.join(',')}`;
        const allLessThan2 = last2.every(d => d < 2);
        const allGreaterThan7 = last2.every(d => d > 7);
        
        if (allLessThan2) {
          return { matched: true, contractType: 'DIGITOVER', barrier: '2', patternDigits: patternKey };
        }
        if (allGreaterThan7) {
          return { matched: true, contractType: 'DIGITUNDER', barrier: '7', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      case 'over2_under7_3': {
        if (digits.length < 3) return { matched: false };
        const last3 = digits.slice(-3);
        const patternKey = `${last3.join(',')}`;
        const allLessThan2 = last3.every(d => d < 2);
        const allGreaterThan7 = last3.every(d => d > 7);
        
        if (allLessThan2) {
          return { matched: true, contractType: 'DIGITOVER', barrier: '2', patternDigits: patternKey };
        }
        if (allGreaterThan7) {
          return { matched: true, contractType: 'DIGITUNDER', barrier: '7', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      case 'over2_under7_4': {
        if (digits.length < 4) return { matched: false };
        const last4 = digits.slice(-4);
        const patternKey = `${last4.join(',')}`;
        const allLessThan2 = last4.every(d => d < 2);
        const allGreaterThan7 = last4.every(d => d > 7);
        
        if (allLessThan2) {
          return { matched: true, contractType: 'DIGITOVER', barrier: '2', patternDigits: patternKey };
        }
        if (allGreaterThan7) {
          return { matched: true, contractType: 'DIGITUNDER', barrier: '7', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      case 'over2_under7_5': {
        if (digits.length < 5) return { matched: false };
        const last5 = digits.slice(-5);
        const patternKey = `${last5.join(',')}`;
        const allLessThan2 = last5.every(d => d < 2);
        const allGreaterThan7 = last5.every(d => d > 7);
        
        if (allLessThan2) {
          return { matched: true, contractType: 'DIGITOVER', barrier: '2', patternDigits: patternKey };
        }
        if (allGreaterThan7) {
          return { matched: true, contractType: 'DIGITUNDER', barrier: '7', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      case 'over3_under6_4': {
        if (digits.length < 4) return { matched: false };
        const last4 = digits.slice(-4);
        const patternKey = `${last4.join(',')}`;
        const allLessThan3 = last4.every(d => d < 3);
        const allGreaterThan6 = last4.every(d => d > 6);
        
        if (allLessThan3) {
          return { matched: true, contractType: 'DIGITOVER', barrier: '3', patternDigits: patternKey };
        }
        if (allGreaterThan6) {
          return { matched: true, contractType: 'DIGITUNDER', barrier: '6', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      case 'over4_under5_4': {
        if (digits.length < 4) return { matched: false };
        const last4 = digits.slice(-4);
        const patternKey = `${last4.join(',')}`;
        const allOver4 = last4.every(d => d >= 5);
        const allUnder5 = last4.every(d => d <= 4);
        
        if (allOver4) {
          return { matched: true, contractType: 'DIGITOVER', barrier: '4', patternDigits: patternKey };
        }
        if (allUnder5) {
          return { matched: true, contractType: 'DIGITUNDER', barrier: '5', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      case 'over4_under5_5': {
        if (digits.length < 5) return { matched: false };
        const last5 = digits.slice(-5);
        const patternKey = `${last5.join(',')}`;
        const allOver4 = last5.every(d => d >= 5);
        const allUnder5 = last5.every(d => d <= 4);
        
        if (allOver4) {
          return { matched: true, contractType: 'DIGITOVER', barrier: '4', patternDigits: patternKey };
        }
        if (allUnder5) {
          return { matched: true, contractType: 'DIGITUNDER', barrier: '5', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      case 'over4_under5_6': {
        if (digits.length < 6) return { matched: false };
        const last6 = digits.slice(-6);
        const patternKey = `${last6.join(',')}`;
        const allOver4 = last6.every(d => d >= 5);
        const allUnder5 = last6.every(d => d <= 4);
        
        if (allOver4) {
          return { matched: true, contractType: 'DIGITOVER', barrier: '4', patternDigits: patternKey };
        }
        if (allUnder5) {
          return { matched: true, contractType: 'DIGITUNDER', barrier: '5', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      case 'over4_under5_7': {
        if (digits.length < 7) return { matched: false };
        const last7 = digits.slice(-7);
        const patternKey = `${last7.join(',')}`;
        const allOver4 = last7.every(d => d >= 5);
        const allUnder5 = last7.every(d => d <= 4);
        
        if (allOver4) {
          return { matched: true, contractType: 'DIGITOVER', barrier: '4', patternDigits: patternKey };
        }
        if (allUnder5) {
          return { matched: true, contractType: 'DIGITUNDER', barrier: '5', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      default:
        return { matched: false };
    }
  }, [m1StrategyType, isDataFresh, getRecentDigits]);

  // M2 Pattern Checker
  const checkM2Pattern = useCallback((symbol: string): { matched: boolean; contractType?: string; barrier?: string; patternDigits?: string } => {
    if (!isDataFresh(symbol)) {
      return { matched: false };
    }
    
    const digits = getRecentDigits(symbol, 10);
    if (digits.length === 0) return { matched: false };
    
    switch (m2RecoveryType) {
      case 'odd_even_3': {
        if (digits.length < 3) return { matched: false };
        const last3 = digits.slice(-3);
        const patternKey = `${last3.join(',')}`;
        const allOdd = last3.every(d => d % 2 !== 0);
        const allEven = last3.every(d => d % 2 === 0);
        
        if (allOdd) {
          return { matched: true, contractType: 'DIGITODD', patternDigits: patternKey };
        }
        if (allEven) {
          return { matched: true, contractType: 'DIGITEVEN', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      case 'odd_even_4': {
        if (digits.length < 4) return { matched: false };
        const last4 = digits.slice(-4);
        const patternKey = `${last4.join(',')}`;
        const allOdd = last4.every(d => d % 2 !== 0);
        const allEven = last4.every(d => d % 2 === 0);
        
        if (allOdd) {
          return { matched: true, contractType: 'DIGITODD', patternDigits: patternKey };
        }
        if (allEven) {
          return { matched: true, contractType: 'DIGITEVEN', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      case 'odd_even_5': {
        if (digits.length < 5) return { matched: false };
        const last5 = digits.slice(-5);
        const patternKey = `${last5.join(',')}`;
        const allOdd = last5.every(d => d % 2 !== 0);
        const allEven = last5.every(d => d % 2 === 0);
        
        if (allOdd) {
          return { matched: true, contractType: 'DIGITODD', patternDigits: patternKey };
        }
        if (allEven) {
          return { matched: true, contractType: 'DIGITEVEN', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      case 'odd_even_6': {
        if (digits.length < 6) return { matched: false };
        const last6 = digits.slice(-6);
        const patternKey = `${last6.join(',')}`;
        const allOdd = last6.every(d => d % 2 !== 0);
        const allEven = last6.every(d => d % 2 === 0);
        
        if (allOdd) {
          return { matched: true, contractType: 'DIGITODD', patternDigits: patternKey };
        }
        if (allEven) {
          return { matched: true, contractType: 'DIGITEVEN', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      case 'odd_even_7': {
        if (digits.length < 7) return { matched: false };
        const last7 = digits.slice(-7);
        const patternKey = `${last7.join(',')}`;
        const allOdd = last7.every(d => d % 2 !== 0);
        const allEven = last7.every(d => d % 2 === 0);
        
        if (allOdd) {
          return { matched: true, contractType: 'DIGITODD', patternDigits: patternKey };
        }
        if (allEven) {
          return { matched: true, contractType: 'DIGITEVEN', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      case 'odd_even_8': {
        if (digits.length < 8) return { matched: false };
        const last8 = digits.slice(-8);
        const patternKey = `${last8.join(',')}`;
        const allOdd = last8.every(d => d % 2 !== 0);
        const allEven = last8.every(d => d % 2 === 0);
        
        if (allOdd) {
          return { matched: true, contractType: 'DIGITODD', patternDigits: patternKey };
        }
        if (allEven) {
          return { matched: true, contractType: 'DIGITEVEN', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      case 'odd_even_9': {
        if (digits.length < 9) return { matched: false };
        const last9 = digits.slice(-9);
        const patternKey = `${last9.join(',')}`;
        const allOdd = last9.every(d => d % 2 !== 0);
        const allEven = last9.every(d => d % 2 === 0);
        
        if (allOdd) {
          return { matched: true, contractType: 'DIGITODD', patternDigits: patternKey };
        }
        if (allEven) {
          return { matched: true, contractType: 'DIGITEVEN', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      case 'over4_under5_5': {
        if (digits.length < 5) return { matched: false };
        const last5 = digits.slice(-5);
        const patternKey = `${last5.join(',')}`;
        const allOver4 = last5.every(d => d >= 5);
        const allUnder5 = last5.every(d => d <= 4);
        
        if (allOver4) {
          return { matched: true, contractType: 'DIGITOVER', barrier: '4', patternDigits: patternKey };
        }
        if (allUnder5) {
          return { matched: true, contractType: 'DIGITUNDER', barrier: '5', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      case 'over4_under5_6': {
        if (digits.length < 6) return { matched: false };
        const last6 = digits.slice(-6);
        const patternKey = `${last6.join(',')}`;
        const allOver4 = last6.every(d => d >= 5);
        const allUnder5 = last6.every(d => d <= 4);
        
        if (allOver4) {
          return { matched: true, contractType: 'DIGITOVER', barrier: '4', patternDigits: patternKey };
        }
        if (allUnder5) {
          return { matched: true, contractType: 'DIGITUNDER', barrier: '5', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      case 'over4_under5_7': {
        if (digits.length < 7) return { matched: false };
        const last7 = digits.slice(-7);
        const patternKey = `${last7.join(',')}`;
        const allOver4 = last7.every(d => d >= 5);
        const allUnder5 = last7.every(d => d <= 4);
        
        if (allOver4) {
          return { matched: true, contractType: 'DIGITOVER', barrier: '4', patternDigits: patternKey };
        }
        if (allUnder5) {
          return { matched: true, contractType: 'DIGITUNDER', barrier: '5', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      case 'over4_under5_8': {
        if (digits.length < 8) return { matched: false };
        const last8 = digits.slice(-8);
        const patternKey = `${last8.join(',')}`;
        const allOver4 = last8.every(d => d >= 5);
        const allUnder5 = last8.every(d => d <= 4);
        
        if (allOver4) {
          return { matched: true, contractType: 'DIGITOVER', barrier: '4', patternDigits: patternKey };
        }
        if (allUnder5) {
          return { matched: true, contractType: 'DIGITUNDER', barrier: '5', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      case 'over4_under5_9': {
        if (digits.length < 9) return { matched: false };
        const last9 = digits.slice(-9);
        const patternKey = `${last9.join(',')}`;
        const allOver4 = last9.every(d => d >= 5);
        const allUnder5 = last9.every(d => d <= 4);
        
        if (allOver4) {
          return { matched: true, contractType: 'DIGITOVER', barrier: '4', patternDigits: patternKey };
        }
        if (allUnder5) {
          return { matched: true, contractType: 'DIGITUNDER', barrier: '5', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      case 'over3_under6_5': {
        if (digits.length < 5) return { matched: false };
        const last5 = digits.slice(-5);
        const patternKey = `${last5.join(',')}`;
        const allLessThan3 = last5.every(d => d < 3);
        const allGreaterThan6 = last5.every(d => d > 6);
        
        if (allLessThan3) {
          return { matched: true, contractType: 'DIGITOVER', barrier: '3', patternDigits: patternKey };
        }
        if (allGreaterThan6) {
          return { matched: true, contractType: 'DIGITUNDER', barrier: '6', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      case 'over3_under6_7': {
        if (digits.length < 7) return { matched: false };
        const last7 = digits.slice(-7);
        const patternKey = `${last7.join(',')}`;
        const allLessThan3 = last7.every(d => d < 3);
        const allGreaterThan6 = last7.every(d => d > 6);
        
        if (allLessThan3) {
          return { matched: true, contractType: 'DIGITOVER', barrier: '3', patternDigits: patternKey };
        }
        if (allGreaterThan6) {
          return { matched: true, contractType: 'DIGITUNDER', barrier: '6', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      case 'same_direction_3':
      case 'same_direction_4':
      case 'same_direction_5':
      case 'same_direction_6':
      case 'same_direction_7':
      case 'same_direction_8':
      case 'same_direction_9':
      case 'same_direction_10': {
        const tickLength = parseInt(m2RecoveryType.split('_')[2]);
        if (digits.length < tickLength) return { matched: false };
        
        const lastNDigits = digits.slice(-tickLength);
        const patternKey = lastNDigits.join(',');
        const allEven = lastNDigits.every(d => d % 2 === 0);
        const allOdd = lastNDigits.every(d => d % 2 !== 0);
        
        if (allEven) {
          return { matched: true, contractType: 'DIGITEVEN', patternDigits: patternKey };
        }
        if (allOdd) {
          return { matched: true, contractType: 'DIGITODD', patternDigits: patternKey };
        }
        return { matched: false };
      }
      
      default:
        return { matched: false };
    }
  }, [m2RecoveryType, isDataFresh, getRecentDigits]);

  const addDetectedPattern = useCallback((symbol: string, name: string, patternType: string, digits: number[], contractType?: string, last15Ticks?: number[]) => {
    const newPattern: DetectedPattern = {
      symbol,
      name,
      patternType,
      timestamp: Date.now(),
      digits: [...digits],
      contractType,
      last15Ticks: last15Ticks || [...digits]
    };
    setDetectedPatterns(prev => [newPattern, ...prev].slice(0, 10));
    setActivePattern(newPattern);
    if (isScannerVoiceActive) {
      playPatternVoice();
    }
    setTimeout(() => {
      setDetectedPatterns(prev => prev.filter(p => p.timestamp !== newPattern.timestamp));
    }, 5000);
  }, [isScannerVoiceActive]);

  const updatePatternResult = useCallback((symbol: string, result: 'Win' | 'Loss', pnl: number, stakeAmount: number) => {
    setActivePattern(prev => prev && prev.symbol === symbol ? { ...prev, result, pnl, stake: stakeAmount } : prev);
    setTradeResult({ result, pnl });
  }, []);

  const findM1Match = useCallback((): { symbol: string; contractType: string; barrier?: string; patternDigits: string; digitsArray: number[]; last15Ticks: number[] } | null => {
    if (Date.now() - lastTradeOverallRef.current < 2000) return null;
    
    for (const market of SCANNER_MARKETS) {
      const hasSubscription = subscriptionStatusRef.current.get(market.symbol);
      if (!hasSubscription) {
        if (derivApi.isConnected) {
          derivApi.subscribeTicks(market.symbol as MarketSymbol, () => {}).catch(() => {});
        }
        continue;
      }
      
      const result = checkM1Pattern(market.symbol);
      if (result.matched && result.contractType && result.patternDigits) {
        const digits = getRecentDigits(market.symbol, 8);
        const last15Ticks = getLast15Ticks(market.symbol);
        addDetectedPattern(market.symbol, market.name, `M1: ${m1StrategyType}`, digits, result.contractType, last15Ticks);
        
        const lastPattern = lastPatternDigitsRef.current.get(market.symbol);
        if (lastPattern === result.patternDigits) {
          logDebug(`[M1] Skipping duplicate pattern for ${market.symbol}: ${result.patternDigits}`);
          continue;
        }
        
        const lastTrade = lastTradeTimeRef.current.get(market.symbol) || 0;
        if (Date.now() - lastTrade < 30000) {
          logDebug(`[M1] Cooldown active for ${market.symbol}, last trade: ${new Date(lastTrade).toLocaleTimeString()}`);
          continue;
        }
        
        logDebug(`[M1] ✅ PATTERN FOUND on ${market.symbol}: ${result.patternDigits} (${result.contractType}${result.barrier ? ` barrier ${result.barrier}` : ''})`);
        
        return { 
          symbol: market.symbol, 
          contractType: result.contractType, 
          barrier: result.barrier,
          patternDigits: result.patternDigits,
          digitsArray: digits,
          last15Ticks
        };
      }
    }
    return null;
  }, [checkM1Pattern, m1StrategyType, addDetectedPattern, getRecentDigits]);

  const findM2Match = useCallback((): { symbol: string; contractType: string; barrier?: string; patternDigits: string; digitsArray: number[]; last15Ticks: number[] } | null => {
    if (Date.now() - lastTradeOverallRef.current < 2000) return null;
    
    const isSameDirectionStrategy = m2RecoveryType.startsWith('same_direction_');
    
    if (isSameDirectionStrategy) {
      const match = findSameDirectionMatch(m2RecoveryType);
      if (match) {
        const market = SCANNER_MARKETS.find(m => m.symbol === match.symbol);
        if (market) {
          const digits = getSameDirectionRecentDigits(match.symbol, match.tickLength);
          addDetectedPattern(match.symbol, market.name, `M2: ${m2RecoveryType} (${match.tickLength} ticks)`, digits, match.contractType, match.last15Ticks);
          
          const lastPattern = lastPatternDigitsRef.current.get(match.symbol);
          if (lastPattern === match.patternDigits) {
            logDebug(`[Same Direction M2] Skipping duplicate pattern for ${match.symbol}: ${match.patternDigits}`);
            return null;
          }
          
          const lastTrade = lastTradeTimeRef.current.get(match.symbol) || 0;
          if (Date.now() - lastTrade < 30000) {
            logDebug(`[Same Direction M2] Cooldown active for ${match.symbol}, last trade: ${new Date(lastTrade).toLocaleTimeString()}`);
            return null;
          }
          
          logDebug(`[Same Direction M2] ✅ PATTERN FOUND on ${match.symbol} (${match.tickLength} ticks): ${match.patternDigits} -> ${match.contractType}`);
          
          return {
            symbol: match.symbol,
            contractType: match.contractType,
            patternDigits: match.patternDigits,
            digitsArray: digits,
            last15Ticks: match.last15Ticks
          };
        }
      }
      return null;
    }
    
    for (const market of SCANNER_MARKETS) {
      const hasSubscription = subscriptionStatusRef.current.get(market.symbol);
      if (!hasSubscription) {
        if (derivApi.isConnected) {
          derivApi.subscribeTicks(market.symbol as MarketSymbol, () => {}).catch(() => {});
        }
        continue;
      }
      
      const result = checkM2Pattern(market.symbol);
      if (result.matched && result.contractType && result.patternDigits) {
        const digits = getRecentDigits(market.symbol, 8);
        const last15Ticks = getLast15Ticks(market.symbol);
        addDetectedPattern(market.symbol, market.name, `M2: ${m2RecoveryType}`, digits, result.contractType, last15Ticks);
        
        const lastPattern = lastPatternDigitsRef.current.get(market.symbol);
        if (lastPattern === result.patternDigits) {
          logDebug(`[M2] Skipping duplicate pattern for ${market.symbol}: ${result.patternDigits}`);
          continue;
        }
        
        const lastTrade = lastTradeTimeRef.current.get(market.symbol) || 0;
        if (Date.now() - lastTrade < 30000) {
          logDebug(`[M2] Cooldown active for ${market.symbol}, last trade: ${new Date(lastTrade).toLocaleTimeString()}`);
          continue;
        }
        
        logDebug(`[M2] ✅ PATTERN FOUND on ${market.symbol}: ${result.patternDigits} (${result.contractType}${result.barrier ? ` barrier ${result.barrier}` : ''})`);
        
        return { 
          symbol: market.symbol, 
          contractType: result.contractType, 
          barrier: result.barrier,
          patternDigits: result.patternDigits,
          digitsArray: digits,
          last15Ticks
        };
      }
    }
    return null;
  }, [checkM2Pattern, m2RecoveryType, addDetectedPattern, getRecentDigits]);

  const addLog = useCallback((id: number, entry: Omit<LogEntry, 'id'>) => {
    setLogEntries(prev => [{ ...entry, id }, ...prev].slice(0, 100));
  }, []);

  const updateLog = useCallback((id: number, updates: Partial<LogEntry>) => {
    setLogEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const clearLog = useCallback(() => {
    setLogEntries([]);
    setWins(0); 
    setLosses(0); 
    setFailedTrades(0);
    setTotalStaked(0); 
    setNetProfit(0);
    setMartingaleStepState(0);
    tpNotifiedRef.current = false;
    slNotifiedRef.current = false;
    lastPnlRef.current = 0;
    netProfitRef.current = 0;
  }, []);

  const updateBalanceAndProfit = useCallback(async (pnl: number, contractId?: string): Promise<{ newProfit: number; newBalance: number }> => {
    const newProfit = netProfitRef.current + pnl;
    const newBalance = localBalanceRef.current + pnl;
    
    netProfitRef.current = newProfit;
    localBalanceRef.current = newBalance;
    
    setNetProfit(newProfit);
    setLocalBalance(newBalance);
    
    logDebug(`Immediate UI update - P&L: ${pnl}, New Profit: ${newProfit}, New Balance: ${newBalance}`);
    
    if (refreshBalance) {
      try {
        await new Promise(resolve => setTimeout(resolve, IMMEDIATE_BALANCE_SYNC_DELAY));
        await refreshBalance();
        const apiBal = apiBalance;
        if (Math.abs(apiBal - localBalanceRef.current) > 0.01) {
          logDebug(`Balance discrepancy detected - Local: $${localBalanceRef.current}, API: $${apiBal}. Syncing...`);
          setLocalBalance(apiBal);
          localBalanceRef.current = apiBal;
          const adjustedProfit = apiBal - (localBalanceRef.current - pnl);
          setNetProfit(adjustedProfit);
          netProfitRef.current = adjustedProfit;
        } else {
          logDebug(`Balance verified - API balance: $${apiBal} matches local`);
        }
        
        return { newProfit: netProfitRef.current, newBalance: localBalanceRef.current };
      } catch (error) {
        logDebug('Post-trade balance sync failed:', error);
      }
    }
    
    return { newProfit, newBalance };
  }, [apiBalance, refreshBalance]);

  const executeRealTrade = useCallback(async (
    contractType: string,
    barrier: string | undefined,
    tradeSymbol: string,
    cStake: number,
    mStep: number,
    mkt: 1 | 2,
    currentLocalBalance: number,
    currentNetProfit: number,
    baseStake: number,
    patternDigits: string,
    patternDigitsArray: number[],
    last15Ticks: number[]
  ) => {
    if (!derivApi.isConnected) {
      const connected = await ensureConnection();
      if (!connected) {
        throw new Error('No connection available');
      }
    }
    
    const now = new Date().toLocaleTimeString();
    setTotalStaked(prev => prev + cStake);
    setCurrentStakeState(cStake);

    lastPatternDigitsRef.current.set(tradeSymbol, patternDigits);
    lastTradeTimeRef.current.set(tradeSymbol, Date.now());
    lastTradeOverallRef.current = Date.now();

    let updatedLocalBalance = currentLocalBalance;
    let updatedNetProfit = currentNetProfit;
    let contractId: string | null = null;

    try {
      await waitForNextTick(tradeSymbol as MarketSymbol);

      const buyParams: any = {
        contract_type: contractType, symbol: tradeSymbol,
        duration: 1, duration_unit: 't', basis: 'stake', amount: cStake,
      };
      if (barrier) buyParams.barrier = barrier;

      const buyResult = await derivApi.buyContract(buyParams);
      
      // Check if the buy was successful and we have a valid contractId
      if (!buyResult || !buyResult.contractId) {
        logDebug(`❌ Failed to buy contract - No contract ID returned for ${tradeSymbol}`);
        setFailedTrades(prev => prev + 1);
        // Don't add to log - no trade was actually executed
        return { 
          localPnl: updatedNetProfit, 
          localBalance: updatedLocalBalance, 
          cStake, 
          mStep, 
          inRecovery: mkt === 2, 
          shouldBreak: false,
          tradeExecuted: false
        };
      }
      
      contractId = buyResult.contractId;
      logDebug(`✅ Contract purchased successfully - ID: ${contractId}, Stake: $${cStake}`);
      
      if (copyTradingService.enabled) {
        copyTradingService.copyTrade({
          ...buyParams,
          masterTradeId: contractId,
        }).catch(err => console.error('Copy trading error:', err));
      }
      
      const result = await derivApi.waitForContractResult(contractId);
      const won = result.status === 'won';
      const pnl = result.profit;
      
      // Only add to log if trade was successful
      const logId = ++logIdRef.current;
      addLog(logId, {
        time: now, market: mkt === 1 ? 'M1' : 'M2', symbol: tradeSymbol,
        contract: contractType, stake: cStake, martingaleStep: mStep,
        exitDigit: '...', result: 'Pending', pnl: 0, balance: currentLocalBalance,
        switchInfo: `Pattern: ${patternDigits} | Last 15: ${last15Ticks.join(',')}`,
      });
      
      updatePatternResult(tradeSymbol, won ? 'Win' : 'Loss', pnl, cStake);
      
      const { newProfit, newBalance } = await updateBalanceAndProfit(pnl, contractId);
      updatedNetProfit = newProfit;
      updatedLocalBalance = newBalance;
      
      if (won) {
        setWins(prev => prev + 1);
      } else {
        setLosses(prev => prev + 1);
        if (activeAccount?.is_virtual) {
          recordLoss(cStake, tradeSymbol, 6000);
        }
      }

      const exitDigit = String(getLastDigit(result.sellPrice || 0));

      let switchInfo = `Pattern: ${patternDigits} | Exit: ${exitDigit} | Last 15: ${last15Ticks.join(',')}`;
      let shouldResetMartingale = false;
      let inRecovery = mkt === 2;
      
      if (won) {
        if (inRecovery) {
          switchInfo += ' ✓ Recovery WIN → Back to M1';
          inRecovery = false;
          shouldResetMartingale = true;
        } else {
          switchInfo += ' ✓ WIN → Continue scanning';
          shouldResetMartingale = true;
        }
      } else {
        if (martingaleOn && mStep < parseInt(martingaleMaxSteps)) {
          cStake = parseFloat((cStake * (parseFloat(martingaleMultiplier) || 2)).toFixed(2));
          mStep++;
          
          if (!inRecovery && m2Enabled) {
            inRecovery = true;
            switchInfo += ` ✗ Loss → Martingale (Step ${mStep}) → M2 Recovery`;
          } else if (!inRecovery && !m2Enabled) {
            switchInfo += ` ✗ Loss → Martingale (Step ${mStep}) → Continue M1`;
          } else if (inRecovery) {
            switchInfo += ` ✗ Loss → Martingale (Step ${mStep}) → Stay M2`;
          }
        } else {
          switchInfo += martingaleOn ? ` ✗ Loss → Max steps reached. Reset.` : ' ✗ Loss → Martingale disabled. Reset.';
          shouldResetMartingale = true;
          
          if (!inRecovery && m2Enabled) {
            inRecovery = true;
            switchInfo += ' → M2 Recovery';
          }
        }
      }
      
      if (shouldResetMartingale) {
        mStep = 0;
        cStake = baseStake;
      }

      setMartingaleStepState(mStep);
      setCurrentStakeState(cStake);

      updateLog(logId, { 
        exitDigit, 
        result: won ? 'Win' : 'Loss', 
        pnl, 
        balance: updatedLocalBalance, 
        switchInfo 
      });

      let shouldBreak = false;
      if (updatedNetProfit >= parseFloat(takeProfit)) {
        showTPNotification('tp', `Take Profit Hit!`, updatedNetProfit);
        shouldBreak = true;
      }
      if (updatedNetProfit <= -parseFloat(stopLoss)) {
        showTPNotification('sl', `Stop Loss Hit!`, Math.abs(updatedNetProfit));
        shouldBreak = true;
      }
      if (updatedLocalBalance < cStake) {
        shouldBreak = true;
      }

      return { 
        localPnl: updatedNetProfit, 
        localBalance: updatedLocalBalance, 
        cStake, 
        mStep, 
        inRecovery, 
        shouldBreak,
        tradeExecuted: true
      };
    } catch (err: any) {
      logDebug('Trade execution error:', err);
      setFailedTrades(prev => prev + 1);
      // Don't add to log - no trade was actually executed
      return { 
        localPnl: updatedNetProfit, 
        localBalance: updatedLocalBalance, 
        cStake, 
        mStep, 
        inRecovery: mkt === 2, 
        shouldBreak: false,
        tradeExecuted: false
      };
    }
  }, [addLog, updateLog, m2Enabled, martingaleOn, martingaleMultiplier, martingaleMaxSteps, takeProfit, stopLoss, activeAccount, recordLoss, ensureConnection, updateBalanceAndProfit, updatePatternResult]);

  const startBot = useCallback(async () => {
    if (!isAuthorized || isRunning) {
      logDebug('Cannot start: not authorized or already running');
      return;
    }
    
    logDebug('Starting bot...');
    
    const connected = await ensureConnection();
    if (!connected) {
      logDebug('Failed to establish connection');
      return;
    }
    
    const baseStake = parseFloat(stake);
    if (baseStake < 0.35) { 
      logDebug('Stake too low, minimum 0.35');
      return; 
    }
    if (!m1Enabled && !m2Enabled) { 
      logDebug('Both markets disabled');
      return; 
    }

    // Reset all state before starting
    setIsRunning(true);
    runningRef.current = true;
    setCurrentMarket(1);
    setBotStatus('trading_m1');
    setCurrentStakeState(baseStake);
    setMartingaleStepState(0);
    
    lastTradeTimeRef.current.clear();
    lastPatternDigitsRef.current.clear();
    lastTradeOverallRef.current = 0;
    tpNotifiedRef.current = false;
    slNotifiedRef.current = false;
    lastPnlRef.current = 0;

    await forceImmediateBalanceUpdate();
    
    const startBalance = localBalanceRef.current;
    setLocalBalance(startBalance);
    setNetProfit(0);
    netProfitRef.current = 0;
    setWins(0);
    setLosses(0);
    setFailedTrades(0);
    setTotalStaked(0);
    setLogEntries([]); // Clear old logs

    let cStake = baseStake;
    let mStep = 0;
    let inRecovery = false;
    let currentNetProfit = 0;
    let currentLocalBalance = startBalance;
    let waitingForPatternAfterLoss = false;

    // Initialize bot state for recovery
    botStateRef.current = {
      cStake,
      mStep,
      inRecovery,
      currentNetProfit,
      currentLocalBalance,
      baseStake,
      waitingForPatternAfterLoss
    };

    while (runningRef.current) {
      // Update bot state periodically for recovery
      botStateRef.current = {
        cStake,
        mStep,
        inRecovery,
        currentNetProfit,
        currentLocalBalance,
        baseStake,
        waitingForPatternAfterLoss
      };
      
      // Check connection status before each trade attempt
      if (!derivApi.isConnected) {
        logDebug('Connection lost during trading, attempting reconnect...');
        const reconnected = await ensureConnection();
        if (!reconnected) {
          logDebug('Failed to reconnect, stopping bot');
          break;
        }
        // After successful reconnection, continue the loop with restored state
        continue;
      }
      
      const mkt: 1 | 2 = inRecovery ? 2 : 1;
      setCurrentMarket(mkt);

      if (mkt === 1 && !m1Enabled) { if (m2Enabled) { inRecovery = true; continue; } else break; }
      if (mkt === 2 && !m2Enabled) { inRecovery = false; continue; }

      let tradeSymbol: string;
      let contractType: string;
      let barrier: string | undefined;
      let patternDigits: string;
      let digitsArray: number[];
      let last15Ticks: number[] = [];

      if (waitingForPatternAfterLoss) {
        logDebug('⏳ Waiting for fresh pattern after loss');
        await new Promise(r => setTimeout(r, 1000));
        waitingForPatternAfterLoss = false;
        continue;
      }

      if (!inRecovery && strategyM1Enabled && m1StrategyType !== 'disabled') {
        setBotStatus('waiting_pattern');

        let matched = false;
        let matchData: { symbol: string; contractType: string; barrier?: string; patternDigits: string; digitsArray: number[]; last15Ticks: number[] } | null = null;
        let attempts = 0;
        
        while (runningRef.current && !matched && attempts < MAX_SCAN_ATTEMPTS) {
          if (!derivApi.isConnected) {
            const reconnected = await ensureConnection();
            if (!reconnected) break;
          }
          
          matchData = findM1Match();
          if (matchData) {
            matched = true;
            logDebug(`M1 pattern matched after ${attempts} attempts`);
          }
          if (!matched) {
            await new Promise<void>(r => setTimeout(r, SCAN_INTERVAL));
            attempts++;
          }
        }
        if (!runningRef.current || !matched) {
          if (!matched) logDebug('M1 scan completed without pattern, continuing...');
          continue;
        }

        setBotStatus('pattern_matched');
        tradeSymbol = matchData!.symbol;
        contractType = matchData!.contractType;
        barrier = matchData!.barrier;
        patternDigits = matchData!.patternDigits;
        digitsArray = matchData!.digitsArray;
        last15Ticks = matchData!.last15Ticks;
        await new Promise(r => setTimeout(r, 500));
      }
      else if (inRecovery && strategyM2Enabled && m2RecoveryType !== 'disabled') {
        setBotStatus('waiting_pattern');

        let matched = false;
        let matchData: { symbol: string; contractType: string; barrier?: string; patternDigits: string; digitsArray: number[]; last15Ticks: number[] } | null = null;
        let attempts = 0;
        
        while (runningRef.current && !matched && attempts < MAX_SCAN_ATTEMPTS) {
          if (!derivApi.isConnected) {
            const reconnected = await ensureConnection();
            if (!reconnected) break;
          }
          
          matchData = findM2Match();
          if (matchData) {
            matched = true;
            logDebug(`M2 pattern matched after ${attempts} attempts`);
          }
          if (!matched) {
            await new Promise<void>(r => setTimeout(r, SCAN_INTERVAL));
            attempts++;
          }
        }
        if (!runningRef.current || !matched) {
          if (!matched) logDebug('M2 scan completed without pattern, continuing...');
          continue;
        }

        setBotStatus('pattern_matched');
        tradeSymbol = matchData!.symbol;
        contractType = matchData!.contractType;
        barrier = matchData!.barrier;
        patternDigits = matchData!.patternDigits;
        digitsArray = matchData!.digitsArray;
        last15Ticks = matchData!.last15Ticks;
        await new Promise(r => setTimeout(r, 500));
      }
      else {
        setBotStatus(mkt === 1 ? 'trading_m1' : 'recovery');
        tradeSymbol = 'R_100';
        contractType = 'DIGITEVEN';
        barrier = undefined;
        patternDigits = 'default';
        digitsArray = [];
        last15Ticks = [];
      }

      const result = await executeRealTrade(
        contractType, barrier, tradeSymbol, cStake, mStep, mkt, currentLocalBalance, currentNetProfit, baseStake, patternDigits, digitsArray, last15Ticks
      );
      if (!result || !runningRef.current) break;
      
      // Only update state if trade was actually executed
      if (result.tradeExecuted) {
        const wasLoss = result.cStake !== cStake || result.mStep !== mStep || result.inRecovery !== inRecovery;
        if (wasLoss && !result.shouldBreak && martingaleOn && result.mStep > 0 && !result.inRecovery) {
          waitingForPatternAfterLoss = true;
        }
        
        currentNetProfit = result.localPnl;
        currentLocalBalance = result.localBalance;
        cStake = result.cStake;
        mStep = result.mStep;
        inRecovery = result.inRecovery;

        if (result.shouldBreak) {
          logDebug('Break condition met, stopping bot');
          break;
        }
      } else {
        // Trade failed to execute - wait before retrying
        logDebug('Trade execution failed, waiting before retry...');
        await new Promise(r => setTimeout(r, 2000));
      }

      await new Promise(r => setTimeout(r, 1000));
    }

    setIsRunning(false);
    runningRef.current = false;
    setBotStatus('idle');
    setIsScannerVoiceActive(false);
    botStateRef.current = null;
    logDebug('Bot stopped');
  }, [isAuthorized, isRunning, stake, m1Enabled, m2Enabled,
    martingaleOn, martingaleMultiplier, martingaleMaxSteps, takeProfit, stopLoss,
    strategyM1Enabled, strategyM2Enabled, m1StrategyType, m2RecoveryType,
    findM1Match, findM2Match, addLog, updateLog, executeRealTrade, ensureConnection, forceImmediateBalanceUpdate]);

  const statusConfig: Record<BotStatus, { icon: string; label: string; color: string }> = {
    idle: { icon: '⚪', label: 'IDLE', color: 'text-slate-400' },
    trading_m1: { icon: '🟢', label: 'TRADING M1', color: 'text-emerald-400' },
    recovery: { icon: '🟣', label: 'RECOVERY MODE', color: 'text-fuchsia-400' },
    waiting_pattern: { icon: '🟡', label: 'WAITING PATTERN', color: 'text-amber-400' },
    pattern_matched: { icon: '✅', label: 'PATTERN MATCHED', color: 'text-emerald-400' },
    reconnecting: { icon: '🔄', label: 'RECONNECTING...', color: 'text-orange-400' },
  };

  const status = statusConfig[botStatus];
  const winRate = wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : '0.0';

  const dollarColors = ['text-emerald-400', 'text-cyan-400', 'text-amber-400', 'text-rose-400', 'text-purple-400', 'text-blue-400', 'text-indigo-400', 'text-pink-400'];

  const getM1DisplayName = (type: M1StrategyType): string => {
    switch (type) {
      case 'over0_under9_1': return '🎯 Over 0 / Under 9 (1 tick)';
      case 'over0_under9_2': return '🎯 Over 0 / Under 9 (2 ticks)';
      case 'over0_under9_3': return '🎯 Over 0 / Under 9 (3 ticks)';
      case 'over0_under9_4': return '🎯 Over 0 / Under 9 (4 ticks)';
      case 'over1_under8_2': return '🎯 Over 1 / Under 8 (2 ticks)';
      case 'over1_under8_3': return '🎯 Over 1 / Under 8 (3 ticks)';
      case 'over1_under8_4': return '🎯 Over 1 / Under 8 (4 ticks)';
      case 'over2_under7_2': return '🎯 Over 2 / Under 7 (2 ticks)';
      case 'over2_under7_3': return '🎯 Over 2 / Under 7 (3 ticks)';
      case 'over2_under7_4': return '🎯 Over 2 / Under 7 (4 ticks)';
      case 'over2_under7_5': return '🎯 Over 2 / Under 7 (5 ticks)';
      case 'over3_under6_4': return '🎯 Over 3 / Under 6 (4 ticks)';
      case 'over4_under5_4': return '🎯 Over 4 / Under 5 (4 ticks)';
      case 'over4_under5_5': return '🎯 Over 4 / Under 5 (5 ticks)';
      case 'over4_under5_6': return '🎯 Over 4 / Under 5 (6 ticks)';
      case 'over4_under5_7': return '🎯 Over 4 / Under 5 (7 ticks)';
      default: return 'Select strategy';
    }
  };

  const getM2DisplayName = (type: M2RecoveryType): string => {
    switch (type) {
      case 'odd_even_3': return '🔄 Even / Odd (3 ticks)';
      case 'odd_even_4': return '🔄 Even / Odd (4 ticks)';
      case 'odd_even_5': return '🔄 Even / Odd (5 ticks)';
      case 'odd_even_6': return '🔄 Even / Odd (6 ticks)';
      case 'odd_even_7': return '🔄 Even / Odd (7 ticks)';
      case 'odd_even_8': return '🔄 Even / Odd (8 ticks)';
      case 'odd_even_9': return '🔄 Even / Odd (9 ticks)';
      case 'over4_under5_5': return '🎯 Over 4 / Under 5 (5 ticks)';
      case 'over4_under5_6': return '🎯 Over 4 / Under 5 (6 ticks)';
      case 'over4_under5_7': return '🎯 Over 4 / Under 5 (7 ticks)';
      case 'over4_under5_8': return '🎯 Over 4 / Under 5 (8 ticks)';
      case 'over4_under5_9': return '🎯 Over 4 / Under 5 (9 ticks)';
      case 'over3_under6_5': return '🎯 Over 3 / Under 6 (5 ticks)';
      case 'over3_under6_7': return '🎯 Over 3 / Under 6 (7 ticks)';
      case 'same_direction_3': return '🔢 Same Direction (3 ticks)';
      case 'same_direction_4': return '🔢 Same Direction (4 ticks)';
      case 'same_direction_5': return '🔢 Same Direction (5 ticks)';
      case 'same_direction_6': return '🔢 Same Direction (6 ticks)';
      case 'same_direction_7': return '🔢 Same Direction (7 ticks)';
      case 'same_direction_8': return '🔢 Same Direction (8 ticks)';
      case 'same_direction_9': return '🔢 Same Direction (9 ticks)';
      case 'same_direction_10': return '🔢 Same Direction (10 ticks)';
      default: return 'Select strategy';
    }
  };

  const hasDetectedPatterns = detectedPatterns.length > 0;

  const getStrengthDisplay = (strength: number) => {
    if (strength >= 70) return { text: 'VERY STRONG', color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
    if (strength >= 55) return { text: 'STRONG', color: 'text-cyan-400', bg: 'bg-cyan-500/20' };
    if (strength >= 40) return { text: 'MODERATE', color: 'text-amber-400', bg: 'bg-amber-500/20' };
    return { text: 'WEAK', color: 'text-slate-400', bg: 'bg-slate-500/20' };
  };

  const getSignalDisplay = (signal: string | null) => {
    if (!signal) return { label: 'ANALYZING', color: 'text-slate-400', bg: 'bg-slate-500/20' };
    switch (signal) {
      case 'EVEN': return { label: 'EVEN', color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
      case 'ODD': return { label: 'ODD', color: 'text-red-400', bg: 'bg-red-500/20' };
      case 'OVER': return { label: 'OVER', color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
      case 'UNDER': return { label: 'UNDER', color: 'text-red-400', bg: 'bg-red-500/20' };
      default: return { label: 'ANALYZING', color: 'text-slate-400', bg: 'bg-slate-500/20' };
    }
  };

  const isPatternVisible = showPatternDetection;
  const isLiveMarketsVisible = showLiveMarkets;
  const isStrongestVisible = showStrongestMarkets;

  const getPatternLiveGridClass = () => {
    if (isPatternVisible && isLiveMarketsVisible) return 'grid-cols-1 lg:grid-cols-2';
    return 'grid-cols-1';
  };

  return (
    <>
      <style>{notificationStyles}</style>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
        <div className="space-y-3 max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-xl px-4 py-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg shadow-lg">
                  <Scan className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    Milliefx Ultimate 2026 Bot
                  </h1>
                  <p className="text-xs text-slate-400">RamzfxFX Ultimate Market Scanner & Recovery Suite🚀🔥🚀</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={`${status.color} bg-slate-800/50 border-slate-700 text-[10px] px-3 py-1`}>
                  {status.icon} {status.label}
                </Badge>
                {isRunning && (
                  <Badge variant="outline" className="text-[10px] text-amber-400 animate-pulse border-amber-500/30 bg-amber-500/10">
                    P/L: ${netProfit.toFixed(2)}
                  </Badge>
                )}
                {isRunning && (
                  <Badge variant="outline" className={`text-[10px] ${currentMarket === 1 ? 'text-emerald-400 border-emerald-500/30' : 'text-fuchsia-400 border-fuchsia-500/30'} bg-slate-800/50`}>
                    {currentMarket === 1 ? '🏠 M1' : '🔄 M2'}
                  </Badge>
                )}
                {failedTrades > 0 && (
                  <Badge variant="outline" className="text-[10px] text-orange-400 border-orange-500/30 bg-orange-500/10">
                    Failed: {failedTrades}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Markets Row - Horizontal (M1 and M2) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Market 1 */}
            <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm border-2 border-emerald-500/30 rounded-xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
                  <Home className="w-4 h-4" /> Market 1 Bot🚀
                </h3>
                <div className="flex items-center gap-2">
                  {currentMarket === 1 && isRunning && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                  <Switch checked={m1Enabled} onCheckedChange={setM1Enabled} disabled={isRunning} />
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-400 mb-1.5 block font-semibold">Strategy Mode</label>
                  <Select value={m1StrategyType} onValueChange={(v: M1StrategyType) => {
                    setM1StrategyType(v);
                    if (v !== 'disabled') {
                      setStrategyM1Enabled(true);
                      setScannerActive(true);
                    }
                  }} disabled={isRunning}>
                    <SelectTrigger className="h-10 text-sm bg-slate-800/50 border-slate-700 text-slate-200">
                      <SelectValue placeholder="Select strategy" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 max-h-[300px] overflow-y-auto">
                      <SelectItem disabled>Over/Under (last digits pattern based) Reversal Direction</SelectItem>
                      <SelectItem value="over0_under9_1">🎯 Over 0 / Under 9 (1 tick)</SelectItem>
                      <SelectItem value="over0_under9_2">🎯 Over 0 / Under 9 (2 ticks)</SelectItem>
                      <SelectItem value="over0_under9_3">🎯 Over 0 / Under 9 (3 ticks)</SelectItem>
                      <SelectItem value="over0_under9_4">🎯 Over 0 / Under 9 (4 ticks)</SelectItem>
                      <SelectItem value="over1_under8_2">🎯 Over 1 / Under 8 (2 ticks)</SelectItem>
                      <SelectItem value="over1_under8_3">🎯 Over 1 / Under 8 (3 ticks)</SelectItem>
                      <SelectItem value="over1_under8_4">🎯 Over 1 / Under 8 (4 ticks)</SelectItem>
                      <SelectItem value="over2_under7_2">🎯 Over 2 / Under 7 (2 ticks)</SelectItem>
                      <SelectItem value="over2_under7_3">🎯 Over 2 / Under 7 (3 ticks)</SelectItem>
                      <SelectItem value="over2_under7_4">🎯 Over 2 / Under 7 (4 ticks)</SelectItem>
                      <SelectItem value="over2_under7_5">🎯 Over 2 / Under 7 (5 ticks)</SelectItem>
                      <SelectItem value="over3_under6_4">🎯 Over 3 / Under 6 (4 ticks)</SelectItem>
                      <SelectItem value="over4_under5_4">🎯 Over 4 / Under 5 (4 ticks)</SelectItem>
                      <SelectItem value="over4_under5_5">🎯 Over 4 / Under 5 (5 ticks)</SelectItem>
                      <SelectItem value="over4_under5_6">🎯 Over 4 / Under 5 (6 ticks)</SelectItem>
                      <SelectItem value="over4_under5_7">🎯 Over 4 / Under 5 (7 ticks)</SelectItem>
                    </SelectContent>
                  </Select>
                  {m1StrategyType !== 'disabled' && (
                    <div className="text-[10px] text-emerald-400 mt-2 animate-pulse flex items-center gap-1">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </span>
                      Scanning ALL markets for fresh patterns...🚀🚀🚀🚀
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Market 2 */}
            <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm border-2 border-fuchsia-500/30 rounded-xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-fuchsia-400 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Market 2 — Recovery Bot🚀
                </h3>
                <div className="flex items-center gap-2">
                  {currentMarket === 2 && isRunning && <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-pulse" />}
                  <Switch checked={m2Enabled} onCheckedChange={setM2Enabled} disabled={isRunning} />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-400 mb-1.5 block font-semibold">Recovery Strategy 🔥</label>
                  <Select value={m2RecoveryType} onValueChange={(v: M2RecoveryType) => {
                    setM2RecoveryType(v);
                    if (v !== 'disabled') {
                      setStrategyM2Enabled(true);
                      setScannerActive(true);
                    }
                  }} disabled={isRunning}>
                    <SelectTrigger className="h-10 text-sm bg-slate-800/50 border-slate-700 text-slate-200">
                      <SelectValue placeholder="Select strategy" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 max-h-[300px] overflow-y-auto">
                      <SelectItem disabled>Even/Odd (last digits pattern based) Reversal Direction</SelectItem>
                      <SelectItem value="odd_even_3">🔄 Even / Odd (3 ticks)</SelectItem>
                      <SelectItem value="odd_even_4">🔄 Even / Odd (4 ticks)</SelectItem>
                      <SelectItem value="odd_even_5">🔄 Even / Odd (5 ticks)</SelectItem>
                      <SelectItem value="odd_even_6">🔄 Even / Odd (6 ticks)</SelectItem>
                      <SelectItem value="odd_even_7">🔄 Even / Odd (7 ticks)</SelectItem>
                      <SelectItem value="odd_even_8">🔄 Even / Odd (8 ticks)</SelectItem>
                      <SelectItem value="odd_even_9">🔄 Even / Odd (9 ticks)</SelectItem>
                      <SelectItem disabled>Over/Under (last digits pattern based) Reversal Direction</SelectItem>
                      <SelectItem value="over4_under5_5">🎯 Over 4 / Under 5 (5 ticks)</SelectItem>
                      <SelectItem value="over4_under5_6">🎯 Over 4 / Under 5 (6 ticks)</SelectItem>
                      <SelectItem value="over4_under5_7">🎯 Over 4 / Under 5 (7 ticks)</SelectItem>
                      <SelectItem value="over4_under5_8">🎯 Over 4 / Under 5 (8 ticks)</SelectItem>
                      <SelectItem value="over4_under5_9">🎯 Over 4 / Under 5 (9 ticks)</SelectItem>
                      <SelectItem value="over3_under6_5">🎯 Over 3 / Under 6 (5 ticks)</SelectItem>
                      <SelectItem value="over3_under6_7">🎯 Over 3 / Under 6 (7 ticks)</SelectItem>
                      <SelectItem disabled>Even/Odd (last digits pattern based) Same Direction</SelectItem>
                      <SelectItem value="same_direction_3">🔢 Even/Odd (3 ticks)</SelectItem>
                      <SelectItem value="same_direction_4">🔢 Even/Odd (4 ticks)</SelectItem>
                      <SelectItem value="same_direction_5">🔢 Even/Odd (5 ticks)</SelectItem>
                      <SelectItem value="same_direction_6">🔢 Even/Odd (6 ticks)</SelectItem>
                      <SelectItem value="same_direction_7">🔢 Even/Odd (7 ticks)</SelectItem>
                      <SelectItem value="same_direction_8">🔢 Even/Odd (8 ticks)</SelectItem>
                      <SelectItem value="same_direction_9">🔢 Even/Odd (9 ticks)</SelectItem>
                      <SelectItem value="same_direction_10">🔢 Even/Odd (10 ticks)</SelectItem>
                    </SelectContent>
                  </Select>
                  {m2RecoveryType !== 'disabled' && (
                    <div className="text-[10px] text-fuchsia-400 mt-2 animate-pulse flex items-center gap-1">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-fuchsia-500"></span>
                      </span>
                      Scanning ALL markets for fresh recovery patterns...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Risk Management - Bot Configuration */}
          <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-amber-400" /> Bot Configuration 🚦
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Stake ($)</label>
                <Input type="number" min="0.35" step="0.01" value={stake} onChange={e => setStake(e.target.value)} disabled={isRunning} className="h-9 text-sm bg-slate-800/50 border-slate-700 text-slate-200" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Take Profit ($)</label>
                <Input type="number" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} disabled={isRunning} className="h-9 text-sm bg-slate-800/50 border-slate-700 text-slate-200" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Stop Loss ($)</label>
                <Input type="number" value={stopLoss} onChange={e => setStopLoss(e.target.value)} disabled={isRunning} className="h-9 text-sm bg-slate-800/50 border-slate-700 text-slate-200" />
              </div>
            </div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-slate-300 font-semibold">Martingale System</label>
              <Switch checked={martingaleOn} onCheckedChange={setMartingaleOn} disabled={isRunning} />
            </div>
            {martingaleOn && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Multiplier</label>
                  <Input type="number" min="1.1" step="0.1" value={martingaleMultiplier} onChange={e => setMartingaleMultiplier(e.target.value)} disabled={isRunning} className="h-8 text-xs bg-slate-800/50 border-slate-700 text-slate-200" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Max Steps</label>
                  <Input type="number" min="1" max="10" value={martingaleMaxSteps} onChange={e => setMartingaleMaxSteps(e.target.value)} disabled={isRunning} className="h-8 text-xs bg-slate-800/50 border-slate-700 text-slate-200" />
                </div>
              </div>
            )}
          </div>

          {/* Global Toggle Row */}
          <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-xl p-3 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-semibold">Pattern Detection:</span>
                <Switch 
                  checked={showPatternDetection} 
                  onCheckedChange={setShowPatternDetection} 
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-semibold">Live Markets:</span>
                <Switch 
                  checked={showLiveMarkets} 
                  onCheckedChange={setShowLiveMarkets} 
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-semibold">Strongest Markets:</span>
                <Switch 
                  checked={showStrongestMarkets} 
                  onCheckedChange={setShowStrongestMarkets} 
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>
            </div>
            <div className="text-[8px] text-slate-500 font-mono">
              Toggle sections on/off
            </div>
          </div>

          {/* Pattern Detection and Live Markets - UPDATED with same height as Trade Report */}
          <div className={`grid ${getPatternLiveGridClass()} gap-3`}>
            {/* Pattern Detection Container - Height reduced to match Trade Report */}
            {showPatternDetection && (
              <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden shadow-xl h-[300px] flex flex-col">
                <div className="p-3 border-b border-slate-700/50 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg">
                      <Scan className="w-3 h-3 text-white" />
                    </div>
                    <h3 className="text-sm font-bold text-amber-400">🔍 Ramzfx 🔥 Market Scanner - Pattern Detection</h3>
                    {scannerActive && isRunning && (
                      <div className="flex items-center gap-1 ml-2">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        <span className="text-[8px] text-emerald-400 font-bold">Active🚀</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setShowPatternDetection(false)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/50 text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <EyeOff className="w-3 h-3" />
                    <span className="text-[8px] font-bold">HIDE</span>
                  </button>
                </div>
                
                {/* Animated Dollar Icons Row */}
                <div className="py-2 bg-slate-800/30 overflow-hidden relative shrink-0">
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-[8px] text-slate-400 font-mono bg-slate-800/80 px-2 py-0.5 rounded-full z-10 font-bold">PATTERN DETECTION</span>
                  </div>
                  <div className="flex items-center gap-2 animate-scroll-right-to-left" style={{ animation: 'scrollRightToLeft 12s linear infinite' }}>
                    {[...Array(15)].map((_, i) => (
                      <DollarSign 
                        key={i}
                        className={`w-3 h-3 ${dollarColors[i % dollarColors.length]} animate-pulse`}
                        style={{ 
                          animationDuration: `${0.5 + (i % 3) * 0.2}s`,
                          filter: 'drop-shadow(0 0 1px currentColor)'
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 animate-scroll-right-to-left" style={{ animation: 'scrollRightToLeft 12s linear infinite', position: 'absolute', top: 0, left: '100%' }}>
                    {[...Array(15)].map((_, i) => (
                      <DollarSign 
                        key={`dup-${i}`}
                        className={`w-3 h-3 ${dollarColors[i % dollarColors.length]} animate-pulse`}
                        style={{ 
                          animationDuration: `${0.5 + (i % 3) * 0.2}s`,
                          filter: 'drop-shadow(0 0 1px currentColor)'
                        }}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Detected Patterns Display */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  {detectedPatterns.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-[10px] text-slate-500 font-semibold">Waiting for pattern detection...</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1.5">
                      {detectedPatterns.map((pattern) => (
                        <div 
                          key={pattern.timestamp}
                          className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50 animate-slideIn"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                                <DollarSign className="w-3 h-3 text-amber-400" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[11px] font-bold text-slate-200">{pattern.symbol}</span>
                                  <Badge className="text-[8px] bg-slate-700/50 text-slate-300 px-1 py-0 font-semibold">{pattern.name}</Badge>
                                </div>
                                <div className="text-[9px] text-amber-400 font-bold">{pattern.patternType}</div>
                                {pattern.contractType && (
                                  <div className="text-[8px] text-cyan-400 font-semibold">Contract: {pattern.contractType.replace('DIGIT', '')}</div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="flex gap-0.5">
                                {(pattern.last15Ticks || pattern.digits).slice(-8).map((digit, i) => (
                                  <span 
                                    key={i}
                                    className="w-5 h-5 rounded bg-slate-700 flex items-center justify-center text-[10px] font-mono font-bold text-cyan-400"
                                  >
                                    {digit}
                                  </span>
                                ))}
                              </div>
                              <Badge className={`text-[8px] px-1 py-0 font-bold ${pattern.result === 'Win' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : pattern.result === 'Loss' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                                {pattern.result ? (pattern.result === 'Win' ? `WIN +$${pattern.pnl?.toFixed(2)}` : `LOSS $${pattern.pnl?.toFixed(2)}`) : 'FOUND 🤷‍♀️'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Live Markets Scanner Container */}
            {showLiveMarkets && (
              <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm border-2 border-emerald-500/30 rounded-xl shadow-xl overflow-hidden h-[400px] flex flex-col">
                <div className="p-3 border-b border-slate-700/50 bg-slate-800/30 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${isRunning ? 'bg-gradient-to-br from-emerald-500 to-green-600 animate-pulse-slow' : 'bg-gradient-to-br from-emerald-600 to-green-700'}`}>
                      <Scan className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-base font-extrabold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                      📡 LIVE MARKETS SCANNER
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setScrollSpeed('normal')}
                        className={`text-[9px] px-1.5 py-0.5 rounded ${scrollSpeed === 'normal' ? 'bg-emerald-500/30 text-emerald-400' : 'bg-slate-700/50 text-slate-400'}`}
                      >
                        Normal
                      </button>
                      <button
                        onClick={() => setScrollSpeed('slow')}
                        className={`text-[9px] px-1.5 py-0.5 rounded ${scrollSpeed === 'slow' ? 'bg-emerald-500/30 text-emerald-400' : 'bg-slate-700/50 text-slate-400'}`}
                      >
                        Slow
                      </button>
                    </div>
                    {isScannerVoiceActive && (
                      <div className="flex items-center gap-1">
                        <Volume2 className="w-4 h-4 text-emerald-400 animate-voice-wave" />
                        <span className="text-[10px] text-emerald-400 font-mono font-bold">VOICE ACTIVE</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isRunning ? 'bg-emerald-400' : 'bg-emerald-400'} opacity-75`}></span>
                        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isRunning ? 'bg-emerald-500' : 'bg-emerald-500'}`}></span>
                      </span>
                      <span className="text-[9px] text-emerald-400 font-bold">LIVE</span>
                    </div>
                    <button
                      onClick={() => setShowLiveMarkets(false)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/50 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <EyeOff className="w-3 h-3" />
                      <span className="text-[8px] font-bold">HIDE</span>
                    </button>
                  </div>
                </div>
                
                {/* Animated Scrolling Markets Container */}
                <div className="relative flex-1 overflow-hidden bg-slate-900/50 min-h-0">
                  {scannerMarkers.length > 0 ? (
                    <div className="absolute inset-0">
                      {isRunning && (
                        <div className="absolute inset-0 pointer-events-none z-10">
                          <div className={`absolute inset-0 bg-gradient-to-t from-emerald-500/0 via-emerald-500/5 to-transparent ${isScannerVoiceActive ? 'animate-pulse' : ''}`} />
                        </div>
                      )}
                      
                      <div 
                        className={`absolute left-0 right-0 ${scrollSpeed === 'normal' ? 'animate-scroll-markets' : 'animate-scroll-markets-slow'}`}
                        style={{ animationDuration: scrollSpeed === 'normal' ? '20s' : '45s' }}
                      >
                        {[...scannerMarkers, ...scannerMarkers].map((market, idx) => {
                          const stats = marketStats.find(s => s.symbol === market.symbol);
                          const strengthInfo = stats ? getStrengthDisplay(stats.strength) : { text: 'ANALYZING', color: 'text-slate-400', bg: 'bg-slate-500/20' };
                          const signalInfo = stats ? getSignalDisplay(stats.dominantSignal) : { label: 'ANALYZING', color: 'text-slate-400', bg: 'bg-slate-500/20' };
                          
                          return (
                            <div 
                              key={`${market.symbol}-${idx}`}
                              className={`mx-2 mb-2 rounded-lg overflow-hidden shadow-lg transform transition-all duration-300 hover:scale-[1.02] animate-fadeInUp`}
                              style={{ animationDelay: `${idx * 0.05}s` }}
                            >
                              <div className={`bg-gradient-to-r ${market.color} p-3`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                      <DollarSign className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                      <span className="font-mono text-base font-bold text-white">{market.symbol}</span>
                                      <span className="text-[11px] text-white/80 ml-1">{market.name}</span>
                                    </div>
                                  </div>
                                  <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${strengthInfo.bg} ${strengthInfo.color}`}>
                                    {strengthInfo.text}
                                  </div>
                                </div>
                                
                                {stats && stats.totalTicks > 0 ? (
                                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                                    <div className="flex items-center justify-between">
                                      <span className="text-white/70">Even:</span>
                                      <span className={`font-bold ${stats.evenPercentage > 50 ? 'text-emerald-400' : 'text-slate-300'}`}>{stats.evenPercentage.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-white/70">Odd:</span>
                                      <span className={`font-bold ${stats.oddPercentage > 50 ? 'text-red-400' : 'text-slate-300'}`}>{stats.oddPercentage.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-white/70">Over 4:</span>
                                      <span className={`font-bold ${stats.over4Percentage > 50 ? 'text-emerald-400' : 'text-slate-300'}`}>{stats.over4Percentage.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-white/70">Under 5:</span>
                                      <span className={`font-bold ${stats.under5Percentage > 50 ? 'text-red-400' : 'text-slate-300'}`}>{stats.under5Percentage.toFixed(1)}%</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-white/60 text-center py-1">
                                    Waiting for tick data...
                                  </div>
                                )}
                                
                                {stats && stats.totalTicks > 0 && (
                                  <>
                                    <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-white rounded-full transition-all duration-500"
                                        style={{ width: `${stats.strength}%` }}
                                      />
                                    </div>
                                    <div className="mt-1 flex items-center justify-between">
                                      <div className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${signalInfo.bg} ${signalInfo.color}`}>
                                        SIGNAL: {signalInfo.label}
                                      </div>
                                      <div className="text-[9px] text-white/60">
                                        {stats.totalTicks} ticks
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-slate-800 flex items-center justify-center">
                          <Scan className="w-6 h-6 text-slate-600 animate-pulse" />
                        </div>
                        <p className="text-[11px] text-slate-500 font-semibold">Loading market data...</p>
                        <p className="text-[9px] text-slate-600 mt-1">Analyzing {SCANNER_MARKETS.length} markets in real-time</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="p-2 border-t border-slate-700/30 bg-slate-800/20 shrink-0">
                  <div className="flex items-center justify-between text-[9px] text-slate-500 font-semibold">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      {SCANNER_MARKETS.length} markets monitored
                    </span>
                    <span className="font-mono font-bold">
                      {marketStats.filter(m => m.totalTicks >= 100).length} markets have 100+ ticks
                    </span>
                    <span className="font-mono text-emerald-400">
                      {strongestMarkets.length} strong markets
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Strongest Markets Banner */}
          {showStrongestMarkets && (
            <div className="bg-gradient-to-r from-amber-900/30 to-amber-800/30 backdrop-blur-sm border border-amber-500/30 rounded-xl p-3 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-amber-500/20 rounded-lg">
                    <TrendingUp className="w-3 h-3 text-amber-400" />
                  </div>
                  <h3 className="text-xs font-bold text-amber-400">🔥 STRONGEST MARKETS (Last 1000+ Ticks)</h3>
                </div>
                <button
                  onClick={() => setShowStrongestMarkets(false)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/50 text-slate-400 hover:text-red-400 transition-colors"
                >
                  <EyeOff className="w-3 h-3" />
                  <span className="text-[8px] font-bold">HIDE</span>
                </button>
              </div>
              <div className="overflow-hidden relative">
                <div className={`flex gap-3 ${scrollSpeed === 'normal' ? 'animate-scroll-markets' : 'animate-scroll-markets-slow'}`}>
                  {[...strongestMarkets, ...strongestMarkets].map((market, idx) => {
                    let exactSignal: string | null = null;
                    let signalColor = 'text-slate-400';
                    let signalBg = 'bg-slate-500/20';
                    
                    if (market.dominantSignal === 'EVEN') {
                      exactSignal = 'EVEN';
                      signalColor = 'text-emerald-400';
                      signalBg = 'bg-emerald-500/20';
                    } else if (market.dominantSignal === 'ODD') {
                      exactSignal = 'ODD';
                      signalColor = 'text-red-400';
                      signalBg = 'bg-red-500/20';
                    } else if (market.dominantSignal === 'OVER') {
                      exactSignal = 'OVER';
                      signalColor = 'text-emerald-400';
                      signalBg = 'bg-emerald-500/20';
                    } else if (market.dominantSignal === 'UNDER') {
                      exactSignal = 'UNDER';
                      signalColor = 'text-red-400';
                      signalBg = 'bg-red-500/20';
                    }
                    
                    return (
                      <div
                        key={`${market.symbol}-${idx}`}
                        className="flex-shrink-0 bg-slate-800/50 rounded-lg p-2 min-w-[220px] border border-amber-500/20"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${market.color} flex items-center justify-center`}>
                              <DollarSign className="w-3 h-3 text-white" />
                            </div>
                            <div>
                              <span className="font-mono text-xs font-bold text-slate-200">{market.symbol}</span>
                              <span className="text-[8px] text-slate-400 ml-1">{market.name}</span>
                            </div>
                          </div>
                          <div className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${getStrengthDisplay(market.strength).bg} ${getStrengthDisplay(market.strength).color}`}>
                            {getStrengthDisplay(market.strength).text}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[9px]">
                          <div>
                            <span className="text-slate-400">Even:</span>
                            <span className="text-emerald-400 ml-1 font-bold">{market.evenPercentage.toFixed(1)}%</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Odd:</span>
                            <span className="text-red-400 ml-1 font-bold">{market.oddPercentage.toFixed(1)}%</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Over 4:</span>
                            <span className="text-emerald-400 ml-1 font-bold">{market.over4Percentage.toFixed(1)}%</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Under 5:</span>
                            <span className="text-red-400 ml-1 font-bold">{market.under5Percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="mt-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-300"
                            style={{ width: `${market.strength}%` }}
                          />
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          {exactSignal ? (
                            <div className={`text-[7px] font-bold px-1.5 py-0.5 rounded ${signalBg} ${signalColor}`}>
                              SIGNAL: {exactSignal}
                            </div>
                          ) : (
                            <div className="text-[7px] font-bold px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-400">
                              SIGNAL: ANALYZING
                            </div>
                          )}
                          <div className="text-[7px] text-slate-500">
                            {market.totalTicks} ticks
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Active Pattern Display */}
          {activePattern && (
            <div className={`w-full bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden border-2 ${activePattern.result === 'Win' ? 'border-emerald-500/50 animate-blink-green' : activePattern.result === 'Loss' ? 'border-rose-500/50 animate-blink-red' : 'border-amber-500/50'} transition-all duration-300`}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${activePattern.result === 'Win' ? 'bg-emerald-500/20' : activePattern.result === 'Loss' ? 'bg-rose-500/20' : 'bg-amber-500/20'}`}>
                      {activePattern.result === 'Win' ? '🎉' : activePattern.result === 'Loss' ? '😢' : '🔍'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-200">
                        {activePattern.result ? (activePattern.result === 'Win' ? 'TRADE WON!' : 'TRADE LOST!') : 'PATTERN DETECTED'}
                      </h3>
                      <p className="text-[9px] text-slate-400">
                        {new Date(activePattern.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  {activePattern.contractType && (
                    <Badge className="text-[10px] bg-cyan-500/20 text-cyan-400 border-cyan-500/30 font-bold">
                      {activePattern.contractType.replace('DIGIT', '')}
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="bg-slate-800/50 rounded-lg p-2">
                    <div className="text-[8px] text-slate-400 mb-1 font-semibold">Market / Symbol</div>
                    <div className="flex items-center gap-1">
                      <Badge className="text-[9px] bg-slate-700/50 text-slate-300 font-bold">
                        {activePattern.symbol}
                      </Badge>
                      <span className="text-[10px] text-slate-400">{activePattern.name}</span>
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-2">
                    <div className="text-[8px] text-slate-400 mb-1 font-semibold">Strategy</div>
                    <div className="text-[9px] font-mono text-amber-400 font-bold">{activePattern.patternType}</div>
                  </div>
                </div>
                
                <div className="bg-slate-800/50 rounded-lg p-3 mb-3">
                  <div className="text-[8px] text-slate-400 mb-2 text-center font-semibold">LAST 15 TICKS PATTERN</div>
                  <div className="flex flex-wrap justify-center gap-1">
                    {(activePattern.last15Ticks || activePattern.digits).slice(-15).map((digit, i) => (
                      <div 
                        key={i}
                        className={`w-7 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center shadow-lg border border-slate-600/50 ${i >= (activePattern.last15Ticks || activePattern.digits).length - (activePattern.patternType.includes('3') ? 3 : activePattern.patternType.includes('4') ? 4 : activePattern.patternType.includes('5') ? 5 : activePattern.patternType.includes('6') ? 6 : activePattern.patternType.includes('7') ? 7 : activePattern.patternType.includes('8') ? 8 : activePattern.patternType.includes('9') ? 9 : activePattern.patternType.includes('10') ? 10 : 4) ? 'border-amber-500/50' : ''}`}
                      >
                        <span className={`text-sm font-mono font-bold ${i >= (activePattern.last15Ticks || activePattern.digits).length - (activePattern.patternType.includes('3') ? 3 : activePattern.patternType.includes('4') ? 4 : activePattern.patternType.includes('5') ? 5 : activePattern.patternType.includes('6') ? 6 : activePattern.patternType.includes('7') ? 7 : activePattern.patternType.includes('8') ? 8 : activePattern.patternType.includes('9') ? 9 : activePattern.patternType.includes('10') ? 10 : 4) ? 'text-amber-400' : 'text-cyan-400'}`}>
                          {digit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {activePattern.result && (
                  <div className={`rounded-lg p-3 text-center ${activePattern.result === 'Win' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-semibold">Stake</span>
                      <span className="text-sm font-mono font-bold text-slate-200">${activePattern.stake?.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-slate-400 font-semibold">Result</span>
                      <span className={`text-sm font-mono font-bold ${activePattern.result === 'Win' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {activePattern.result === 'Win' ? '+' : ''}{activePattern.pnl?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Performance Stats Row */}
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Trade Report 
              </span>
              <span className="font-mono text-xl font-bold text-cyan-400">${localBalance.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-7 gap-3">
              <div className="text-center bg-slate-800/30 rounded-lg p-2">
                <div className="text-[9px] text-slate-400 mb-1 font-semibold">Total Trades</div>
                <div className="font-mono text-lg font-bold text-slate-200">{wins + losses}</div>
              </div>
              <div className="text-center bg-slate-800/30 rounded-lg p-2">
                <div className="text-[9px] text-slate-400 mb-1 font-semibold">Win Rate</div>
                <div className="font-mono text-lg font-bold text-emerald-400">{winRate}%</div>
              </div>
              <div className="text-center bg-slate-800/30 rounded-lg p-2">
                <div className="text-[9px] text-slate-400 mb-1 font-semibold">Wins💵</div>
                <div className="font-mono text-lg font-bold text-emerald-400">{wins}</div>
              </div>
              <div className="text-center bg-slate-800/30 rounded-lg p-2">
                <div className="text-[9px] text-slate-400 mb-1 font-semibold">Losses😒</div>
                <div className="font-mono text-lg font-bold text-rose-400">{losses}</div>
              </div>
              <div className="text-center bg-slate-800/30 rounded-lg p-2">
                <div className="text-[9px] text-slate-400 mb-1 font-semibold">Failed❌</div>
                <div className="font-mono text-lg font-bold text-orange-400">{failedTrades}</div>
              </div>
              <div className="text-center bg-slate-800/30 rounded-lg p-2">
                <div className="text-[9px] text-slate-400 mb-1 font-semibold">Total Staked</div>
                <div className="font-mono text-lg font-bold text-amber-400">
                  ${totalStaked.toFixed(2)}
                </div>
              </div>
              <div className="text-center bg-slate-800/30 rounded-lg p-2">
                <div className="text-[9px] text-slate-400 mb-1 font-semibold">Net 💲 Profit</div>
                <div className={`font-mono text-lg font-bold ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {netProfit >= 0 ? '+' : ''}{netProfit.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Start/Stop Button */}
          <div className="flex justify-center w-full">
            <button
              onClick={isRunning ? stopBot : startBot}
              disabled={!isRunning && (!isAuthorized || localBalance < parseFloat(stake))}
              className={`
                relative w-full h-14 text-base font-bold rounded-xl transition-all duration-300 ease-out
                overflow-hidden group
                ${isRunning 
                  ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-500/30' 
                  : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/30'
                }
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                active:scale-95 transform
              `}
            >
              {isRunning && (
                <>
                  <span className="absolute inset-0 bg-white/20 animate-pulse rounded-xl" />
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                </>
              )}
              
              <div className="relative flex items-center justify-center gap-3">
                {isRunning ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="flex items-center gap-1 font-bold">
                      STOP BOT
                      <span className="flex gap-0.5 ml-1">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    </span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span className="flex items-center gap-1 font-bold">
                      RUN BOT
                      <span className="relative flex h-2 w-2 ml-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                      </span>
                    </span>
                  </>
                )}
              </div>
            </button>
          </div>

          {/* Activity Log - Full Width */}
          <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden shadow-xl">
            <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Trade Results  
                <Badge className="ml-2 bg-slate-800 text-slate-300 text-[9px]">
                  Current Stake: ${currentStake.toFixed(2)}{martingaleStep > 0 && ` M${martingaleStep}`}
                </Badge>
              </h3>
              <Button variant="ghost" size="sm" onClick={clearLog} className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400 hover:bg-slate-800/50">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="max-h-[300px] overflow-auto">
              <table className="w-full text-[11px]">
                <thead className="text-[10px] text-slate-400 bg-slate-800/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Time</th>
                    <th className="text-left p-2">Mkt</th>
                    <th className="text-left p-2">Symbol</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-right p-2">Stake</th>
                    <th className="text-center p-2">Result</th> 
                    <th className="text-right p-2">P/L</th>
                    <th className="text-right p-2">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {logEntries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-slate-500 py-12">
                        No successful trades yet — configure and start the bot
                        <div className="text-[9px] text-slate-600 mt-1">
                          Failed trades: {failedTrades}
                        </div>
                      </td>
                    </tr>
                  ) : logEntries.map(e => (
                    <tr key={e.id} className={`border-t border-slate-700/30 hover:bg-slate-800/30 transition-colors ${
                      e.market === 'M1' ? 'border-l-2 border-l-emerald-500' : 'border-l-2 border-l-fuchsia-500'
                    }`}>
                      <td className="p-2 font-mono text-[9px] text-slate-400">{e.time}</td>
                      <td className={`p-2 font-bold text-xs ${
                        e.market === 'M1' ? 'text-emerald-400' : 'text-fuchsia-400'
                      }`}>{e.market}</td>
                      <td className="p-2 font-mono text-[9px] text-slate-300">{e.symbol}</td>
                      <td className="p-2 text-[9px] text-slate-300">{e.contract.replace('DIGIT', '')}</td>
                      <td className="p-2 font-mono text-right text-[9px] text-slate-300">
                        ${e.stake.toFixed(2)}
                        {e.martingaleStep > 0 && <span className="text-amber-400 ml-1">M{e.martingaleStep}</span>}
                      </td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          e.result === 'Win' ? 'bg-emerald-500/20 text-emerald-400' :
                          e.result === 'Loss' ? 'bg-rose-500/20 text-rose-400' :
                          'bg-amber-500/20 text-amber-400 animate-pulse'
                        }`}>
                          {e.result === 'Pending' ? '...' : e.result}
                        </span>
                      </td>
                      <td className={`p-2 font-mono text-right text-[9px] font-bold ${
                        e.pnl > 0 ? 'text-emerald-400' : e.pnl < 0 ? 'text-rose-400' : 'text-slate-400'
                      }`}>
                        {e.result === 'Pending' ? '...' : `${e.pnl > 0 ? '+' : ''}${e.pnl.toFixed(2)}`}
                      </td>
                      <td className="p-2 font-mono text-right text-[9px] text-slate-400">
                        ${e.balance.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <NotificationPopup />
    </>
  );
        }
