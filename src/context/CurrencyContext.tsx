import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { formatCurrency as formatCurrencyUtil, getCurrencySymbol } from '@/types';

interface CurrencyContextType {
  currency: string;
  setCurrency: (code: string) => Promise<void>;
  formatCurrency: (amount: number) => string;
  symbol: string;
  loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currency, setCurrencyState] = useState('ZAR');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCurrencyState('ZAR');
      setLoading(false);
      return;
    }

    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from('user_settings')
        .select('currency')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setCurrencyState(data.currency);
      } else {
        const { error } = await supabase
          .from('user_settings')
          .insert({ user_id: user.id, currency: 'ZAR' });
        if (!error) setCurrencyState('ZAR');
      }
      setLoading(false);
    })();
  }, [user]);

  const setCurrency = async (code: string) => {
    if (!user) return;
    setCurrencyState(code);
    const { data } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      await supabase.from('user_settings').update({ currency: code }).eq('id', data.id);
    } else {
      await supabase.from('user_settings').insert({ user_id: user.id, currency: code });
    }
  };

  const formatCurrency = (amount: number) => formatCurrencyUtil(amount, currency);
  const symbol = getCurrencySymbol(currency);

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency, formatCurrency, symbol, loading }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
