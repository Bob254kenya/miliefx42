import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type PatternCondition = 'Even' | 'Odd' | 'Over' | 'Under' | 'Any';

interface PatternStrategyProps {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  patternLength: number;
  onLengthChange: (v: number) => void;
  pattern: PatternCondition[];
  onPatternChange: (idx: number, val: PatternCondition) => void;
  disabled?: boolean;
}

const CONDITIONS: PatternCondition[] = ['Even', 'Odd', 'Over', 'Under', 'Any'];

/**
 * Configurable pattern-based strategy.
 * User defines a sequence of conditions; bot checks if the last N digits match.
 */
export default function PatternStrategy({
  enabled, onToggle, patternLength, onLengthChange,
  pattern, onPatternChange, disabled,
}: PatternStrategyProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Pattern Strategy</h3>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => onToggle(e.target.checked)}
            disabled={disabled}
            className="accent-primary"
          />
          <span className="text-muted-foreground">{enabled ? 'ON' : 'OFF'}</span>
        </label>
      </div>

      {enabled && (
        <>
          <div>
            <label className="text-xs text-muted-foreground">Pattern Length</label>
            <Select
              value={String(patternLength)}
              onValueChange={v => onLengthChange(parseInt(v))}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5].map(n => (
                  <SelectItem key={n} value={String(n)}>{n} digits</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Sequence (oldest → newest)</label>
            {Array.from({ length: patternLength }, (_, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-4">#{i + 1}</span>
                <Select
                  value={pattern[i] || 'Any'}
                  onValueChange={v => onPatternChange(i, v as PatternCondition)}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground italic">
            Bot will only trade when the last {patternLength} digits match this pattern.
          </p>
        </>
      )}
    </div>
  );
}

/**
 * Check if the last N digits match the configured pattern.
 * Over/Under use barrier 4 by default for pattern matching.
 */
export function doesPatternMatch(
  digits: number[],
  pattern: PatternCondition[],
  barrier: number,
): boolean {
  const len = pattern.length;
  if (digits.length < len) return false;

  const slice = digits.slice(-len);
  return slice.every((d, i) => {
    const cond = pattern[i];
    if (cond === 'Any') return true;
    if (cond === 'Even') return d % 2 === 0;
    if (cond === 'Odd') return d % 2 !== 0;
    if (cond === 'Over') return d > barrier;
    if (cond === 'Under') return d < barrier;
    return true;
  });
}
