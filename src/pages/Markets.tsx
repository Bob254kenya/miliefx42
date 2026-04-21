import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MARKETS, MARKET_GROUPS } from '@/services/deriv-api';
import { Input } from '@/components/ui/input';
import VolatilityCard from '@/components/analyzer/VolatilityCard';
import { Sparkles, Filter, TrendingUp, Clock, ChevronUp, ChevronDown, Wifi, WifiOff } from 'lucide-react';

export default function Markets() {
  const [selectedGroup, setSelectedGroup] = useState<string>('vol');
  const [tickCount, setTickCount] = useState(1000);
  const [showStrongSignalsOnly, setShowStrongSignalsOnly] = useState(false);
  const [strongSignals, setStrongSignals] = useState<Set<string>>(new Set());
  const [activeConnections, setActiveConnections] = useState(0);

  const groups = ['all', ...MARKET_GROUPS.map(g => g.value)];
  const filtered = selectedGroup === 'all'
    ? MARKETS
    : MARKETS.filter(m => m.group === selectedGroup);

  // Handle strong signals from child components
  const handleStrongSignal = useCallback((symbol: string, hasSignal: boolean) => {
    setStrongSignals(prev => {
      const newSet = new Set(prev);
      if (hasSignal) {
        newSet.add(symbol);
      } else {
        newSet.delete(symbol);
      }
      return newSet;
    });
  }, []);

  const handleConnectionStatus = useCallback((isConnected: boolean) => {
    setActiveConnections(prev => isConnected ? prev + 1 : Math.max(0, prev - 1));
  }, []);

  const displayMarkets = showStrongSignalsOnly
    ? filtered.filter(m => strongSignals.has(m.symbol))
    : filtered;

  // Reset strong signals when tick count changes
  useEffect(() => {
    setStrongSignals(new Set());
  }, [tickCount]);

  const incrementTicks = () => {
    setTickCount(prev => Math.min(2000, prev + 100));
  };

  const decrementTicks = () => {
    setTickCount(prev => Math.max(50, prev - 100));
  };

  const tickPresets = [100, 250, 500, 1000, 1500, 2000];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-2 sm:px-3 py-2 sm:py-3 max-w-[1600px] space-y-2 sm:space-y-3">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" />
                <h1 className="text-sm sm:text-lg md:text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Ramzfx Market Analyzer 
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[8px] sm:text-[10px] text-muted-foreground">
                  Real-time digit analysis with AI-powered signals
                </p>
                {/* Connection Status Indicator */}
                <div className="flex items-center gap-1">
                  {activeConnections > 0 ? (
                    <Wifi className="w-2.5 h-2.5 text-green-500" />
                  ) : (
                    <WifiOff className="w-2.5 h-2.5 text-yellow-500" />
                  )}
                  <span className={`text-[8px] ${activeConnections > 0 ? 'text-green-500' : 'text-yellow-500'}`}>
                    {activeConnections > 0 ? `${activeConnections} active` : 'connecting...'}
                  </span>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowStrongSignalsOnly(!showStrongSignalsOnly)}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-[9px] sm:text-[10px] font-medium transition-all ${
                showStrongSignalsOnly
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                  : 'bg-muted hover:bg-muted/80 text-foreground'
              }`}
            >
              <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span className="hidden xs:inline">{showStrongSignalsOnly ? 'Strong Signals' : 'All Markets'}</span>
              <span className="xs:hidden">{showStrongSignalsOnly ? 'Strong' : 'All'}</span>
              {showStrongSignalsOnly && strongSignals.size > 0 && (
                <span className="ml-0.5 px-1 py-0.5 bg-white/20 rounded-full text-[8px] sm:text-[9px]">
                  {strongSignals.size}
                </span>
              )}
            </motion.button>
          </div>

          {/* Tick Count Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1.5">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-[7px] sm:text-[8px] text-muted-foreground">TICKS</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={decrementTicks}
                    className="p-0.5 hover:bg-muted rounded-md transition-colors"
                    disabled={tickCount <= 50}
                  >
                    <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground" />
                  </button>
                  <span className="text-[11px] sm:text-xs font-mono font-bold min-w-[40px] sm:min-w-[45px] text-center">
                    {tickCount}
                  </span>
                  <button
                    onClick={incrementTicks}
                    className="p-0.5 hover:bg-muted rounded-md transition-colors"
                    disabled={tickCount >= 2000}
                  >
                    <ChevronUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-1 flex-wrap">
              {tickPresets.map(preset => (
                <motion.button
                  key={preset}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setTickCount(preset)}
                  className={`px-1.5 sm:px-2 py-1 rounded-md text-[8px] sm:text-[9px] font-medium transition-all ${
                    tickCount === preset
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {preset}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Filter Section */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-1.5"
        >
          <div className="flex items-center gap-1.5">
            <Filter className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground" />
            <span className="text-[9px] sm:text-[10px] font-medium">Market Groups</span>
          </div>
          <div className="flex gap-1 flex-wrap">
            {groups.map((g, idx) => (
              <motion.button
                key={g}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => setSelectedGroup(g)}
                className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[9px] sm:text-[10px] font-medium transition-all ${
                  selectedGroup === g
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {g === 'all' ? 'All' : MARKET_GROUPS.find(mg => mg.value === g)?.label?.split(' ')[0] || g}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Markets Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedGroup + (showStrongSignalsOnly ? '-strong' : '-all') + tickCount}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3"
          >
            {displayMarkets.map((market, idx) => (
              <motion.div
                key={market.symbol}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.03 }}
                className="h-full"
              >
                <VolatilityCard
                  symbol={market.symbol}
                  tickCount={tickCount}
                  mode="over"
                  onStrongSignal={(hasSignal) => handleStrongSignal(market.symbol, hasSignal)}
                  onConnectionStatus={handleConnectionStatus}
                />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Empty State */}
        {displayMarkets.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-6 sm:py-8"
          >
            <div className="bg-muted/30 rounded-lg p-4 sm:p-6">
              <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground mx-auto mb-1.5 sm:mb-2" />
              <p className="text-xs sm:text-sm text-muted-foreground">No strong signals detected at the moment</p>
              <button
                onClick={() => setShowStrongSignalsOnly(false)}
                className="mt-1.5 sm:mt-2 text-primary hover:underline text-[10px] sm:text-xs"
              >
                View all markets
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
