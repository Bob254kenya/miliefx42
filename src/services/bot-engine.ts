/**
 * Bot Engine — Strategy logic for all 5 automated bots.
 * DEFENSIVE: digit 0 is NEVER ignored. All comparisons use strict numeric operators.
 * MARTINGALE: LOSS → multiply, WIN → reset (STANDARD martingale).
 */

import { getLastDigit } from './analysis';

export interface BotDecision {
  shouldTrade: boolean;
  contractType: string;
  barrier?: string;
  reason: string;
}

export interface BotConfig {
  stake: number;
  martingale: boolean;
  multiplier: number;
  maxRecovery: number;
  stopLoss: number;
  takeProfit: number;
}

// ─── Shared Helpers ───

/** Check if same digit repeats N times consecutively at the end */
export function hasConsecutiveRepeat(digits: number[], times: number): boolean {
  if (digits.length < times) return false;
  const tail = digits.slice(-times);
  // digit 0 is valid — strict equality
  return tail.every(d => d === tail[0]);
}

/** Compute tick momentum: count of increasing ticks in last N */
export function tickMomentum(prices: number[], window: number = 5): { rising: number; falling: number } {
  if (prices.length < window) return { rising: 0, falling: 0 };
  const slice = prices.slice(-window);
  let rising = 0, falling = 0;
  for (let i = 1; i < slice.length; i++) {
    if (slice[i] > slice[i - 1]) rising++;
    else if (slice[i] < slice[i - 1]) falling++;
  }
  return { rising, falling };
}

/**
 * Compute digit frequency from array of digits.
 * Explicitly iterates 0-9. Digit 0 is always counted.
 */
export function digitFrequency(digits: number[]): number[] {
  const freq = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // explicit 10 slots
  for (let i = 0; i < digits.length; i++) {
    const d = digits[i];
    if (d !== undefined && d !== null && !Number.isNaN(d) && d >= 0 && d <= 9) {
      freq[d]++;
      if (d === 0) {
        console.log('[digitFrequency] Digit 0 counted. Current freq[0]:', freq[0]);
      }
    }
  }
  return freq;
}

/** Detect if spread is choppy */
export function isChoppy(prices: number[], window: number = 10): boolean {
  if (prices.length < window) return false;
  const slice = prices.slice(-window);
  let changes = 0;
  for (let i = 2; i < slice.length; i++) {
    const prev = slice[i - 1] - slice[i - 2];
    const curr = slice[i] - slice[i - 1];
    if ((prev > 0 && curr < 0) || (prev < 0 && curr > 0)) changes++;
  }
  return changes / (window - 2) > 0.7;
}

/** AI Confidence Score (0-100) */
export function calculateConfidence(digits: number[], consecutiveLosses: number): number {
  if (digits.length < 10) return 0;

  const freq = digitFrequency(digits);
  const len = digits.length;
  const pcts = freq.map(f => (f / len) * 100);

  const maxDeviation = Math.max(...pcts.map(p => Math.abs(p - 10)));
  const imbalanceScore = Math.min(maxDeviation * 3, 40);

  const mean = 10;
  const variance = pcts.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / 10;
  const stdDev = Math.sqrt(variance);
  const deviationScore = Math.min(stdDev * 5, 30);

  const lossPenalty = Math.min(consecutiveLosses * 10, 30);
  const sampleBonus = Math.min(len / 5, 20);

  const score = Math.max(0, Math.min(100, imbalanceScore + deviationScore + sampleBonus - lossPenalty));
  return Math.round(score);
}

// ─── BOT 1: Over 2 Recovery 5 ───

export function evaluateOver2(digits: number[], prices: number[]): BotDecision {
  if (digits.length < 3) return { shouldTrade: false, contractType: '', reason: 'Need 3+ digits' };

  if (hasConsecutiveRepeat(digits, 4)) {
    return { shouldTrade: false, contractType: '', reason: 'Safety: 4x consecutive repeat' };
  }

  const last3 = digits.slice(-3);
  const allBelow3 = last3.every(d => d >= 0 && d <= 2); // 0, 1, 2

  const len = digits.length;
  const underCount = digits.filter(d => d >= 0 && d <= 2).length;
  const underPct = (underCount / len) * 100;

  const freq = digitFrequency(digits);
  const zeroPct = (freq[0] / len) * 100;
  const zeroSpike = zeroPct > 12;

  if (allBelow3 && underPct > 52 && zeroSpike) {
    return {
      shouldTrade: true,
      contractType: 'DIGITOVER',
      barrier: '2',
      reason: `Last 3 ≤ 2, Under%=${underPct.toFixed(1)}, 0-spike=${zeroPct.toFixed(1)}%`,
    };
  }

  if (allBelow3 && underPct > 52) {
    return {
      shouldTrade: true,
      contractType: 'DIGITOVER',
      barrier: '2',
      reason: `Last 3 ≤ 2, Under%=${underPct.toFixed(1)}%`,
    };
  }

  return { shouldTrade: false, contractType: '', reason: 'Conditions not met' };
}

