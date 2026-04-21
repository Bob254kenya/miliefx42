import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, StopCircle, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

export interface BotSettings {
  stake: number;
  martingale: boolean;
  multiplier: number;
  maxRecovery: number;
  stopLoss: number;
  takeProfit: number;
}

interface BotCardProps {
  name: string;
  description: string;
  icon: string;
  accentColor: string;
  isRunning: boolean;
  wins: number;
  losses: number;
  pnl: number;
  lastReason: string;
  consecutiveLosses: number;
  settings: BotSettings;
  onSettingsChange: (s: BotSettings) => void;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export default function BotCard({
  name, description, icon, accentColor,
  isRunning, wins, losses, pnl, lastReason, consecutiveLosses,
  settings, onSettingsChange, onStart, onStop, disabled,
}: BotCardProps) {
  const [expanded, setExpanded] = useState(false);
  const winRate = (wins + losses) > 0 ? (wins / (wins + losses)) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card border rounded-xl overflow-hidden ${
        isRunning ? `border-${accentColor} glow-${accentColor === 'profit' ? 'profit' : 'primary'}` : 'border-border'
      }`}
    >
      {/* Header */}
      <div
        className="p-3 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <div>
            <div className="text-sm font-semibold text-foreground">{name}</div>
            <div className="text-[10px] text-muted-foreground">{description}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-2 h-2 rounded-full bg-profit"
            />
          )}
          {!isRunning ? (
            <Button
              size="sm"
              onClick={e => { e.stopPropagation(); onStart(); }}
              disabled={disabled}
              className="h-7 text-xs bg-profit hover:bg-profit/90 text-profit-foreground"
            >
              <Play className="w-3 h-3 mr-1" /> Start
            </Button>
          ) : (
            <Button
              size="sm"
              variant="destructive"
              onClick={e => { e.stopPropagation(); onStop(); }}
              className="h-7 text-xs"
            >
              <StopCircle className="w-3 h-3 mr-1" /> Stop
            </Button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-3 pb-2 grid grid-cols-5 gap-1.5 text-center">
        <div className="bg-muted rounded p-1">
          <div className="text-[9px] text-muted-foreground">Wins</div>
          <div className="font-mono text-xs text-profit font-bold">{wins}</div>
        </div>
        <div className="bg-muted rounded p-1">
          <div className="text-[9px] text-muted-foreground">Losses</div>
          <div className="font-mono text-xs text-loss font-bold">{losses}</div>
        </div>
        <div className="bg-muted rounded p-1">
          <div className="text-[9px] text-muted-foreground">Win%</div>
          <div className={`font-mono text-xs font-bold ${winRate >= 50 ? 'text-profit' : 'text-loss'}`}>
            {winRate.toFixed(0)}%
          </div>
        </div>
        <div className="bg-muted rounded p-1">
          <div className="text-[9px] text-muted-foreground">P/L</div>
          <div className={`font-mono text-xs font-bold ${pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
            {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
          </div>
        </div>
        <div className="bg-muted rounded p-1">
          <div className="text-[9px] text-muted-foreground">Recovery</div>
          <div className="font-mono text-xs text-warning font-bold">{consecutiveLosses}/{settings.maxRecovery}</div>
        </div>
      </div>

      {/* Last reason */}
      {lastReason && (
        <div className="px-3 pb-2">
          <div className="text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-1 flex items-center gap-1">
            <Zap className="w-3 h-3 text-warning" />
            {lastReason}
          </div>
        </div>
      )}

      {/* Expanded settings */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="border-t border-border p-3 space-y-2"
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground">Stake</label>
              <Input
                type="number" min="0.35" step="0.01"
                value={settings.stake}
                onChange={e => onSettingsChange({ ...settings, stake: parseFloat(e.target.value) || 0.35 })}
                disabled={isRunning}
                className="h-7 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Max Recovery</label>
              <Input
                type="number" min="1" max="10"
                value={settings.maxRecovery}
                onChange={e => onSettingsChange({ ...settings, maxRecovery: parseInt(e.target.value) || 3 })}
                disabled={isRunning}
                className="h-7 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Stop Loss</label>
              <Input
                type="number"
                value={settings.stopLoss}
                onChange={e => onSettingsChange({ ...settings, stopLoss: parseFloat(e.target.value) || 10 })}
                disabled={isRunning}
                className="h-7 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Take Profit</label>
              <Input
                type="number"
                value={settings.takeProfit}
                onChange={e => onSettingsChange({ ...settings, takeProfit: parseFloat(e.target.value) || 20 })}
                disabled={isRunning}
                className="h-7 text-xs"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-foreground flex items-center gap-1">
              <Shield className="w-3 h-3" /> Martingale
            </label>
            <Switch
              checked={settings.martingale}
              onCheckedChange={v => onSettingsChange({ ...settings, martingale: v })}
              disabled={isRunning}
            />
          </div>
          {settings.martingale && (
            <div>
              <label className="text-[10px] text-muted-foreground">Multiplier</label>
              <Input
                type="number" min="1.1" step="0.1"
                value={settings.multiplier}
                onChange={e => onSettingsChange({ ...settings, multiplier: parseFloat(e.target.value) || 1.5 })}
                disabled={isRunning}
                className="h-7 text-xs"
              />
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
