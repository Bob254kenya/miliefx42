/**
 * Hook to fetch 1000 historical ticks on mount and maintain live updates.
 * Digit 0 is ALWAYS counted — uses defensive getLastDigit.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { derivApi, type MarketSymbol } from '@/services/deriv-api';
import { getLastDigit } from '@/services/analysis';

interface TickLoaderState {
  digits: number[];
  prices: number[];
  isLoading: boolean;
  error: string | null;
  tickCount: number;
}

export function useTickLoader(symbol: MarketSymbol, maxTicks: number = 1000) {
  const [state, setState] = useState<TickLoaderState>({
    digits: [],
    prices: [],
    isLoading: true,
    error: null,
    tickCount: 0,
  });
  const mountedRef = useRef(true);
  const subscribedRef = useRef(false);

  const loadHistory = useCallback(async () => {
    if (!derivApi.isConnected) {
      setState(prev => ({ ...prev, isLoading: false, error: 'Not connected' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const history = await derivApi.getTickHistory(symbol, maxTicks);
      const prices = history.history.prices || [];
      const digits = prices.map(getLastDigit);

      if (mountedRef.current) {
        setState({
          prices,
          digits,
          isLoading: false,
          error: null,
          tickCount: prices.length,
        });
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: err.message || 'Failed to fetch ticks',
        }));
      }
    }
  }, [symbol, maxTicks]);

  // Live tick subscription
  useEffect(() => {
    mountedRef.current = true;

    loadHistory();

    if (!derivApi.isConnected) return;

    const handler = (data: any) => {
      if (!data.tick || data.tick.symbol !== symbol || !mountedRef.current) return;
      const price = data.tick.quote;
      const digit = getLastDigit(price);

      setState(prev => {
        const newPrices = [...prev.prices, price].slice(-maxTicks);
        const newDigits = [...prev.digits, digit].slice(-maxTicks);
        return {
          ...prev,
          prices: newPrices,
          digits: newDigits,
          tickCount: newPrices.length,
        };
      });
    };

    const unsub = derivApi.onMessage(handler);
    if (!subscribedRef.current) {
      subscribedRef.current = true;
      derivApi.subscribeTicks(symbol, () => {}).catch(console.error);
    }

    return () => {
      mountedRef.current = false;
      unsub();
      subscribedRef.current = false;
    };
  }, [symbol, maxTicks, loadHistory]);

  return state;
}
