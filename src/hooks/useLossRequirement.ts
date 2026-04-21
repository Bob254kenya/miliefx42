import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'loss_requirement_state';

interface LossState {
  currentLossCount: number;
  requiredLosses: number;
  tradeHistory: any[];
  unlocked: boolean;
}

// Always return unlocked state
function loadState(): LossState {
  // Ignore any existing localStorage data and force unlocked
  return { 
    currentLossCount: 0,      // Count starts at 0
    requiredLosses: 0,        // No losses required!
    tradeHistory: [], 
    unlocked: true             // Always unlocked
  };
}

function saveState(state: LossState) {
  // Save but we've already overridden to be unlocked
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useLossRequirement() {
  const [state, setState] = useState<LossState>(loadState);

  useEffect(() => { saveState(state); }, [state]);

  // Always return unlocked values
  const remaining = 0;                    // No losses remaining
  const isUnlocked = true;                 // Always unlocked

  // Record loss but never lock trading
  const recordLoss = useCallback((stake: number, symbol: string, durationMs: number) => {
    // Just update count but keep unlocked
    setState(prev => ({
      ...prev,
      currentLossCount: prev.currentLossCount + 1,
      unlocked: true, // Force unlocked
      tradeHistory: [
        ...prev.tradeHistory, 
        { timestamp: Date.now(), stake, symbol, duration: durationMs }
      ].slice(-50)
    }));
  }, []);

  // Set required losses but keep unlocked
  const setRequiredLosses = useCallback((n: number) => {
    setState(prev => ({
      ...prev,
      requiredLosses: n,
      unlocked: true, // Force unlocked
    }));
  }, []);

  // Reset progress but stay unlocked
  const resetProgress = useCallback(() => {
    setState({
      currentLossCount: 0,
      requiredLosses: 0,  // No losses required
      tradeHistory: [],
      unlocked: true,      // Stay unlocked
    });
  }, []);

  // Return all values - isUnlocked is ALWAYS true
  return {
    currentLossCount: state.currentLossCount,
    requiredLosses: state.requiredLosses,
    remaining,
    isUnlocked,
    recordLoss,
    setRequiredLosses,
    resetProgress,
  };
                                    }
