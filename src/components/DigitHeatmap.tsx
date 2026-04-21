import { motion } from 'framer-motion';
import { analyzeDigits } from '@/services/analysis';

interface DigitHeatmapProps {
  prices: number[];
  lastDigit: number;
}

export default function DigitHeatmap({ prices, lastDigit }: DigitHeatmapProps) {
  const { percentages, mostCommon, leastCommon } = analyzeDigits(prices);

  const getColor = (pct: number, digit: number) => {
    if (digit === mostCommon) return 'bg-profit text-profit-foreground';
    if (digit === leastCommon) return 'bg-loss text-loss-foreground';
    if (pct > 12) return 'bg-profit/30 text-foreground';
    if (pct < 8) return 'bg-loss/30 text-foreground';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 10 }, (_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.03 }}
            className={`relative rounded-lg p-3 text-center transition-all ${getColor(percentages[i], i)} ${
              i === lastDigit ? 'ring-2 ring-primary glow-primary' : ''
            }`}
          >
            <div className="font-mono text-lg font-bold">{i}</div>
            <div className="font-mono text-xs mt-1">{percentages[i].toFixed(1)}%</div>
          </motion.div>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>🟢 Most: <span className="text-profit font-mono">{mostCommon}</span></span>
        <span>🔴 Least: <span className="text-loss font-mono">{leastCommon}</span></span>
        <span>Ticks: <span className="font-mono">{prices.length}</span></span>
      </div>
    </div>
  );
}
