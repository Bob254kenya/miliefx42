import { type TradeLog as TradeLogType } from './types';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface TradeLogProps {
  trades: TradeLogType[];
}

function exportCSV(trades: TradeLogType[]) {
  const header = 'Time,Market,Contract,Stake,Result,PnL\n';
  const rows = trades.map(t =>
    `${t.time},${t.market},${t.contract},${t.stake.toFixed(2)},${t.result},${t.pnl.toFixed(2)}`
  ).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `trades-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TradeLogComponent({ trades }: TradeLogProps) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-foreground text-sm">Trade Log</h2>
        {trades.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => exportCSV(trades)} className="h-7 text-xs">
            <Download className="w-3 h-3 mr-1" /> CSV
          </Button>
        )}
      </div>
      <div className="max-h-64 overflow-auto">
        <table className="w-full text-xs">
          <thead className="text-[10px] text-muted-foreground bg-muted/50 sticky top-0">
            <tr>
              <th className="text-left p-1.5">Time</th>
              <th className="text-left p-1.5">Market</th>
              <th className="text-left p-1.5">Type</th>
              <th className="text-right p-1.5">Stake</th>
              <th className="text-center p-1.5">Result</th>
              <th className="text-right p-1.5">P/L</th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-muted-foreground py-6">
                  No trades yet
                </td>
              </tr>
            ) : trades.map(trade => (
              <tr key={trade.id} className="border-t border-border/50 hover:bg-muted/30">
                <td className="p-1.5 font-mono">{trade.time}</td>
                <td className="p-1.5 font-mono">{trade.market}</td>
                <td className="p-1.5">{trade.contract}</td>
                <td className="p-1.5 font-mono text-right">{trade.stake.toFixed(2)}</td>
                <td className="p-1.5 text-center">
                  <span className={`px-1.5 py-0.5 rounded-full ${
                    trade.result === 'Win' ? 'bg-profit/10 text-profit' :
                    trade.result === 'Loss' ? 'bg-loss/10 text-loss' :
                    'bg-warning/10 text-warning'
                  }`}>
                    {trade.result}
                  </span>
                </td>
                <td className={`p-1.5 font-mono text-right ${
                  trade.pnl > 0 ? 'text-profit' : trade.pnl < 0 ? 'text-loss' : 'text-muted-foreground'
                }`}>
                  {trade.pnl > 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
