import { type TradeLog } from './types';

interface StatsPanelProps {
  trades: TradeLog[];
  balance: number;
  currentStake: number;
  market: string;
  currency: string;
}

export default function StatsPanel({ trades, balance, currentStake, market, currency }: StatsPanelProps) {
  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
  const wins = trades.filter(t => t.result === 'Win').length;
  const losses = trades.filter(t => t.result === 'Loss').length;
  const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;

  const items = [
    { label: 'Balance', value: `${balance.toFixed(2)} ${currency}`, color: 'text-foreground' },
    { label: 'Win Rate', value: `${winRate.toFixed(1)}%`, color: winRate >= 50 ? 'text-profit' : 'text-loss' },
    { label: 'Wins', value: String(wins), color: 'text-profit' },
    { label: 'Losses', value: String(losses), color: 'text-loss' },
    { label: 'P/L', value: `${totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}`, color: totalPnL >= 0 ? 'text-profit' : 'text-loss' },
    { label: 'Trades', value: String(trades.length), color: 'text-foreground' },
    { label: 'Stake', value: `${currentStake.toFixed(2)}`, color: 'text-primary' },
    { label: 'Market', value: market, color: 'text-muted-foreground' },
  ];

  return (
    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
      {items.map(it => (
        <div key={it.label} className="bg-card border border-border rounded-lg p-2 text-center">
          <div className="text-[9px] text-muted-foreground">{it.label}</div>
          <div className={`font-mono text-xs font-bold ${it.color} truncate`}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}
