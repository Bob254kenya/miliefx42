import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { derivApi, type MarketSymbol } from '@/services/deriv-api';
import { getLastDigit, analyzeDigits, calculateRSI, calculateMACD, calculateBollingerBands } from '@/services/analysis';
import { copyTradingService } from '@/services/copy-trading-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import {
  TrendingUp, TrendingDown, Activity, BarChart3, ArrowUp, ArrowDown, Minus,
  Target, ShieldAlert, Gauge, Volume2, VolumeX, Clock, Zap, Trophy, Play, Pause, StopCircle, Eye, EyeOff, RefreshCw,
  Plus, X, LineChart, Anchor, Copy, Users, Wifi, WifiOff, Combine
} from 'lucide-react';

// ============================================
// TP/SL NOTIFICATION POPUP - COMPONENT
// ============================================

const notificationStyles = `
@keyframes slideUpCenter {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
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
    transform: translateY(30px) scale(0.95);
  }
}

@keyframes float {
  0% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-10px) rotate(5deg);
  }
  100% {
    transform: translateY(0px) rotate(0deg);
  }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-slide-up-center {
  animation: slideUpCenter 0.4s cubic-bezier(0.34, 1.2, 0.64, 1) forwards;
}

.animate-slide-down-center {
  animation: slideDownCenter 0.3s ease-out forwards;
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}

.animate-bounce {
  animation: bounce 0.4s ease-in-out 2;
}

.animate-pulse-slow {
  animation: pulse 1s ease-in-out infinite;
}

.animate-spin-slow {
  animation: spin 1s linear infinite;
}
`;

// Helper function to show notification (TP/SL)
const showTPNotification = (type: 'tp' | 'sl', message: string, amount?: number) => {
  if (typeof window !== 'undefined' && (window as any).showTPNotification) {
    (window as any).showTPNotification(type, message, amount);
  }
};

