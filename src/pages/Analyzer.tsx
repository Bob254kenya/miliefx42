import { useState } from 'react';
import { MARKETS, MARKET_GROUPS } from '@/services/deriv-api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import VolatilityCard from '@/components/analyzer/VolatilityCard';

export default function Analyzer() {
  const [group, setGroup] = useState('vol');
  const [mode, setMode] = useState<'over' | 'under'>('over');
  const [tickCount, setTickCount] = useState(1000);

  const filtered = MARKETS.filter(m => m.group === group);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-profit bg-profit/10 rounded-lg px-4 py-2 text-center">
          Deriv Over/Under Entry Digit Analyzer
        </h1>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-40">
          <label className="text-[10px] text-muted-foreground mb-1 block">Mode</label>
          <Select value={mode} onValueChange={(v) => setMode(v as 'over' | 'under')}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="over">Over</SelectItem>
              <SelectItem value="under">Under</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <label className="text-[10px] text-muted-foreground mb-1 block">Market Group</label>
          <Select value={group} onValueChange={setGroup}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MARKET_GROUPS.map(g => (
                <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-32">
          <label className="text-[10px] text-muted-foreground mb-1 block">Ticks</label>
          <Input
            type="number"
            min={50}
            max={4000}
            value={tickCount}
            onChange={(e) => setTickCount(Math.max(50, Math.min(4000, parseInt(e.target.value) || 1000)))}
            className="h-8 text-xs"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(m => (
          <VolatilityCard
            key={m.symbol}
            symbol={m.symbol}
            tickCount={tickCount}
            mode={mode}
          />
        ))}
      </div>
    </div>
  );
}
