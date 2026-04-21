// bots-page.tsx
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { derivApi, MARKETS, type MarketSymbol } from '@/services/deriv-api';
import { getLastDigit } from '@/services/analysis';
import { useAuth } from '@/contexts/AuthContext';
import {
  evaluateOver2, evaluateUnder6, evaluateEvenOdd,
  evaluateMatchesDiffers, evaluateRiseFall,
  calculateConfidence, type BotDecision,
} from '@/services/bot-engine';
import { validateDigitEligibility } from '@/services/smart-signal-engine';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BotCard, { type BotSettings } from '@/components/bots/BotCard';
import ConfidenceScore from '@/components/bots/ConfidenceScore';
import VolatilityMeter from '@/components/bots/VolatilityMeter';
import SessionAnalytics from '@/components/bots/SessionAnalytics';
import SmartDigitGrid from '@/components/bots/SmartDigitGrid';
import DigitDisplay from '@/components/auto-trade/DigitDisplay';
import SignalAlerts from '@/components/auto-trade/SignalAlerts';
import TradeLogComponent from '@/components/auto-trade/TradeLog';
import { type TradeLog } from '@/components/auto-trade/types';

type BotId = 'over2' | 'under6' | 'evenodd' | 'matchdiff' | 'risefall';

interface BotState {
  isRunning: boolean;
  wins: number;
  losses: number;
  pnl: number;
  lastReason: string;
  consecutiveLosses: number;
  settings: BotSettings;
}

const DEFAULT_BOT_CONFIGS: Record<BotId, { name: string; desc: string; icon: string; accent: string; settings: BotSettings }> = {
  over2: {
    name: 'Over 2 Recovery 5',
    desc: 'Enter Over 2 when last 3 digits < 3',
    icon: '🟢',
    accent: 'profit',
    settings: { stake: 1, martingale: true, multiplier: 1.8, maxRecovery: 5, stopLoss: 15, takeProfit: 25 },
  },
  under6: {
    name: 'Under 6 Recovery 4',
    desc: 'Enter Under 6 when last 3 digits > 6',
    icon: '🔴',
    accent: 'loss',
    settings: { stake: 1, martingale: true, multiplier: 1.7, maxRecovery: 4, stopLoss: 12, takeProfit: 20 },
  },
  evenodd: {
    name: 'Even / Odd Bot',
    desc: 'Counter-trade dominant parity',
    icon: '🔵',
    accent: 'even',
    settings: { stake: 1, martingale: true, multiplier: 2, maxRecovery: 3, stopLoss: 10, takeProfit: 15 },
  },
  matchdiff: {
    name: 'Matches / Differs',
    desc: 'Differs against dominant digit >18%',
    icon: '🟣',
    accent: 'signal',
    settings: { stake: 1, martingale: true, multiplier: 1.5, maxRecovery: 3, stopLoss: 10, takeProfit: 15 },
  },
  risefall: {
    name: 'Rise / Fall',
    desc: 'Momentum reversal on 4/5 tick streaks',
    icon: '📈',
    accent: 'primary',
    settings: { stake: 1, martingale: false, multiplier: 1.5, maxRecovery: 3, stopLoss: 10, takeProfit: 15 },
  },
};

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