// TP/SL Notification Component
const TPSLNotificationPopup = () => {
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
    <>
      <style>{notificationStyles}</style>
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div 
          className={`
            pointer-events-auto w-[500px] h-[300px] rounded-xl shadow-2xl overflow-hidden
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
    </>
  );
};

/* ── Markets ── */
const ALL_MARKETS = [
  { symbol: '1HZ10V', name: 'Volatility 10 (1s)', group: 'vol1s' },
  { symbol: '1HZ15V', name: 'Volatility 15 (1s)', group: 'vol1s' },
  { symbol: '1HZ25V', name: 'Volatility 25 (1s)', group: 'vol1s' },
  { symbol: '1HZ30V', name: 'Volatility 30 (1s)', group: 'vol1s' },
  { symbol: '1HZ50V', name: 'Volatility 50 (1s)', group: 'vol1s' },
  { symbol: '1HZ75V', name: 'Volatility 75 (1s)', group: 'vol1s' },
  { symbol: '1HZ100V', name: 'Volatility 100 (1s)', group: 'vol1s' },
  { symbol: 'R_10', name: 'Volatility 10', group: 'vol' },
  { symbol: 'R_25', name: 'Volatility 25', group: 'vol' },
  { symbol: 'R_50', name: 'Volatility 50', group: 'vol' },
  { symbol: 'R_75', name: 'Volatility 75', group: 'vol' },
  { symbol: 'R_100', name: 'Volatility 100', group: 'vol' },
  { symbol: 'JD10', name: 'Jump 10', group: 'jump' },
  { symbol: 'JD25', name: 'Jump 25', group: 'jump' },
  { symbol: 'JD50', name: 'Jump 50', group: 'jump' },
  { symbol: 'JD75', name: 'Jump 75', group: 'jump' },
  { symbol: 'JD100', name: 'Jump 100', group: 'jump' },
  { symbol: 'RDBEAR', name: 'Bear Market', group: 'bear' },
  { symbol: 'RDBULL', name: 'Bull Market', group: 'bull' },
  { symbol: 'stpRNG', name: 'Step Index', group: 'step' },
  { symbol: 'RBRK100', name: 'Range Break 100', group: 'range' },
  { symbol: 'RBRK200', name: 'Range Break 200', group: 'range' },
];

const GROUPS = [
  { value: 'all', label: 'All' },
  { value: 'vol1s', label: 'Vol 1s' },
  { value: 'vol', label: 'Vol' },
  { value: 'jump', label: 'Jump' },
  { value: 'bear', label: 'Bear' },
  { value: 'bull', label: 'Bull' },
  { value: 'step', label: 'Step' },
  { value: 'range', label: 'Range' },
];

const TIMEFRAMES = ['1m','3m','5m','15m','30m','1h','4h','12h','1d'];
const CANDLE_CONFIG = {
  minCandles: 1000,
  maxCandles: 5000,
  defaultCandles: 1000,
};

const TICK_RANGES = [50, 100, 200, 300, 500, 1000];

const CONTRACT_TYPES = [
  { value: 'CALL', label: 'Rise' },
  { value: 'PUT', label: 'Fall' },
  { value: 'DIGITMATCH', label: 'Digits Match' },
  { value: 'DIGITDIFF', label: 'Digits Differs' },
  { value: 'DIGITEVEN', label: 'Digits Even' },
  { value: 'DIGITODD', label: 'Digits Odd' },
  { value: 'DIGITOVER', label: 'Digits Over' },
  { value: 'DIGITUNDER', label: 'Digits Under' },
];

type IndicatorType = 'RSI' | 'BB' | 'MA' | 'MACD';
interface Indicator {
  id: string;
  type: IndicatorType;
  enabled: boolean;
}

interface Candle {
  open: number; high: number; low: number; close: number; time: number;
}

interface TradeRecord {
  id: string;
  time: number;
  type: string;
  stake: number;
  profit: number;
  status: 'won' | 'lost' | 'open';
  symbol: string;
  resultDigit?: number;
  outcomeSymbol?: string;
  isVirtual?: boolean;
  virtualLossCount?: number;
  virtualRequired?: number;
}

interface DigitStats {
  frequency: Record<number, number>;
  percentages: Record<number, number>;
  mostCommon: number;
  leastCommon: number;
  totalTicks: number;
  evenPercentage: number;
  oddPercentage: number;
  overPercentage: number;
  underPercentage: number;
  last26Digits: number[];
  tickPrices: number[];
}

// Independent tick storage for digit analysis
const globalTickHistory: { [symbol: string]: number[] } = {};
const globalTickPrices: { [symbol: string]: number[] } = {};
const tickCallbacks: { [symbol: string]: (() => void)[] } = [];

function getTickHistory(symbol: string): number[] {
  return globalTickHistory[symbol] || [];
}

function getTickPrices(symbol: string): number[] {
  return globalTickPrices[symbol] || [];
}

function addTick(symbol: string, digit: number, price: number) {
  if (!globalTickHistory[symbol]) globalTickHistory[symbol] = [];
  if (!globalTickPrices[symbol]) globalTickPrices[symbol] = [];
  
  globalTickHistory[symbol].push(digit);
  globalTickPrices[symbol].push(price);
  
  if (globalTickHistory[symbol].length > 2000) globalTickHistory[symbol].shift();
  if (globalTickPrices[symbol].length > 2000) globalTickPrices[symbol].shift();
  
  if (tickCallbacks[symbol]) {
    tickCallbacks[symbol].forEach(cb => cb());
  }
}

function subscribeToTicks(symbol: string, callback: () => void) {
  if (!tickCallbacks[symbol]) tickCallbacks[symbol] = [];
  tickCallbacks[symbol].push(callback);
  return () => {
    tickCallbacks[symbol] = tickCallbacks[symbol].filter(cb => cb !== callback);
  };
}

function buildCandles(prices: number[], times: number[], tf: string): Candle[] {
  if (prices.length === 0) return [];
  const seconds: Record<string,number> = {
    '1m':60,'3m':180,'5m':300,'15m':900,'30m':1800,'1h':3600,'4h':14400,'12h':43200,'1d':86400,
  };
  const interval = seconds[tf] || 60;
  const candles: Candle[] = [];
  let current: Candle | null = null;

  for (let i = 0; i < prices.length; i++) {
    const p = prices[i];
    const t = times[i] || Date.now()/1000 + i;
    const bucket = Math.floor(t / interval) * interval;

    if (!current || current.time !== bucket) {
      if (current) candles.push(current);
      current = { open: p, high: p, low: p, close: p, time: bucket };
    } else {
      current.high = Math.max(current.high, p);
      current.low = Math.min(current.low, p);
      current.close = p;
    }
  }
  if (current) candles.push(current);
  return candles;
}

function calcEMA(prices: number[], period: number): number[] {
  const emaValues: number[] = [];
  if (prices.length === 0) return emaValues;
  
  const k = 2 / (period + 1);
  let ema = prices[0];
  
  for (let i = 0; i < prices.length; i++) {
    if (i === 0) {
      ema = prices[i];
    } else {
      ema = prices[i] * k + ema * (1 - k);
    }
    emaValues.push(ema);
  }
  return emaValues;
}

function calcSMA(prices: number[], period: number): number[] {
  const smaValues: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      smaValues.push(prices[i]);
    } else {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      smaValues.push(sum / period);
    }
  }
  return smaValues;
}

function calcEMASeries(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  if (prices.length < period) return prices.map(() => null);
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = 0; i < period; i++) result.push(null);
  result[period - 1] = ema;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

function calcSMASeries(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    const slice = prices.slice(i - period + 1, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return result;
}

function calcBBSeries(prices: number[], period: number, mult: number = 2) {
  const upper: (number | null)[] = [];
  const middle: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) { upper.push(null); middle.push(null); lower.push(null); continue; }
    const slice = prices.slice(i - period + 1, i + 1);
    const ma = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((s, p) => s + (p - ma) ** 2, 0) / period;
    const std = Math.sqrt(variance);
    upper.push(ma + mult * std);
    middle.push(ma);
    lower.push(ma - mult * std);
  }
  return { upper, middle, lower };
}

function calcRSISeries(prices: number[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [null];
  if (prices.length < period + 1) return prices.map(() => null);
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = prices[i] - prices[i - 1];
    if (d > 0) gains += d; else losses -= d;
    result.push(null);
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  const rsi0 = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  result[period] = rsi0;
  for (let i = period + 1; i < prices.length; i++) {
    const d = prices[i] - prices[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(0, d)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -d)) / period;
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  return result;
}

function calcMACDSeries(prices: number[]) {
  const ema12 = calcEMA(prices, 12);
  const ema26 = calcEMA(prices, 26);
  const macdLine: number[] = [];
  const signalLine: number[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    const macd = ema12[i] - ema26[i];
    macdLine.push(macd);
    
    if (i < 9) {
      signalLine.push(macd);
    } else {
      const signal = macdLine.slice(i - 8, i + 1).reduce((a, b) => a + b, 0) / 9;
      signalLine.push(signal);
    }
  }
  
  return { macd: macdLine, signal: signalLine };
}

function mapCandlesToPriceIndices(prices: number[], times: number[], tf: string): number[] {
  const seconds: Record<string, number> = {
    '1m':60,'3m':180,'5m':300,'15m':900,'30m':1800,'1h':3600,'4h':14400,'12h':43200,'1d':86400,
  };
  const interval = seconds[tf] || 60;
  const indices: number[] = [];
  let lastBucket = -1;
  for (let i = 0; i < prices.length; i++) {
    const t = times[i] || Date.now() / 1000 + i;
    const bucket = Math.floor(t / interval) * interval;
    if (bucket !== lastBucket) {
      if (lastBucket !== -1) indices.push(i - 1);
      lastBucket = bucket;
    }
  }
  indices.push(prices.length - 1);
  return indices;
}

function calcSR(prices: number[]) {
  if (prices.length < 10) return { support: 0, resistance: 0 };
  const sorted = [...prices].sort((a, b) => a - b);
  const p5 = Math.floor(sorted.length * 0.05);
  const p95 = Math.floor(sorted.length * 0.95);
  return { support: sorted[p5], resistance: sorted[Math.min(p95, sorted.length - 1)] };
}

function calcMACDFull(prices: number[]) {
  const ema12 = calcEMA(prices, 12);
  const ema26 = calcEMA(prices, 26);
  const macd = (ema12[ema12.length - 1] || 0) - (ema26[ema26.length - 1] || 0);
  const signal = macd * 0.8;
  return { macd, signal, histogram: macd - signal };
}

function calculateDigitStats(symbol: string, tickRange: number): DigitStats {
  const ticks = getTickHistory(symbol);
  const tickPricesData = getTickPrices(symbol);
  const recentTicks = ticks.slice(-tickRange);
  
  const frequency: Record<number, number> = {};
  for (let i = 0; i <= 9; i++) frequency[i] = 0;
  
  for (const digit of recentTicks) {
    frequency[digit] = (frequency[digit] || 0) + 1;
  }
  
  const percentages: Record<number, number> = {};
  for (let i = 0; i <= 9; i++) {
    percentages[i] = (frequency[i] / recentTicks.length) * 100;
  }
  
  let mostCommon = 0;
  let leastCommon = 0;
  let maxFreq = 0;
  let minFreq = Infinity;
  
  for (let i = 0; i <= 9; i++) {
    if (frequency[i] > maxFreq) {
      maxFreq = frequency[i];
      mostCommon = i;
    }
    if (frequency[i] < minFreq) {
      minFreq = frequency[i];
      leastCommon = i;
    }
  }
  
  const evenCount = recentTicks.filter(d => d % 2 === 0).length;
  const oddCount = recentTicks.length - evenCount;
  const overCount = recentTicks.filter(d => d > 4).length;
  const underCount = recentTicks.length - overCount;
  const last26Digits = ticks.slice(-26);
  const last26Prices = tickPricesData.slice(-26);
  
  return {
    frequency,
    percentages,
    mostCommon,
    leastCommon,
    totalTicks: recentTicks.length,
    evenPercentage: recentTicks.length > 0 ? (evenCount / recentTicks.length * 100) : 50,
    oddPercentage: recentTicks.length > 0 ? (oddCount / recentTicks.length * 100) : 50,
    overPercentage: recentTicks.length > 0 ? (overCount / recentTicks.length * 100) : 50,
    underPercentage: recentTicks.length > 0 ? (underCount / recentTicks.length * 100) : 50,
    last26Digits,
    tickPrices: last26Prices,
  };
}

// ============================================
// VIRTUAL CONTRACT SIMULATION FUNCTION
// ============================================

function simulateVirtualContract(
  contractType: string, barrier: string, symbol: string
): Promise<{ won: boolean; digit: number }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsub();
      reject(new Error('Virtual contract timeout'));
    }, 5000);
    
    const unsub = derivApi.onMessage((data: any) => {
      if (data.tick && data.tick.symbol === symbol) {
        clearTimeout(timeout);
        unsub();
        const digit = getLastDigit(data.tick.quote);
        const b = parseInt(barrier) || 0;
        let won = false;
        switch (contractType) {
          case 'DIGITEVEN': won = digit % 2 === 0; break;
          case 'DIGITODD': won = digit % 2 !== 0; break;
          case 'DIGITMATCH': won = digit === b; break;
          case 'DIGITDIFF': won = digit !== b; break;
          case 'DIGITOVER': won = digit > b; break;
          case 'DIGITUNDER': won = digit < b; break;
          case 'CALL': won = true; break;
          case 'PUT': won = false; break;
          default: won = false;
        }
        resolve({ won, digit });
      }
    });
  });
}

// ============================================
// CHECK CONNECTION FUNCTION
// ============================================
const checkConnection = async (): Promise<boolean> => {
  if (!derivApi.isConnected) {
    toast.error('Not connected to Deriv. Please check your connection.');
    return false;
  }
  return true;
};

// ============================================
// PATTERN PARSING FUNCTIONS FOR COMBINED STRATEGY
// ============================================

type PatternToken = 
  | { type: 'digit'; value: number }
  | { type: 'eo'; value: 'E' | 'O' }
  | { type: 'ou'; value: 'O' | 'U' }; // Over/Under

function parseCombinedPattern(patternStr: string): PatternToken[] | null {
  const trimmed = patternStr.trim().toUpperCase();
  if (trimmed.length === 0) return null;
  
  const tokens: PatternToken[] = [];
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch >= '0' && ch <= '9') {
      tokens.push({ type: 'digit', value: parseInt(ch, 10) });
    } else if (ch === 'E' || ch === 'O') {
      tokens.push({ type: 'eo', value: ch });
    } else if (ch === 'U') {
      tokens.push({ type: 'ou', value: 'U' });
    } else {
      return null;
    }
  }
  return tokens;
}

function checkPatternMatch(ticks: number[], tickPrices: number[], tokens: PatternToken[]): boolean {
  if (ticks.length < tokens.length) return false;
  
  const recentDigits = ticks.slice(-tokens.length);
  const recentPrices = tickPrices.slice(-tokens.length);
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const digit = recentDigits[i];
    const price = recentPrices[i];
    const prevPrice = i > 0 ? recentPrices[i - 1] : undefined;
    
    switch (token.type) {
      case 'digit':
        if (digit !== token.value) return false;
        break;
      case 'eo':
        const isEven = digit % 2 === 0;
        if ((token.value === 'E' && !isEven) || (token.value === 'O' && isEven)) return false;
        break;
      case 'ou':
        const isOver = digit > 4;
        if ((token.value === 'O' && !isOver) || (token.value === 'U' && isOver)) return false;
        break;
    }
  }
  return true;
}

export default function TradingChart() {
  const { isAuthorized, balance: apiBalance, refreshBalance } = useAuth();
  const [showChart, setShowChart] = useState(false);
  const [symbol, setSymbol] = useState('R_100');
  const [groupFilter, setGroupFilter] = useState('all');
  const [timeframe, setTimeframe] = useState('1m');
  const [prices, setPrices] = useState<number[]>([]);
  const [times, setTimes] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [candleCount, setCandleCount] = useState(CANDLE_CONFIG.defaultCandles);
  const [tickRange, setTickRange] = useState(1000);
  const subscribedRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const subscriptionRef = useRef<any>(null);
  const reconnectAttempts = useRef(0);

  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [showIndicatorPanel, setShowIndicatorPanel] = useState(false);

  const [digitStats, setDigitStats] = useState<DigitStats>({
    frequency: {},
    percentages: {},
    mostCommon: 0,
    leastCommon: 0,
    totalTicks: 0,
    evenPercentage: 50,
    oddPercentage: 50,
    overPercentage: 50,
    underPercentage: 50,
    last26Digits: [],
    tickPrices: [],
  });

  const [candleWidth, setCandleWidth] = useState(7);
  const [scrollOffset, setScrollOffset] = useState(0);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartOffset = useRef(0);
  const isPriceAxisDragging = useRef(false);
  const priceAxisStartY = useRef(0);
  const priceAxisStartWidth = useRef(7);

  // Contract type for display
  const [selectedContractType, setSelectedContractType] = useState('CALL');
  const [selectedPrediction, setSelectedPrediction] = useState('5');

  const [tradeHistory, setTradeHistory] = useState<TradeRecord[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const lastSpokenSignal = useRef('');

  const [strategyEnabled, setStrategyEnabled] = useState(false);
  const [strategyMode, setStrategyMode] = useState<'pattern' | 'digit' | 'combined'>('pattern');
  const [patternInput, setPatternInput] = useState('');
  const [digitCondition, setDigitCondition] = useState('==');
  const [digitCompare, setDigitCompare] = useState('5');
  const [digitWindow, setDigitWindow] = useState('3');
  const [combinedPatterns, setCombinedPatterns] = useState<string>('');
  const [useOrLogic, setUseOrLogic] = useState(false); // true = OR, false = AND (all patterns must match)

  const [botRunning, setBotRunning] = useState(false);
  const [botPaused, setBotPaused] = useState(false);
  const botRunningRef = useRef(false);
  const botPausedRef = useRef(false);
  const shouldStopRef = useRef(false);
  const [botConfig, setBotConfig] = useState({
    botSymbol: 'R_100',
    stake: '1.00',
    contractType: 'CALL',
    prediction: '5',
    duration: '1',
    durationUnit: 't',
    martingale: false,
    multiplier: '2.0',
    stopLoss: '10',
    takeProfit: '20',
    maxTrades: '50',
  });
  const [botStats, setBotStats] = useState({ trades: 0, wins: 0, losses: 0, pnl: 0, currentStake: 0, consecutiveLosses: 0 });
  const [turboMode, setTurboMode] = useState(true); // TURBO MODE DEFAULT TRUE

  const [displaySymbols, setDisplaySymbols] = useState<string[]>([]);
  const [showNumbersInFiltration, setShowNumbersInFiltration] = useState(false); // Toggle for showing numbers

  // ============================================
  // VIRTUAL HOOK STATE VARIABLES
  // ============================================
  const [hookEnabled, setHookEnabled] = useState(false);
  const [virtualLossCount, setVirtualLossCount] = useState('3');
  const [realCount, setRealCount] = useState('3');
  const [vhFakeWins, setVhFakeWins] = useState(0);
  const [vhFakeLosses, setVhFakeLosses] = useState(0);
  const [vhConsecLosses, setVhConsecLosses] = useState(0);
  const [vhStatus, setVhStatus] = useState<'idle' | 'waiting' | 'confirmed' | 'failed'>('idle');
  const patternTradeTakenRef = useRef(false);

  // Helper function to get symbol based on contract type, digit, and price movement
  const getDigitSymbol = useCallback((digit: number, price: number, prevPrice: number | null, type: string, barrier: string): string => {
    const barrierNum = parseInt(barrier);
    
    switch (type) {
      case 'CALL':
      case 'PUT':
        if (prevPrice === null) return '?';
        if (price > prevPrice) return 'R';
        if (price < prevPrice) return 'F';
        return 'C';
        
      case 'DIGITOVER':
        if (digit > barrierNum) return 'O';
        if (digit === barrierNum) return 'S';
        return 'U';
        
      case 'DIGITUNDER':
        if (digit < barrierNum) return 'U';
        if (digit === barrierNum) return 'S';
        return 'O';
        
      case 'DIGITEVEN':
        return digit % 2 === 0 ? 'E' : 'O';
        
      case 'DIGITODD':
        return digit % 2 !== 0 ? 'O' : 'E';
        
      case 'DIGITMATCH':
        return digit === barrierNum ? 'S' : 'D';
        
      case 'DIGITDIFF':
        return digit !== barrierNum ? 'D' : 'S';
        
      default:
        return digit.toString();
    }
  }, []);

  // Update display symbols
  const updateDisplaySymbols = useCallback(() => {
    const tickPricesData = digitStats.tickPrices;
    const symbols = digitStats.last26Digits.map((digit, index) => {
      const currentPrice = tickPricesData[index];
      const prevPrice = index > 0 ? tickPricesData[index - 1] : null;
      return getDigitSymbol(digit, currentPrice, prevPrice, selectedContractType, selectedPrediction);
    });
    setDisplaySymbols(symbols);
  }, [digitStats.last26Digits, digitStats.tickPrices, selectedContractType, selectedPrediction, getDigitSymbol]);

  // Update when contract type changes
  useEffect(() => {
    updateDisplaySymbols();
  }, [selectedContractType, selectedPrediction, updateDisplaySymbols]);

  // Update when tick data changes
  useEffect(() => {
    updateDisplaySymbols();
  }, [digitStats.last26Digits, digitStats.tickPrices, updateDisplaySymbols]);

  // Function to update digit stats
  const updateDigitStats = useCallback(() => {
    const stats = calculateDigitStats(symbol, tickRange);
    setDigitStats(stats);
  }, [symbol, tickRange]);

  // Subscribe to real-time tick updates
  useEffect(() => {
    updateDigitStats();
    
    const unsubscribe = subscribeToTicks(symbol, () => {
      updateDigitStats();
    });
    
    return unsubscribe;
  }, [symbol, tickRange, updateDigitStats]);

  const addIndicator = useCallback((type: IndicatorType) => {
    const newIndicator: Indicator = {
      id: `${type}-${Date.now()}`,
      type,
      enabled: true,
    };
    setIndicators(prev => [...prev, newIndicator]);
    toast.success(`${type} indicator added`);
  }, []);

  const removeIndicator = useCallback((id: string) => {
    setIndicators(prev => prev.filter(ind => ind.id !== id));
    toast.info('Indicator removed');
  }, []);

  const toggleIndicator = useCallback((id: string) => {
    setIndicators(prev => prev.map(ind =>
      ind.id === id ? { ...ind, enabled: !ind.enabled } : ind
    ));
  }, []);

  // Load history
  useEffect(() => {
    let active = true;
    let timeoutId: NodeJS.Timeout;
    
    const cleanup = async () => {
      if (subscriptionRef.current) {
        try {
          await derivApi.unsubscribeTicks(symbol as MarketSymbol);
          console.log(`Unsubscribed from ${symbol}`);
        } catch (err) {
          console.error('Error unsubscribing:', err);
        }
        subscriptionRef.current = null;
      }
    };

    const load = async () => {
      if (!derivApi.isConnected) {
        setIsLoading(false);
        if (reconnectAttempts.current < 3) {
          reconnectAttempts.current++;
          timeoutId = setTimeout(load, 2000);
        }
        return;
      }
      
      reconnectAttempts.current = 0;
      setIsLoading(true);
      
      await cleanup();
      
      try {
        setPrices([]);
        setTimes([]);
        
        const ticksToLoad = Math.min(candleCount, CANDLE_CONFIG.maxCandles);
        const hist = await derivApi.getTickHistory(symbol as MarketSymbol, ticksToLoad);
        if (!active) return;
        
        const historicalDigits = (hist.history.prices || []).map(p => getLastDigit(p));
        const historicalPrices = hist.history.prices || [];
        globalTickHistory[symbol] = historicalDigits;
        globalTickPrices[symbol] = historicalPrices;
        
        setPrices(hist.history.prices || []);
        setTimes(hist.history.times || []);
        setScrollOffset(0);
        setIsLoading(false);
        
        updateDigitStats();

        if (!subscribedRef.current || !subscriptionRef.current) {
          subscriptionRef.current = await derivApi.subscribeTicks(symbol as MarketSymbol, (data: any) => {
            if (!active || !data.tick) return;
            
            const quote = data.tick.quote;
            const digit = getLastDigit(quote);
            const epoch = data.tick.epoch;
            
            addTick(symbol, digit, quote);
            
            setPrices(prev => {
              const newPrices = [...prev, quote];
              return newPrices.slice(-CANDLE_CONFIG.maxCandles);
            });
            
            setTimes(prev => {
              const newTimes = [...prev, epoch];
              return newTimes.slice(-CANDLE_CONFIG.maxCandles);
            });
            
            if (canvasRef.current && showChart) {
              canvasRef.current.style.transition = 'background-color 0.1s';
              canvasRef.current.style.backgroundColor = 'rgba(63, 185, 80, 0.05)';
              setTimeout(() => {
                if (canvasRef.current) {
                  canvasRef.current.style.backgroundColor = '';
                }
              }, 100);
            }
          });
          subscribedRef.current = true;
          console.log(`Subscribed to ${symbol} for real-time updates`);
          toast.success(`Connected to ${symbol} market`, { duration: 2000 });
        }
      } catch (err) {
        console.error('Error loading market data:', err);
        setIsLoading(false);
        toast.error(`Failed to load ${symbol} data`);
      }
    };
    
    load();
    
    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
      cleanup();
      subscribedRef.current = false;
    };
  }, [symbol, candleCount, updateDigitStats, showChart]);

  useEffect(() => {
    const checkConnection = setInterval(() => {
      if (!derivApi.isConnected && !isLoading) {
        console.log('Connection lost, attempting to reconnect...');
        setPrices([]);
        setTimes([]);
        setSymbol(prev => prev);
      }
    }, 5000);

    return () => clearInterval(checkConnection);
  }, [isLoading]);

  const handleManualRefresh = useCallback(async () => {
    if (!derivApi.isConnected) {
      toast.error('Not connected to Deriv');
      return;
    }
    
    setIsLoading(true);
    try {
      const hist = await derivApi.getTickHistory(symbol as MarketSymbol, 100);
      setPrices(prev => {
        const newPrices = [...prev, ...hist.history.prices];
        return newPrices.slice(-CANDLE_CONFIG.maxCandles);
      });
      setTimes(prev => {
        const newTimes = [...prev, ...hist.history.times];
        return newTimes.slice(-CANDLE_CONFIG.maxCandles);
      });
      toast.success('Market data refreshed');
    } catch (err) {
      toast.error('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  }, [symbol]);

  const candles = useMemo(() => buildCandles(prices, times, timeframe), [prices, times, timeframe]);
  const currentPrice = prices[prices.length - 1] || 0;
  const lastDigit = getLastDigit(currentPrice);
  
  const bb = useMemo(() => calculateBollingerBands(prices, 20), [prices]);
  const ema50 = useMemo(() => calcEMA(prices, 50), [prices]);
  const sma20 = useMemo(() => calcSMA(prices, 20), [prices]);
  const { support, resistance } = useMemo(() => calcSR(prices), [prices]);
  const rsi = useMemo(() => calculateRSI(prices, 14), [prices]);
  const macd = useMemo(() => calcMACDFull(prices), [prices]);

  const candleEndIndices = useMemo(() => mapCandlesToPriceIndices(prices, times, timeframe), [prices, times, timeframe]);
  const emaSeries = useMemo(() => calcEMASeries(prices, 50), [prices]);
  const smaSeries = useMemo(() => calcSMASeries(prices, 20), [prices]);
  const bbSeries = useMemo(() => calcBBSeries(prices, 20, 2), [prices]);
  const rsiSeries = useMemo(() => calcRSISeries(prices, 14), [prices]);
  const macdSeries = useMemo(() => calcMACDSeries(prices), [prices]);

  const { frequency, percentages, mostCommon, leastCommon, totalTicks, evenPercentage, oddPercentage, overPercentage, underPercentage } = digitStats;
  
  const bbRange = bb.upper - bb.lower || 1;
  const bbPosition = ((currentPrice - bb.lower) / bbRange * 100);

  const riseSignal = useMemo(() => {
    const conf = rsi < 30 ? 85 : rsi > 70 ? 25 : 50 + (50 - rsi);
    return { direction: rsi < 45 ? 'Rise' : 'Fall', confidence: Math.min(95, Math.max(10, Math.round(conf))) };
  }, [rsi]);

  const eoSignal = useMemo(() => {
    const conf = Math.abs(evenPercentage - 50) * 2 + 50;
    return { direction: evenPercentage > 50 ? 'Even' : 'Odd', confidence: Math.min(90, Math.round(conf)) };
  }, [evenPercentage]);

  const ouSignal = useMemo(() => {
    const conf = Math.abs(overPercentage - 50) * 2 + 50;
    return { direction: overPercentage > 50 ? 'Over' : 'Under', confidence: Math.min(90, Math.round(conf)) };
  }, [overPercentage]);

  const matchSignal = useMemo(() => {
    const bestPct = Math.max(...Object.values(percentages));
    return { digit: mostCommon, confidence: Math.min(90, Math.round(bestPct * 3)) };
  }, [percentages, mostCommon]);

  const cleanPattern = patternInput.toUpperCase().replace(/[^EO]/g, '');
  const patternValid = cleanPattern.length >= 2;

  // ============================================
  // COMBINED STRATEGY PARSING
  // ============================================
  const parsedPatterns = useMemo(() => {
    if (!combinedPatterns.trim()) return [];
    const patterns = combinedPatterns.split(',').map(p => p.trim().toUpperCase()).filter(p => p.length > 0);
    return patterns.map(p => parseCombinedPattern(p)).filter((p): p is PatternToken[] => p !== null);
  }, [combinedPatterns]);

  const checkPatternMatch = useCallback((): boolean => {
    const ticks = getTickHistory(botConfig.botSymbol);
    const tickPrices = getTickPrices(botConfig.botSymbol);
    if (ticks.length < 2) return false;
    
    // Original E/O pattern strategy
    if (strategyMode === 'pattern') {
      if (ticks.length < cleanPattern.length) return false;
      const recent = ticks.slice(-cleanPattern.length);
      for (let i = 0; i < cleanPattern.length; i++) {
        const expected = cleanPattern[i];
        const actual = recent[i] % 2 === 0 ? 'E' : 'O';
        if (expected !== actual) return false;
      }
      return true;
    }
    
    // Digit condition strategy
    if (strategyMode === 'digit') {
      const win = parseInt(digitWindow) || 3;
      const comp = parseInt(digitCompare);
      if (ticks.length < win) return false;
      const recent = ticks.slice(-win);
      return recent.every(d => {
        switch (digitCondition) {
          case '>': return d > comp;
          case '<': return d < comp;
          case '>=': return d >= comp;
          case '<=': return d <= comp;
          case '==': return d === comp;
          case '!=': return d !== comp;
          default: return false;
        }
      });
    }
    
    // Combined strategy (multiple patterns)
    if (strategyMode === 'combined') {
      if (parsedPatterns.length === 0) return true;
      
      if (useOrLogic) {
        // OR: any pattern matches
        return parsedPatterns.some(patterns => checkPatternMatch(ticks, tickPrices, patterns));
      } else {
        // AND: all patterns must match (using sliding window for each pattern)
        return parsedPatterns.every(patterns => checkPatternMatch(ticks, tickPrices, patterns));
      }
    }
    
    return true;
  }, [botConfig.botSymbol, cleanPattern, strategyMode, digitWindow, digitCondition, digitCompare, parsedPatterns, useOrLogic]);

  const checkStrategyCondition = useCallback((): boolean => {
    if (!strategyEnabled) return true;
    return checkPatternMatch();
  }, [strategyEnabled, checkPatternMatch]);

  // Helper function to get outcome symbol for trade
  const getOutcomeSymbol = useCallback((trade: TradeRecord): string => {
    if (trade.status === 'open') return '';
    
    const digit = trade.resultDigit;
    if (digit === undefined) return '';
    
    const barrier = botConfig.prediction;
    const barrierNum = parseInt(barrier);
    
    switch (trade.type) {
      case 'CALL':
        return trade.status === 'won' ? 'R' : 'F';
      case 'PUT':
        return trade.status === 'won' ? 'F' : 'R';
      case 'DIGITOVER':
        if (trade.status === 'won') {
          if (digit > barrierNum) return 'O';
          if (digit === barrierNum) return 'S';
          return 'U';
        } else {
          if (digit <= barrierNum) return digit === barrierNum ? 'S' : 'U';
          return 'O';
        }
      case 'DIGITUNDER':
        if (trade.status === 'won') {
          if (digit < barrierNum) return 'U';
          if (digit === barrierNum) return 'S';
          return 'O';
        } else {
          if (digit >= barrierNum) return digit === barrierNum ? 'S' : 'O';
          return 'U';
        }
      case 'DIGITEVEN':
        if (trade.status === 'won') {
          return digit % 2 === 0 ? 'E' : 'O';
        } else {
          return digit % 2 !== 0 ? 'O' : 'E';
        }
      case 'DIGITODD':
        if (trade.status === 'won') {
          return digit % 2 !== 0 ? 'O' : 'E';
        } else {
          return digit % 2 === 0 ? 'E' : 'O';
        }
      case 'DIGITMATCH':
        if (trade.status === 'won') {
          return digit === barrierNum ? 'S' : 'D';
        } else {
          return digit !== barrierNum ? 'D' : 'S';
        }
      case 'DIGITDIFF':
        if (trade.status === 'won') {
          return digit !== barrierNum ? 'D' : 'S';
        } else {
          return digit === barrierNum ? 'S' : 'D';
        }
      default:
        return '';
    }
  }, [botConfig.prediction]);

  const getLegendText = () => {
    switch (selectedContractType) {
      case 'CALL':
        return { symbol1: 'R', meaning1: 'Rise (price up)', symbol2: 'F', meaning2: 'Fall (price down)', symbol3: 'C', meaning3: 'Constant (price same)' };
      case 'PUT':
        return { symbol1: 'F', meaning1: 'Fall (price down)', symbol2: 'R', meaning2: 'Rise (price up)', symbol3: 'C', meaning3: 'Constant (price same)' };
      case 'DIGITOVER':
        return { symbol1: 'O', meaning1: `Over > ${selectedPrediction}`, symbol2: 'S', meaning2: `Same = ${selectedPrediction}`, symbol3: 'U', meaning3: `Under < ${selectedPrediction}` };
      case 'DIGITUNDER':
        return { symbol1: 'U', meaning1: `Under < ${selectedPrediction}`, symbol2: 'S', meaning2: `Same = ${selectedPrediction}`, symbol3: 'O', meaning3: `Over > ${selectedPrediction}` };
      case 'DIGITEVEN':
        return { symbol1: 'E', meaning1: 'Even', symbol2: 'O', meaning2: 'Odd', symbol3: '', meaning3: '' };
      case 'DIGITODD':
        return { symbol1: 'O', meaning1: 'Odd', symbol2: 'E', meaning2: 'Even', symbol3: '', meaning3: '' };
      case 'DIGITMATCH':
        return { symbol1: 'S', meaning1: `Same = ${selectedPrediction}`, symbol2: 'D', meaning2: `Different ≠ ${selectedPrediction}`, symbol3: '', meaning3: '' };
      case 'DIGITDIFF':
        return { symbol1: 'D', meaning1: `Different ≠ ${selectedPrediction}`, symbol2: 'S', meaning2: `Same = ${selectedPrediction}`, symbol3: '', meaning3: '' };
      default:
        return { symbol1: '', meaning1: '', symbol2: '', meaning2: '', symbol3: '', meaning3: '' };
    }
  };

  // Canvas handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !showChart) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        setCandleWidth(prev => Math.max(2, Math.min(20, prev - Math.sign(e.deltaY))));
      } else {
        const delta = Math.sign(e.deltaY) * Math.max(3, Math.floor(candles.length * 0.03));
        setScrollOffset(prev => Math.max(0, Math.min(candles.length - 10, prev + delta)));
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      const canvasRect = canvas.getBoundingClientRect();
      const pAxisX = canvasRect.width - 70;
      const localX = e.clientX - canvasRect.left;
      if (localX >= pAxisX) {
        isPriceAxisDragging.current = true;
        priceAxisStartY.current = e.clientY;
        priceAxisStartWidth.current = candleWidth;
        canvas.style.cursor = 'ns-resize';
      } else {
        isDragging.current = true;
        dragStartX.current = e.clientX;
        dragStartOffset.current = scrollOffset;
        canvas.style.cursor = 'grabbing';
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isPriceAxisDragging.current) {
        const dy = priceAxisStartY.current - e.clientY;
        const newWidth = Math.max(2, Math.min(24, priceAxisStartWidth.current + Math.round(dy / 8)));
        setCandleWidth(newWidth);
        return;
      }
      if (!isDragging.current) return;
      const dx = dragStartX.current - e.clientX;
      const candlesPerPx = 1 / (candleWidth + 1);
      const delta = Math.round(dx * candlesPerPx);
      setScrollOffset(Math.max(0, Math.min(candles.length - 10, dragStartOffset.current + delta)));
    };

    const onMouseUp = () => {
      isDragging.current = false;
      isPriceAxisDragging.current = false;
      canvas.style.cursor = 'crosshair';
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [candles.length, scrollOffset, candleWidth, showChart]);

  // Chart rendering (keep existing rendering logic)
  useEffect(() => {
    if (!showChart) return;
    
    const canvas = canvasRef.current;
    if (!canvas || candles.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const totalH = rect.height;
    const rsiH = indicators.find(i => i.enabled && i.type === 'RSI') ? 80 : 0;
    const macdH = indicators.find(i => i.enabled && i.type === 'MACD') ? 80 : 0;
    const H = totalH - rsiH - macdH - 8;
    const priceAxisW = 70;
    const chartW = W - priceAxisW;

    ctx.fillStyle = '#0D1117';
    ctx.fillRect(0, 0, W, totalH);

    const gap = 1;
    const totalCandleW = candleWidth + gap;
    const maxVisible = Math.floor(chartW / totalCandleW);
    const endIdx = candles.length - scrollOffset;
    const startIdx = Math.max(0, endIdx - maxVisible);
    const visibleCandles = candles.slice(startIdx, endIdx);
    const visibleEndIndices = candleEndIndices.slice(startIdx, endIdx);

    if (visibleCandles.length < 1) return;

    const allPrices = visibleCandles.flatMap(c => [c.high, c.low]);
    for (let i = 0; i < visibleCandles.length; i++) {
      const idx = visibleEndIndices[i];
      if (idx === undefined) continue;
      
      if (indicators.find(i => i.enabled && i.type === 'BB')) {
        const u = idx < bbSeries.upper.length ? bbSeries.upper[idx] : null;
        const l = idx < bbSeries.lower.length ? bbSeries.lower[idx] : null;
        if (u !== null) allPrices.push(u);
        if (l !== null) allPrices.push(l);
      }
      if (indicators.find(i => i.enabled && i.type === 'MA')) {
        const e = idx < emaSeries.length ? emaSeries[idx] : null;
        const s = idx < smaSeries.length ? smaSeries[idx] : null;
        if (e !== null) allPrices.push(e);
        if (s !== null) allPrices.push(s);
      }
    }
    
    const rawMin = Math.min(...allPrices);
    const rawMax = Math.max(...allPrices);
    const priceRange = rawMax - rawMin;
    const padding = priceRange * 0.12 || 0.001;
    const minP = rawMin - padding;
    const maxP = rawMax + padding;
    const range = maxP - minP || 1;
    const chartPadTop = 20;
    const chartPadBot = 20;
    const drawH = H - chartPadTop - chartPadBot;
    const toY = (p: number) => chartPadTop + ((maxP - p) / range) * drawH;

    ctx.strokeStyle = '#21262D';
    ctx.lineWidth = 0.5;
    const gridSteps = 8;
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.fillStyle = '#484F58';
    for (let i = 0; i <= gridSteps; i++) {
      const y = chartPadTop + (i / gridSteps) * drawH;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke();
      const pLabel = maxP - (i / gridSteps) * range;
      ctx.fillText(pLabel.toFixed(4), chartW + 4, y + 3);
    }
    for (let i = 0; i < 10; i++) {
      const x = (chartW / 10) * i;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }

    const offsetX = 5;

    const drawLine = (values: (number | null)[], color: string, width: number, dash: number[] = []) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dash);
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < visibleCandles.length; i++) {
        const idx = visibleEndIndices[i];
        if (idx === undefined) continue;
        const v = idx < values.length ? values[idx] : null;
        if (v === null) continue;
        const x = offsetX + i * totalCandleW + candleWidth / 2;
        const y = toY(v);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };

    if (indicators.find(i => i.enabled && i.type === 'BB')) {
      ctx.fillStyle = 'rgba(188, 140, 255, 0.06)';
      const bbUpperPoints: {x: number, y: number}[] = [];
      const bbLowerPoints: {x: number, y: number}[] = [];
      for (let i = 0; i < visibleCandles.length; i++) {
        const idx = visibleEndIndices[i];
        if (idx === undefined) continue;
        const u = idx < bbSeries.upper.length ? bbSeries.upper[idx] : null;
        const l = idx < bbSeries.lower.length ? bbSeries.lower[idx] : null;
        if (u === null || l === null) continue;
        const x = offsetX + i * totalCandleW + candleWidth / 2;
        bbUpperPoints.push({ x, y: toY(u) });
        bbLowerPoints.push({ x, y: toY(l) });
      }
      if (bbUpperPoints.length > 1) {
        ctx.beginPath();
        ctx.moveTo(bbUpperPoints[0].x, bbUpperPoints[0].y);
        bbUpperPoints.forEach(p => ctx.lineTo(p.x, p.y));
        for (let i = bbLowerPoints.length - 1; i >= 0; i--) ctx.lineTo(bbLowerPoints[i].x, bbLowerPoints[i].y);
        ctx.closePath();
        ctx.fill();
      }
      drawLine(bbSeries.upper, '#BC8CFF', 1.2, [5, 3]);
      drawLine(bbSeries.middle, '#BC8CFF', 1.5);
      drawLine(bbSeries.lower, '#BC8CFF', 1.2, [5, 3]);
    }

    if (indicators.find(i => i.enabled && i.type === 'MA')) {
      drawLine(emaSeries, '#2F81F7', 1.5);
      drawLine(smaSeries, '#E6B422', 1.5);
    }

    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = '#3FB950';
    ctx.lineWidth = 1.5;
    const supY = toY(support);
    ctx.beginPath(); ctx.moveTo(0, supY); ctx.lineTo(chartW, supY); ctx.stroke();

    ctx.strokeStyle = '#F85149';
    const resY = toY(resistance);
    ctx.beginPath(); ctx.moveTo(0, resY); ctx.lineTo(chartW, resY); ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = '9px JetBrains Mono, monospace';
    ctx.fillStyle = '#3FB950';
    ctx.fillRect(chartW, supY - 7, priceAxisW, 14);
    ctx.fillStyle = '#0D1117';
    ctx.fillText(`S ${support.toFixed(4)}`, chartW + 2, supY + 3);
    ctx.fillStyle = '#F85149';
    ctx.fillRect(chartW, resY - 7, priceAxisW, 14);
    ctx.fillStyle = '#0D1117';
    ctx.fillText(`R ${resistance.toFixed(4)}`, chartW + 2, resY + 3);

    for (let i = 0; i < visibleCandles.length; i++) {
      const c = visibleCandles[i];
      const x = offsetX + i * totalCandleW;
      const isBullish = c.close >= c.open;
      const color = isBullish ? '#3B82F6' : '#EF4444';

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, toY(c.high));
      ctx.lineTo(x + candleWidth / 2, toY(c.low));
      ctx.stroke();

      const bodyTop = toY(Math.max(c.open, c.close));
      const bodyBot = toY(Math.min(c.open, c.close));
      const bodyH = Math.max(1, bodyBot - bodyTop);
      ctx.fillStyle = color;
      ctx.fillRect(x, bodyTop, candleWidth, bodyH);
    }

    const curY = toY(currentPrice);
    ctx.setLineDash([2, 2]);
    ctx.strokeStyle = '#E6EDF3';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, curY); ctx.lineTo(chartW, curY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#58A6FF';
    ctx.fillRect(chartW, curY - 8, priceAxisW, 16);
    ctx.fillStyle = '#0D1117';
    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.fillText(currentPrice.toFixed(4), chartW + 2, curY + 4);

    ctx.font = '10px JetBrains Mono, monospace';
    const legends = [
      { label: 'Support', color: '#3FB950' },
      { label: 'Resistance', color: '#F85149' },
    ];
    
    if (indicators.find(i => i.enabled && i.type === 'BB')) {
      legends.push({ label: 'BB(20,2)', color: '#BC8CFF' });
    }
    if (indicators.find(i => i.enabled && i.type === 'MA')) {
      legends.push({ label: 'EMA 50', color: '#2F81F7' });
      legends.push({ label: 'SMA 20', color: '#E6B422' });
    }
    
    let lx = 8;
    legends.forEach(l => {
      ctx.fillStyle = l.color;
      ctx.fillRect(lx, 6, 10, 3);
      ctx.fillText(l.label, lx + 14, 12);
      lx += ctx.measureText(l.label).width + 24;
    });

    ctx.fillStyle = '#484F58';
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.fillText(`${visibleCandles.length} candles | Scroll: wheel | Zoom: Ctrl+wheel | Drag to pan`, 8, H - 6);

    let currentYOffset = H + 8;
    
    if (indicators.find(i => i.enabled && i.type === 'RSI')) {
      const rsiTop = currentYOffset;
      ctx.fillStyle = '#161B22';
      ctx.fillRect(0, rsiTop, W, rsiH);
      ctx.strokeStyle = '#21262D';
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, rsiTop); ctx.lineTo(W, rsiTop); ctx.stroke();

      const rsiToY = (v: number) => rsiTop + 4 + ((100 - v) / 100) * (rsiH - 8);
      ctx.font = '8px JetBrains Mono, monospace';
      [30, 50, 70].forEach(level => {
        const y = rsiToY(level);
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = level === 50 ? '#484F58' : (level === 70 ? '#F8514950' : '#3FB95050');
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#484F58';
        ctx.fillText(String(level), chartW + 4, y + 3);
      });

      ctx.fillStyle = '#8B949E';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText('RSI(14)', 4, rsiTop + 12);

      ctx.strokeStyle = '#D29922';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let rsiStarted = false;
      for (let i = 0; i < visibleCandles.length; i++) {
        const idx = visibleEndIndices[i];
        if (idx === undefined) continue;
        const v = idx < rsiSeries.length ? rsiSeries[idx] : null;
        if (v === null) continue;
        const x = offsetX + i * totalCandleW + candleWidth / 2;
        const y = rsiToY(v);
        if (!rsiStarted) { ctx.moveTo(x, y); rsiStarted = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      const lastRsi = rsi;
      const rsiColor = lastRsi > 70 ? '#F85149' : lastRsi < 30 ? '#3FB950' : '#D29922';
      ctx.fillStyle = rsiColor;
      ctx.fillRect(chartW, rsiToY(lastRsi) - 7, priceAxisW, 14);
      ctx.fillStyle = '#0D1117';
      ctx.font = 'bold 9px JetBrains Mono, monospace';
      ctx.fillText(lastRsi.toFixed(1), chartW + 2, rsiToY(lastRsi) + 3);

      ctx.fillStyle = 'rgba(248, 81, 73, 0.04)';
      ctx.fillRect(0, rsiTop, chartW, rsiToY(70) - rsiTop);
      ctx.fillStyle = 'rgba(63, 185, 80, 0.04)';
      ctx.fillRect(0, rsiToY(30), chartW, rsiTop + rsiH - rsiToY(30));
      
      currentYOffset += rsiH;
    }
    
    if (indicators.find(i => i.enabled && i.type === 'MACD')) {
      const macdTop = currentYOffset;
      ctx.fillStyle = '#161B22';
      ctx.fillRect(0, macdTop, W, macdH);
      ctx.strokeStyle = '#21262D';
      ctx.beginPath(); ctx.moveTo(0, macdTop); ctx.lineTo(W, macdTop); ctx.stroke();
      
      const macdValues = macdSeries.macd;
      const signalValues = macdSeries.signal;
      
      if (macdValues.length > 0) {
        const allMacd = [...macdValues, ...signalValues];
        const maxMacd = Math.max(...allMacd, 0.001);
        const minMacd = Math.min(...allMacd, -0.001);
        const macdRange = maxMacd - minMacd;
        
        const macdToY = (v: number) => macdTop + 4 + ((maxMacd - v) / macdRange) * (macdH - 8);
        
        const zeroY = macdToY(0);
        ctx.strokeStyle = '#484F58';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(0, zeroY); ctx.lineTo(chartW, zeroY); ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.beginPath();
        ctx.strokeStyle = '#2F81F7';
        ctx.lineWidth = 1.5;
        let macdStarted = false;
        for (let i = 0; i < visibleCandles.length; i++) {
          const idx = visibleEndIndices[i];
          if (idx === undefined) continue;
          const v = idx < macdValues.length ? macdValues[idx] : null;
          if (v === null) continue;
          const x = offsetX + i * totalCandleW + candleWidth / 2;
          const y = macdToY(v);
          if (!macdStarted) { ctx.moveTo(x, y); macdStarted = true; }
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        
        ctx.beginPath();
        ctx.strokeStyle = '#E6B422';
        ctx.lineWidth = 1.5;
        let signalStarted = false;
        for (let i = 0; i < visibleCandles.length; i++) {
          const idx = visibleEndIndices[i];
          if (idx === undefined) continue;
          const v = idx < signalValues.length ? signalValues[idx] : null;
          if (v === null) continue;
          const x = offsetX + i * totalCandleW + candleWidth / 2;
          const y = macdToY(v);
          if (!signalStarted) { ctx.moveTo(x, y); signalStarted = true; }
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        
        ctx.fillStyle = '#8B949E';
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.fillText('MACD', 4, macdTop + 12);
        
        const lastMacd = macdValues[macdValues.length - 1] || 0;
        const lastSignal = signalValues[signalValues.length - 1] || 0;
        ctx.fillStyle = '#2F81F7';
        ctx.fillRect(chartW, macdToY(lastMacd) - 7, priceAxisW / 2, 14);
        ctx.fillStyle = '#0D1117';
        ctx.font = 'bold 8px JetBrains Mono, monospace';
        ctx.fillText(lastMacd.toFixed(4), chartW + 2, macdToY(lastMacd) + 3);
        
        ctx.fillStyle = '#E6B422';
        ctx.fillRect(chartW + priceAxisW / 2, macdToY(lastSignal) - 7, priceAxisW / 2, 14);
        ctx.fillStyle = '#0D1117';
        ctx.fillText(lastSignal.toFixed(4), chartW + priceAxisW / 2 + 2, macdToY(lastSignal) + 3);
      }
    }

  }, [candles, bb, ema50, support, resistance, currentPrice, candleEndIndices, emaSeries, smaSeries, bbSeries, rsiSeries, rsi, candleWidth, scrollOffset, showChart, indicators, macdSeries]);

  const filteredMarkets = groupFilter === 'all' ? ALL_MARKETS : ALL_MARKETS.filter(m => m.group === groupFilter);
  const marketName = ALL_MARKETS.find(m => m.symbol === symbol)?.name || symbol;

  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    if (lastSpokenSignal.current === text) return;
    lastSpokenSignal.current = text;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  // ============================================
  // EXECUTE REAL TRADE FUNCTION (with TP/SL handling)
  // ============================================
  const executeRealTrade = useCallback(async (
    stakeAmount: number,
    currentPnl: number,
    isVirtual: boolean = false
  ): Promise<{ won: boolean; profit: number; newPnl: number; shouldStop: boolean }> => {
    // Check connection before executing trade
    if (!derivApi.isConnected) {
      toast.error('No connection to Deriv. Cannot execute trade.');
      return { won: false, profit: 0, newPnl: currentPnl, shouldStop: false };
    }
    
    const ct = botConfig.contractType;
    const params: any = {
      contract_type: ct,
      symbol: botConfig.botSymbol,
      duration: parseInt(botConfig.duration),
      duration_unit: botConfig.durationUnit,
      basis: 'stake',
      amount: stakeAmount,
    };
    if (['DIGITMATCH', 'DIGITDIFF', 'DIGITOVER', 'DIGITUNDER'].includes(ct)) {
      params.barrier = botConfig.prediction;
    }

    try {
      const { contractId } = await derivApi.buyContract(params);
      
      // Add to trade history (open status)
      const tr: TradeRecord = {
        id: contractId,
        time: Date.now(),
        type: ct,
        stake: stakeAmount,
        profit: 0,
        status: 'open',
        symbol: botConfig.botSymbol,
        isVirtual,
      };
      setTradeHistory(prev => [tr, ...prev]);
      
      const result = await derivApi.waitForContractResult(contractId);
      const won = result.status === 'won';
      const profit = result.profit;
      const newPnl = currentPnl + profit;
      const resultDigit = getLastDigit(result.price || 0);
      
      setTradeHistory(prev => prev.map(t =>
        t.id === contractId
          ? { ...t, profit, status: result.status, resultDigit, outcomeSymbol: getOutcomeSymbol({ ...t, profit, status: result.status, resultDigit }) }
          : t
      ));
      
      // Check TP/SL
      const tpValue = parseFloat(botConfig.takeProfit);
      const slValue = parseFloat(botConfig.stopLoss);
      let shouldStop = false;
      
      if (newPnl >= tpValue) {
        showTPNotification('tp', `Take Profit Target Hit!`, newPnl);
        shouldStop = true;
        if (voiceEnabled) speak(`Take profit reached. Total profit ${newPnl.toFixed(2)} dollars`);
      }
      if (newPnl <= -slValue) {
        showTPNotification('sl', `Stop Loss Target Hit!`, Math.abs(newPnl));
        shouldStop = true;
        if (voiceEnabled) speak(`Stop loss hit. Total loss ${Math.abs(newPnl).toFixed(2)} dollars`);
      }
      
      return { won, profit, newPnl, shouldStop };
    } catch (err: any) {
      toast.error(`Trade error: ${err.message}`);
      return { won: false, profit: 0, newPnl: currentPnl, shouldStop: false };
    }
  }, [botConfig, voiceEnabled, getOutcomeSymbol]);

  // ============================================
  // VIRTUAL TRADE FUNCTION (for hook phase) - NO NOTIFICATIONS
  // ============================================
  const executeVirtualTrade = useCallback(async (
    currentLossCount: number,
    requiredLosses: number
  ): Promise<{ won: boolean; profit: number }> => {
    try {
      const result = await simulateVirtualContract(
        botConfig.contractType,
        botConfig.prediction,
        botConfig.botSymbol
      );
      
      const won = result.won;
      
      // Add virtual trade to history - NO TOAST NOTIFICATIONS
      const virtualTrade: TradeRecord = {
        id: `virtual-${Date.now()}-${Math.random()}`,
        time: Date.now(),
        type: botConfig.contractType,
        stake: 0, // No stake for virtual trades
        profit: 0,
        status: won ? 'won' : 'lost',
        symbol: botConfig.botSymbol,
        resultDigit: result.digit,
        isVirtual: true,
        virtualLossCount: currentLossCount + (won ? 0 : 1),
        virtualRequired: requiredLosses,
      };
      setTradeHistory(prev => [virtualTrade, ...prev]);
      
      // NO toast notifications for virtual trades
      return { won, profit: 0 };
    } catch (err: any) {
      console.error('Virtual trade error:', err);
      // Add failed virtual trade - NO TOAST
      const failedTrade: TradeRecord = {
        id: `virtual-failed-${Date.now()}`,
        time: Date.now(),
        type: botConfig.contractType,
        stake: 0,
        profit: 0,
        status: 'lost',
        symbol: botConfig.botSymbol,
        isVirtual: true,
        virtualLossCount: currentLossCount + 1,
        virtualRequired: requiredLosses,
      };
      setTradeHistory(prev => [failedTrade, ...prev]);
      return { won: false, profit: 0 };
    }
  }, [botConfig]);

  // ============================================
  // START BOT WITH VIRTUAL HOOK INTEGRATION - NO VIRTUAL NOTIFICATIONS
  // ============================================
  const startBot = useCallback(async () => {
    if (!isAuthorized) { toast.error('Login to Deriv first'); return; }
    
    // Check connection before starting
    if (!derivApi.isConnected) {
      toast.error('Not connected to Deriv. Please check your connection.');
      return;
    }
    
    // Sync balance before starting
    if (refreshBalance) await refreshBalance();
    
    shouldStopRef.current = false;
    setBotRunning(true);
    setBotPaused(false);
    botRunningRef.current = true;
    botPausedRef.current = false;
    patternTradeTakenRef.current = false;
    
    const baseStake = parseFloat(botConfig.stake) || 1;
    const sl = parseFloat(botConfig.stopLoss) || 10;
    const tp = parseFloat(botConfig.takeProfit) || 20;
    const maxT = parseInt(botConfig.maxTrades) || 50;
    const mart = botConfig.martingale;
    const mult = parseFloat(botConfig.multiplier) || 2;
    
    let stake = baseStake;
    let pnl = 0;
    let trades = 0;
    let wins = 0;
    let losses = 0;
    let consLosses = 0;
    
    // Reset hook states
    setVhFakeWins(0);
    setVhFakeLosses(0);
    setVhConsecLosses(0);
    setVhStatus('idle');

    if (voiceEnabled) speak('Auto trading bot started');

    while (botRunningRef.current && !shouldStopRef.current) {
      if (botPausedRef.current) {
        await new Promise(r => setTimeout(r, 500));
        continue;
      }
      
      // Check TP/SL limits
      if (trades >= maxT || pnl <= -sl || pnl >= tp) {
        const reason = trades >= maxT ? 'Max trades reached' : pnl <= -sl ? 'Stop loss hit' : 'Take profit reached';
        toast.info(`🤖 Bot stopped: ${reason}`);
        break;
      }

      // Check strategy condition if enabled
      if (strategyEnabled) {
        let conditionMet = false;
        while (botRunningRef.current && !conditionMet && !shouldStopRef.current) {
          conditionMet = checkStrategyCondition();
          if (!conditionMet) {
            await new Promise(r => setTimeout(r, 500));
          }
        }
        if (!botRunningRef.current || shouldStopRef.current) break;
      }

      // ============================================
      // VIRTUAL HOOK LOGIC - NO NOTIFICATIONS
      // ============================================
      if (hookEnabled) {
        setVhStatus('waiting');
        let consecLossesHook = 0;
        const requiredLosses = parseInt(virtualLossCount) || 3;
        const realTradesCount = parseInt(realCount) || 2;
        let virtualTradeNum = 0;

        // VIRTUAL PHASE: Accumulate consecutive losses - NO TOASTS
        while (consecLossesHook < requiredLosses && botRunningRef.current && !shouldStopRef.current) {
          virtualTradeNum++;
          
          if (voiceEnabled && virtualTradeNum % 5 === 0) {
            speak(`Virtual trade ${virtualTradeNum}, losses ${consecLossesHook} of ${requiredLosses}`);
          }
          
          try {
            const vResult = await executeVirtualTrade(consecLossesHook, requiredLosses);
            
            if (!botRunningRef.current || shouldStopRef.current) break;

            if (vResult.won) {
              consecLossesHook = 0;
              setVhConsecLosses(0);
              setVhFakeWins(prev => prev + 1);
              // NO toast notification
            } else {
              consecLossesHook++;
              setVhConsecLosses(consecLossesHook);
              setVhFakeLosses(prev => prev + 1);
              // NO toast notification
            }
            
            await new Promise(r => setTimeout(r, 200));
          } catch (err) {
            console.error('Virtual simulation error:', err);
            break;
          }
        }

        if (!botRunningRef.current || shouldStopRef.current) break;

        setVhStatus('confirmed');
        // NO toast notification for hook confirmation
        
        if (voiceEnabled) {
          speak(`Virtual hook confirmed after ${consecLossesHook} losses. Starting ${realTradesCount} real trades.`);
        }

        // REAL PHASE: Execute real trades - BREAK ON FIRST WIN
        let winOccurred = false;
        
        for (let ri = 0; ri < realTradesCount && botRunningRef.current && !winOccurred && !shouldStopRef.current; ri++) {
          if (!derivApi.isConnected) {
            toast.error('Connection lost. Stopping bot.');
            shouldStopRef.current = true;
            break;
          }
          
          const result = await executeRealTrade(stake, pnl, false);
          
          trades++;
          pnl = result.newPnl;
          
          if (result.won) {
            wins++;
            consLosses = 0;
            winOccurred = true;
            stake = baseStake;
            if (voiceEnabled) speak(`Hook trade ${ri + 1} won. Total profit ${pnl.toFixed(2)}`);
            toast.success(`✅ Hook trade WIN! Exiting hook mode.`);
          } else {
            losses++;
            consLosses++;
            if (mart) {
              stake = Math.round(stake * mult * 100) / 100;
            }
            if (voiceEnabled) speak(`Hook trade ${ri + 1} loss. ${mart ? `New stake ${stake.toFixed(2)}` : ''}`);
          }
          
          setBotStats({ trades, wins, losses, pnl, currentStake: stake, consecutiveLosses: consLosses });
          
          if (result.shouldStop) {
            shouldStopRef.current = true;
            break;
          }
          
          if (!turboMode && ri < realTradesCount - 1 && !winOccurred) {
            await new Promise(r => setTimeout(r, 400));
          }
        }
        
        setVhStatus('idle');
        setVhConsecLosses(0);
        patternTradeTakenRef.current = true;
        
        if (!turboMode && !shouldStopRef.current) {
          await new Promise(r => setTimeout(r, 500));
        }
        
        continue;
      }

      // ============================================
      // NORMAL TRADING (NO HOOK)
      // ============================================
      if (!derivApi.isConnected) {
        toast.error('Connection lost. Stopping bot.');
        break;
      }
      
      const result = await executeRealTrade(stake, pnl, false);
      
      trades++;
      pnl = result.newPnl;
      
      if (result.won) {
        wins++;
        consLosses = 0;
        stake = baseStake;
        if (voiceEnabled && trades % 5 === 0) speak(`Trade ${trades} won. Total profit ${pnl.toFixed(2)}`);
      } else {
        losses++;
        consLosses++;
        if (mart) {
          stake = Math.round(stake * mult * 100) / 100;
        } else {
          stake = baseStake;
        }
        if (voiceEnabled) speak(`Loss ${consLosses}. ${mart ? `Martingale stake ${stake.toFixed(2)}` : ''}`);
      }
      
      setBotStats({ trades, wins, losses, pnl, currentStake: stake, consecutiveLosses: consLosses });
      
      if (result.shouldStop) {
        shouldStopRef.current = true;
        break;
      }
      
      if (!turboMode) {
        await new Promise(r => setTimeout(r, 400));
      }
    }
    
    setBotRunning(false);
    botRunningRef.current = false;
    setVhStatus('idle');
    shouldStopRef.current = false;
    setBotStats(prev => ({ ...prev, trades, wins, losses, pnl }));
    
    if (voiceEnabled && (pnl <= -sl || pnl >= tp)) {
      speak(`Bot stopped. Final profit ${pnl.toFixed(2)} dollars`);
    }
  }, [isAuthorized, botConfig, voiceEnabled, speak, strategyEnabled, checkStrategyCondition, hookEnabled, virtualLossCount, realCount, executeRealTrade, executeVirtualTrade, turboMode, refreshBalance]);

  const stopBot = useCallback(() => {
    shouldStopRef.current = true;
    botRunningRef.current = false;
    setBotRunning(false);
    setVhStatus('idle');
    toast.info('🛑 Bot stopped');
  }, []);
  
  const togglePauseBot = useCallback(() => {
    botPausedRef.current = !botPausedRef.current;
    setBotPaused(botPausedRef.current);
    toast.info(botPausedRef.current ? '⏸ Bot paused' : '▶ Bot resumed');
  }, []);

  const handleBotSymbolChange = useCallback((newSymbol: string) => {
    setBotConfig(prev => ({ ...prev, botSymbol: newSymbol }));
    setSymbol(newSymbol);
  }, []);

  const totalTrades = tradeHistory.filter(t => t.status !== 'open' && !t.isVirtual).length;
  const winsCount = tradeHistory.filter(t => t.status === 'won' && !t.isVirtual).length;
  const lossesCount = tradeHistory.filter(t => t.status === 'lost' && !t.isVirtual).length;
  const totalProfit = tradeHistory.filter(t => !t.isVirtual).reduce((s, t) => s + t.profit, 0);
  const winRate = totalTrades > 0 ? (winsCount / totalTrades * 100) : 0;

  const legend = getLegendText();

  return (
    <div className="space-y-4 max-w-[1920px] mx-auto p-4">
      {/* TP/SL Notification Popup */}
      <TPSLNotificationPopup />
      
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />Milliefx Trading Chart
          </h1>
          <p className="text-xs text-muted-foreground">{marketName} • {timeframe} • {candles.length} candles</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Connection Status */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] ${
            derivApi.isConnected ? 'bg-profit/20 text-profit' : 'bg-loss/20 text-loss'
          }`}>
            {derivApi.isConnected ? (
              <>
                <Wifi className="w-3 h-3" />
                <span>Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" />
                <span>Disconnected refresh page</span>
              </>
            )}
          </div>
          <Button
            onClick={handleManualRefresh}
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin-slow' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setShowChart(!showChart)}
            variant="outline"
            size="sm"
            className="gap-1"
          >
            {showChart ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showChart ? "Hide Chart" : "Show Chart"}
          </Button>
          <Badge className="font-mono text-sm" variant="outline">
            {currentPrice.toFixed(4)}
          </Badge>
        </div>
      </div>

      {/* Market Selector */}
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="flex flex-wrap gap-1 mb-2">
          {GROUPS.map(g => (
            <Button key={g.value} size="sm" variant={groupFilter === g.value ? 'default' : 'outline'}
              className="h-6 text-[10px] px-2" onClick={() => setGroupFilter(g.value)}>
              {g.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 max-h-20 overflow-auto">
          {filteredMarkets.map(m => (
            <Button key={m.symbol} size="sm"
              variant={symbol === m.symbol ? 'default' : 'ghost'}
              className={`h-6 text-[9px] px-2 ${symbol === m.symbol ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
              onClick={() => setSymbol(m.symbol)}>
              {m.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Timeframe and Candle Count */}
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="flex flex-wrap gap-1">
          {TIMEFRAMES.map(tf => (
            <Button key={tf} size="sm" variant={timeframe === tf ? 'default' : 'outline'}
              className={`h-7 text-xs px-3 ${timeframe === tf ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => setTimeframe(tf)}>
              {tf}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-muted-foreground">Candles (1000-5000):</label>
          <Select value={String(candleCount)} onValueChange={v => setCandleCount(Math.min(Math.max(parseInt(v), CANDLE_CONFIG.minCandles), CANDLE_CONFIG.maxCandles))}>
            <SelectTrigger className="h-7 text-xs w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1000, 2000, 3000, 4000, 5000].map(c => (
                <SelectItem key={c} value={String(c)}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* LEFT: Chart + Info */}
        <div className="xl:col-span-8 space-y-3">
          {/* Candlestick Chart */}
          <AnimatePresence mode="wait">
            {showChart && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="bg-[#0D1117] border border-[#30363D] rounded-xl overflow-hidden">
                  <canvas ref={canvasRef} className="w-full" style={{ height: 520, cursor: 'crosshair' }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Indicators Panel */}
          <div className="bg-card border border-border rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground flex items-center gap-1">
                <LineChart className="w-3.5 h-3.5 text-primary" /> Indicators
              </h3>
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[10px] gap-1"
                onClick={() => setShowIndicatorPanel(!showIndicatorPanel)}
              >
                <Plus className="w-3 h-3" />
                Add Indicator
              </Button>
            </div>
            
            {showIndicatorPanel && (
              <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-lg">
                {['RSI', 'BB', 'MA', 'MACD'].map(type => (
                  <Button
                    key={type}
                    size="sm"
                    variant="outline"
                    className="h-6 text-[9px]"
                    onClick={() => addIndicator(type as IndicatorType)}
                    disabled={indicators.some(i => i.type === type)}
                  >
                    + {type}
                  </Button>
                ))}
              </div>
            )}
            
            {indicators.length > 0 ? (
              <div className="space-y-1.5">
                {indicators.map(indicator => (
                  <div key={indicator.id} className="flex items-center justify-between p-1.5 bg-muted/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={indicator.enabled}
                        onCheckedChange={() => toggleIndicator(indicator.id)}
                        className="scale-75"
                      />
                      <span className="text-[10px] font-mono">{indicator.type}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0 text-muted-foreground hover:text-loss"
                      onClick={() => removeIndicator(indicator.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-xs">
                No indicators added. Click "Add Indicator" to add RSI, BB, MA, or MACD.
              </div>
            )}
          </div>

          {/* Price Info Panel */}
          <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
            {[
              { label: 'Price', value: currentPrice.toFixed(4), color: 'text-foreground' },
              { label: 'Last Digit', value: String(lastDigit), color: 'text-primary' },
              { label: 'Support', value: support.toFixed(2), color: 'text-[#3FB950]' },
              { label: 'Resistance', value: resistance.toFixed(2), color: 'text-[#F85149]' },
              { label: 'BB Upper', value: bb.upper.toFixed(2), color: 'text-[#BC8CFF]' },
              { label: 'BB Middle', value: bb.middle.toFixed(2), color: 'text-[#BC8CFF]' },
              { label: 'BB Lower', value: bb.lower.toFixed(2), color: 'text-[#BC8CFF]' },
            ].map(item => (
              <div key={item.label} className="bg-card border border-border rounded-lg p-2 text-center">
                <div className="text-[9px] text-muted-foreground">{item.label}</div>
                <div className={`font-mono text-xs font-bold ${item.color}`}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Digit Analysis - Real-Time Updates */}
          <div className="bg-card border border-border rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground">Milliefx Digit Analysis (Real-Time)</h3>
              <div className="flex items-center gap-2">
                <label className="text-[9px] text-muted-foreground">Tick Range:</label>
                <Select value={String(tickRange)} onValueChange={v => setTickRange(parseInt(v))}>
                  <SelectTrigger className="h-7 text-xs w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TICK_RANGES.map(r => (
                      <SelectItem key={r} value={String(r)}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="text-[9px] animate-pulse">
                  Live: {totalTicks} ticks
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-[#D29922]/10 border border-[#D29922]/30 rounded-lg p-2">
                <div className="text-[9px] text-[#D29922]">Odd</div>
                <div className="font-mono text-sm font-bold text-[#D29922]">{oddPercentage.toFixed(1)}%</div>
                <div className="h-1.5 bg-muted rounded-full mt-1"><div className="h-full bg-[#D29922] rounded-full" style={{ width: `${oddPercentage}%` }} /></div>
              </div>
              <div className="bg-[#3FB950]/10 border border-[#3FB950]/30 rounded-lg p-2">
                <div className="text-[9px] text-[#3FB950]">Even</div>
                <div className="font-mono text-sm font-bold text-[#3FB950]">{evenPercentage.toFixed(1)}%</div>
                <div className="h-1.5 bg-muted rounded-full mt-1"><div className="h-full bg-[#3FB950] rounded-full" style={{ width: `${evenPercentage}%` }} /></div>
              </div>
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-2">
                <div className="text-[9px] text-primary">Over 4 (5-9)</div>
                <div className="font-mono text-sm font-bold text-primary">{overPercentage.toFixed(1)}%</div>
                <div className="h-1.5 bg-muted rounded-full mt-1"><div className="h-full bg-primary rounded-full" style={{ width: `${overPercentage}%` }} /></div>
              </div>
              <div className="bg-[#D29922]/10 border border-[#D29922]/30 rounded-lg p-2">
                <div className="text-[9px] text-[#D29922]">Under 5 (0-4)</div>
                <div className="font-mono text-sm font-bold text-[#D29922]">{underPercentage.toFixed(1)}%</div>
                <div className="h-1.5 bg-muted rounded-full mt-1"><div className="h-full bg-[#D29922] rounded-full" style={{ width: `${underPercentage}%` }} /></div>
              </div>
            </div>

            <div className="grid grid-cols-5 md:grid-cols-10 gap-1.5">
              {Array.from({ length: 10 }, (_, d) => {
                const pct = percentages[d] || 0;
                const count = frequency[d] || 0;
                const isHot = pct > 12;
                const isWarm = pct > 9;
                const isBestMatch = d === mostCommon;
                const isBestDiffer = d === leastCommon;
                return (
                  <button key={d}
                    onClick={() => { setSelectedPrediction(String(d)); }}
                    className={`relative rounded-lg p-2 text-center transition-all border cursor-pointer hover:ring-2 hover:ring-primary ${
                      selectedPrediction === String(d) ? 'ring-2 ring-primary' : ''
                    } ${isHot ? 'bg-loss/10 border-loss/40 text-loss' :
                      isWarm ? 'bg-warning/10 border-warning/40 text-warning' :
                      'bg-card border-border text-primary'}`}
                  >
                    <div className="font-mono text-lg font-bold">{d}</div>
                    <div className="text-[8px]">{count} ({pct.toFixed(1)}%)</div>
                    <div className="h-1 bg-muted rounded-full mt-1">
                      <div className={`h-full rounded-full ${isHot ? 'bg-loss' : isWarm ? 'bg-warning' : 'bg-primary'}`} style={{ width: `${Math.min(100, pct * 5)}%` }} />
                    </div>
                    {isBestMatch && (
                      <Badge className="absolute -top-1 -right-1 text-[7px] px-1 bg-profit text-profit-foreground">Match</Badge>
                    )}
                    {isBestDiffer && (
                      <Badge className="absolute -top-1 -left-1 text-[7px] px-1 bg-loss text-loss-foreground">Diff</Badge>
                    )}
                  </button>
                );
              })}
            </div>
            
            <div className="text-center text-[8px] text-muted-foreground animate-pulse">
              🔄 Updating in real-time with each new tick
            </div>
          </div>

          {/* Strategic Recommendations */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-card border border-profit/30 rounded-lg p-2">
              <div className="text-[9px] text-muted-foreground">Most Appearing </div>
              <div className="font-mono text-lg font-bold text-profit">{mostCommon}</div>
              <div className="text-[8px] text-muted-foreground">{percentages[mostCommon]?.toFixed(1)}% frequency</div>
            </div>
            <div className="bg-card border border-loss/30 rounded-lg p-2">
              <div className="text-[9px] text-muted-foreground">Least Appearing </div>
              <div className="font-mono text-lg font-bold text-loss">{leastCommon}</div>
              <div className="text-[8px] text-muted-foreground">{percentages[leastCommon]?.toFixed(1)}% frequency</div>
            </div>
            <div className="bg-card border border-[#D29922]/30 rounded-lg p-2">
              <div className="text-[9px] text-muted-foreground">Even/Odd</div>
              <div className={`font-mono text-lg font-bold ${evenPercentage > 50 ? 'text-[#3FB950]' : 'text-[#D29922]'}`}>
                {evenPercentage > 50 ? 'EVEN' : 'ODD'}
              </div>
              <div className="text-[8px] text-muted-foreground">{Math.max(evenPercentage, oddPercentage).toFixed(1)}%</div>
            </div>
            <div className="bg-card border border-primary/30 rounded-lg p-2">
              <div className="text-[9px] text-muted-foreground">Over/Under</div>
              <div className={`font-mono text-lg font-bold ${overPercentage > 50 ? 'text-primary' : 'text-[#D29922]'}`}>
                {overPercentage > 50 ? 'OVER' : 'UNDER'}
              </div>
              <div className="text-[8px] text-muted-foreground">{Math.max(overPercentage, underPercentage).toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* RIGHT: Signals + Bot + Last 26 Digits */}
        <div className="xl:col-span-4 space-y-3">
          {/* Voice AI Toggle */}
          <div className="bg-card border border-primary/30 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-primary" />Milliefx AI Voice Signals
              </h3>
              <Button
                size="sm"
                variant={voiceEnabled ? 'default' : 'outline'}
                className="h-7 text-[10px] gap-1"
                onClick={() => {
                  setVoiceEnabled(!voiceEnabled);
                  if (!voiceEnabled) {
                    const u = new SpeechSynthesisUtterance('Voice signals enabled');
                    u.rate = 1.1;
                    window.speechSynthesis?.speak(u);
                  } else {
                    window.speechSynthesis?.cancel();
                  }
                }}
              >
                {voiceEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                {voiceEnabled ? 'ON' : 'OFF'}
              </Button>
            </div>
            {voiceEnabled && (
              <p className="text-[9px] text-muted-foreground mt-1">🔊 Milliefx AI will announce trade results</p>
            )}
          </div>

          {/* Trading Signals */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center gap-1 mb-1">
                {riseSignal.direction === 'Rise' ? <TrendingUp className="w-3.5 h-3.5 text-profit" /> : <TrendingDown className="w-3.5 h-3.5 text-loss" />}
                <span className="text-[10px] font-semibold">Rise/Fall</span>
              </div>
              <div className={`font-mono text-sm font-bold ${riseSignal.direction === 'Rise' ? 'text-profit' : 'text-loss'}`}>
                {riseSignal.direction}
              </div>
              <div className="text-[8px] text-muted-foreground mb-1">RSI: {rsi.toFixed(1)}</div>
              <div className="h-1.5 bg-muted rounded-full">
                <div className={`h-full rounded-full ${riseSignal.direction === 'Rise' ? 'bg-profit' : 'bg-loss'}`}
                  style={{ width: `${riseSignal.confidence}%` }} />
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center gap-1 mb-1">
                <Activity className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-semibold">Even/Odd</span>
              </div>
              <div className={`font-mono text-sm font-bold ${eoSignal.direction === 'Even' ? 'text-[#3FB950]' : 'text-[#D29922]'}`}>
                {eoSignal.direction}
              </div>
              <div className="text-[8px] text-muted-foreground mb-1">{evenPercentage.toFixed(1)}% even</div>
              <div className="h-1.5 bg-muted rounded-full">
                <div className={`h-full rounded-full ${eoSignal.direction === 'Even' ? 'bg-[#3FB950]' : 'bg-[#D29922]'}`}
                  style={{ width: `${eoSignal.confidence}%` }} />
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center gap-1 mb-1">
                <ArrowUp className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-semibold">Over/Under</span>
              </div>
              <div className={`font-mono text-sm font-bold ${ouSignal.direction === 'Over' ? 'text-primary' : 'text-[#D29922]'}`}>
                {ouSignal.direction}
              </div>
              <div className="text-[8px] text-muted-foreground mb-1">{overPercentage.toFixed(1)}% over</div>
              <div className="h-1.5 bg-muted rounded-full">
                <div className={`h-full rounded-full ${ouSignal.direction === 'Over' ? 'bg-primary' : 'bg-[#D29922]'}`}
                  style={{ width: `${ouSignal.confidence}%` }} />
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center gap-1 mb-1">
                <Target className="w-3.5 h-3.5 text-profit" />
                <span className="text-[10px] font-semibold">Match Digit</span>
              </div>
              <div className="font-mono text-sm font-bold text-profit">Digit {matchSignal.digit}</div>
              <div className="text-[8px] text-muted-foreground mb-1">{percentages[mostCommon]?.toFixed(1)}%</div>
              <div className="h-1.5 bg-muted rounded-full">
                <div className="h-full bg-profit rounded-full" style={{ width: `${matchSignal.confidence}%` }} />
              </div>
            </div>
          </div>

          {/* AUTO BOT PANEL */}
          <div className={`bg-card border rounded-xl p-3 space-y-2 ${botRunning ? 'border-profit glow-profit' : 'border-border'}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-primary" /> Milliefx Speed Bot
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={turboMode ? 'default' : 'outline'}
                  className={`h-6 text-[9px] px-2 ${turboMode ? 'bg-profit hover:bg-profit/90 text-profit-foreground animate-pulse' : ''}`}
                  onClick={() => setTurboMode(!turboMode)}
                  disabled={botRunning}
                >
                  <Zap className="w-3 h-3 mr-0.5" />
                  {turboMode ? '⚡ TURBO' : 'Turbo'}
                </Button>
                {botRunning && (
                  <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                    <Badge className="text-[8px] bg-profit text-profit-foreground">RUNNING</Badge>
                  </motion.div>
                )}
              </div>
            </div>

            <div>
              <label className="text-[9px] text-muted-foreground">Market</label>
              <Select value={botConfig.botSymbol} onValueChange={handleBotSymbolChange} disabled={botRunning}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {ALL_MARKETS.map(m => (
                    <SelectItem key={m.symbol} value={m.symbol}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Select value={botConfig.contractType} onValueChange={v => setBotConfig(p => ({ ...p, contractType: v }))} disabled={botRunning}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{CONTRACT_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>

            {['DIGITMATCH','DIGITDIFF','DIGITOVER','DIGITUNDER'].includes(botConfig.contractType) && (
              <div>
                <label className="text-[9px] text-muted-foreground">Prediction (0-9)</label>
                <div className="grid grid-cols-5 gap-1">
                  {Array.from({ length: 10 }, (_, i) => (
                    <button key={i} disabled={botRunning} onClick={() => setBotConfig(p => ({ ...p, prediction: String(i) }))}
                      className={`h-6 rounded text-[10px] font-mono font-bold transition-all ${
                        botConfig.prediction === String(i) ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-secondary'
                      }`}>{i}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-muted-foreground">Stake ($)</label>
                <Input type="number" min="0.35" step="0.01" value={botConfig.stake}
                  onChange={e => setBotConfig(p => ({ ...p, stake: e.target.value }))} disabled={botRunning} className="h-7 text-xs" />
              </div>
              <div>
                <label className="text-[9px] text-muted-foreground">Duration</label>
                <div className="flex gap-1">
                  <Input type="number" min="1" value={botConfig.duration}
                    onChange={e => setBotConfig(p => ({ ...p, duration: e.target.value }))} disabled={botRunning} className="h-7 text-xs flex-1" />
                  <Select value={botConfig.durationUnit} onValueChange={v => setBotConfig(p => ({ ...p, durationUnit: v }))} disabled={botRunning}>
                    <SelectTrigger className="h-7 text-xs w-16"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="t">T</SelectItem>
                      <SelectItem value="s">S</SelectItem>
                      <SelectItem value="m">M</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-[10px] text-foreground">Martingale</label>
              <div className="flex items-center gap-2">
                {botConfig.martingale && (
                  <Input type="number" min="1.1" step="0.1" value={botConfig.multiplier}
                    onChange={e => setBotConfig(p => ({ ...p, multiplier: e.target.value }))} disabled={botRunning}
                    className="h-6 text-[10px] w-14" />
                )}
                <button onClick={() => setBotConfig(p => ({ ...p, martingale: !p.martingale }))} disabled={botRunning}
                  className={`w-9 h-5 rounded-full transition-colors ${botConfig.martingale ? 'bg-primary' : 'bg-muted'} relative`}>
                  <div className={`w-4 h-4 rounded-full bg-background shadow absolute top-0.5 transition-transform ${botConfig.martingale ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>

            {/* ============================================ */}
            {/* VIRTUAL HOOK SECTION - NO NOTIFICATIONS */}
            {/* ============================================ */}
            <div className="border-t border-border pt-2 mt-1">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-semibold text-primary flex items-center gap-1">
                  <Anchor className="w-3 h-3" /> Virtual Hook
                </label>
                <Switch checked={hookEnabled} onCheckedChange={setHookEnabled} disabled={botRunning} />
              </div>

              {hookEnabled && (
                <div className="space-y-2 p-2 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[8px] text-muted-foreground">Required V-Losses</label>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        value={virtualLossCount}
                        onChange={e => setVirtualLossCount(e.target.value)}
                        disabled={botRunning}
                        className="h-7 text-[10px]"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] text-muted-foreground">Real Trades (max)</label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={realCount}
                        onChange={e => setRealCount(e.target.value)}
                        disabled={botRunning}
                        className="h-7 text-[10px]"
                      />
                    </div>
                  </div>
                  
                  {/* Virtual Hook Stats Display */}
                  <div className="grid grid-cols-3 gap-1 text-center pt-1">
                    <div className="bg-muted/30 rounded p-1">
                      <div className="text-[7px] text-muted-foreground">V-Win</div>
                      <div className="font-mono text-[9px] font-bold text-profit">{vhFakeWins}</div>
                    </div>
                    <div className="bg-muted/30 rounded p-1">
                      <div className="text-[7px] text-muted-foreground">V-Loss</div>
                      <div className="font-mono text-[9px] font-bold text-loss">{vhFakeLosses}</div>
                    </div>
                    <div className="bg-muted/30 rounded p-1">
                      <div className="text-[7px] text-muted-foreground">Streak</div>
                      <div className="font-mono text-[9px] font-bold text-warning">{vhConsecLosses}</div>
                    </div>
                  </div>
                  
                  <div className="text-[8px] text-muted-foreground text-center">
                    🎣 Bot will wait for {virtualLossCount} consecutive virtual losses, then enter {realCount} real trade(s)
                  </div>
                  
                  {vhStatus === 'waiting' && botRunning && (
                    <div className="bg-primary/10 border border-primary/30 rounded p-1 text-[8px] text-primary animate-pulse text-center">
                      🎣 Waiting for {virtualLossCount} consecutive virtual losses... ({vhConsecLosses}/{virtualLossCount})
                    </div>
                  )}
                  {vhStatus === 'confirmed' && botRunning && (
                    <div className="bg-profit/10 border border-profit/30 rounded p-1 text-[4px] text-profit text-center animate-pulse">
                      ✅ Hook confirmed! Executing real trades...
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Strategy Section with Combined Mode */}
            <div className="border-t border-border pt-2 mt-1">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-semibold text-warning flex items-center gap-1">
                  <Combine className="w-3 h-3" /> Pattern/Digit/Combined Strategy
                </label>
                <Switch checked={strategyEnabled} onCheckedChange={setStrategyEnabled} disabled={botRunning} />
              </div>

              {strategyEnabled && (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={strategyMode === 'pattern' ? 'default' : 'outline'}
                      className="text-[9px] h-6 px-2 flex-1"
                      onClick={() => setStrategyMode('pattern')}
                      disabled={botRunning}
                    >
                      Pattern (E/O)
                    </Button>
                    <Button
                      size="sm"
                      variant={strategyMode === 'digit' ? 'default' : 'outline'}
                      className="text-[9px] h-6 px-2 flex-1"
                      onClick={() => setStrategyMode('digit')}
                      disabled={botRunning}
                    >
                      Digit Condition 
                    </Button>
                    <Button
                      size="sm"
                      variant={strategyMode === 'combined' ? 'default' : 'outline'}
                      className="text-[9px] h-6 px-2 flex-1"
                      onClick={() => setStrategyMode('combined')}
                      disabled={botRunning}
                    >
                      <Combine className="w-2.5 h-2.5 mr-0.5" /> Combined
                    </Button>
                  </div>

                  {strategyMode === 'pattern' ? (
                    <div>
                      <label className="text-[8px] text-muted-foreground">Pattern (E=Even, O=Odd)</label>
                      <Textarea
                        placeholder="e.g., EEEOE or OOEEO"
                        value={patternInput}
                        onChange={e => setPatternInput(e.target.value.toUpperCase().replace(/[^EO]/g, ''))}
                        disabled={botRunning}
                        className="h-12 text-[10px] font-mono min-h-0 mt-1"
                      />
                      <div className={`text-[9px] font-mono mt-1 ${patternValid ? 'text-profit' : 'text-loss'}`}>
                        {cleanPattern.length === 0 ? 'Enter pattern (min 2 characters)' :
                          patternValid ? `✓ Pattern: ${cleanPattern}` : `✗ Need at least 2 characters (E/O)`}
                      </div>
                    </div>
                  ) : strategyMode === 'digit' ? (
                    <div className="grid grid-cols-3 gap-1">
                      <div>
                        <label className="text-[8px] text-muted-foreground">If last </label>
                        <Input type="number" min="1" max="50" value={digitWindow}
                          onChange={e => setDigitWindow(e.target.value)} disabled={botRunning}
                          className="h-7 text-[10px]" />
                      </div>
                      <div>
                        <label className="text-[8px] text-muted-foreground">ticks are </label>
                        <Select value={digitCondition} onValueChange={setDigitCondition} disabled={botRunning}>
                          <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['==', '!=', '>', '<', '>=', '<='].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-[8px] text-muted-foreground">Digit</label>
                        <Input type="number" min="0" max="9" value={digitCompare}
                          onChange={e => setDigitCompare(e.target.value)} disabled={botRunning}
                          className="h-7 text-[10px]" />
                      </div>
                    </div>
                  ) : (
                    // Combined Strategy UI
                    <div className="space-y-2">
                      <div>
                        <label className="text-[8px] text-muted-foreground">Patterns (comma separated)</label>
                        <Textarea
                          placeholder="e.g., 11O, 99U, 112, 232, EEEOE, OOEEO, 1O, 2E, 5U"
                          value={combinedPatterns}
                          onChange={e => setCombinedPatterns(e.target.value.toUpperCase())}
                          disabled={botRunning}
                          className="h-20 text-[10px] font-mono min-h-0 mt-1"
                        />
                        <div className="text-[8px] text-muted-foreground mt-1">
                          Formats: digits(0-9), E/O (Even/Odd), O/U (Over/Under). Example: "11O" means last two digits are 1 and 1, last is Over.
                        </div>
                        {parsedPatterns.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {parsedPatterns.map((p, idx) => (
                              <Badge key={idx} variant="outline" className="text-[8px] font-mono">
                                {combinedPatterns.split(',')[idx].trim()}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {combinedPatterns.length > 0 && parsedPatterns.length === 0 && (
                          <div className="text-[8px] text-loss mt-1">Invalid patterns. Use digits(0-9), E/O, O/U only.</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[8px] text-muted-foreground">Match Logic:</label>
                        <Button
                          size="sm"
                          variant={!useOrLogic ? 'default' : 'outline'}
                          className="text-[8px] h-5 px-2"
                          onClick={() => setUseOrLogic(false)}
                          disabled={botRunning}
                        >
                          AND (All)
                        </Button>
                        <Button
                          size="sm"
                          variant={useOrLogic ? 'default' : 'outline'}
                          className="text-[8px] h-5 px-2"
                          onClick={() => setUseOrLogic(true)}
                          disabled={botRunning}
                        >
                          OR (Any)
                        </Button>
                      </div>
                      <div className="text-[8px] text-muted-foreground text-center py-1">
                        {useOrLogic ? 'Any pattern match triggers trade' : 'All patterns must match to trade'}
                      </div>
                    </div>
                  )}

                  <div className="text-[8px] text-muted-foreground text-center py-1">
                    Bot will wait for condition before each trade
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <div>
                <label className="text-[8px] text-muted-foreground">Stop Loss</label>
                <Input type="number" value={botConfig.stopLoss} onChange={e => setBotConfig(p => ({ ...p, stopLoss: e.target.value }))}
                  disabled={botRunning} className="h-7 text-xs" />
              </div>
              <div>
                <label className="text-[8px] text-muted-foreground">Take Profit</label>
                <Input type="number" value={botConfig.takeProfit} onChange={e => setBotConfig(p => ({ ...p, takeProfit: e.target.value }))}
                  disabled={botRunning} className="h-7 text-xs" />
              </div>
              <div>
                <label className="text-[8px] text-muted-foreground">Max Trades</label>
                <Input type="number" value={botConfig.maxTrades} onChange={e => setBotConfig(p => ({ ...p, maxTrades: e.target.value }))}
                  disabled={botRunning} className="h-7 text-xs" />
              </div>
            </div>

            {botRunning && (
              <div className="grid grid-cols-3 gap-1 text-center">
                <div className="bg-muted/30 rounded p-1">
                  <div className="text-[7px] text-muted-foreground">Stake</div>
                  <div className="font-mono text-[10px] font-bold text-foreground">${botStats.currentStake.toFixed(2)}</div>
                </div>
                <div className="bg-muted/30 rounded p-1">
                  <div className="text-[7px] text-muted-foreground">Streak</div>
                  <div className="font-mono text-[10px] font-bold text-loss">{botStats.consecutiveLosses}L</div>
                </div>
                <div className={`${botStats.pnl >= 0 ? 'bg-profit/10' : 'bg-loss/10'} rounded p-1`}>
                  <div className="text-[7px] text-muted-foreground">P/L</div>
                  <div className={`font-mono text-[10px] font-bold ${botStats.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {botStats.pnl >= 0 ? '+' : ''}{botStats.pnl.toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {!botRunning ? (
                <Button onClick={startBot} disabled={!isAuthorized} className="flex-1 h-10 text-xs font-bold bg-profit hover:bg-profit/90 text-profit-foreground">
                  <Play className="w-4 h-4 mr-1" /> Start Bot
                </Button>
              ) : (
                <>
                  <Button onClick={togglePauseBot} variant="outline" className="flex-1 h-10 text-xs">
                    <Pause className="w-3.5 h-3.5 mr-1" /> {botPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button onClick={stopBot} variant="destructive" className="flex-1 h-10 text-xs">
                    <StopCircle className="w-3.5 h-3.5 mr-1" /> Stop
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Last 26 Digits - Filtration Chamber with Number Toggle */}
          <div className="bg-card border border-border rounded-xl p-3">
            <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center justify-between">
              <span>Ramzfx Filtration Chamber 🚆</span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-[8px] h-6 px-2"
                  onClick={() => setShowNumbersInFiltration(!showNumbersInFiltration)}
                >
                  {showNumbersInFiltration ? 'Hide Numbers' : 'Show Numbers'}
                </Button>
                <Badge variant="outline" className="text-[8px] animate-pulse">
                  🟢 LIVE
                </Badge>
                <Badge className="text-[8px] bg-primary/20 text-primary">
                  {selectedContractType === 'CALL' ? 'Rise' : 
                   selectedContractType === 'PUT' ? 'Fall' :
                   selectedContractType === 'DIGITOVER' ? `Over ${selectedPrediction}` :
                   selectedContractType === 'DIGITUNDER' ? `Under ${selectedPrediction}` :
                   selectedContractType === 'DIGITEVEN' ? 'Even' :
                   selectedContractType === 'DIGITODD' ? 'Odd' :
                   selectedContractType === 'DIGITMATCH' ? `Match ${selectedPrediction}` :
                   selectedContractType === 'DIGITDIFF' ? `Diff ${selectedPrediction}` : selectedContractType}
                </Badge>
              </div>
            </h3>
            
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-3 text-[8px] justify-center">
              {legend.symbol1 && (
                <div className="flex items-center gap-1">
                  <div className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold ${
                    legend.symbol1 === 'R' ? 'bg-profit/20 text-profit' :
                    legend.symbol1 === 'F' ? 'bg-loss/20 text-loss' :
                    legend.symbol1 === 'O' ? 'bg-loss/20 text-loss' :
                    legend.symbol1 === 'U' ? 'bg-profit/20 text-profit' :
                    legend.symbol1 === 'S' ? 'bg-primary/20 text-primary' :
                    legend.symbol1 === 'E' ? 'bg-[#3FB950]/20 text-[#3FB950]' :
                    'bg-muted/20 text-foreground'
                  }`}>
                    {legend.symbol1}
                  </div>
                  <span className="text-muted-foreground">{legend.meaning1}</span>
                </div>
              )}
              {legend.symbol2 && (
                <div className="flex items-center gap-1">
                  <div className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold ${
                    legend.symbol2 === 'R' ? 'bg-profit/20 text-profit' :
                    legend.symbol2 === 'F' ? 'bg-loss/20 text-loss' :
                    legend.symbol2 === 'O' ? 'bg-loss/20 text-loss' :
                    legend.symbol2 === 'U' ? 'bg-profit/20 text-profit' :
                    legend.symbol2 === 'S' ? 'bg-primary/20 text-primary' :
                    legend.symbol2 === 'E' ? 'bg-[#3FB950]/20 text-[#3FB950]' :
                    'bg-muted/20 text-foreground'
                  }`}>
                    {legend.symbol2}
                  </div>
                  <span className="text-muted-foreground">{legend.meaning2}</span>
                </div>
              )}
              {legend.symbol3 && (
                <div className="flex items-center gap-1">
                  <div className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold ${
                    legend.symbol3 === 'R' ? 'bg-profit/20 text-profit' :
                    legend.symbol3 === 'F' ? 'bg-loss/20 text-loss' :
                    legend.symbol3 === 'O' ? 'bg-loss/20 text-loss' :
                    legend.symbol3 === 'U' ? 'bg-profit/20 text-profit' :
                    legend.symbol3 === 'S' ? 'bg-primary/20 text-primary' :
                    legend.symbol3 === 'E' ? 'bg-[#3FB950]/20 text-[#3FB950]' :
                    'bg-muted/20 text-foreground'
                  }`}>
                    {legend.symbol3}
                  </div>
                  <span className="text-muted-foreground">{legend.meaning3}</span>
                </div>
              )}
            </div>
            
            {/* Analysis Mode Selector */}
            <div className="mb-3 pt-1 border-t border-border">
              <div className="flex items-center gap-2">
                <label className="text-[9px] text-muted-foreground whitespace-nowrap">Mode:</label>
                <Select value={selectedContractType} onValueChange={(value) => {
                  setSelectedContractType(value);
                  setTimeout(() => updateDisplaySymbols(), 0);
                }}>
                  <SelectTrigger className="h-6 text-[10px] flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TYPES.map(c => (
                      <SelectItem key={c.value} value={c.value} className="text-[10px]">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {['DIGITMATCH', 'DIGITDIFF', 'DIGITOVER', 'DIGITUNDER'].includes(selectedContractType) && (
                <div className="flex items-center gap-2 mt-2">
                  <label className="text-[9px] text-muted-foreground whitespace-nowrap">Digit:</label>
                  <Input
                    type="number"
                    min="0"
                    max="9"
                    value={selectedPrediction}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 9)) {
                        setSelectedPrediction(val);
                        setTimeout(() => updateDisplaySymbols(), 0);
                      }
                    }}
                    className="h-6 text-[10px] w-12 text-center"
                  />
                </div>
              )}
            </div>
            
            <div className="flex gap-1 flex-wrap justify-center">
              {displaySymbols.length > 0 ? (
                displaySymbols.map((symbol, i) => {
                  const isLast = i === displaySymbols.length - 1;
                  const actualDigit = digitStats.last26Digits[i];
                  const actualDigitForOverUnder = actualDigit !== undefined ? actualDigit : -1;
                  
                  let bgColor = '';
                  let textColor = '';
                  
                  // Color mapping based on symbol meaning with Over/Under special handling when showing numbers
                  if (showNumbersInFiltration && actualDigitForOverUnder !== -1) {
                    // Show numbers mode: Over digits (5-9) green, Under digits (0-4) red, other specials stay consistent
                    if (actualDigitForOverUnder > 4) {
                      bgColor = 'bg-profit/30';
                      textColor = 'text-profit';
                    } else {
                      bgColor = 'bg-loss/30';
                      textColor = 'text-loss';
                    }
                  } else {
                    // Normal symbol mode
                    if (symbol === 'R' || symbol === 'U') {
                      bgColor = 'bg-profit/20';
                      textColor = 'text-profit';
                    } else if (symbol === 'F' || symbol === 'O') {
                      bgColor = 'bg-loss/20';
                      textColor = 'text-loss';
                    } else if (symbol === 'E') {
                      bgColor = 'bg-[#3FB950]/20';
                      textColor = 'text-[#3FB950]';
                    } else if (symbol === 'S') {
                      bgColor = 'bg-primary/20';
                      textColor = 'text-primary';
                    } else if (symbol === 'D') {
                      bgColor = 'bg-[#D29922]/20';
                      textColor = 'text-[#D29922]';
                    } else if (symbol === 'C') {
                      bgColor = 'bg-[#58A6FF]/20';
                      textColor = 'text-[#58A6FF]';
                    } else {
                      bgColor = 'bg-muted/20';
                      textColor = 'text-foreground';
                    }
                  }
                  
                  // Display either symbol or the actual digit
                  const displayValue = showNumbersInFiltration && actualDigitForOverUnder !== -1 
                    ? actualDigitForOverUnder.toString() 
                    : symbol;
                  
                  return (
                    <motion.div
                      key={i}
                      initial={isLast ? { scale: 0.8 } : {}}
                      animate={isLast ? { scale: [1, 1.2, 1] } : {}}
                      transition={isLast ? { duration: 0.5 } : {}}
                      className={`w-7 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-sm border-2 transition-all ${
                        isLast ? 'w-9 h-11 text-base ring-2 ring-primary' : ''
                      } ${bgColor} ${textColor} ${
                        isLast ? 'border-primary' : 
                        symbol === 'R' || symbol === 'U' ? 'border-profit/30' :
                        symbol === 'F' || symbol === 'O' ? 'border-loss/30' :
                        symbol === 'E' ? 'border-[#3FB950]/30' :
                        symbol === 'S' ? 'border-primary/30' :
                        symbol === 'D' ? 'border-[#D29922]/30' :
                        'border-border'
                      }`}
                    >
                      {displayValue}
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center text-xs text-muted-foreground py-4">
                  Waiting for tick data...
                </div>
              )}
            </div>
            <div className="text-center text-[8px] text-muted-foreground mt-2">
              🔄 Updates with every tick • Latest digit highlighted
              {showNumbersInFiltration && " • Over (5-9) Green | Under (0-4) Red"}
            </div>
          </div>

          {/* Bot Progress */}
          <div className="bg-card border border-border rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-primary" /> Trade Results 
              </h3>
              {tradeHistory.length > 0 && (
                <Button variant="ghost" size="sm" className="h-6 text-[9px] text-muted-foreground hover:text-loss"
                  onClick={() => { setTradeHistory([]); setBotStats({ trades: 0, wins: 0, losses: 0, pnl: 0, currentStake: 0, consecutiveLosses: 0 }); }}>
                  Clear
                </Button>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <div className="bg-muted/30 rounded-lg p-1.5 text-center">
                <div className="text-[8px] text-muted-foreground">Trades</div>
                <div className="font-mono text-sm font-bold text-foreground">{totalTrades}</div>
              </div>
              <div className="bg-profit/10 rounded-lg p-1.5 text-center">
                <div className="text-[8px] text-profit">Wins</div>
                <div className="font-mono text-sm font-bold text-profit">{winsCount}</div>
              </div>
              <div className="bg-loss/10 rounded-lg p-1.5 text-center">
                <div className="text-[8px] text-loss">Losses</div>
                <div className="font-mono text-sm font-bold text-loss">{lossesCount}</div>
              </div>
              <div className={`${totalProfit >= 0 ? 'bg-profit/10' : 'bg-loss/10'} rounded-lg p-1.5 text-center`}>
                <div className="text-[8px] text-muted-foreground">P/L</div>
                <div className={`font-mono text-sm font-bold ${totalProfit >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)}
                </div>
              </div>
            </div>
            {totalTrades > 0 && (
              <div>
                <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
                  <span>Win Rate</span>
                  <span className="font-mono font-bold">{winRate.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-profit rounded-full" style={{ width: `${winRate}%` }} />
                </div>
              </div>
            )}

            {/* Trade History - All trades visible, no limit */}
            {tradeHistory.length > 0 && (
              <div className="max-h-60 overflow-auto space-y-1">
                {tradeHistory.map(t => {
                  const outcomeSymbol = getOutcomeSymbol(t);
                  const outcomeColor = t.status === 'won' ? 'text-profit' : 'text-loss';
                  
                  let badgeColor = '';
                  if (outcomeSymbol === 'R' || outcomeSymbol === 'U') badgeColor = 'border-profit text-profit';
                  else if (outcomeSymbol === 'F' || outcomeSymbol === 'O') badgeColor = 'border-loss text-loss';
                  else if (outcomeSymbol === 'S') badgeColor = 'border-primary text-primary';
                  else if (outcomeSymbol === 'D') badgeColor = 'border-[#D29922] text-[#D29922]';
                  else if (outcomeSymbol === 'E') badgeColor = 'border-[#3FB950] text-[#3FB950]';
                  
                  // Enhanced styling for virtual trades
                  const isVirtualTrade = t.isVirtual === true;
                  const virtualStatusClass = isVirtualTrade
                    ? t.status === 'won'
                      ? 'bg-gradient-to-r from-green-950/40 to-emerald-950/30 border-green-500/50'
                      : 'bg-gradient-to-r from-red-950/40 to-rose-950/30 border-red-500/50'
                    : '';
                  
                  return (
                    <div key={t.id} className={`flex items-center justify-between text-[9px] p-1.5 rounded-lg border ${
                      t.status === 'open' ? 'border-primary/30 bg-primary/5' :
                      t.status === 'won' ? 'border-profit/30 bg-profit/5' :
                      'border-loss/30 bg-loss/5'
                    } ${virtualStatusClass} ${isVirtualTrade ? 'border-dashed' : ''}`}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-bold ${t.status === 'won' ? 'text-profit' : t.status === 'lost' ? 'text-loss' : 'text-primary'}`}>
                          {t.status === 'open' ? '⏳' : t.status === 'won' ? '✅' : '❌'}
                        </span>
                        {isVirtualTrade && (
                          <Badge variant="outline" className="text-[6px] px-1 py-0 bg-purple-500/30 text-purple-400 border-purple-500/50">
                            VIRTUAL
                          </Badge>
                        )}
                        <span className="font-mono text-muted-foreground">{t.type}</span>
                        {!isVirtualTrade && t.stake > 0 && (
                          <span className="text-muted-foreground">${t.stake.toFixed(2)}</span>
                        )}
                        {isVirtualTrade && (
                          <span className="text-purple-400/70 text-[8px] font-mono">
                            {t.virtualLossCount !== undefined && t.virtualRequired !== undefined 
                              ? `(${t.virtualLossCount}/${t.virtualRequired})` 
                              : '(virtual)'}
                          </span>
                        )}
                        {t.resultDigit !== undefined && (
                          <Badge variant="outline" className={`text-[8px] px-1 ${t.status === 'won' ? 'border-profit text-profit' : 'border-loss text-loss'}`}>
                            {t.resultDigit}
                          </Badge>
                        )}
                        {outcomeSymbol && t.status !== 'open' && (
                          <Badge variant="outline" className={`text-[8px] px-1 font-mono ${badgeColor}`}>
                            {outcomeSymbol}
                          </Badge>
                        )}
                      </div>
                      <span className={`font-mono font-bold ${isVirtualTrade ? (t.status === 'won' ? 'text-green-400' : 'text-red-400') : (t.profit >= 0 ? 'text-profit' : 'text-loss')}`}>
                        {t.status === 'open' ? '...' : isVirtualTrade ? (t.status === 'won' ? 'WIN' : 'LOSS') : `${t.profit >= 0 ? '+' : ''}$${t.profit.toFixed(2)}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Technical Status */}
          <div className="bg-card border border-border rounded-xl p-3 space-y-2">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-primary" /> Technical Status
            </h3>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">RSI (14)</span>
                <span className={`font-mono font-bold ${rsi > 70 ? 'text-loss' : rsi < 30 ? 'text-profit' : 'text-foreground'}`}>
                  {rsi.toFixed(1)} {rsi > 70 ? '🔴 Overbought' : rsi < 30 ? '🟢 Oversold' : '⚪ Neutral'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">MACD</span>
                <span className={`font-mono font-bold ${macd.macd > 0 ? 'text-profit' : 'text-loss'}`}>
                  {macd.macd.toFixed(4)} {macd.macd > 0 ? '📈 Bullish' : '📉 Bearish'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">EMA 50</span>
                <span className={`font-mono font-bold ${currentPrice > (ema50[ema50.length - 1] || 0) ? 'text-profit' : 'text-loss'}`}>
                  {currentPrice > (ema50[ema50.length - 1] || 0) ? '📈 Above' : '📉 Below'} ({(ema50[ema50.length - 1] || 0).toFixed(2)})
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">BB Position</span>
                <span className="font-mono font-bold text-[#BC8CFF]">{bbPosition.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full">
                <div className="h-full bg-[#BC8CFF] rounded-full" style={{ width: `${Math.min(100, Math.max(0, bbPosition))}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
