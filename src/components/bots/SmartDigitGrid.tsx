import { motion } from 'framer-motion';
import { digitFrequency } from '@/services/bot-engine';

interface SmartDigitGridProps {
  digits: number[];
  barrier: number;
  onSelectDigit: (d: number) => void;
  selectedDigit: number;
}

/**
 * Enhanced digit 0-9 analysis grid with:
 * - Frequency count & percentage
 * - Color: green (most), orange (2nd most), red (least)
 * - Over/Under/Even/Odd/Matches/Differs percentages
 * - Signal bias suggestions
 */
export default function SmartDigitGrid({ digits, barrier, onSelectDigit, selectedDigit }: SmartDigitGridProps) {
  const len = digits.length || 1;
  const freq = digitFrequency(digits);
  const pcts = freq.map(f => (f / len) * 100);

  // Rank digits by frequency
  const sorted = [...freq].map((f, i) => ({ digit: i, count: f })).sort((a, b) => b.count - a.count);
  const mostDigit = sorted[0]?.digit ?? 0;
  const secondDigit = sorted[1]?.digit ?? 1;
  const leastDigit = sorted[sorted.length - 1]?.digit ?? 9;

  const getDigitColor = (digit: number) => {
    if (digit === mostDigit) return 'border-profit bg-profit/10 text-profit';
    if (digit === secondDigit) return 'border-warning bg-warning/10 text-warning';
    if (digit === leastDigit) return 'border-loss bg-loss/10 text-loss';
    return 'border-border bg-muted text-foreground';
  };

  // Stats
  // Over=5-9, Under=0-4 (0 is Under). Digit 0 always counted.
  const overCount = digits.filter(d => d >= 5).length;
  const underCount = digits.filter(d => d <= 4).length;
  const evenCount = digits.filter(d => d % 2 === 0).length; // 0 is even
  const oddCount = len - evenCount;
  const matchCount = digits.filter(d => d === selectedDigit).length;
  const differCount = len - matchCount;
  const over69 = digits.filter(d => d >= 6).length;
  const under04 = digits.filter(d => d <= 4).length;

  const overPct = (overCount / len) * 100;
  const underPct = (underCount / len) * 100;
  const evenPct = (evenCount / len) * 100;
  const oddPct = (oddCount / len) * 100;
  const matchPct = (matchCount / len) * 100;
  const differPct = (differCount / len) * 100;
  const over69Pct = (over69 / len) * 100;
  const under04Pct = (under04 / len) * 100;

  // Signal bias suggestions
  const biases: { label: string; color: string }[] = [];
  if (overPct > 55) biases.push({ label: 'Suggest UNDER', color: 'text-loss' });
  if (underPct > 55) biases.push({ label: 'Suggest OVER', color: 'text-profit' });
  if (evenPct > 55) biases.push({ label: 'Suggest ODD', color: 'text-odd' });
  if (oddPct > 55) biases.push({ label: 'Suggest EVEN', color: 'text-even' });

  const statRows = [
    { label: 'Even', value: evenPct, color: 'text-even' },
    { label: 'Odd', value: oddPct, color: 'text-odd' },
    { label: `Over ${barrier}`, value: overPct, color: 'text-profit' },
    { label: `Under ${barrier}`, value: underPct, color: 'text-loss' },
    { label: `Match ${selectedDigit}`, value: matchPct, color: 'text-primary' },
    { label: `Differ ${selectedDigit}`, value: differPct, color: 'text-signal' },
    { label: 'Over (6-9)', value: over69Pct, color: 'text-profit' },
    { label: 'Under (0-4)', value: under04Pct, color: 'text-loss' },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Smart Digit Analysis</h3>

      {/* Digit 0-9 grid */}
      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: 10 }, (_, i) => (
          <motion.button
            key={i}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelectDigit(i)}
            className={`rounded-lg p-2 text-center transition-all border-2 ${getDigitColor(i)} ${
              i === selectedDigit ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''
            }`}
          >
            <div className="font-mono text-lg font-bold">{i}</div>
            <div className="text-[9px] opacity-70">{freq[i]} · {pcts[i].toFixed(1)}%</div>
          </motion.button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-3 text-[10px]">
        <span className="text-profit">● Most</span>
        <span className="text-warning">● 2nd</span>
        <span className="text-loss">● Least</span>
        <span className="text-muted-foreground ml-auto">{len} ticks</span>
      </div>

      {/* Percentages grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {statRows.map(s => (
          <div key={s.label} className="bg-muted rounded-lg p-1.5 text-center">
            <div className="text-[9px] text-muted-foreground">{s.label}</div>
            <div className={`font-mono text-xs font-bold ${s.color}`}>{s.value.toFixed(1)}%</div>
          </div>
        ))}
      </div>

      {/* Bias suggestions */}
      {biases.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {biases.map(b => (
            <motion.span
              key={b.label}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className={`text-[10px] font-bold px-2 py-1 rounded bg-muted ${b.color}`}
            >
              ⚡ {b.label}
            </motion.span>
          ))}
        </div>
      )}
    </div>
  );
}