// ─── BOT 2: Under 6 Recovery 4 ───

export function evaluateUnder6(digits: number[], prices: number[]): BotDecision {
  if (digits.length < 3) return { shouldTrade: false, contractType: '', reason: 'Need 3+ digits' };

  const last3 = digits.slice(-3);
  const allAbove6 = last3.every(d => d >= 7 && d <= 9);

  const len = digits.length;
  const overCount = digits.filter(d => d >= 7).length;
  const overPct = (overCount / len) * 100;

  if (allAbove6 && overPct > 52) {
    return {
      shouldTrade: true,
      contractType: 'DIGITUNDER',
      barrier: '6',
      reason: `Last 3 ≥ 7, Over%=${overPct.toFixed(1)}%`,
    };
  }

  return { shouldTrade: false, contractType: '', reason: 'Conditions not met' };
}

// ─── BOT 3: Even/Odd ───

export function evaluateEvenOdd(digits: number[]): BotDecision {
  if (digits.length < 20) return { shouldTrade: false, contractType: '', reason: 'Need 20+ digits' };

  const analysisDigits = digits.slice(-100);
  const len = analysisDigits.length;
  // 0 is EVEN (0 % 2 === 0)
  const evenCount = analysisDigits.filter(d => d % 2 === 0).length;
  const evenPct = (evenCount / len) * 100;
  const oddPct = 100 - evenPct;

  const last4 = digits.slice(-4);
  const last4AllEven = last4.every(d => d % 2 === 0);
  const last4AllOdd = last4.every(d => d % 2 !== 0);

  if (evenPct > 53 && last4AllEven) {
    return {
      shouldTrade: true,
      contractType: 'DIGITODD',
      reason: `Even=${evenPct.toFixed(1)}% + 4 consecutive even → Trade Odd`,
    };
  }

  if (oddPct > 53 && last4AllOdd) {
    return {
      shouldTrade: true,
      contractType: 'DIGITEVEN',
      reason: `Odd=${oddPct.toFixed(1)}% + 4 consecutive odd → Trade Even`,
    };
  }

  return { shouldTrade: false, contractType: '', reason: 'Conditions not met' };
}

// ─── BOT 4: Matches/Differs ───

export function evaluateMatchesDiffers(digits: number[]): BotDecision {
  if (digits.length < 20) return { shouldTrade: false, contractType: '', reason: 'Need 20+ digits' };

  const freq = digitFrequency(digits);
  const len = digits.length;
  const pcts = freq.map(f => (f / len) * 100);

  const maxPct = Math.max(...pcts);
  const dominantDigit = pcts.indexOf(maxPct);

  if (hasConsecutiveRepeat(digits, 3)) {
    return { shouldTrade: false, contractType: '', reason: 'Safety: 3x consecutive repeat' };
  }

  if (maxPct > 18) {
    return {
      shouldTrade: true,
      contractType: 'DIGITDIFF',
      barrier: String(dominantDigit),
      reason: `Digit ${dominantDigit} at ${maxPct.toFixed(1)}% > 18% → Trade Differs`,
    };
  }

  return { shouldTrade: false, contractType: '', reason: 'No dominant digit (>18%)' };
}

// ─── BOT 5: Rise/Fall ───

export function evaluateRiseFall(prices: number[]): BotDecision {
  if (prices.length < 5) return { shouldTrade: false, contractType: '', reason: 'Need 5+ prices' };

  if (isChoppy(prices, 10)) {
    return { shouldTrade: false, contractType: '', reason: 'Choppy market — skipping' };
  }

  const { rising, falling } = tickMomentum(prices, 5);

  if (rising >= 4) {
    return {
      shouldTrade: true,
      contractType: 'CALL',
      reason: `4/5 ticks rising → Enter Fall (mean reversion)`,
    };
  }

  if (falling >= 4) {
    return {
      shouldTrade: true,
      contractType: 'PUT',
      reason: `4/5 ticks falling → Enter Rise (mean reversion)`,
    };
  }

  return { shouldTrade: false, contractType: '', reason: 'No clear momentum' };
}
