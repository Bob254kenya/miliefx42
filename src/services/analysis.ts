/**
 * Technical analysis utility functions.
 * DEFENSIVE PROGRAMMING: digit 0 is NEVER ignored.
 * All checks use explicit numeric comparisons — no truthy/falsy evaluation.
 */

/**
 * Extract the last digit from a tick price.
 * Converts to string, removes decimal, takes last character.
 * Digit 0 is a valid result.
 */
export function getLastDigit(price: number): number {
  if (price === null || price === undefined || Number.isNaN(price)) {
    console.error('[getLastDigit] Invalid price:', price);
    return 0;
  }
  // Deriv digit extraction: toFixed(2) then last character
  const fixedStr = parseFloat(String(price)).toFixed(2);
  const lastChar = fixedStr.slice(-1);
  const digit = parseInt(lastChar, 10);

  if (Number.isNaN(digit) || digit < 0 || digit > 9) {
    console.error('[getLastDigit] Failed extraction from price:', price, '→ raw:', lastChar);
    return 0;
  }

  return digit;
}

/**
 * Analyze digit frequency across a set of prices.
 * Digit 0 is explicitly counted.
 */
export function analyzeDigits(prices: number[]): {
  frequency: number[];
  mostCommon: number;
  leastCommon: number;
  percentages: number[];
} {
  const frequency = new Array(10).fill(0);

  for (let i = 0; i < prices.length; i++) {
    const digit = getLastDigit(prices[i]);
    frequency[digit]++;
  }

  const total = prices.length || 1;
  const percentages = frequency.map(f => (f / total) * 100);

  const mostCommon = frequency.indexOf(Math.max(...frequency));
  const leastCommon = frequency.indexOf(Math.min(...frequency));

  return { frequency, mostCommon, leastCommon, percentages };
}

/**
 * Generate trading signals from recent price data.
 *
 * Over X  = digit > X (strict)
 * Under X = digit < X (strict)
 * Even includes 0, 2, 4, 6, 8
 * Odd includes 1, 3, 5, 7, 9
 */
export function generateSignals(prices: number[]): {
  overUnder: { type: string; strength: 'Weak' | 'Moderate' | 'Strong'; direction: string };
  evenOdd: { type: string; strength: 'Weak' | 'Moderate' | 'Strong'; direction: string };
  matchesDiffers: { type: string; strength: 'Weak' | 'Moderate' | 'Strong'; direction: string };
} {
  const recentDigits = prices.slice(-20).map(getLastDigit);
  const len = recentDigits.length || 1;

  // Over/Under: digit > 4 is "Over", digit < 5 is "Under"
  const overCount = recentDigits.filter(d => d > 4).length;
  const overRatio = overCount / len;

  const overStrength: 'Weak' | 'Moderate' | 'Strong' =
    Math.abs(overRatio - 0.5) > 0.2 ? 'Strong' :
    Math.abs(overRatio - 0.5) > 0.1 ? 'Moderate' : 'Weak';

  // Even/Odd — 0 is EVEN
  const evenCount = recentDigits.filter(d => d % 2 === 0).length;
  const evenRatio = evenCount / len;

  const evenStrength: 'Weak' | 'Moderate' | 'Strong' =
    Math.abs(evenRatio - 0.5) > 0.2 ? 'Strong' :
    Math.abs(evenRatio - 0.5) > 0.1 ? 'Moderate' : 'Weak';

  // Matches/Differs — consecutive digit equality (strict ===)
  const matches = recentDigits.slice(1).filter((d, i) => d === recentDigits[i]).length;
  const matchRatio = matches / (len - 1 || 1);

  const matchStrength: 'Weak' | 'Moderate' | 'Strong' =
    matchRatio > 0.2 ? 'Strong' : matchRatio > 0.1 ? 'Moderate' : 'Weak';

  return {
    overUnder: {
      type: 'Over/Under',
      strength: overStrength,
      direction: overRatio > 0.5 ? 'Over' : 'Under',
    },
    evenOdd: {
      type: 'Even/Odd',
      strength: evenStrength,
      direction: evenRatio > 0.5 ? 'Even' : 'Odd',
    },
    matchesDiffers: {
      type: 'Match/Differ',
      strength: matchStrength,
      direction: matchRatio > 0.15 ? 'Matches' : 'Differs',
    },
  };
}

// ─── Technical Indicators ───

export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

export function calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12 - ema26;
  const signal = macd * 0.8;
  const histogram = macd - signal;
  return { macd, signal, histogram };
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

export function calculateMA(prices: number[], period: number = 20): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function calculateBollingerBands(prices: number[], period: number = 20): {
  upper: number; middle: number; lower: number;
} {
  const ma = calculateMA(prices, period);
  const slice = prices.slice(-period);
  const variance = slice.reduce((sum, p) => sum + Math.pow(p - ma, 2), 0) / period;
  const std = Math.sqrt(variance);
  return {
    upper: ma + 2 * std,
    middle: ma,
    lower: ma - 2 * std,
  };
}
