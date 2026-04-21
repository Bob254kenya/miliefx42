import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { derivApi, MARKETS, MARKET_GROUPS } from '@/services/deriv-api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Play, StopCircle, Trash2, Radar, Search } from 'lucide-react';

type ContractType = 'DIGITEVEN' | 'DIGITODD' | 'DIGITMATCH' | 'DIGITDIFF' | 'DIGITOVER' | 'DIGITUNDER';
type PatternType = 'pattern' | 'digit';
type PatternAction = 'tradeOnce' | 'tradeUntilWin';
type DigitCondition = '>' | '<' | '==' | '>=' | '<=';

interface TickEntry {
  digit: number;
  extendedDigit: number;
  isEven: boolean;
  price: number;
  time: number;
}

interface TradeEntry {
  id: number;
  time: string;
  market: string;
  symbol: string;
  contractType: string;
  stake: number;
  exitDigit: string;
  result: 'Win' | 'Loss' | 'Pending';
  pnl: number;
  balance: number;
  switchInfo: string;
  isMartingale: boolean;
  martingaleStep: number;
}

const SCANNER_MARKETS = MARKETS.map(m => m.symbol);

function extractLastDigit(price: number): number {
  return parseInt(parseFloat(String(price)).toFixed(2).slice(-1), 10);
}

function extractExtendedDigit(price: number): number {
  const priceStr = parseFloat(String(price)).toFixed(2);
  return parseInt(priceStr.replace('.', '').slice(-2), 10);
}

function waitForNextTick(symbol: string): Promise<{ quote: number; epoch: number }> {
  return new Promise((resolve) => {
    const unsub = derivApi.onMessage((data: any) => {
      if (data.tick && data.tick.symbol === symbol) {
        unsub();
        resolve({ quote: data.tick.quote, epoch: data.tick.epoch });
      }
    });
  });
}

