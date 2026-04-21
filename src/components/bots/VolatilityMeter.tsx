import { motion } from 'framer-motion';

interface VolatilityMeterProps {
  prices: number[];
}

export default function VolatilityMeter({ prices }: VolatilityMeterProps) {
  // Measure tick speed (price changes per recent ticks)
  const recent = prices.slice(-20);
  let changes = 0;
  let totalDelta = 0;

  for (let i = 1; i < recent.length; i++) {
    const delta = Math.abs(recent[i] - recent[i - 1]);
    totalDelta += delta;
    if (delta > 0) changes++;
  }

  const avgDelta = recent.length > 1 ? totalDelta / (recent.length - 1) : 0;
  const changeRate = recent.length > 1 ? (changes / (recent.length - 1)) * 100 : 0;

  // Normalize to 0-100 scale (adjust thresholds per market)
  const intensity = Math.min(100, Math.round(changeRate * 1.2));
  const isUnstable = intensity > 80;
  const color = isUnstable ? 'text-loss' : intensity > 50 ? 'text-warning' : 'text-profit';
  const bgColor = isUnstable ? 'bg-loss' : intensity > 50 ? 'bg-warning' : 'bg-profit';
  const status = isUnstable ? 'UNSTABLE' : intensity > 50 ? 'MODERATE' : 'STABLE';

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Volatility Strength</h3>
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${bgColor}/10 ${color}`}>
          {status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center bg-muted rounded-lg p-2">
          <div className="text-[9px] text-muted-foreground">Intensity</div>
          <div className={`font-mono text-sm font-bold ${color}`}>{intensity}%</div>
        </div>
        <div className="text-center bg-muted rounded-lg p-2">
          <div className="text-[9px] text-muted-foreground">Avg Delta</div>
          <div className="font-mono text-sm font-bold text-foreground">{avgDelta.toFixed(4)}</div>
        </div>
        <div className="text-center bg-muted rounded-lg p-2">
          <div className="text-[9px] text-muted-foreground">Activity</div>
          <div className="font-mono text-sm font-bold text-foreground">{changeRate.toFixed(0)}%</div>
        </div>
      </div>

      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${intensity}%` }}
          transition={{ duration: 0.5 }}
          className={`h-full rounded-full ${bgColor}`}
        />
      </div>
    </div>
  );
}
