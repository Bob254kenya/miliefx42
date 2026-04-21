/**
 * Smart Signal Engine — Frequency-based signal analysis.
 * Analyzes last 1000 ticks for most/least appearing digits.
 * Entry conditions based on frequency thresholds.
 * Odd/Even volatility filtering.
 * Martingale recovery with max 5 runs.
 */

import { type MarketSymbol } from './deriv-api';
import { getLastDigit } from './analysis';
import { digitFrequency } from './bot-engine';

export interface DigitRanking {
  digit: number;
  count: number;
  pct: number;
}

export interface MarketSignal {
  symbol: MarketSymbol;
  marketName: string;
  digits: number[];
  rankings: DigitRanking[];
  most: DigitRanking;
  second: DigitRanking;
  third: DigitRanking;
  least: DigitRanking;
  signalStrength: number;
  isValid: boolean;
  validationReason: string;
  suggestedContract: string;
  suggestedBarrier: string;
  overPct: number;
  underPct: number;
  evenPct: number;
  oddPct: number;
  // New: frequency-based entry conditions
  entryDirection: 'OVER' | 'UNDER' | null;
  overStake: number;
  overRecoveryStake: number;
  underStake: number;
  underRecoveryStake: number;
  oddEvenFilter: 'ODD' | 'EVEN' | null;
}

/**
 * Analyze digits with frequency-based entry logic:
 * - OVER when most freq > 4 AND least freq > 4 (stake 1, recovery 3)
 * - UNDER when most freq < 5 AND least freq < 8 (stake 1, recovery 6)
 * - Odd/Even filter based on volatility parity dominance
 */
export function analyzeMarketDigits(
  digits: number[],
  symbol: MarketSymbol,
  marketName: string,
): MarketSignal {
  const len = digits.length || 1;
  const freq = digitFrequency(digits);

  const rankings: DigitRanking[] = [];
  for (let i = 0; i <= 9; i++) {
    rankings.push({ digit: i, count: freq[i], pct: (freq[i] / len) * 100 });
  }
  rankings.sort((a, b) => b.count - a.count);

  const most = rankings[0];
  const second = rankings[1];
  const third = rankings[2];
  const least = rankings[rankings.length - 1];

  // Over=5-9, Under=0-4
  const overCount = digits.filter(d => d >= 5).length;
  const underCount = digits.filter(d => d <= 4).length;
  const evenCount = digits.filter(d => d % 2 === 0).length;
  const oddCount = digits.filter(d => d % 2 !== 0).length;

  const overPct = (overCount / len) * 100;
  const underPct = (underCount / len) * 100;
  const evenPct = (evenCount / len) * 100;
  const oddPct = (oddCount / len) * 100;

  // ── Frequency-based entry conditions ──
  let entryDirection: 'OVER' | 'UNDER' | null = null;

  // OVER: most freq > 4 AND least freq > 4
  const overCondition = most.count > 4 && least.count > 4;
  // UNDER: most freq < 5 AND least freq < 8
  const underCondition = most.count < 5 && least.count < 8;

  if (overCondition && !underCondition) {
    entryDirection = 'OVER';
  } else if (underCondition && !overCondition) {
    entryDirection = 'UNDER';
  } else if (overCondition && underCondition) {
    // Both met — pick by pct dominance
    entryDirection = overPct >= underPct ? 'OVER' : 'UNDER';
  }

  // ── Odd/Even volatility filter ──
  const oddEvenFilter: 'ODD' | 'EVEN' | null = 
    oddPct > evenPct ? 'ODD' : evenPct > oddPct ? 'EVEN' : null;

  // ── Signal strength ──
  const imbalance = most.pct - least.pct;
  let strength = 0;
  if (imbalance > 5) strength += 2;
  if (imbalance > 10) strength += 2;
  if (imbalance > 15) strength += 2;
  if (second.pct > 12) strength += 1;
  if (third.pct > 11) strength += 1;
  if (most.pct + second.pct + third.pct > 40) strength += 1;
  if (least.pct < 5) strength += 1;
  strength = Math.min(10, strength);

  const isValid = entryDirection !== null && strength >= 3 && digits.length >= 20;

  let validationReason = '';
  if (!isValid) {
    if (!entryDirection) validationReason = 'No entry condition met';
    else if (strength < 3) validationReason = `Strength ${strength} < 3`;
    else validationReason = 'Insufficient data';
  } else {
    validationReason = `${entryDirection} | STR ${strength} | Most:${most.count} Least:${least.count} | ${oddEvenFilter || 'N/A'} filter`;
  }

  let suggestedContract = entryDirection === 'OVER' ? 'DIGITOVER' : 'DIGITUNDER';
  let suggestedBarrier = entryDirection === 'OVER' ? '1' : '6';

  // Apply odd/even filter override
  if (isValid && oddEvenFilter) {
    if (oddEvenFilter === 'ODD' && oddPct > 55) {
      suggestedContract = 'DIGITODD';
      suggestedBarrier = '';
    } else if (oddEvenFilter === 'EVEN' && evenPct > 55) {
      suggestedContract = 'DIGITEVEN';
      suggestedBarrier = '';
    }
  }

  return {
    symbol, marketName, digits, rankings,
    most, second, third, least,
    signalStrength: strength, isValid, validationReason,
    suggestedContract, suggestedBarrier,
    overPct, underPct, evenPct, oddPct,
    entryDirection,
    overStake: 1, overRecoveryStake: 3,
    underStake: 1, underRecoveryStake: 6,
    oddEvenFilter,
  };
}

