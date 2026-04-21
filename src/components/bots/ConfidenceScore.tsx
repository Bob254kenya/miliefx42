import { motion } from 'framer-motion';

interface ConfidenceScoreProps {
  score: number;
  label?: string;
}

export default function ConfidenceScore({ score, label = 'AI Confidence' }: ConfidenceScoreProps) {
  const color = score >= 65 ? 'text-profit' : score >= 40 ? 'text-warning' : 'text-loss';
  const bgColor = score >= 65 ? 'bg-profit' : score >= 40 ? 'bg-warning' : 'bg-loss';
  const status = score >= 65 ? 'TRADE' : score >= 40 ? 'CAUTION' : 'HOLD';

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${bgColor}/10 ${color}`}>
          {status}
        </span>
      </div>

      <div className="relative h-3 bg-muted rounded-full overflow-hidden mb-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${bgColor}`}
        />
      </div>

      <div className="flex justify-between items-center">
        <span className="text-[10px] text-muted-foreground">Based on digit imbalance, patterns & loss streak</span>
        <span className={`font-mono text-lg font-bold ${color}`}>{score}</span>
      </div>
    </div>
  );
}
