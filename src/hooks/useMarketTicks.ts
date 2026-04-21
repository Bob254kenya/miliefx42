import { useState, useEffect, useRef, useCallback } from 'react';
import { derivApi, type MarketSymbol } from '@/services/deriv-api';
import { getLastDigit } from '@/services/analysis';

interface TickState {
  prices: number[];
  digits: number[];
  lastPrice: number;
  lastDigit: number;
  lastEpoch: number;
  isSubscribed: boolean;
}

export function useMarketTicks(symbol: MarketSymbol, maxTicks: number = 100) {
  const [state, setState] = useState<TickState>({
    prices: [],
    digits: [],
    lastPrice: 0,
    lastDigit: 0,
    lastEpoch: 0,
    isSubscribed: false,
  });
  const subscribedRef = useRef(false);

  const subscribe = useCallback(async () => {
    if (subscribedRef.current || !derivApi.isConnected) return;
    subscribedRef.current = true;

    try {
      // Get history first
      const history = await derivApi.getTickHistory(symbol, maxTicks);
      const prices = history.history.prices;
      const digits = prices.map(getLastDigit);
      
      setState({
        prices,
        digits,
        lastPrice: prices[prices.length - 1] || 0,
        lastDigit: digits[digits.length - 1] || 0,
        lastEpoch: Date.now() / 1000,
        isSubscribed: true,
      });

      // Subscribe to live ticks
      await derivApi.subscribeTicks(symbol, (data) => {
        if (data.tick) {
          const price = data.tick.quote;
          // FIX: getLastDigit returns 0-9; no truthy guard needed
          const digit = getLastDigit(price);

          setState(prev => {
            const newPrices = [...prev.prices, price].slice(-maxTicks);
            const newDigits = [...prev.digits, digit].slice(-maxTicks);
            return {
              prices: newPrices,
              digits: newDigits,
              lastPrice: price,
              lastDigit: digit,
              lastEpoch: data.tick.epoch,
              isSubscribed: true,
            };
          });
        }
      });
    } catch (err) {
      console.error(`Failed to subscribe to ${symbol}:`, err);
      subscribedRef.current = false;
    }
  }, [symbol, maxTicks]);

  const unsubscribe = useCallback(async () => {
    if (!subscribedRef.current) return;
    subscribedRef.current = false;
    await derivApi.unsubscribeTicks(symbol);
    setState(prev => ({ ...prev, isSubscribed: false }));
  }, [symbol]);

  useEffect(() => {
    subscribe();
    return () => { unsubscribe(); };
  }, [subscribe, unsubscribe]);

  return { ...state, subscribe, unsubscribe };
}
