import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function TradeHistory() {
  // In a real app, this would come from a global store or context
  const [trades] = useState<any[]>([]);

  const exportCSV = () => {
    if (trades.length === 0) return;
    const headers = 'Time,Market,Contract,Stake,Result,P/L\n';
    const rows = trades.map(t => `${t.time},${t.market},${t.contract},${t.stake},${t.result},${t.pnl}`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trade History</h1>
          <p className="text-sm text-muted-foreground">Review your trading performance</p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={trades.length === 0}>
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-card border border-border rounded-xl p-8 text-center"
      >
        <div className="text-muted-foreground">
          <p className="text-lg mb-2">No trade history yet</p>
          <p className="text-sm">Start auto-trading to see your results here. Trade logs from the Auto Trade page will appear in real-time.</p>
        </div>
      </motion.div>
    </div>
  );
}
