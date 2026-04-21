import { MARKETS, type MarketSymbol } from '@/services/deriv-api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Play, Pause, StopCircle } from 'lucide-react';

export interface TradeConfigState {
  market: MarketSymbol;
  contractType: string;
  digit: string;
  stake: string;
  martingale: boolean;
  multiplier: string;
  stopLoss: string;
  takeProfit: string;
  maxTrades: string;
}

interface TradeConfigProps {
  config: TradeConfigState;
  onChange: <K extends keyof TradeConfigState>(key: K, val: TradeConfigState[K]) => void;
  isRunning: boolean;
  isPaused: boolean;
  isAuthorized: boolean;
  currency: string;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
}

const CONTRACT_TYPES = [
  { value: 'DIGITOVER', label: 'Over' },
  { value: 'DIGITUNDER', label: 'Under' },
  { value: 'DIGITEVEN', label: 'Even' },
  { value: 'DIGITODD', label: 'Odd' },
  { value: 'DIGITMATCH', label: 'Matches' },
  { value: 'DIGITDIFF', label: 'Differs' },
];

export default function TradeConfig({
  config, onChange, isRunning, isPaused, isAuthorized,
  currency, onStart, onPause, onStop,
}: TradeConfigProps) {
  const needsDigit = ['DIGITOVER', 'DIGITUNDER', 'DIGITMATCH', 'DIGITDIFF'].includes(config.contractType);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <h2 className="font-semibold text-foreground text-sm">Configuration</h2>

      <div>
        <label className="text-[10px] text-muted-foreground">Market</label>
        <Select value={config.market} onValueChange={v => onChange('market', v as MarketSymbol)} disabled={isRunning}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MARKETS.map(m => (
              <SelectItem key={m.symbol} value={m.symbol}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-[10px] text-muted-foreground">Contract Type</label>
        <Select value={config.contractType} onValueChange={v => onChange('contractType', v)} disabled={isRunning}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CONTRACT_TYPES.map(ct => (
              <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {needsDigit && (
        <div>
          <label className="text-[10px] text-muted-foreground">Barrier (0-9)</label>
          <div className="grid grid-cols-5 gap-1">
            {Array.from({ length: 10 }, (_, i) => (
              <button
                key={i}
                onClick={() => onChange('digit', String(i))}
                disabled={isRunning}
                className={`h-7 rounded text-xs font-mono font-bold transition-all ${
                  parseInt(config.digit) === i
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-secondary'
                }`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="text-[10px] text-muted-foreground">Stake ({currency})</label>
        <Input type="number" min="0.35" step="0.01" value={config.stake}
          onChange={e => onChange('stake', e.target.value)} disabled={isRunning} className="h-8 text-xs" />
      </div>

      <div className="flex items-center justify-between">
        <label className="text-xs text-foreground">Martingale</label>
        <Switch checked={config.martingale} onCheckedChange={v => onChange('martingale', v)} disabled={isRunning} />
      </div>

      {config.martingale && (
        <div>
          <label className="text-[10px] text-muted-foreground">Multiplier</label>
          <Input type="number" min="1.1" step="0.1" value={config.multiplier}
            onChange={e => onChange('multiplier', e.target.value)} disabled={isRunning} className="h-8 text-xs" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">Stop Loss</label>
          <Input type="number" value={config.stopLoss}
            onChange={e => onChange('stopLoss', e.target.value)} disabled={isRunning} className="h-8 text-xs" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Take Profit</label>
          <Input type="number" value={config.takeProfit}
            onChange={e => onChange('takeProfit', e.target.value)} disabled={isRunning} className="h-8 text-xs" />
        </div>
      </div>

      <div>
        <label className="text-[10px] text-muted-foreground">Max Trades</label>
        <Input type="number" value={config.maxTrades}
          onChange={e => onChange('maxTrades', e.target.value)} disabled={isRunning} className="h-8 text-xs" />
      </div>

      <div className="flex gap-2 pt-1">
        {!isRunning ? (
          <Button onClick={onStart} disabled={!isAuthorized} className="flex-1 h-9 bg-profit hover:bg-profit/90 text-profit-foreground text-xs">
            <Play className="w-3.5 h-3.5 mr-1" /> Start
          </Button>
        ) : (
          <>
            <Button onClick={onPause} variant="outline" className="flex-1 h-9 text-xs">
              <Pause className="w-3.5 h-3.5 mr-1" /> {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button onClick={onStop} variant="destructive" className="flex-1 h-9 text-xs">
              <StopCircle className="w-3.5 h-3.5 mr-1" /> Stop
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
