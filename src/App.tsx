import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CurrencyProvider } from '@/context/CurrencyContext';
import AuthScreen from '@/components/AuthScreen';
import Dashboard from '@/components/Dashboard';
import { Loader2 } from 'lucide-react';

type View = 'dashboard' | 'bills' | 'calendar' | 'settings';

function AppContent() {
  const { session, loading } = useAuth();
  const [view, setView] = useState<View>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  return (
    <CurrencyProvider>
      <Dashboard view={view} setView={setView} />
    </CurrencyProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
