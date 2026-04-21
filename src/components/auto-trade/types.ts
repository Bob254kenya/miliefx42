export interface TradeLog {
  id: number;
  time: string;
  market: string;
  contract: string;
  stake: number;
  result: 'Win' | 'Loss' | 'Pending';
  pnl: number;
}