/**
 * Validates digit eligibility before trade execution.
 */
export function validateDigitEligibility(
  digits: number[],
  contractType: string,
  barrier: number,
): { eligible: boolean; reason: string; dominantDigits: number[] } {
  if (digits.length < 10) {
    return { eligible: false, reason: 'Need 10+ ticks for analysis', dominantDigits: [] };
  }

  const len = digits.length;
  const freq = digitFrequency(digits);

  if (contractType === 'DIGITOVER') {
    const aboveDigits = digits.filter(d => d > barrier);
    const abovePct = (aboveDigits.length / len) * 100;
    const dominantAbove = freq
      .map((c, i) => ({ digit: i, count: c }))
      .filter(d => d.digit > barrier)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(d => d.digit);

    if (abovePct < 40) {
      return { eligible: false, reason: `Over ${barrier} only ${abovePct.toFixed(1)}% — need 40%+`, dominantDigits: dominantAbove };
    }
    return { eligible: true, reason: `Over ${barrier} at ${abovePct.toFixed(1)}% ✓`, dominantDigits: dominantAbove };
  }

  if (contractType === 'DIGITUNDER') {
    const belowDigits = digits.filter(d => d < barrier);
    const belowPct = (belowDigits.length / len) * 100;
    const dominantBelow = freq
      .map((c, i) => ({ digit: i, count: c }))
      .filter(d => d.digit < barrier)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(d => d.digit);

    if (belowPct < 40) {
      return { eligible: false, reason: `Under ${barrier} only ${belowPct.toFixed(1)}% — need 40%+`, dominantDigits: dominantBelow };
    }
    return { eligible: true, reason: `Under ${barrier} at ${belowPct.toFixed(1)}% ✓`, dominantDigits: dominantBelow };
  }

  if (contractType === 'DIGITEVEN') {
    const evenCount = digits.filter(d => d % 2 === 0).length;
    const evenPct = (evenCount / len) * 100;
    if (evenPct < 48) {
      return { eligible: false, reason: `Even at ${evenPct.toFixed(1)}% — weak`, dominantDigits: [0, 2, 4, 6, 8] };
    }
    return { eligible: true, reason: `Even at ${evenPct.toFixed(1)}% ✓`, dominantDigits: [0, 2, 4, 6, 8] };
  }

  if (contractType === 'DIGITODD') {
    const oddCount = digits.filter(d => d % 2 !== 0).length;
    const oddPct = (oddCount / len) * 100;
    if (oddPct < 48) {
      return { eligible: false, reason: `Odd at ${oddPct.toFixed(1)}% — weak`, dominantDigits: [1, 3, 5, 7, 9] };
    }
    return { eligible: true, reason: `Odd at ${oddPct.toFixed(1)}% ✓`, dominantDigits: [1, 3, 5, 7, 9] };
  }

  return { eligible: true, reason: 'No digit validation needed', dominantDigits: [] };
}

