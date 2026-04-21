interface PercentagePanelProps {
  digits: number[];
  barrier: number;
  onSelectDigit: (digit: number) => void;
  selectedDigit: number;
}

/**
 * Real-time percentage calculations for all contract types + digit 0-9 buttons.
 * All digits including 0 are correctly counted.
 */
export default function PercentagePanel({ digits, barrier, onSelectDigit, selectedDigit }: PercentagePanelProps) {
  const len = digits.length || 1;

  // Compute percentages
  const evenCount = digits.filter(d => d % 2 === 0).length;
  const oddCount = digits.filter(d => d % 2 !== 0).length;
  const overCount = digits.filter(d => d > barrier).length;
  const underCount = digits.filter(d => d < barrier).length;
  const matchCount = digits.filter(d => d === selectedDigit).length;
  const differCount = digits.filter(d => d !== selectedDigit).length;

  const pctEven = ((evenCount / len) * 100).toFixed(1);
  const pctOdd = ((oddCount / len) * 100).toFixed(1);
  const pctOver = ((overCount / len) * 100).toFixed(1);
  const pctUnder = ((underCount / len) * 100).toFixed(1);
  const pctMatch = ((matchCount / len) * 100).toFixed(1);
  const pctDiffer = ((differCount / len) * 100).toFixed(1);

  // Per-digit frequency
  const freq = new Array(10).fill(0);
  digits.forEach(d => { freq[d]++; });
  const pctDigits = freq.map(f => ((f / len) * 100).toFixed(1));

  const stats = [
    { label: 'Even', value: pctEven, color: 'text-even' },
    { label: 'Odd', value: pctOdd, color: 'text-odd' },
    { label: `Over ${barrier}`, value: pctOver, color: 'text-profit' },
    { label: `Under ${barrier}`, value: pctUnder, color: 'text-loss' },
    { label: `Match ${selectedDigit}`, value: pctMatch, color: 'text-primary' },
    { label: `Differ ${selectedDigit}`, value: pctDiffer, color: 'text-signal' },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Live Percentages</h3>

      {/* Contract type percentages */}
      <div className="grid grid-cols-3 gap-2">
        {stats.map(s => (
          <div key={s.label} className="bg-muted rounded-lg p-2 text-center">
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
            <div className={`font-mono text-sm font-bold ${s.color}`}>{s.value}%</div>
          </div>
        ))}
      </div>

      {/* Digit 0-9 buttons with count & pct */}
      <div>
        <div className="text-xs text-muted-foreground mb-2">Digit Frequency (click to select barrier)</div>
        <div className="grid grid-cols-5 gap-1.5">
          {Array.from({ length: 10 }, (_, i) => (
            <button
              key={i}
              onClick={() => onSelectDigit(i)}
              className={`rounded-lg p-1.5 text-center transition-all border-2 ${
                i === selectedDigit
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-muted hover:border-muted-foreground'
              }`}
            >
              <div className="font-mono text-sm font-bold text-foreground">{i}</div>
              <div className="text-[9px] text-muted-foreground">{freq[i]} · {pctDigits[i]}%</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