export default function BotsPage() {
  const { isAuthorized, activeAccount, balance } = useAuth();
  const [market, setMarket] = useState<MarketSymbol>('R_100');
  const [digits, setDigits] = useState<number[]>([]);
  const [prices, setPrices] = useState<number[]>([]);
  const [trades, setTrades] = useState<TradeLog[]>([]);
  const [selectedDigit, setSelectedDigit] = useState(4);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [historyView, setHistoryView] = useState<number>(30);

  const MAX_SESSION_TRADES = 50;
  const [cooldownActive, setCooldownActive] = useState(false);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startBalanceRef = useRef(balance);
  useEffect(() => { if (balance > 0 && startBalanceRef.current === 0) startBalanceRef.current = balance; }, [balance]);
  const drawdownPct = startBalanceRef.current > 0 ? ((startBalanceRef.current - balance) / startBalanceRef.current) * 100 : 0;
  const dailyProfitPct = startBalanceRef.current > 0 ? ((balance - startBalanceRef.current) / startBalanceRef.current) * 100 : 0;

  const tradeIdRef = useRef(0);

  const [bots, setBots] = useState<Record<BotId, BotState>>(() => {
    const init: Record<string, BotState> = {};
    for (const [id, cfg] of Object.entries(DEFAULT_BOT_CONFIGS)) {
      init[id] = { isRunning: false, wins: 0, losses: 0, pnl: 0, lastReason: '', consecutiveLosses: 0, settings: { ...cfg.settings } };
    }
    return init as Record<BotId, BotState>;
  });
  const botRunningRef = useRef<Record<BotId, boolean>>({ over2: false, under6: false, evenodd: false, matchdiff: false, risefall: false });

  const totalConsecutiveLosses = Math.max(...Object.values(bots).map(b => b.consecutiveLosses));
  const confidence = useMemo(() => calculateConfidence(digits, totalConsecutiveLosses), [digits, totalConsecutiveLosses]);

  // Subscribe to ticks
  useEffect(() => {
    if (!derivApi.isConnected) return;
    let active = true;
    const handler = (data: any) => {
      if (data.tick && data.tick.symbol === market && active) {
        const d = getLastDigit(data.tick.quote);
        setDigits(prev => [...prev, d].slice(-500));
        setPrices(prev => [...prev, data.tick.quote].slice(-500));
      }
    };
    const unsub = derivApi.onMessage(handler);
    derivApi.subscribeTicks(market, () => {}).catch(console.error);
    return () => { active = false; unsub(); };
  }, [market]);

  useEffect(() => { setDigits([]); setPrices([]); }, [market]);

  // Bot trading loop — FIXED: API-confirmed results + reversed martingale
  const runBot = useCallback(async (botId: BotId) => {
    if (!isAuthorized || botRunningRef.current[botId]) return;
    botRunningRef.current[botId] = true;
    setBots(prev => ({ ...prev, [botId]: { ...prev[botId], isRunning: true, lastReason: 'Starting...' } }));

    await derivApi.subscribeTicks(market, () => {});

    const settings = bots[botId].settings;
    let stake = settings.stake;
    let consLosses = 0;

    while (botRunningRef.current[botId]) {
      if (drawdownPct > 20) {
        setBots(prev => ({ ...prev, [botId]: { ...prev[botId], lastReason: '🛑 20% drawdown limit hit' } }));
        break;
      }
      if (dailyProfitPct >= 15) {
        setBots(prev => ({ ...prev, [botId]: { ...prev[botId], lastReason: '🔒 15% daily profit locked' } }));
        break;
      }
      if (trades.length >= MAX_SESSION_TRADES) {
        setBots(prev => ({ ...prev, [botId]: { ...prev[botId], lastReason: '⏸ Max session trades reached' } }));
        break;
      }
      if (cooldownActive) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      try {
        const tick = await waitForNextTick(market);
        const digit = getLastDigit(tick.quote);
        const currentDigits = [...digits, digit].slice(-500);
        const currentPrices = [...prices, tick.quote].slice(-500);

        let decision: BotDecision;
        switch (botId) {
          case 'over2': decision = evaluateOver2(currentDigits, currentPrices); break;
          case 'under6': decision = evaluateUnder6(currentDigits, currentPrices); break;
          case 'evenodd': decision = evaluateEvenOdd(currentDigits); break;
          case 'matchdiff': decision = evaluateMatchesDiffers(currentDigits); break;
          case 'risefall': decision = evaluateRiseFall(currentPrices); break;
        }

        setBots(prev => ({ ...prev, [botId]: { ...prev[botId], lastReason: decision.reason } }));

        if (!decision.shouldTrade) {
          await new Promise(r => setTimeout(r, 300));
          continue;
        }

        // Confidence gate
        const conf = calculateConfidence(currentDigits, consLosses);
        if (conf < 65 && botId !== 'risefall') {
          setBots(prev => ({ ...prev, [botId]: { ...prev[botId], lastReason: `Confidence ${conf} < 65, waiting...` } }));
          await new Promise(r => setTimeout(r, 500));
          continue;
        }

        // Digit eligibility validation
        const eligibility = validateDigitEligibility(
          currentDigits,
          decision.contractType,
          parseInt(decision.barrier || '0'),
        );
        if (!eligibility.eligible && botId !== 'risefall') {
          setBots(prev => ({ ...prev, [botId]: { ...prev[botId], lastReason: `Digit check: ${eligibility.reason}` } }));
          await new Promise(r => setTimeout(r, 500));
          continue;
        }

        const params: any = {
          contract_type: decision.contractType,
          symbol: market,
          duration: 1,
          duration_unit: 't',
          basis: 'stake',
          amount: stake,
        };
        if (decision.barrier !== undefined) params.barrier = decision.barrier;

        const id = ++tradeIdRef.current;
        const now = new Date().toLocaleTimeString();

        setTrades(prev => [{
          id, time: now, market, contract: decision.contractType,
          stake, result: 'Pending' as const, pnl: 0,
        }, ...prev].slice(0, 200));

        console.log(`[${botId}] TRADE: ${decision.contractType} barrier=${decision.barrier || 'N/A'} stake=${stake}`);

        // Buy contract then WAIT for API-confirmed result
        const { contractId, buyPrice } = await derivApi.buyContract(params);
        console.log(`[${botId}] Contract ${contractId} opened @ ${buyPrice} — waiting for settlement...`);

        const result = await derivApi.waitForContractResult(contractId);
        const won = result.status === 'won';
        const pnl = result.profit;

        console.log(`[${botId}] ${won ? 'WIN' : 'LOSS'} P/L=${pnl} (API-confirmed)`);

        setTrades(prev => prev.map(t =>
          t.id === id ? { ...t, result: won ? 'Win' : 'Loss', pnl } : t
        ));

        // STANDARD MARTINGALE: LOSS → multiply, WIN → reset
        if (won) {
          consLosses = 0;
          stake = settings.stake; // WIN → reset to base
        } else {
          consLosses++;
          if (settings.martingale) {
            stake *= settings.multiplier; // LOSS → multiply
          }
          if (consLosses >= 3 && !cooldownActive) {
            setCooldownActive(true);
            cooldownTimerRef.current = setTimeout(() => setCooldownActive(false), 10000);
          }
        }

        const botPnl = bots[botId].pnl + pnl;
        if (botPnl <= -settings.stopLoss || botPnl >= settings.takeProfit) {
          setBots(prev => ({ ...prev, [botId]: {
            ...prev[botId],
            wins: prev[botId].wins + (won ? 1 : 0),
            losses: prev[botId].losses + (won ? 0 : 1),
            pnl: botPnl,
            consecutiveLosses: consLosses,
            lastReason: botPnl >= settings.takeProfit ? '🎯 Take Profit hit!' : '🛑 Stop Loss hit!',
          }}));
          break;
        }

        if (consLosses > settings.maxRecovery) {
          setBots(prev => ({ ...prev, [botId]: { ...prev[botId], lastReason: '🛑 Max recovery exceeded' } }));
          break;
        }

        setBots(prev => ({ ...prev, [botId]: {
          ...prev[botId],
          wins: prev[botId].wins + (won ? 1 : 0),
          losses: prev[botId].losses + (won ? 0 : 1),
          pnl: botPnl,
          consecutiveLosses: consLosses,
        }}));

        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.error(`[${botId}] Error:`, err);
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    botRunningRef.current[botId] = false;
    setBots(prev => ({ ...prev, [botId]: { ...prev[botId], isRunning: false } }));
  }, [isAuthorized, market, digits, prices, bots, trades, cooldownActive, drawdownPct, dailyProfitPct]);

  const stopBot = useCallback((botId: BotId) => {
    botRunningRef.current[botId] = false;
    setBots(prev => ({ ...prev, [botId]: { ...prev[botId], isRunning: false, lastReason: 'Stopped by user' } }));
  }, []);

  const updateBotSettings = useCallback((botId: BotId, settings: BotSettings) => {
    setBots(prev => ({ ...prev, [botId]: { ...prev[botId], settings } }));
  }, []);

  const displayDigits = digits.slice(-historyView);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">🤖 Smart Trading Bots</h1>
          <p className="text-xs text-muted-foreground">API-verified results • Standard martingale (LOSS → multiply) • Digit validation</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(historyView)} onValueChange={v => setHistoryView(parseInt(v))}>
            <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[30, 50, 100, 500].map(n => (
                <SelectItem key={n} value={String(n)}>Last {n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={market} onValueChange={v => setMarket(v as MarketSymbol)}>
            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MARKETS.map(m => (
                <SelectItem key={m.symbol} value={m.symbol}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ConfidenceScore score={confidence} />
        <VolatilityMeter prices={prices} />
        <SessionAnalytics
          trades={trades}
          maxTradesPerSession={MAX_SESSION_TRADES}
          cooldownActive={cooldownActive}
          drawdownPct={drawdownPct}
          dailyProfitPct={dailyProfitPct}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 space-y-3">
          {(Object.entries(DEFAULT_BOT_CONFIGS) as [BotId, typeof DEFAULT_BOT_CONFIGS[BotId]][]).map(([id, cfg]) => (
            <BotCard
              key={id}
              name={cfg.name}
              description={cfg.desc}
              icon={cfg.icon}
              accentColor={cfg.accent}
              isRunning={bots[id].isRunning}
              wins={bots[id].wins}
              losses={bots[id].losses}
              pnl={bots[id].pnl}
              lastReason={bots[id].lastReason}
              consecutiveLosses={bots[id].consecutiveLosses}
              settings={bots[id].settings}
              onSettingsChange={s => updateBotSettings(id, s)}
              onStart={() => runBot(id)}
              onStop={() => stopBot(id)}
              disabled={!isAuthorized || cooldownActive}
            />
          ))}
        </div>

        <div className="lg:col-span-4 space-y-4">
          <DigitDisplay digits={displayDigits} barrier={selectedDigit} />
          <SmartDigitGrid
            digits={digits}
            barrier={selectedDigit}
            onSelectDigit={setSelectedDigit}
            selectedDigit={selectedDigit}
          />
          <SignalAlerts
            digits={digits}
            barrier={selectedDigit}
            soundEnabled={soundEnabled}
            onSoundToggle={setSoundEnabled}
          />
        </div>

        <div className="lg:col-span-4">
          <TradeLogComponent trades={trades} />
        </div>
      </div>
    </div>
  );
}
