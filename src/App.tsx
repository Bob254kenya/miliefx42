import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import bgHero from '@/assets/bg-hero.jpeg';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginPage from "@/components/LoginPage";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Markets from "@/pages/Markets";
import Analyzer from "@/pages/Analyzer";
import AutoTrade from "@/pages/AutoTrade";
import BotsPage from "@/pages/BotsPage";
import SmartBotPage from "@/pages/SmartBotPage";
import AdvancedRamzBot from "@/pages/AdvancedRamzBot";
import ProScannerBot from "@/pages/ProScannerBot";
import TradingChart from "@/pages/TradingChart";
import TradeHistory from "@/pages/TradeHistory";
import SettingsPage from "@/pages/SettingsPage";
import CopyTradingManager from "@/pages/CopyTradingManager";
import FreeBots from "@/pages/FreeBots";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAuthorized, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={bgHero} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
        </div>
        <motion.div
          className="text-center flex flex-col items-center gap-6 relative z-10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Animated rings */}
          <div className="relative w-24 h-24">
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary/20"
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute inset-2 rounded-full border-2 border-primary/30"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-primary border-r-primary/50"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute inset-3 rounded-full border-[2px] border-transparent border-b-primary/70 border-l-primary/30"
              animate={{ rotate: -360 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
            />
            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Activity className="w-8 h-8 text-primary" />
              </motion.div>
            </div>
          </div>

          {/* Welcome text */}
          <div className="space-y-2">
            <motion.h1
              className="text-2xl font-bold text-foreground tracking-tight"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              WELCOME TO {' '}
              <span className="text-primary">MILLIEFX.SITE</span>
            </motion.h1>
            <motion.div
              className="flex items-center justify-center gap-2 text-muted-foreground text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Precision is Power. Profit is the Result.🔥💥
              </motion.span>
              <motion.span
                className="flex gap-0.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                {[0, 1, 2].map(i => (
                  <motion.span
                    key={i}
                    className="w-1 h-1 rounded-full bg-primary"
                    animate={{ opacity: [0, 1, 0], y: [0, -4, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </motion.span>
            </motion.div>
          </div>

          {/* Progress bar */}
          <motion.div
            className="w-48 h-1 rounded-full bg-border overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
            />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<ProScannerBot />} />
        <Route path="/pro-bot" element={<ProScannerBot />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/markets" element={<Markets />} />
        <Route path="/analyzer" element={<Analyzer />} />
        <Route path="/auto-trade" element={<AutoTrade />} />
        <Route path="/bots" element={<BotsPage />} />
        <Route path="/smart-bot" element={<SmartBotPage />} />
        <Route path="/ramz-bot" element={<AdvancedRamzBot />} />
        <Route path="/chart" element={<TradingChart />} />
        <Route path="/history" element={<TradeHistory />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/copy-trading" element={<CopyTradingManager />} />
        <Route path="/free-bots" element={<FreeBots />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