/**
 * Recovery state for martingale with max 5 recovery runs.
 */
export interface RecoveryState {
  inRecovery: boolean;
  lastWasLoss: boolean;
  baseStake: number;
  recoveryStake: number;
  currentStake: number;
  consecutiveLosses: number;
  maxRecovery: number;
  exhausted: boolean;
}

export function createRecoveryState(baseStake: number, recoveryStake: number, maxRecovery: number = 5): RecoveryState {
  return {
    inRecovery: false,
    lastWasLoss: false,
    baseStake,
    recoveryStake,
    currentStake: baseStake,
    consecutiveLosses: 0,
    maxRecovery,
    exhausted: false,
  };
}

export function getRecoveryAction(
  state: RecoveryState,
  multiplier: number,
  lastResult: 'won' | 'lost' | null,
): { barrier: string; nextStake: number; newState: RecoveryState } {
  const newState = { ...state };

  if (lastResult === 'lost') {
    newState.inRecovery = true;
    newState.lastWasLoss = true;
    newState.consecutiveLosses = state.consecutiveLosses + 1;
    newState.currentStake = state.consecutiveLosses === 0 
      ? state.recoveryStake 
      : state.currentStake * multiplier;
    
    if (newState.consecutiveLosses >= state.maxRecovery) {
      newState.exhausted = true;
      console.log(`[Martingale] EXHAUSTED — ${state.maxRecovery} recovery attempts failed`);
    } else {
      console.log(`[Martingale] LOSS ${newState.consecutiveLosses}/${state.maxRecovery} → stake ${newState.currentStake.toFixed(2)}`);
    }
  } else if (lastResult === 'won') {
    newState.currentStake = state.baseStake;
    newState.lastWasLoss = false;
    newState.inRecovery = false;
    newState.consecutiveLosses = 0;
    newState.exhausted = false;
    console.log(`[Martingale] WIN → stake reset to base ${newState.currentStake.toFixed(2)}`);
  }

  const barrier = newState.inRecovery ? '3' : '1';

  return {
    barrier,
    nextStake: newState.currentStake,
    newState,
  };
}

/**
 * Check if conditions still valid for auto-stop.
 */
export function checkConditionsStillValid(
  signal: MarketSignal,
  currentDigits: number[],
  originalOddEvenFilter: 'ODD' | 'EVEN' | null,
): { valid: boolean; reason: string } {
  const len = currentDigits.length || 1;
  const freq = digitFrequency(currentDigits);
  const rankings = [];
  for (let i = 0; i <= 9; i++) {
    rankings.push({ digit: i, count: freq[i] });
  }
  rankings.sort((a, b) => b.count - a.count);
  const most = rankings[0];
  const least = rankings[rankings.length - 1];

  // Check if original entry conditions still hold
  if (signal.entryDirection === 'OVER') {
    if (most.count <= 4 || least.count <= 4) {
      return { valid: false, reason: `OVER conditions lost: most=${most.count}, least=${least.count}` };
    }
  } else if (signal.entryDirection === 'UNDER') {
    if (most.count >= 5 || least.count >= 8) {
      return { valid: false, reason: `UNDER conditions lost: most=${most.count}, least=${least.count}` };
    }
  }

  // Check odd/even shift
  if (originalOddEvenFilter) {
    const evenCount = currentDigits.filter(d => d % 2 === 0).length;
    const oddCount = len - evenCount;
    const currentFilter = oddCount > evenCount ? 'ODD' : 'EVEN';
    if (currentFilter !== originalOddEvenFilter) {
      return { valid: false, reason: `Parity shifted: was ${originalOddEvenFilter}, now ${currentFilter}` };
    }
  }

  return { valid: true, reason: 'Conditions still valid' };
}
