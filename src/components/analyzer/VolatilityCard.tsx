import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, Zap, BarChart3, ArrowUpDown } from 'lucide-react';

interface VolatilityCardProps {
  symbol: string;
  tickCount: number;
  mode: 'over' | 'under';
  onStrongSignal?: (hasSignal: boolean) => void;
  onConnectionStatus?: (isConnected: boolean) => void;
}

interface Pattern {
  digits: number[];
  length: number;
  frequency: number;
}

/**
 * Extracts last digit from a price using Deriv-standard method
 */
function extractDigit(price: number): number {
  const fixed = parseFloat(String(price)).toFixed(2);
  const d = parseInt(fixed.slice(-1), 10);
  if (Number.isNaN(d) || d < 0 || d > 9) return 0;
  return d;
}

export default function VolatilityCard({ 
  symbol, 
  tickCount, 
  mode, 
  onStrongSignal,
  onConnectionStatus 
}: VolatilityCardProps) {
  const [digits, setDigits] = useState<number[]>([]);
  const [activeDigit, setActiveDigit] = useState(5);
  const [status, setStatus] = useState<'connecting' | 'live' | 'error' | 'offline'>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const digitsRef = useRef<number[]>([]);
  const mountedRef = useRef(true);
  const lastSignalRef = useRef<string>('');
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const retryCountRef = useRef(0);
  const maxRetries = 5;

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    if (!mountedRef.current) return;
    
    setStatus('connecting');
    onConnectionStatus?.(false);
    
    const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=131592');
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setStatus('live');
      onConnectionStatus?.(true);
      retryCountRef.current = 0;
      
      // Request initial data
      ws.send(JSON.stringify({
        ticks_history: symbol,
        style: 'ticks',
        count: tickCount,
        end: 'latest',
        subscribe: 1,
      }));
    };

    ws.onmessage = (msg) => {
      if (!mountedRef.current) return;
      
      try {
        const data = JSON.parse(msg.data);

        if (data.history) {
          const prices: number[] = data.history.prices || [];
          const extracted = prices.map(extractDigit);
          digitsRef.current = extracted;
          setDigits([...extracted]);
        }

        if (data.tick) {
          const price = parseFloat(data.tick.quote);
          const digit = extractDigit(price);
          if (digit >= 0 && digit <= 9) {
            digitsRef.current.push(digit);
            if (digitsRef.current.length > 4000) digitsRef.current.shift();
            setDigits([...digitsRef.current]);
          }
        }
        
        // Handle errors
        if (data.error) {
          console.error('WebSocket error:', data.error);
          setStatus('error');
          onConnectionStatus?.(false);
        }
      } catch (err) {
        console.error('Error parsing message:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      if (mountedRef.current) {
        setStatus('error');
        onConnectionStatus?.(false);
      }
    };
    
    ws.onclose = () => {
      if (!mountedRef.current) return;
      setStatus('offline');
      onConnectionStatus?.(false);
      
      // Auto-reconnect with exponential backoff
      if (retryCountRef.current < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            retryCountRef.current++;
            connectWebSocket();
          }
        }, delay);
      }
    };
  }, [symbol, tickCount, onConnectionStatus]);

  // Initialize connection
  useEffect(() => {
    mountedRef.current = true;
    digitsRef.current = [];
    setDigits([]);
    
    connectWebSocket();

    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connectWebSocket]);

  // Reconnect when tickCount changes
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        ticks_history: symbol,
        style: 'ticks',
        count: tickCount,
        end: 'latest',
        subscribe: 1,
      }));
    }
  }, [symbol, tickCount]);

  // Optimized analysis with memoization
  const analysis = useMemo(() => {
    const recentTicks = digits.slice(-tickCount);
    const lastDigits = recentTicks.slice(-30);
    const threshold = activeDigit;
    const total = recentTicks.length || 1;

    // Fast frequency counting
    const counts = new Array(10).fill(0);
    for (let i = 0; i < recentTicks.length; i++) {
      const d = recentTicks[i];
      if (d >= 0 && d <= 9) counts[d]++;
    }

    // Calculate percentages for each digit (to one decimal place)
    const digitPercentages = new Array(10).fill('0.0');
    for (let i = 0; i < 10; i++) {
      digitPercentages[i] = ((counts[i] / total) * 100).toFixed(1);
    }

    // Find most, second, least frequent digits
    let most = 0, second = 1, least = 9;
    let mostCount = counts[0], secondCount = counts[1], leastCount = counts[9];
    
    for (let i = 1; i < 10; i++) {
      if (counts[i] > mostCount) {
        second = most;
        secondCount = mostCount;
        most = i;
        mostCount = counts[i];
      } else if (counts[i] > secondCount) {
        second = i;
        secondCount = counts[i];
      }
      if (counts[i] < leastCount) {
        least = i;
        leastCount = counts[i];
      }
    }

    // Over/Under percentages
    let lowCount = 0, highCount = 0;
    for (let i = 0; i < threshold; i++) lowCount += counts[i];
    for (let i = threshold + 1; i <= 9; i++) highCount += counts[i];
    const lowPercent = ((lowCount / total) * 100).toFixed(1);
    const highPercent = ((highCount / total) * 100).toFixed(1);

    // Even/Odd analysis
    let evenCount = 0, oddCount = 0;
    for (let i = 0; i <= 9; i += 2) evenCount += counts[i];
    for (let i = 1; i <= 9; i += 2) oddCount += counts[i];
    const evenPercent = ((evenCount / total) * 100).toFixed(1);
    const oddPercent = ((oddCount / total) * 100).toFixed(1);

    // Strong signal detection
    let signalType: 'neutral' | 'over' | 'under' = 'neutral';
    let signalStrength = 0;
    let signalText = 'WAIT';
    
    if (recentTicks.length >= 50) {
      if (most < threshold && second < threshold) {
        signalType = 'under';
        signalStrength = Math.min(100, Math.round(((counts[most] + counts[second]) / total) * 100));
        signalText = `🔥 UNDER ${threshold} (${signalStrength}%)`;
      } else if (most > threshold && second > threshold) {
        signalType = 'over';
        signalStrength = Math.min(100, Math.round(((counts[most] + counts[second]) / total) * 100));
        signalText = `🔥 OVER ${threshold} (${signalStrength}%)`;
      }
    }

    // Entry probability calculation
    const winningDigits: number[] = [];
    const losingDigits: number[] = [];
    const entryProbability: { digit: number; winRate: number }[] = [];
    
    for (let digit = 0; digit <= 9; digit++) {
      let wins = 0, losses = 0;
      for (let i = 0; i < recentTicks.length - 1; i++) {
        if (recentTicks[i] === digit) {
          const next = recentTicks[i + 1];
          if (mode === 'over') {
            if (next > threshold) wins++;
            else if (next < threshold) losses++;
          } else {
            if (next < threshold) wins++;
            else if (next > threshold) losses++;
          }
        }
      }
      
      if (wins + losses > 0) {
        const winRate = (wins / (wins + losses)) * 100;
        entryProbability.push({ digit, winRate });
        if (winRate > 60) winningDigits.push(digit);
        else if (winRate < 40) losingDigits.push(digit);
      }
    }
    
    entryProbability.sort((a, b) => b.winRate - a.winRate);
    const bestEntryDigits = entryProbability.slice(0, 2);

    // Pattern detection (simple)
    const patterns: Pattern[] = [];
    let currentPattern: number[] = [];
    
    for (let i = 0; i < recentTicks.length; i++) {
      if (currentPattern.length === 0 || recentTicks[i] === currentPattern[currentPattern.length - 1]) {
        currentPattern.push(recentTicks[i]);
      } else {
        if (currentPattern.length >= 3) {
          patterns.push({
            digits: [...currentPattern],
            length: currentPattern.length,
            frequency: 1
          });
        }
        currentPattern = [recentTicks[i]];
      }
    }
    
    const patternMap = new Map<string, Pattern>();
    patterns.forEach(pattern => {
      const key = pattern.digits.join(',');
      if (patternMap.has(key)) {
        const existing = patternMap.get(key)!;
        existing.frequency++;
      } else {
        patternMap.set(key, { ...pattern });
      }
    });
    
    const longestPatterns = Array.from(patternMap.values())
      .sort((a, b) => b.length - a.length)
      .slice(0, 2);

    return {
      lastDigits,
      counts,
      digitPercentages,
      total,
      most,
      second,
      least,
      mostCount,
      secondCount,
      leastCount,
      lowPercent,
      highPercent,
      signalType,
      signalStrength,
      signalText,
      winningDigits: [...new Set(winningDigits)].slice(0, 3),
      losingDigits: [...new Set(losingDigits)].slice(0, 3),
      evenPercent,
      oddPercent,
      bestEntryDigits,
      longestPatterns,
      hasEnoughData: recentTicks.length >= 50
    };
  }, [digits, tickCount, activeDigit, mode]);

  // Notify parent of strong signal
  useEffect(() => {
    const hasStrongSignal = analysis.signalType !== 'neutral' && analysis.hasEnoughData;
    const signalKey = `${analysis.signalType}-${analysis.signalStrength}`;
    
    if (lastSignalRef.current !== signalKey) {
      lastSignalRef.current = signalKey;
      const timeoutId = setTimeout(() => {
        onStrongSignal?.(hasStrongSignal);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [analysis.signalType, analysis.signalStrength, analysis.hasEnoughData, onStrongSignal]);

  const statusColor = status === 'live' ? 'text-green-500' : status === 'error' ? 'text-red-500' : 'text-yellow-500';
  const statusBg = status === 'live' ? 'bg-green-500/10' : status === 'error' ? 'bg-red-500/10' : 'bg-yellow-500/10';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15 }}
      className="bg-gradient-to-br from-card to-card/95 backdrop-blur-sm border border-border/50 rounded-lg p-2 sm:p-2.5 shadow-md hover:shadow-lg transition-all duration-150 h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 sm:mb-2.5">
        <div className="flex items-center gap-1 sm:gap-1.5">
          <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
          <h3 className="font-bold text-[11px] sm:text-xs bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            {symbol}
          </h3>
        </div>
        <div className={`px-1 sm:px-1.5 py-0.5 rounded-full text-[7px] sm:text-[8px] font-mono ${statusBg} ${statusColor}`}>
          {status === 'live' && '● LIVE'}
          {status === 'connecting' && '● CONN'}
          {status === 'error' && '● ERR'}
          {status === 'offline' && '● OFF'}
        </div>
      </div>

      {/* Signal Box */}
      <AnimatePresence>
        {analysis.signalType !== 'neutral' && analysis.hasEnoughData && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`mb-2 sm:mb-2.5 rounded-md p-1 sm:p-1.5 text-center ${
              analysis.signalType === 'over'
                ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30'
                : 'bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-500/30'
            }`}
          >
            <div className="flex items-center justify-center gap-0.5 sm:gap-1">
              {analysis.signalType === 'over' ? (
                <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-500" />
              ) : (
                <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-500" />
              )}
              <span className={`text-[8px] sm:text-[9px] font-bold ${
                analysis.signalType === 'over' ? 'text-green-500' : 'text-red-500'
              }`}>
                {analysis.signalText}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-0.5 sm:h-1 mt-0.5 sm:mt-1">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${analysis.signalStrength}%` }}
                className={`h-0.5 sm:h-1 rounded-full ${
                  analysis.signalType === 'over' ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Last 30 digits */}
      <div className="mb-2 sm:mb-2.5">
        <div className="flex items-center gap-1 mb-1 sm:mb-1.5">
          <BarChart3 className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-muted-foreground" />
          <span className="text-[7px] sm:text-[8px] text-muted-foreground">Last 30</span>
        </div>
        <div className="grid grid-cols-10 gap-0.5 sm:gap-1">
          {analysis.lastDigits.map((d, i) => {
            let bgColor = 'bg-muted';
            let textColor = 'text-foreground';
            if (d === activeDigit) {
              bgColor = 'bg-primary';
              textColor = 'text-primary-foreground';
            } else if (d > activeDigit) {
              bgColor = 'bg-green-500/20';
              textColor = 'text-green-500';
            } else if (d < activeDigit) {
              bgColor = 'bg-red-500/20';
              textColor = 'text-red-500';
            }
            return (
              <div
                key={`${i}-${d}`}
                className={`w-full aspect-square flex items-center justify-center rounded-full text-[8px] sm:text-[9px] font-mono font-bold ${bgColor} ${textColor}`}
              >
                {d}
              </div>
            );
          })}
        </div>
      </div>

      {/* Digit buttons with 1 decimal place percentages */}
      <div className="mb-2 sm:mb-2.5">
        <div className="grid grid-cols-5 gap-0.5 sm:gap-1">
          {Array.from({ length: 10 }, (_, i) => {
            const pct = analysis.digitPercentages[i];
            let btnClass = 'bg-muted/50 hover:bg-muted text-foreground';
            if (i === analysis.most) btnClass = 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
            else if (i === analysis.second) btnClass = 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
            else if (i === analysis.least) btnClass = 'bg-gradient-to-r from-red-500 to-rose-500 text-white';

            return (
              <motion.button
                key={i}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveDigit(i)}
                className={`rounded py-0.5 sm:py-1 text-[8px] sm:text-[9px] font-mono font-bold transition-all ${btnClass} ${
                  i === activeDigit ? 'ring-1 ring-primary ring-offset-0' : ''
                }`}
              >
                {i}
                <span className="block text-[6px] sm:text-[7px] opacity-80">{pct}%</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Compact Stats */}
      <div className="grid grid-cols-2 gap-1 sm:gap-1.5 mb-2 sm:mb-2.5">
        <div className="bg-muted/30 rounded p-1 sm:p-1.5">
          <div className="flex justify-between text-[7px] sm:text-[8px] font-mono">
            <span className="text-red-500">&lt;{activeDigit}</span>
            <span className="text-green-500">&gt;{activeDigit}</span>
          </div>
          <div className="flex gap-0.5 sm:gap-1 mt-0.5">
            <div className="flex-1 h-1 sm:h-1.5 bg-red-500/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${analysis.lowPercent}%` }}
                className="h-full bg-red-500 rounded-full"
              />
            </div>
            <div className="flex-1 h-1 sm:h-1.5 bg-green-500/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${analysis.highPercent}%` }}
                className="h-full bg-green-500 rounded-full"
              />
            </div>
          </div>
          <div className="flex justify-between text-[6px] sm:text-[7px] mt-0.5">
            <span className="text-red-500">{analysis.lowPercent}%</span>
            <span className="text-green-500">{analysis.highPercent}%</span>
          </div>
        </div>

        <div className="bg-muted/30 rounded p-1 sm:p-1.5">
          <div className="flex items-center justify-between gap-0.5">
            <ArrowUpDown className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-muted-foreground" />
            <span className="text-[6px] sm:text-[7px] font-medium">E/O</span>
          </div>
          <div className="flex gap-0.5 sm:gap-1 mt-0.5">
            <div className="flex-1 h-1 sm:h-1.5 bg-purple-500/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${analysis.evenPercent}%` }}
                className="h-full bg-purple-500 rounded-full"
              />
            </div>
            <div className="flex-1 h-1 sm:h-1.5 bg-orange-500/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${analysis.oddPercent}%` }}
                className="h-full bg-orange-500 rounded-full"
              />
            </div>
          </div>
          <div className="flex justify-between text-[6px] sm:text-[7px] mt-0.5">
            <span className="text-purple-500">{analysis.evenPercent}%</span>
            <span className="text-orange-500">{analysis.oddPercent}%</span>
          </div>
        </div>
      </div>

      {/* Most, Second Most, and Least Appearing Digits Container */}
      <div className="mb-2 sm:mb-2.5 bg-gradient-to-r from-primary/5 to-primary/10 rounded p-1.5 sm:p-2">
        <div className="flex items-center gap-1 sm:gap-1.5 mb-1.5 sm:mb-2">
          <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
          <span className="text-[7px] sm:text-[8px] font-bold text-primary uppercase tracking-wide">Digit Frequency</span>
        </div>
        
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {/* Most Appearing */}
          <div className="text-center bg-green-500/10 rounded-lg p-1 sm:p-1.5">
            <div className="text-[6px] sm:text-[7px] text-green-500/80 font-medium mb-0.5">MOST</div>
            <div className="text-[16px] sm:text-[20px] font-mono font-bold text-green-500 leading-none">
              {analysis.most}
            </div>
            <div className="text-[7px] sm:text-[8px] text-green-400 font-mono mt-0.5">
              {analysis.digitPercentages[analysis.most]}%
            </div>
            <div className="text-[5px] sm:text-[6px] text-green-500/60 mt-0.5">
              {analysis.mostCount} ticks
            </div>
          </div>

          {/* Second Most Appearing */}
          <div className="text-center bg-blue-500/10 rounded-lg p-1 sm:p-1.5">
            <div className="text-[6px] sm:text-[7px] text-blue-500/80 font-medium mb-0.5">2ND MOST</div>
            <div className="text-[16px] sm:text-[20px] font-mono font-bold text-blue-500 leading-none">
              {analysis.second}
            </div>
            <div className="text-[7px] sm:text-[8px] text-blue-400 font-mono mt-0.5">
              {analysis.digitPercentages[analysis.second]}%
            </div>
            <div className="text-[5px] sm:text-[6px] text-blue-500/60 mt-0.5">
              {analysis.secondCount} ticks
            </div>
          </div>

          {/* Least Appearing */}
          <div className="text-center bg-red-500/10 rounded-lg p-1 sm:p-1.5">
            <div className="text-[6px] sm:text-[7px] text-red-500/80 font-medium mb-0.5">LEAST</div>
            <div className="text-[16px] sm:text-[20px] font-mono font-bold text-red-500 leading-none">
              {analysis.least}
            </div>
            <div className="text-[7px] sm:text-[8px] text-red-400 font-mono mt-0.5">
              {analysis.digitPercentages[analysis.least]}%
            </div>
            <div className="text-[5px] sm:text-[6px] text-red-500/60 mt-0.5">
              {analysis.leastCount} ticks
            </div>
          </div>
        </div>
      </div>

      {/* Patterns */}
      {analysis.longestPatterns.length > 0 && analysis.longestPatterns[0]?.digits.length >= 3 && (
        <div className="bg-muted/30 rounded p-1 sm:p-1.5 mb-1 sm:mb-1.5">
          <div className="flex items-center gap-0.5 sm:gap-1">
            <TrendingUp className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-muted-foreground" />
            <span className="text-[6px] sm:text-[7px] font-medium">Patterns</span>
          </div>
          <div className="text-[6px] sm:text-[7px] font-mono">
            {analysis.longestPatterns[0]?.digits.slice(0, 3).join('→')}
          </div>
        </div>
      )}

      {/* Triggers */}
      {(analysis.winningDigits.length > 0 || analysis.losingDigits.length > 0) && (
        <div className="bg-muted/30 rounded p-1 sm:p-1.5">
          <div className="flex justify-between">
            <div>
              <div className="flex items-center gap-0.5 sm:gap-1">
                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-green-500" />
                <span className="text-[5px] sm:text-[6px]">W</span>
              </div>
              <div className="flex gap-0.5 mt-0.5">
                {analysis.winningDigits.slice(0, 3).map(d => (
                  <span key={d} className="px-0.5 sm:px-1 bg-green-500/20 text-green-500 rounded text-[5px] sm:text-[6px] font-mono">
                    {d}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-0.5 sm:gap-1">
                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-red-500" />
                <span className="text-[5px] sm:text-[6px]">L</span>
              </div>
              <div className="flex gap-0.5 mt-0.5">
                {analysis.losingDigits.slice(0, 3).map(d => (
                  <span key={d} className="px-0.5 sm:px-1 bg-red-500/20 text-red-500 rounded text-[5px] sm:text-[6px] font-mono">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
        }