export default function AdvancedRamzBot() {
  const { isAuthorized, balance, activeAccount } = useAuth();

  const [symbol, setSymbol] = useState('R_100');

  // Scanner
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerTickCount, setScannerTickCount] = useState(100);
  const [scannerTickHistory, setScannerTickHistory] = useState<Record<string, TickEntry[]>>({});
  const scannerTickRef = useRef<Record<string, TickEntry[]>>({});

  // Market 1 (Home)
  const [m1Contract, setM1Contract] = useState<ContractType>('DIGITEVEN');
  const [m1Barrier, setM1Barrier] = useState(5);
  const [m1Active, setM1Active] = useState(true);

  // Market 2 (Recovery)
  const [m2Contract, setM2Contract] = useState<ContractType>('DIGITOVER');
  const [m2Barrier, setM2Barrier] = useState(4);
  const [m2Active, setM2Active] = useState(true);

  // Pattern Strategy (M2 only)
  const [strategyActive, setStrategyActive] = useState(false);
  const [strategyMode, setStrategyMode] = useState<PatternType>('pattern');
  const [patternText, setPatternText] = useState('EEEOE');
  const [patternAction, setPatternAction] = useState<PatternAction>('tradeOnce');
  const [digitCondition, setDigitCondition] = useState<DigitCondition>('>');
  const [digitCompareValue, setDigitCompareValue] = useState(5);
  const [digitAnalysisWindow, setDigitAnalysisWindow] = useState(20);

  // Risk Management
  const [initialStake, setInitialStake] = useState(1);
  const [martingaleEnabled, setMartingaleEnabled] = useState(false);
  const [martingaleMultiplier, setMartingaleMultiplier] = useState(2);
  const [martingaleMaxSteps, setMartingaleMaxSteps] = useState(5);
  const [takeProfit, setTakeProfit] = useState(20);
  const [stopLoss, setStopLoss] = useState(10);

  // Bot state
  const [isRunning, setIsRunning] = useState(false);
  const runningRef = useRef(false);
  const [currentMarket, setCurrentMarket] = useState<1 | 2>(1);
  const [botStatus, setBotStatus] = useState('Idle');
  const [waitingForPattern, setWaitingForPattern] = useState(false);
  const [scannerMatchedMarket, setScannerMatchedMarket] = useState<string | null>(null);

  // Stats
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [totalStaked, setTotalStaked] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [currentStake, setCurrentStake] = useState(1);
  const [winRate, setWinRate] = useState(0);

  // Live tick history
  const [liveDigits, setLiveDigits] = useState<TickEntry[]>([]);
  const tickHistoryRef = useRef<TickEntry[]>([]);

  // Trade log
  const [trades, setTrades] = useState<TradeEntry[]>([]);
  const tradeIdRef = useRef(0);

  // Subscribe to main symbol ticks
  useEffect(() => {
    if (!isAuthorized) return;
    tickHistoryRef.current = [];
    setLiveDigits([]);

    derivApi.subscribeTicks(symbol, (data: any) => {
      if (data.tick) {
        const price = parseFloat(data.tick.quote);
        const digit = extractLastDigit(price);
        const extendedDigit = extractExtendedDigit(price);
        const entry: TickEntry = { digit, extendedDigit, isEven: digit % 2 === 0, price, time: Date.now() };
        tickHistoryRef.current.push(entry);
        if (tickHistoryRef.current.length > 1000) tickHistoryRef.current.shift();
        setLiveDigits([...tickHistoryRef.current]);
      }
    });

    return () => { derivApi.unsubscribeTicks(symbol); };
  }, [symbol, isAuthorized]);

  // Subscribe to ALL markets for scanner
  useEffect(() => {
    if (!isAuthorized || !scannerActive) return;
    let active = true;

    const handler = (data: any) => {
      if (!data.tick || !active) return;
      const sym = data.tick.symbol as string;
      const price = parseFloat(data.tick.quote);
      const digit = extractLastDigit(price);
      const extendedDigit = extractExtendedDigit(price);
      const entry: TickEntry = { digit, extendedDigit, isEven: digit % 2 === 0, price, time: Date.now() };

      if (!scannerTickRef.current[sym]) scannerTickRef.current[sym] = [];
      scannerTickRef.current[sym].push(entry);
      if (scannerTickRef.current[sym].length > 200) scannerTickRef.current[sym].shift();
    };

    const unsub = derivApi.onMessage(handler);
    MARKETS.forEach(m => { derivApi.subscribeTicks(m.symbol, () => {}).catch(() => {}); });

    // Update UI periodically
    const interval = setInterval(() => {
      if (active) setScannerTickHistory({ ...scannerTickRef.current });
    }, 2000);

    return () => { active = false; unsub(); clearInterval(interval); };
  }, [isAuthorized, scannerActive]);

  useEffect(() => {
    const total = wins + losses;
    setWinRate(total > 0 ? (wins / total) * 100 : 0);
  }, [wins, losses]);

  // Pattern matching helpers
  const checkPatternMatchForHistory = useCallback((history: TickEntry[]): boolean => {
    const pattern = patternText.toUpperCase();
    if (pattern.length < 2) return false;
    if (history.length < pattern.length) return false;
    const recent = history.slice(-pattern.length);
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] !== (recent[i].isEven ? 'E' : 'O')) return false;
    }
    return true;
  }, [patternText]);

  const checkDigitConditionForHistory = useCallback((history: TickEntry[]): boolean => {
    if (history.length < digitAnalysisWindow) return false;
    const recent = history.slice(-digitAnalysisWindow);
    for (const tick of recent) {
      const digitToCheck = digitCompareValue > 9 ? tick.extendedDigit : tick.digit;
      let valid = false;
      switch (digitCondition) {
        case '>': valid = digitToCheck > digitCompareValue; break;
        case '<': valid = digitToCheck < digitCompareValue; break;
        case '==': valid = digitToCheck === digitCompareValue; break;
        case '>=': valid = digitToCheck >= digitCompareValue; break;
        case '<=': valid = digitToCheck <= digitCompareValue; break;
      }
      if (!valid) return false;
    }
    return true;
  }, [digitCondition, digitCompareValue, digitAnalysisWindow]);

  const checkPatternMatch = useCallback(() => checkPatternMatchForHistory(tickHistoryRef.current), [checkPatternMatchForHistory]);
  const checkDigitCondition = useCallback(() => checkDigitConditionForHistory(tickHistoryRef.current), [checkDigitConditionForHistory]);

  // Find first scanner market matching strategy
  const findScannerMatch = useCallback((): string | null => {
    for (const sym of SCANNER_MARKETS) {
      const history = scannerTickRef.current[sym];
      if (!history || history.length < 10) continue;

      if (strategyMode === 'pattern') {
        if (checkPatternMatchForHistory(history)) return sym;
      } else {
        if (checkDigitConditionForHistory(history)) return sym;
      }
    }
    return null;
  }, [checkPatternMatchForHistory, checkDigitConditionForHistory, strategyMode]);

  // Main trading loop
  const startBot = useCallback(async () => {
    if (!isAuthorized || isRunning) return;
    if (balance < initialStake) { toast.error('Insufficient balance'); return; }
    if (!m1Active && !m2Active) { toast.error('Enable at least one market'); return; }
    if (strategyActive && strategyMode === 'pattern' && !/^[EO]{2,}$/i.test(patternText)) {
      toast.error('Enter a valid pattern (2+ chars, E or O only)'); return;
    }

    setIsRunning(true);
    runningRef.current = true;
    setCurrentMarket(1);
    setBotStatus('Running');
    setWaitingForPattern(false);
    setScannerMatchedMarket(null);

    let stake = initialStake;
    setCurrentStake(stake);
    let totalPnl = 0;
    let mStep = 0;
    let onMarket: 1 | 2 = 1;
    let inRecoveryMode = false;
    let patternMatched = false;

    while (runningRef.current) {
      if (balance < stake) { toast.error('Insufficient balance — Bot halted'); break; }

      try {
        // Ensure current market is enabled
        if (!((onMarket === 1 && m1Active) || (onMarket === 2 && m2Active))) {
          if (onMarket === 2 && m1Active) { onMarket = 1; inRecoveryMode = false; }
          else if (onMarket === 1 && m2Active) { onMarket = 2; inRecoveryMode = true; }
          else { await new Promise(r => setTimeout(r, 500)); continue; }
          setCurrentMarket(onMarket);
        }

        // Strategy gate for M2
        let tradeSymbol = symbol;

        if (inRecoveryMode && strategyActive) {
          if (strategyMode === 'pattern') {
            if (!patternMatched) {
              // Scanner mode: check all markets
              if (scannerActive) {
                const matched = findScannerMatch();
                if (!matched) {
                  // Also check primary symbol
                  if (!checkPatternMatch()) {
                    setWaitingForPattern(true);
                    setBotStatus(`M2: Scanner scanning for pattern: ${patternText}`);
                    setScannerMatchedMarket(null);
                    await waitForNextTick(symbol);
                    continue;
                  }
                  tradeSymbol = symbol;
                } else {
                  tradeSymbol = matched;
                  setScannerMatchedMarket(matched);
                }
              } else {
                await waitForNextTick(symbol);
                if (!checkPatternMatch()) {
                  setWaitingForPattern(true);
                  setBotStatus(`M2: Waiting for pattern: ${patternText}`);
                  continue;
                }
              }
              patternMatched = true;
              setWaitingForPattern(false);
              if (patternAction === 'tradeOnce') { /* will trade once */ }
            }
          } else if (strategyMode === 'digit') {
            if (scannerActive) {
              const matched = findScannerMatch();
              if (!matched) {
                await waitForNextTick(symbol);
                if (!checkDigitCondition()) {
                  setWaitingForPattern(true);
                  setBotStatus(`M2: Scanner scanning for digit condition`);
                  setScannerMatchedMarket(null);
                  continue;
                }
                tradeSymbol = symbol;
              } else {
                tradeSymbol = matched;
                setScannerMatchedMarket(matched);
              }
            } else {
              await waitForNextTick(symbol);
              if (!checkDigitCondition()) {
                setWaitingForPattern(true);
                setBotStatus(`M2: Waiting for digit condition: ${digitCompareValue}`);
                continue;
              }
            }
            setWaitingForPattern(false);
          }
        } else {
          await waitForNextTick(symbol);
        }

        // Determine contract params
        let contractType: string;
        let barrier: string | undefined;

        if (onMarket === 1) {
          contractType = m1Contract;
          barrier = needsBarrier(m1Contract) ? String(m1Barrier) : undefined;
          setBotStatus(`M1: ${contractType}${barrier ? ` (${barrier})` : ''}`);
        } else {
          contractType = m2Contract;
          barrier = needsBarrier(m2Contract) ? String(m2Barrier) : undefined;
          const scanLabel = scannerActive && tradeSymbol !== symbol ? ` [Scanner: ${tradeSymbol}]` : '';
          setBotStatus(`M2 Recovery: ${contractType}${barrier ? ` (${barrier})` : ''}${scanLabel}`);
        }

        const params: any = {
          contract_type: contractType, symbol: tradeSymbol,
          duration: 1, duration_unit: 't', basis: 'stake', amount: stake,
        };
        if (barrier !== undefined) params.barrier = barrier;

        const id = ++tradeIdRef.current;
        const now = new Date().toLocaleTimeString();
        const marketLabel = onMarket === 1 ? 'M1' : 'M2';
        let strategyNote = '';
        if (onMarket === 2 && strategyActive) {
          strategyNote = strategyMode === 'pattern' ? ' [Pattern]' : ` [Digit=${digitCompareValue}]`;
        }

        const newEntry: TradeEntry = {
          id, time: now, market: `${marketLabel}${strategyNote}`,
          symbol: tradeSymbol, contractType, stake,
          exitDigit: '...', result: 'Pending', pnl: 0, balance,
          switchInfo: '', isMartingale: mStep > 0 && martingaleEnabled, martingaleStep: mStep,
        };
        setTrades(prev => [newEntry, ...prev].slice(0, 200));
        setTotalStaked(prev => prev + stake);

        const { contractId } = await derivApi.buyContract(params);
        const result = await derivApi.waitForContractResult(contractId);
        const won = result.status === 'won';
        const pnl = result.profit;
        totalPnl += pnl;

        let switchInfo = '';

        if (won) {
          patternMatched = false;
          setWaitingForPattern(false);
          setScannerMatchedMarket(null);

          if (inRecoveryMode) {
            inRecoveryMode = false;
            onMarket = 1;
            setCurrentMarket(1);
            switchInfo = '✓ Recovery complete → Back to M1';
          } else {
            switchInfo = '→ Continue on M1';
          }
          stake = initialStake;
          mStep = 0;
          setWins(prev => prev + 1);
        } else {
          if (!inRecoveryMode && m2Active) {
            inRecoveryMode = true;
            onMarket = 2;
            setCurrentMarket(2);
            if (strategyActive) {
              patternMatched = false;
              setWaitingForPattern(true);
              switchInfo = '✗ Loss → M2 Recovery (checking strategy...)';
            } else {
              switchInfo = '✗ Loss → M2 Recovery';
            }
          } else if (inRecoveryMode) {
            if (strategyActive && strategyMode === 'pattern' && patternAction === 'tradeOnce') {
              patternMatched = false;
              setWaitingForPattern(true);
              switchInfo = '→ M2: Loss, waiting for next pattern match';
            } else if (strategyActive && strategyMode === 'pattern' && patternAction === 'tradeUntilWin') {
              switchInfo = '→ M2: Continuing until win';
            } else if (strategyActive && strategyMode === 'digit') {
              setWaitingForPattern(true);
              switchInfo = '→ M2: Loss, checking digit condition';
            } else {
              switchInfo = '→ M2: Continue recovery';
            }
          } else {
            switchInfo = '→ Continue (no M2 available)';
          }

          if (martingaleEnabled) {
            if (mStep < martingaleMaxSteps) {
              stake = parseFloat((stake * martingaleMultiplier).toFixed(2));
              mStep++;
            } else { stake = initialStake; mStep = 0; }
          }
          setLosses(prev => prev + 1);
        }

        setCurrentStake(stake);
        setNetProfit(totalPnl);

        setTrades(prev => prev.map(t =>
          t.id === id ? { ...t, result: won ? 'Win' : 'Loss', pnl,
            exitDigit: String(tickHistoryRef.current[tickHistoryRef.current.length - 1]?.digit ?? '-'),
            balance: balance + totalPnl, switchInfo,
          } : t
        ));

        if (totalPnl >= takeProfit) { toast.success(`🎊 Take Profit: +$${totalPnl.toFixed(2)}`); break; }
        if (totalPnl <= -stopLoss) { toast.error(`🛑 Stop Loss: $${totalPnl.toFixed(2)}`); break; }

        await new Promise(r => setTimeout(r, 500));
      } catch (err: any) {
        if (err.message?.includes('Insufficient balance')) { toast.error('Insufficient balance'); break; }
        console.error('Ramz Bot error:', err);
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    setIsRunning(false);
    runningRef.current = false;
    setBotStatus('Stopped');
    setWaitingForPattern(false);
    setScannerMatchedMarket(null);
  }, [isAuthorized, isRunning, balance, initialStake, symbol, m1Active, m1Contract, m1Barrier,
    m2Active, m2Contract, m2Barrier, strategyActive, strategyMode, patternText, patternAction,
    checkPatternMatch, checkDigitCondition, digitCompareValue, findScannerMatch, scannerActive,
    martingaleEnabled, martingaleMultiplier, martingaleMaxSteps, stopLoss, takeProfit]);

  const stopBot = () => {
    runningRef.current = false;
    setIsRunning(false);
    setBotStatus('Stopped');
    setWaitingForPattern(false);
    setCurrentMarket(1);
    setScannerMatchedMarket(null);
  };

  const clearData = () => {
    setTrades([]);
    setWins(0); setLosses(0); setTotalStaked(0); setNetProfit(0); setCurrentStake(initialStake);
  };

  const last8 = liveDigits.slice(-8);
  const patternValid = /^[EOeo]{2,}$/.test(patternText);
  const patternMatchNow = patternValid && checkPatternMatch();
  const needsBarrierFn = (ct: string) => ['DIGITOVER', 'DIGITUNDER', 'DIGITMATCH', 'DIGITDIFF'].includes(ct);

  // Scanner market count with data
  const scannerMarketsWithData = Object.keys(scannerTickHistory).filter(k => (scannerTickHistory[k]?.length || 0) > 5).length;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-profit bg-clip-text text-transparent">
          ⚡ Advanced Millie Bot
        </h1>
        <p className="text-xs text-muted-foreground">Pattern-Based Strategy with M1/M2 Recovery & Multi-Market Scanner</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Connection Card */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm">🔌</div>
            <h3 className="font-semibold text-foreground">Connection</h3>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Trading Symbol</label>
            <Select value={symbol} onValueChange={setSymbol} disabled={isRunning}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MARKET_GROUPS.map(g => (
                  <div key={g.value}>
                    <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">{g.label}</div>
                    {MARKETS.filter(m => m.group === g.value).map(m => (
                      <SelectItem key={m.symbol} value={m.symbol}>{m.name}</SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
            <div className={`w-2 h-2 rounded-full ${isAuthorized ? 'bg-profit' : 'bg-loss animate-pulse'}`} />
            <span className="text-xs text-muted-foreground">{isAuthorized ? 'Connected' : 'Disconnected'}</span>
            <span className="text-xs font-mono text-foreground ml-auto">
              Balance: ${balance.toFixed(2)} {activeAccount?.currency}
            </span>
          </div>
        </div>

        {/* Scanner Card */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent/50 flex items-center justify-center">
                <Radar className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Multi-Market Scanner</h3>
                <p className="text-[10px] text-muted-foreground">Scans all markets for strategy match in M2</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={scannerActive ? 'default' : 'secondary'} className="text-[9px]">
                {scannerActive ? 'ACTIVE' : 'INACTIVE'}
              </Badge>
              <Switch checked={scannerActive} onCheckedChange={setScannerActive} disabled={isRunning} />
            </div>
          </div>

          {scannerActive && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-muted-foreground">Scanner Tick Window</label>
                  <span className="text-xs font-mono text-primary">{scannerTickCount} ticks</span>
                </div>
                <Slider min={50} max={1000} step={10} value={[scannerTickCount]}
                  onValueChange={([v]) => setScannerTickCount(v)} disabled={isRunning} />
                <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                  <span>50</span><span>500</span><span>1000</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {MARKETS.map(m => {
                  const hasData = (scannerTickHistory[m.symbol]?.length || 0) > 5;
                  return (
                    <Badge key={m.symbol} variant={hasData ? 'outline' : 'secondary'}
                      className={`text-[8px] ${hasData ? 'border-primary/50 text-primary' : 'text-muted-foreground'}`}>
                      {m.symbol}
                    </Badge>
                  );
                })}
              </div>

              <div className="text-[10px] text-muted-foreground bg-muted rounded-lg p-2">
                <Search className="w-3 h-3 inline mr-1" />
                {scannerMarketsWithData}/{MARKETS.length} markets streaming.
                {scannerMatchedMarket && isRunning && (
                  <span className="text-profit font-bold ml-1">Match: {scannerMatchedMarket}</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Market 1 (Home) */}
        <div className={`bg-card border-2 rounded-xl p-4 space-y-3 transition-all ${
          currentMarket === 1 && isRunning ? 'border-profit' : 'border-border'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-profit/10 flex items-center justify-center text-sm">🏠</div>
              <div>
                <h3 className="font-semibold text-foreground">Market 1 (Home)</h3>
                {currentMarket === 1 && isRunning && (
                  <Badge className="text-[9px] mt-0.5 bg-profit text-profit-foreground">ACTIVE</Badge>
                )}
              </div>
            </div>
            <Switch checked={m1Active} onCheckedChange={setM1Active} disabled={isRunning} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Contract Type</label>
              <Select value={m1Contract} onValueChange={(v) => setM1Contract(v as ContractType)} disabled={isRunning}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DIGITEVEN">Digit Even</SelectItem>
                  <SelectItem value="DIGITODD">Digit Odd</SelectItem>
                  <SelectItem value="DIGITMATCH">Digit Match</SelectItem>
                  <SelectItem value="DIGITDIFF">Digit Differs</SelectItem>
                  <SelectItem value="DIGITOVER">Digit Over</SelectItem>
                  <SelectItem value="DIGITUNDER">Digit Under</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {needsBarrierFn(m1Contract) && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Barrier (0-9)</label>
                <Input type="number" min={0} max={9} value={m1Barrier}
                  onChange={(e) => setM1Barrier(Math.max(0, Math.min(9, parseInt(e.target.value) || 0)))}
                  disabled={isRunning} className="h-9 text-xs" />
              </div>
            )}
          </div>
        </div>

        {/* Market 2 (Recovery) */}
        <div className={`bg-card border-2 rounded-xl p-4 space-y-3 transition-all ${
          currentMarket === 2 && isRunning ? 'border-loss' : 'border-border'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center text-sm">🔄</div>
              <div>
                <h3 className="font-semibold text-foreground">Market 2 (Recovery)</h3>
                {currentMarket === 2 && isRunning && (
                  <Badge className="text-[9px] mt-0.5 bg-loss text-loss-foreground">RECOVERY</Badge>
                )}
              </div>
            </div>
            <Switch checked={m2Active} onCheckedChange={setM2Active} disabled={isRunning} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Contract Type</label>
              <Select value={m2Contract} onValueChange={(v) => setM2Contract(v as ContractType)} disabled={isRunning}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DIGITEVEN">Digit Even</SelectItem>
                  <SelectItem value="DIGITODD">Digit Odd</SelectItem>
                  <SelectItem value="DIGITMATCH">Digit Match</SelectItem>
                  <SelectItem value="DIGITDIFF">Digit Differs</SelectItem>
                  <SelectItem value="DIGITOVER">Digit Over</SelectItem>
                  <SelectItem value="DIGITUNDER">Digit Under</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {needsBarrierFn(m2Contract) && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Barrier (0-9)</label>
                <Input type="number" min={0} max={9} value={m2Barrier}
                  onChange={(e) => setM2Barrier(Math.max(0, Math.min(9, parseInt(e.target.value) || 0)))}
                  disabled={isRunning} className="h-9 text-xs" />
              </div>
            )}
          </div>
          <div className="bg-warning/10 border-l-2 border-warning rounded p-2 text-[10px] text-muted-foreground">
            Recovery Mode: Uses its own contract settings. Stays here until a WIN, then returns to M1.
          </div>
        </div>

        {/* Pattern Strategy */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent/50 flex items-center justify-center text-sm">🎯</div>
              <div>
                <h3 className="font-semibold text-foreground">Pattern Strategy</h3>
                <Badge variant="outline" className="text-[9px] mt-0.5">M2 ONLY</Badge>
              </div>
            </div>
            <Switch checked={strategyActive} onCheckedChange={setStrategyActive} disabled={isRunning} />
          </div>

          {strategyActive && (
            <>
              <p className="text-[10px] text-muted-foreground">
                ONLY applies on Market 2 (Recovery). {scannerActive ? 'Scanner checks ALL markets.' : 'Checks primary symbol only.'}
              </p>

              <div className="flex gap-2">
                <button onClick={() => setStrategyMode('pattern')} disabled={isRunning}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    strategyMode === 'pattern' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>Even/Odd Pattern</button>
                <button onClick={() => setStrategyMode('digit')} disabled={isRunning}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    strategyMode === 'digit' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>Last Digit Analysis (0-24)</button>
              </div>

              {strategyMode === 'pattern' ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Pattern (E=Even, O=Odd)</label>
                    <input value={patternText}
                      onChange={(e) => setPatternText(e.target.value.toUpperCase().replace(/[^EO]/g, ''))}
                      disabled={isRunning} placeholder="EEEOE"
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs font-mono uppercase tracking-widest text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div className={`font-mono text-center py-2 rounded-lg border text-sm tracking-[4px] ${
                    !patternValid ? 'border-loss/50 text-loss bg-loss/5' :
                    patternMatchNow ? 'border-profit/50 text-profit bg-profit/5' :
                    'border-warning/50 text-warning bg-warning/5'
                  }`}>
                    {patternText || '...'}
                    <div className="text-[9px] mt-1 tracking-normal">
                      {!patternValid ? 'Invalid' : patternMatchNow ? '✅ Matched!' : '⏳ Waiting...'}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">Action When Matched</label>
                    <div className="space-y-1.5">
                      {([
                        { val: 'tradeOnce' as const, label: 'Trade Once', desc: 'Execute one contract' },
                        { val: 'tradeUntilWin' as const, label: 'Trade Until Win', desc: 'Keep trading until win' },
                      ]).map(opt => (
                        <label key={opt.val}
                          className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                            patternAction === opt.val ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'
                          }`}>
                          <input type="radio" checked={patternAction === opt.val}
                            onChange={() => setPatternAction(opt.val)} disabled={isRunning} className="mt-0.5" />
                          <div>
                            <div className="text-xs font-medium text-foreground">{opt.label}</div>
                            <div className="text-[10px] text-muted-foreground">{opt.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Condition</label>
                      <Select value={digitCondition} onValueChange={(v) => setDigitCondition(v as DigitCondition)} disabled={isRunning}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value=">">&gt; Greater Than</SelectItem>
                          <SelectItem value="<">&lt; Less Than</SelectItem>
                          <SelectItem value="==">=  Equal To</SelectItem>
                          <SelectItem value=">=">&ge; Greater or Equal</SelectItem>
                          <SelectItem value="<=">&le; Less or Equal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Value (0-24)</label>
                      <Input type="number" min={0} max={24} value={digitCompareValue}
                        onChange={(e) => setDigitCompareValue(Math.max(0, Math.min(24, parseInt(e.target.value) || 0)))}
                        disabled={isRunning} className="h-9 text-xs" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Analysis Window</label>
                    <Input type="number" min={5} max={100} value={digitAnalysisWindow}
                      onChange={(e) => setDigitAnalysisWindow(Math.max(5, Math.min(100, parseInt(e.target.value) || 20)))}
                      disabled={isRunning} className="h-9 text-xs" />
                  </div>
                </div>
              )}

              {waitingForPattern && isRunning && (
                <div className="text-center text-xs py-2 rounded-lg bg-warning/10 text-warning border border-warning/30 animate-pulse">
                  ⏳ {strategyMode === 'pattern' ? `Waiting: ${patternText}` : `Waiting: digit ${digitCondition} ${digitCompareValue}`}
                  {scannerActive && ' (scanning all markets)'}
                </div>
              )}
            </>
          )}
        </div>

        {/* Risk Management */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3 lg:col-span-2">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center text-sm">💰</div>
            <h3 className="font-semibold text-foreground">Risk Management</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Initial Stake ($)</label>
              <Input type="number" min={0.35} step={0.01} value={initialStake}
                onChange={(e) => setInitialStake(parseFloat(e.target.value) || 0.35)}
                disabled={isRunning} className="h-9 text-xs" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Martingale</label>
              <Select value={martingaleEnabled ? 'on' : 'off'} onValueChange={(v) => setMartingaleEnabled(v === 'on')} disabled={isRunning}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Disabled</SelectItem>
                  <SelectItem value="on">Enabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {martingaleEnabled && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Multiplier</label>
                  <Input type="number" min={1.1} step={0.1} value={martingaleMultiplier}
                    onChange={(e) => setMartingaleMultiplier(parseFloat(e.target.value) || 2)}
                    disabled={isRunning} className="h-9 text-xs" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Max Steps</label>
                  <Input type="number" min={1} max={20} value={martingaleMaxSteps}
                    onChange={(e) => setMartingaleMaxSteps(parseInt(e.target.value) || 5)}
                    disabled={isRunning} className="h-9 text-xs" />
                </div>
              </>
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Take Profit ($)</label>
              <Input type="number" min={1} value={takeProfit}
                onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 20)}
                disabled={isRunning} className="h-9 text-xs" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Stop Loss ($)</label>
              <Input type="number" min={1} value={stopLoss}
                onChange={(e) => setStopLoss(parseFloat(e.target.value) || 10)}
                disabled={isRunning} className="h-9 text-xs" />
            </div>
          </div>
        </div>
      </div>

      {/* Live Digit Stream */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm">🔢</div>
            <h3 className="font-semibold text-foreground">Live Digit Stream</h3>
          </div>
          <Badge variant="outline" className="text-[9px]">Last 8 Ticks</Badge>
        </div>
        <div className="flex justify-center gap-2 flex-wrap">
          {last8.length === 0
            ? Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="w-12 h-14 rounded-lg border-2 border-border flex flex-col items-center justify-center font-mono opacity-30">
                  <span className="text-lg font-bold">-</span>
                  <span className="text-[8px] font-bold">WAIT</span>
                </div>
              ))
            : last8.map((tick, i) => {
                const isNewest = i === last8.length - 1;
                const isOver = tick.digit >= 5;
                return (
                  <motion.div key={`${i}-${tick.digit}-${tick.time}`}
                    initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className={`w-12 h-14 rounded-lg border-2 flex flex-col items-center justify-center font-mono transition-all ${
                      isNewest ? 'border-primary shadow-[0_0_15px_hsl(var(--primary)/0.3)] scale-105' :
                      isOver ? 'border-loss/50 bg-loss/5' : 'border-profit/50 bg-profit/5'
                    }`}>
                    <span className={`text-lg font-bold ${tick.isEven ? 'text-primary' : 'text-warning'}`}>{tick.digit}</span>
                    <span className={`text-[8px] font-bold uppercase ${isOver ? 'text-loss' : 'text-profit'}`}>
                      {isOver ? 'O' : 'U'}{tick.isEven ? 'E' : 'O'}
                    </span>
                  </motion.div>
                );
              })
          }
        </div>
        <div className="flex justify-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-loss" /> Over (≥5)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-profit" /> Under (&lt;5)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> Even</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning" /> Odd</span>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex gap-3 justify-center">
          {!isRunning ? (
            <Button onClick={startBot} disabled={!isAuthorized || balance < initialStake}
              className="bg-profit hover:bg-profit/90 text-profit-foreground px-8">
              <Play className="w-4 h-4 mr-2" /> Start Trading
            </Button>
          ) : (
            <Button onClick={stopBot} variant="destructive" className="px-8">
              <StopCircle className="w-4 h-4 mr-2" /> Stop Trading
            </Button>
          )}
        </div>
        <div className="flex items-center justify-center gap-4 text-xs flex-wrap">
          <span className="text-muted-foreground">
            Current: <Badge variant={currentMarket === 1 ? 'default' : 'destructive'} className="text-[9px] ml-1">
              {currentMarket === 1 ? 'M1 (Home)' : 'M2 (Recovery)'}
            </Badge>
          </span>
          <span className="text-muted-foreground">Status: <span className="text-foreground font-medium">{botStatus}</span></span>
          {scannerActive && (
            <Badge variant="outline" className="text-[9px] text-primary">
              <Radar className="w-3 h-3 mr-1" /> Scanner ON
            </Badge>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground text-center">
          {scannerActive
            ? 'Logic: M1 → Loss → M2 → Scanner checks ALL markets for strategy → First match trades → Win → M1'
            : 'Logic: M1 → Loss → M2 → Check Pattern/Digit → Trade → Win → M1'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'Wins', value: wins, color: 'text-profit' },
          { label: 'Losses', value: losses, color: 'text-loss' },
          { label: 'Total Staked', value: `$${totalStaked.toFixed(2)}`, color: 'text-primary' },
          { label: 'Net Profit', value: `${netProfit >= 0 ? '+' : ''}$${netProfit.toFixed(2)}`, color: netProfit >= 0 ? 'text-profit' : 'text-loss' },
          { label: 'Current Stake', value: `$${currentStake.toFixed(2)}`, color: 'text-primary' },
          { label: 'Win Rate', value: `${winRate.toFixed(1)}%`, color: winRate >= 50 ? 'text-profit' : 'text-loss' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
            <div className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Activity Log */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm">📋</div>
            <h3 className="font-semibold text-foreground">Activity Log</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={clearData} className="text-xs text-muted-foreground">
            <Trash2 className="w-3 h-3 mr-1" /> Clear
          </Button>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {['Time', 'Market', 'Symbol', 'Contract', 'Stake', 'Exit', 'Result', 'P/L', 'Balance'].map(h => (
                  <th key={h} className="text-left py-2 px-2 text-primary font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-6 text-muted-foreground">System ready. Connect and start trading.</td></tr>
              ) : trades.map(t => (
                <tr key={t.id} className="border-b border-border/30 hover:bg-muted/30">
                  <td className="py-2 px-2 font-mono text-muted-foreground">{t.time}</td>
                  <td className={`py-2 px-2 font-semibold ${t.market.startsWith('M1') ? 'text-profit' : 'text-loss'}`}>{t.market}</td>
                  <td className="py-2 px-2 font-mono text-xs text-primary">{t.symbol}</td>
                  <td className="py-2 px-2">{t.contractType}</td>
                  <td className="py-2 px-2 text-right font-mono">
                    {t.isMartingale ? (
                      <span className="text-warning italic">${t.stake.toFixed(2)} (M{t.martingaleStep})</span>
                    ) : `$${t.stake.toFixed(2)}`}
                  </td>
                  <td className="py-2 px-2 text-center font-mono">{t.exitDigit}</td>
                  <td className="py-2 px-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      t.result === 'Win' ? 'bg-profit/10 text-profit' :
                      t.result === 'Loss' ? 'bg-loss/10 text-loss' : 'text-warning'
                    }`}>{t.result}</span>
                    {t.switchInfo && (
                      <div className="text-[9px] text-warning font-semibold mt-0.5">{t.switchInfo}</div>
                    )}
                  </td>
                  <td className={`py-2 px-2 text-right font-mono font-bold ${t.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {t.pnl >= 0 ? '+' : ''}{t.pnl.toFixed(2)}
                  </td>
                  <td className="py-2 px-2 font-mono">${t.balance.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function needsBarrier(ct: string) {
  return ['DIGITOVER', 'DIGITUNDER', 'DIGITMATCH', 'DIGITDIFF'].includes(ct);
}
