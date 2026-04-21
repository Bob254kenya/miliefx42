import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';

interface SignalAlertsProps {
  digits: number[];
  barrier: number;
  soundEnabled: boolean;
  onSoundToggle: (v: boolean) => void;
}

interface Signal {
  label: string;
  active: boolean;
  color: string;
  bgColor: string;
}

/**
 * Shows visual (and optional audio) alerts when digit percentages
 * cross threshold values.
 */
export default function SignalAlerts({ digits, barrier, soundEnabled, onSoundToggle }: SignalAlertsProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const len = digits.length || 1;

  const overPct = (digits.filter(d => d > barrier).length / len) * 100;
  const underPct = (digits.filter(d => d < barrier).length / len) * 100;
  const evenPct = (digits.filter(d => d % 2 === 0).length / len) * 100;
  const oddPct = (digits.filter(d => d % 2 !== 0).length / len) * 100;

  const signals: Signal[] = [
    { label: 'OVER SIGNAL', active: overPct > 60, color: 'text-profit', bgColor: 'bg-profit/10 border-profit' },
    { label: 'UNDER SIGNAL', active: underPct > 60, color: 'text-loss', bgColor: 'bg-loss/10 border-loss' },
    { label: 'EVEN ALERT', active: evenPct > 55, color: 'text-even', bgColor: 'bg-even/10 border-even' },
    { label: 'ODD ALERT', active: oddPct > 55, color: 'text-odd', bgColor: 'bg-odd/10 border-odd' },
  ];

  const anyActive = signals.some(s => s.active);

  // Play beep when signal triggers
  useEffect(() => {
    if (anyActive && soundEnabled) {
      try {
        if (!audioRef.current) {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          gain.gain.value = 0.1;
          osc.start();
          setTimeout(() => { osc.stop(); ctx.close(); }, 150);
        }
      } catch {}
    }
  }, [anyActive, soundEnabled]);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Signals</h3>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={e => onSoundToggle(e.target.checked)}
            className="accent-primary"
          />
          <span className="text-muted-foreground">🔊 Sound</span>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {signals.map(s => (
          <motion.div
            key={s.label}
            animate={s.active ? { opacity: [0.6, 1, 0.6] } : { opacity: 0.4 }}
            transition={s.active ? { repeat: Infinity, duration: 1 } : {}}
            className={`rounded-lg border-2 p-2 text-center text-xs font-bold ${
              s.active ? s.bgColor + ' ' + s.color : 'border-border bg-muted text-muted-foreground'
            }`}
          >
            {s.label}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
