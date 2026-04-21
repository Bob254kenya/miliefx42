import { motion } from 'framer-motion';

interface SignalCardProps {
  title: string;
  direction: string;
  strength: 'Weak' | 'Moderate' | 'Strong';
}

export default function SignalCard({ title, direction, strength }: SignalCardProps) {
  const strengthColor = {
    Weak: 'text-warning bg-warning/10',
    Moderate: 'text-primary bg-primary/10',
    Strong: 'text-profit bg-profit/10',
  };

  const strengthWidth = {
    Weak: 'w-1/3',
    Moderate: 'w-2/3',
    Strong: 'w-full',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-card border border-border rounded-lg p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{title}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${strengthColor[strength]}`}>
          {strength}
        </span>
      </div>
      <div className="font-mono text-sm font-semibold text-foreground">{direction}</div>
      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 0.5 }}
          className={`h-full rounded-full ${strengthWidth[strength]} ${
            strength === 'Strong' ? 'bg-profit' : strength === 'Moderate' ? 'bg-primary' : 'bg-warning'
          }`}
        />
      </div>
    </motion.div>
  );
}
