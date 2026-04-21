import { type TradeLog } from '@/components/auto-trade/types';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface SessionAnalyticsProps {
  trades: TradeLog[];
  maxTradesPerSession: number;
  cooldownActive: boolean;
  drawdownPct: number;
  dailyProfitPct: number;
}

export default function SessionAnalytics({
  trades, maxTradesPerSession, cooldownActive, drawdownPct, dailyProfitPct,
}: SessionAnalyticsProps) {
  const wins = trades.filter(t => t.result === 'Win').length;
  const losses = trades.filter(t => t.result === 'Loss').length;
  const total = trades.length;
  const winRate = total > 0 ? (wins / total) * 100 : 0;

  // Recovery success (wins after a loss)
  let recoveries = 0;
  let recoveryAttempts = 0;
  for (let i = 1; i < trades.length; i++) {
    if (trades[i - 1].result === 'Loss') {
      recoveryAttempts++;
      if (trades[i].result === 'Win') recoveries++;
    }
  }
  const recoveryRate = recoveryAttempts > 0 ? (recoveries / recoveryAttempts) * 100 : 0;

  // Cumulative P/L chart data (reversed since trades are newest first)
  const chartData = [...trades].reverse().reduce((acc, t, i) => {
    const prev = acc.length > 0 ? acc[acc.length - 1].pnl : 0;
    acc.push({ trade: i + 1, pnl: prev + t.pnl });
    return acc;
  }, [] as { trade: number; pnl: number }[]);

  const stats = [
    { label: 'Win Rate', value: `${winRate.toFixed(1)}%`, color: winRate >= 50 ? 'text-profit' : 'text-loss' },
    { label: 'Total Trades', value: `${total}/${maxTradesPerSession}`, color: 'text-foreground' },
    { label: 'Recovery%', value: `${recoveryRate.toFixed(0)}%`, color: recoveryRate >= 50 ? 'text-profit' : 'text-warning' },
    { label: 'Drawdown', value: `${drawdownPct.toFixed(1)}%`, color: drawdownPct > 15 ? 'text-loss' : 'text-foreground' },
    { label: 'Daily Profit', value: `${dailyProfitPct.toFixed(1)}%`, color: dailyProfitPct > 0 ? 'text-profit' : 'text-loss' },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Session Analytics</h3>
        {cooldownActive && (
          <span className="text-[10px] bg-warning/10 text-warning px-2 py-0.5 rounded font-bold animate-pulse">
            COOLDOWN
          </span>
        )}
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {stats.map(s => (
          <div key={s.label} className="bg-muted rounded-lg p-1.5 text-center">
            <div className="text-[9px] text-muted-foreground">{s.label}</div>
            <div className={`font-mono text-xs font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* P/L Chart */}
      {chartData.length > 1 && (
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="trade" hide />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: 'hsl(225 20% 9%)', border: '1px solid hsl(225 15% 16%)', borderRadius: '8px', fontSize: '10px' }}
                labelStyle={{ color: 'hsl(215 15% 50%)' }}
              />
              <Line
                type="monotone"
                dataKey="pnl"
                stroke="hsl(195 100% 50%)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
