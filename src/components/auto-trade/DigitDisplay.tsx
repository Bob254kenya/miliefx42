import { motion } from 'framer-motion';

interface DigitDisplayProps {
  digits: number[];
  barrier: number;
}

/**
 * Shows digits as colored boxes.
 * Green = digit > barrier (Over), Red = digit < barrier (Under),
 * Blue border = Even, Orange border = Odd.
 * Digit 0 is always included.
 */
export default function DigitDisplay({ digits, barrier }: DigitDisplayProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Digit Stream</h3>
        <span className="text-[10px] text-muted-foreground font-mono">{digits.length} ticks</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {digits.length === 0 && (
          <p className="text-xs text-muted-foreground">Waiting for ticks…</p>
        )}
        {digits.map((d, i) => {
          const isOver = d > barrier;
          const isUnder = d < barrier;
          const isEven = d % 2 === 0;

          let bgClass = 'bg-muted';
          if (isOver) bgClass = 'bg-profit/20';
          else if (isUnder) bgClass = 'bg-loss/20';

          const borderClass = isEven ? 'border-even' : 'border-odd';

          return (
            <motion.div
              key={`${i}-${d}`}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.15 }}
              className={`w-8 h-8 flex items-center justify-center rounded-md font-mono text-xs font-bold border-2 ${bgClass} ${borderClass} text-foreground`}
            >
              {d}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
