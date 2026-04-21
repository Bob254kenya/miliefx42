import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { derivApi, type MarketSymbol } from '@/services/deriv-api';
import { copyTradingService } from '@/services/copy-trading-service';
import { getLastDigit } from '@/services/analysis';
import { useAuth } from '@/contexts/AuthContext';
import { useLossRequirement } from '@/hooks/useLossRequirement';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Play, StopCircle, Trash2, Scan,
  Home, RefreshCw, Shield, Zap, Eye, Anchor, Download, Upload, X, Users,
  MessageCircle, MessageSquare, Youtube, Instagram, Music, BarChart3, Activity, TrendingUp, TrendingDown, Target, Volume2, VolumeX, LineChart, Wifi, WifiOff, Trophy, ShieldAlert, GripVertical
} from 'lucide-react';
import ConfigPreview, { type BotConfig } from '@/components/bot-config/ConfigPreview';

// ============================================
// SOCIAL NOTIFICATION POPUP - CENTERED WITH TOP PADDING
// ============================================

// Animation Styles
const notificationStyles = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes slideOutUp {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-30px) scale(0.95);
  }
}

@keyframes slideUpCenter {
  from {
    opacity: 0;
    transform: translateY(40px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes slideDownCenter {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(40px) scale(0.9);
  }
}

@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes float {
  0% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-8px) rotate(2deg); }
  100% { transform: translateY(0px) rotate(0deg); }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.3); }
  50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.6); }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
.animate-slide-in-down { animation: slideInDown 0.4s cubic-bezier(0.34, 1.2, 0.64, 1) forwards; }
.animate-slide-out-up { animation: slideOutUp 0.3s ease-out forwards; }
.animate-slide-up-center { animation: slideUpCenter 0.4s cubic-bezier(0.34, 1.2, 0.64, 1) forwards; }
.animate-slide-down-center { animation: slideDownCenter 0.3s ease-out forwards; }
.animate-gradient { background-size: 200% 200%; animation: gradientShift 3s ease infinite; }
.animate-float { animation: float 3s ease-in-out infinite; }
.animate-bounce { animation: bounce 0.4s ease-in-out 2; }
.animate-pulse-slow { animation: pulse 1s ease-in-out infinite; }
.animate-shimmer { animation: shimmer 2s infinite; }
.animate-glow-pulse { animation: glowPulse 1.5s ease-in-out infinite; }
.animate-spin-slow { animation: spin 1s linear infinite; }
`;

// Helper function to show notification (TP/SL)
export const showTPNotification = (type: 'tp' | 'sl', message: string, amount?: number) => {
  if (typeof window !== 'undefined' && (window as any).showTPNotification) {
    (window as any).showTPNotification(type, message, amount);
  }
};

// Social Notification Component - Centered with 100px top padding
const SocialNotificationPopup = ({ onClose }: { onClose: () => void }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleMaybeLater = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const socialLinks = [
    {
      name: 'WhatsApp',
      url: 'https://+2544942149',
      icon: <MessageCircle className="w-4 h-4" />,
      color: 'hover:text-[#25D366]',
      bgGradient: 'from-green-500/20 to-green-600/20',
    },
    {
      name: 'Telegram Group',
      url: 'https://t.me/+YDUwvuuVDYg5NjE0',
      icon: <MessageSquare className="w-4 h-4" />,
      color: 'hover:text-[#26A5E4]',
      bgGradient: 'from-blue-500/20 to-blue-600/20',
    },
    {
      name: 'Facebook Channel',
      url: 'https://www.facebook.com/profile.php?id=61573399294689',
      icon: <MessageSquare className="w-4 h-4" />,
      color: 'hover:text-[#26A5E4]',
      bgGradient: 'from-blue-500/20 to-blue-600/20',
    },
    {
      name: 'YouTube',
      url: 'https://youtube.com/@millicentalice-sc6kz?si=TRpxu_Eji8k2q98K',
      icon: <Youtube className="w-4 h-4" />,
      color: 'hover:text-[#FF0000]',
      bgGradient: 'from-red-500/20 to-red-600/20',
    },
    {
      name: 'TikTok',
      url: 'https://www.tiktok.com/@aliceousmillie?_t=ZM-90rqIhv3NY8&_r=1',
      icon: <Music className="w-4 h-4" />,
      color: 'hover:text-foreground',
      bgGradient: 'from-gray-500/20 to-gray-600/20',
    },
    {
      name: 'Instagram',
      url: ' https://www.instagram.com/aliceousmilliie?igsh=ZHJrZXFtdGViendx',
      icon: <Instagram className="w-4 h-4" />,
      color: 'hover:text-[#E4405F]',
      bgGradient: 'from-pink-500/20 to-pink-600/20',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pointer-events-none" style={{ paddingTop: '100px' }}>
      <div 
        className={`
          pointer-events-auto w-[380px] max-w-[90vw] rounded-2xl shadow-2xl overflow-hidden
          ${isExiting ? 'animate-slide-out-up' : 'animate-slide-in-down'}
        `}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 animate-gradient" />
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute text-white/15 text-2xl animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${5 + Math.random() * 5}s`,
              }}
            >
              {i % 3 === 0 ? '💰' : i % 3 === 1 ? '📈' : '🚀'}
            </div>
          ))}
        </div>
        
        <div className="relative z-10 flex flex-col">
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 p-1 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all duration-200 backdrop-blur-sm z-20"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Join Our Trading Community</h2>
                <p className="text-[10px] text-white/80">Connect & Grow Together</p>
              </div>
            </div>
            
            <p className="text-[11px] text-white/80 mb-3">
              Connect with fellow traders! Share experiences, strategies, and get updates on new features.
            </p>
            
            <div className="grid grid-cols-2 gap-2 mb-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleClose}
                  className={`
                    flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/15 backdrop-blur-sm
                    border border-white/30 text-white transition-all duration-300
                    hover:scale-105 hover:bg-white/25 ${social.color}
                  `}
                >
                  <div className={`p-1 rounded-lg bg-gradient-to-r ${social.bgGradient}`}>
                    {social.icon}
                  </div>
                  <span className="text-[9px] font-medium truncate">{social.name}</span>
                </a>
              ))}
            </div>
            
            <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-2 mb-3">
              <p className="text-[8px] text-blue-100 text-center">
                📢 Get access to strategies, bots and guides sent earlier on our channels
              </p>
            </div>
          </div>
          
          <div className="p-3 pt-0 flex gap-2">
            <button
              onClick={handleClose}
              className="flex-1 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-semibold transition-all duration-200 backdrop-blur-sm border border-white/30"
            >
              NO THANKS
            </button>
            <button
              onClick={handleMaybeLater}
              className="flex-1 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-[11px] font-semibold transition-all duration-200 shadow-lg"
            >
              MAYBE LATER
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// TP/SL Notification Component (stays centered)
const TPSLNotificationPopup = () => {
  const [notification, setNotification] = useState<{ type: 'tp' | 'sl'; message: string; amount?: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    (window as any).showTPNotification = (type: 'tp' | 'sl', message: string, amount?: number) => {
      setNotification({ type, message, amount });
      setIsVisible(true);
      setIsExiting(false);
      
      const timeout = setTimeout(() => {
        handleClose();
      }, 8000);
      
      return () => clearTimeout(timeout);
    };
    
    return () => {
      delete (window as any).showTPNotification;
    };
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      setNotification(null);
      setIsExiting(false);
    }, 300);
  };

  if (!isVisible || !notification) return null;

  const isTP = notification.type === 'tp';
  const amount = notification.amount;

  const backgroundIcons = () => {
    const icons = [];
    const iconCount = 12;
    const colors = isTP 
      ? ['#10b981', '#34d399', '#6ee7b7', '#059669']
      : ['#f43f5e', '#fb7185', '#fda4af', '#e11d48'];
    
    for (let i = 0; i < iconCount; i++) {
      const size = 12 + Math.random() * 20;
      const left = Math.random() * 100;
      const delay = Math.random() * 12;
      const duration = 6 + Math.random() * 8;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const icon = isTP ? '💰' : '😢';
      
      icons.push(
        <div
          key={i}
          className="absolute animate-float"
          style={{
            left: `${left}%`,
            bottom: '-30px',
            fontSize: `${size}px`,
            opacity: 0.25,
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
            color: color,
            filter: 'drop-shadow(0 0 2px currentColor)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          {icon}
        </div>
      );
    }
    return icons;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div 
        className={`
          pointer-events-auto w-[350px] h-[350px] rounded-xl shadow-2xl overflow-hidden
          ${isExiting ? 'animate-slide-down-center' : 'animate-slide-up-center'}
        `}
      >
        <div className={`
          relative w-full h-full overflow-hidden
          ${isTP 
            ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' 
            : 'bg-gradient-to-br from-rose-500 to-rose-700'
          }
        `}>
          <div className="absolute inset-0 overflow-hidden">
            {backgroundIcons()}
          </div>
          
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
          
          <div className="relative w-full h-full flex flex-col p-3 z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center text-xl
                ${isTP 
                  ? 'bg-emerald-400/30' 
                  : 'bg-rose-400/30'
                }
                shadow-lg backdrop-blur-sm
                animate-pulse-slow
                flex-shrink-0
              `}>
                {isTP ? '🎉' : '😢'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-sm font-bold text-white truncate`}>
                  {isTP ? 'TAKE PROFIT!' : 'STOP LOSS!'}
                </h3>
                <p className="text-[8px] text-white/70">
                  {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center text-center mb-2">
              <p className="text-white text-xs font-medium leading-tight">
                {notification.message}
              </p>
              {amount && (
                <p className={`text-xl font-bold mt-1 ${isTP ? 'text-emerald-200' : 'text-rose-200'} animate-bounce`}>
                  {isTP ? '+' : '-'}${Math.abs(amount).toFixed(2)}
                </p>
              )}
            </div>
            
            <button
              onClick={handleClose}
              className={`
                w-full py-1.5 rounded-lg font-semibold text-xs transition-all duration-200
                ${isTP 
                  ? 'bg-white/95 text-emerald-600 hover:bg-white hover:scale-[1.02]' 
                  : 'bg-white/95 text-rose-600 hover:bg-white hover:scale-[1.02]'
                }
                transform active:scale-[0.98]
                shadow-lg backdrop-blur-sm
              `}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// DRAGGABLE TRADING CHART POPUP COMPONENT - CENTERED WITH TOP PADDING
// ============================================

const ALL_MARKETS = [
  { symbol: '1HZ10V', name: 'Volatility 10 (1s)', group: 'vol1s' },
  { symbol: '1HZ15V', name: 'Volatility 15 (1s)', group: 'vol1s' },
  { symbol: '1HZ25V', name: 'Volatility 25 (1s)', group: 'vol1s' },
  { symbol: '1HZ30V', name: 'Volatility 30 (1s)', group: 'vol1s' },
  { symbol: '1HZ50V', name: 'Volatility 50 (1s)', group: 'vol1s' },
  { symbol: '1HZ75V', name: 'Volatility 75 (1s)', group: 'vol1s' },
  { symbol: '1HZ100V', name: 'Volatility 100 (1s)', group: 'vol1s' },
  { symbol: 'R_10', name: 'Volatility 10', group: 'vol' },
  { symbol: 'R_25', name: 'Volatility 25', group: 'vol' },
  { symbol: 'R_50', name: 'Volatility 50', group: 'vol' },
  { symbol: 'R_75', name: 'Volatility 75', group: 'vol' },
  { symbol: 'R_100', name: 'Volatility 100', group: 'vol' },
  { symbol: 'JD10', name: 'Jump 10', group: 'jump' },
  { symbol: 'JD25', name: 'Jump 25', group: 'jump' },
  { symbol: 'JD50', name: 'Jump 50', group: 'jump' },
  { symbol: 'JD75', name: 'Jump 75', group: 'jump' },
  { symbol: 'JD100', name: 'Jump 100', group: 'jump' },
  { symbol: 'RDBEAR', name: 'Bear Market', group: 'bear' },
  { symbol: 'RDBULL', name: 'Bull Market', group: 'bull' },
  { symbol: 'stpRNG', name: 'Step Index', group: 'step' },
];

const CONTRACT_TYPES_CHART = [
  { value: 'CALL', label: 'Rise' },
  { value: 'PUT', label: 'Fall' },
  { value: 'DIGITMATCH', label: 'Digits Match' },
  { value: 'DIGITDIFF', label: 'Digits Differs' },
  { value: 'DIGITEVEN', label: 'Digits Even' },
  { value: 'DIGITODD', label: 'Digits Odd' },
  { value: 'DIGITOVER', label: 'Digits Over' },
  { value: 'DIGITUNDER', label: 'Digits Under' },
];

// Global tick storage for chart
const chartTickHistory: { [symbol: string]: number[] } = {};
const chartTickPrices: { [symbol: string]: number[] } = {};
const chartTickCallbacks: { [symbol: string]: (() => void)[] } = [];

function getChartTickHistory(symbol: string): number[] {
  return chartTickHistory[symbol] || [];
}

function getChartTickPrices(symbol: string): number[] {
  return chartTickPrices[symbol] || [];
}

function addChartTick(symbol: string, digit: number, price: number) {
  if (!chartTickHistory[symbol]) chartTickHistory[symbol] = [];
  if (!chartTickPrices[symbol]) chartTickPrices[symbol] = [];
  
  chartTickHistory[symbol].push(digit);
  chartTickPrices[symbol].push(price);
  
  if (chartTickHistory[symbol].length > 2000) chartTickHistory[symbol].shift();
  if (chartTickPrices[symbol].length > 2000) chartTickPrices[symbol].shift();
  
  if (chartTickCallbacks[symbol]) {
    chartTickCallbacks[symbol].forEach(cb => cb());
  }
}

function subscribeToChartTicks(symbol: string, callback: () => void) {
  if (!chartTickCallbacks[symbol]) chartTickCallbacks[symbol] = [];
  chartTickCallbacks[symbol].push(callback);
  return () => {
    chartTickCallbacks[symbol] = chartTickCallbacks[symbol].filter(cb => cb !== callback);
  };
}

function calculateChartDigitStats(symbol: string, tickRange: number) {
  const ticks = getChartTickHistory(symbol);
  const tickPricesData = getChartTickPrices(symbol);
  const recentTicks = ticks.slice(-tickRange);
  
  const frequency: Record<number, number> = {};
  for (let i = 0; i <= 9; i++) frequency[i] = 0;
  
  for (const digit of recentTicks) {
    frequency[digit] = (frequency[digit] || 0) + 1;
  }
  
  const percentages: Record<number, number> = {};
  for (let i = 0; i <= 9; i++) {
    percentages[i] = recentTicks.length > 0 ? (frequency[i] / recentTicks.length) * 100 : 0;
  }
  
  let mostCommon = 0;
  let leastCommon = 0;
  let secondMost = 0;
  let maxFreq = 0;
  let secondMaxFreq = 0;
  let minFreq = Infinity;
  
  for (let i = 0; i <= 9; i++) {
    if (frequency[i] > maxFreq) {
      secondMaxFreq = maxFreq;
      secondMost = mostCommon;
      maxFreq = frequency[i];
      mostCommon = i;
    } else if (frequency[i] > secondMaxFreq) {
      secondMaxFreq = frequency[i];
      secondMost = i;
    }
    if (frequency[i] < minFreq) {
      minFreq = frequency[i];
      leastCommon = i;
    }
  }
  
  const evenCount = recentTicks.filter(d => d % 2 === 0).length;
  const oddCount = recentTicks.length - evenCount;
  const overCount = recentTicks.filter(d => d > 4).length;
  const underCount = recentTicks.length - overCount;
  const over3Count = recentTicks.filter(d => d > 2).length;
  const under6Count = recentTicks.filter(d => d < 6).length;
  const last26Digits = ticks.slice(-26);
  const last26Prices = tickPricesData.slice(-26);
  
  return {
    frequency,
    percentages,
    mostCommon,
    secondMost,
    leastCommon,
    totalTicks: recentTicks.length,
    evenPercentage: recentTicks.length > 0 ? (evenCount / recentTicks.length * 100) : 50,
    oddPercentage: recentTicks.length > 0 ? (oddCount / recentTicks.length * 100) : 50,
    overPercentage: recentTicks.length > 0 ? (overCount / recentTicks.length * 100) : 50,
    underPercentage: recentTicks.length > 0 ? (underCount / recentTicks.length * 100) : 50,
    over3Percentage: recentTicks.length > 0 ? (over3Count / recentTicks.length * 100) : 50,
    under6Percentage: recentTicks.length > 0 ? (under6Count / recentTicks.length * 100) : 50,
    last26Digits,
    tickPrices: last26Prices,
  };
}

// Draggable Trading Chart Popup Component
const TradingChartPopup = ({ onClose, isRunning }: { onClose: () => void; isRunning: boolean }) => {
  const [symbol, setSymbol] = useState('R_100');
  const [selectedContractType, setSelectedContractType] = useState('CALL');
  const [selectedPrediction, setSelectedPrediction] = useState('5');
  const [tickRange, setTickRange] = useState(1000);
  const [digitStats, setDigitStats] = useState<any>(null);
  const [displaySymbols, setDisplaySymbols] = useState<string[]>([]);
  const [isExiting, setIsExiting] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 190, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const popupRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  
  const lastSpokenSignal = useRef('');
  const subscribedRef = useRef(false);
  const subscriptionRef = useRef<any>(null);
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (dragHandleRef.current && dragHandleRef.current.contains(e.target as Node)) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
      e.preventDefault();
    }
  };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);
  
  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    if (lastSpokenSignal.current === text) return;
    lastSpokenSignal.current = text;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);
  
  const getDigitSymbol = useCallback((digit: number, price: number, prevPrice: number | null, type: string, barrier: string): string => {
    const barrierNum = parseInt(barrier);
    
    switch (type) {
      case 'CALL':
      case 'PUT':
        if (prevPrice === null) return '?';
        if (price > prevPrice) return 'R';
        if (price < prevPrice) return 'F';
        return 'C';
      case 'DIGITOVER':
        if (digit > barrierNum) return 'O';
        if (digit === barrierNum) return 'S';
        return 'U';
      case 'DIGITUNDER':
        if (digit < barrierNum) return 'U';
        if (digit === barrierNum) return 'S';
        return 'O';
      case 'DIGITEVEN':
        return digit % 2 === 0 ? 'E' : 'O';
      case 'DIGITODD':
        return digit % 2 !== 0 ? 'O' : 'E';
      case 'DIGITMATCH':
        return digit === barrierNum ? 'S' : 'D';
      case 'DIGITDIFF':
        return digit !== barrierNum ? 'D' : 'S';
      default:
        return digit.toString();
    }
  }, []);
  
  const updateDisplaySymbols = useCallback(() => {
    if (!digitStats) return;
    const tickPricesData = digitStats.tickPrices;
    const symbols = digitStats.last26Digits.map((digit: number, index: number) => {
      const currentPrice = tickPricesData[index];
      const prevPrice = index > 0 ? tickPricesData[index - 1] : null;
      return getDigitSymbol(digit, currentPrice, prevPrice, selectedContractType, selectedPrediction);
    });
    setDisplaySymbols(symbols);
  }, [digitStats, selectedContractType, selectedPrediction, getDigitSymbol]);
  
  const updateDigitStats = useCallback(() => {
    const stats = calculateChartDigitStats(symbol, tickRange);
    setDigitStats(stats);
  }, [symbol, tickRange]);
  
  useEffect(() => {
    updateDigitStats();
    const unsubscribe = subscribeToChartTicks(symbol, () => {
      updateDigitStats();
    });
    return unsubscribe;
  }, [symbol, tickRange, updateDigitStats]);
  
  useEffect(() => {
    updateDisplaySymbols();
  }, [selectedContractType, selectedPrediction, updateDisplaySymbols]);
  
  useEffect(() => {
    updateDisplaySymbols();
  }, [digitStats, updateDisplaySymbols]);
  
  useEffect(() => {
    let active = true;
    
    const cleanup = async () => {
      if (subscriptionRef.current) {
        try {
          await derivApi.unsubscribeTicks(symbol as MarketSymbol);
        } catch (err) {
          console.error('Error unsubscribing:', err);
        }
        subscriptionRef.current = null;
      }
    };
    
    const load = async () => {
      if (!derivApi.isConnected) return;
      
      await cleanup();
      
      try {
        const hist = await derivApi.getTickHistory(symbol as MarketSymbol, 1000);
        if (!active) return;
        
        const historicalDigits = (hist.history.prices || []).map((p: number) => getLastDigit(p));
        const historicalPrices = hist.history.prices || [];
        chartTickHistory[symbol] = historicalDigits;
        chartTickPrices[symbol] = historicalPrices;
        
        updateDigitStats();
        
        if (!subscribedRef.current || !subscriptionRef.current) {
          subscriptionRef.current = await derivApi.subscribeTicks(symbol as MarketSymbol, (data: any) => {
            if (!active || !data.tick) return;
            const quote = data.tick.quote;
            const digit = getLastDigit(quote);
            addChartTick(symbol, digit, quote);
          });
          subscribedRef.current = true;
        }
      } catch (err) {
        console.error('Error loading market data:', err);
      }
    };
    
    load();
    
    return () => {
      active = false;
      cleanup();
      subscribedRef.current = false;
    };
  }, [symbol, updateDigitStats]);
  
  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };
  
  const legend = (() => {
    switch (selectedContractType) {
      case 'CALL':
        return { symbol1: 'R', meaning1: 'Rise', symbol2: 'F', meaning2: 'Fall', symbol3: 'C', meaning3: 'Constant' };
      case 'PUT':
        return { symbol1: 'F', meaning1: 'Fall', symbol2: 'R', meaning2: 'Rise', symbol3: 'C', meaning3: 'Constant' };
      case 'DIGITOVER':
        return { symbol1: 'O', meaning1: `Over ${selectedPrediction}`, symbol2: 'S', meaning2: `Same ${selectedPrediction}`, symbol3: 'U', meaning3: `Under ${selectedPrediction}` };
      case 'DIGITUNDER':
        return { symbol1: 'U', meaning1: `Under ${selectedPrediction}`, symbol2: 'S', meaning2: `Same ${selectedPrediction}`, symbol3: 'O', meaning3: `Over ${selectedPrediction}` };
      case 'DIGITEVEN':
        return { symbol1: 'E', meaning1: 'Even', symbol2: 'O', meaning2: 'Odd', symbol3: '', meaning3: '' };
      case 'DIGITODD':
        return { symbol1: 'O', meaning1: 'Odd', symbol2: 'E', meaning2: 'Even', symbol3: '', meaning3: '' };
      case 'DIGITMATCH':
        return { symbol1: 'S', meaning1: `Same ${selectedPrediction}`, symbol2: 'D', meaning2: `Diff ${selectedPrediction}`, symbol3: '', meaning3: '' };
      case 'DIGITDIFF':
        return { symbol1: 'D', meaning1: `Diff ${selectedPrediction}`, symbol2: 'S', meaning2: `Same ${selectedPrediction}`, symbol3: '', meaning3: '' };
      default:
        return { symbol1: '', meaning1: '', symbol2: '', meaning2: '', symbol3: '', meaning3: '' };
    }
  })();
  
  const percentages = digitStats?.percentages || {};
  const evenPercentage = digitStats?.evenPercentage || 50;
  const oddPercentage = digitStats?.oddPercentage || 50;
  const overPercentage = digitStats?.overPercentage || 50;
  const underPercentage = digitStats?.underPercentage || 50;
  const over3Percentage = digitStats?.over3Percentage || 50;
  const under6Percentage = digitStats?.under6Percentage || 50;
  const mostCommon = digitStats?.mostCommon || 0;
  const secondMost = digitStats?.secondMost || 0;
  const leastCommon = digitStats?.leastCommon || 0;
  const totalTicks = digitStats?.totalTicks || 0;
  
  if (isMinimized) {
    return (
      <div 
        className="fixed z-50 pointer-events-none"
        style={{ left: position.x, top: position.y }}
      >
        <div 
          className="pointer-events-auto w-[280px] max-w-[85vw] rounded-xl shadow-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-blue-500/30 cursor-pointer"
          onClick={() => setIsMinimized(false)}
        >
          <div className="p-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <BarChart3 className="w-3 h-3 text-white" />
              </div>
              <span className="text-[10px] font-semibold text-white">Ramzfx Ai Signals</span>
              {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
            </div>
            <button onClick={handleClose} className="p-0.5 rounded hover:bg-white/10">
              <X className="w-3 h-3 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      ref={popupRef}
      className="fixed z-50 pointer-events-none"
      style={{ left: position.x, top: position.y }}
    >
      <div 
        className={`
          pointer-events-auto w-[380px] max-w-[90vw] max-h-[85vh] overflow-y-auto rounded-xl shadow-2xl
          bg-gradient-to-br from-slate-900 to-slate-950 border border-blue-500/30
          ${isExiting ? 'animate-slide-out-up' : 'animate-slide-in-down'}
          ${isDragging ? 'cursor-grabbing' : ''}
        `}
        style={{ height: 'auto', maxHeight: 'calc(100vh - 120px)' }}
      >
        <div 
          ref={dragHandleRef}
          onMouseDown={handleMouseDown}
          className="sticky top-0 z-10 bg-gradient-to-r from-slate-900 to-slate-950 border-b border-blue-500/30 p-3 flex items-center justify-between rounded-t-xl cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center gap-2">
            <GripVertical className="w-3.5 h-3.5 text-gray-400" />
            <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
              <BarChart3 className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Ramzfx Trading Signals</h3>
              <p className="text-[8px] text-blue-300">Drag to move • Live Market Analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={voiceEnabled ? 'default' : 'outline'}
              className="h-6 text-[8px] px-1.5 gap-0.5"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
            >
              {voiceEnabled ? <Volume2 className="w-2.5 h-2.5" /> : <VolumeX className="w-2.5 h-2.5" />}
              {voiceEnabled ? 'ON' : 'OFF'}
            </Button>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 transition-all"
            >
              <span className="text-[10px]">━</span>
            </button>
            <button
              onClick={handleClose}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        
        <div className="p-3 space-y-3">
          <div>
            <label className="text-[9px] text-blue-300 block mb-1">Market</label>
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger className="h-7 text-[10px] bg-slate-800/50 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-40">
                {ALL_MARKETS.map(m => (
                  <SelectItem key={m.symbol} value={m.symbol} className="text-[10px]">
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-[9px] text-blue-300 block mb-1">Contract Type</label>
            <Select value={selectedContractType} onValueChange={setSelectedContractType}>
              <SelectTrigger className="h-7 text-[10px] bg-slate-800/50 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTRACT_TYPES_CHART.map(c => (
                  <SelectItem key={c.value} value={c.value} className="text-[10px]">
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {['DIGITMATCH', 'DIGITDIFF', 'DIGITOVER', 'DIGITUNDER'].includes(selectedContractType) && (
            <div>
              <label className="text-[9px] text-blue-300 block mb-1">Prediction (0-9)</label>
              <div className="grid grid-cols-5 gap-1">
                {Array.from({ length: 10 }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedPrediction(String(i))}
                    className={`h-7 rounded text-[10px] font-mono font-bold transition-all ${
                      selectedPrediction === String(i) 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-slate-800/50 text-gray-300 hover:bg-slate-700'
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <label className="text-[9px] text-blue-300">Tick Range</label>
            <Select value={String(tickRange)} onValueChange={v => setTickRange(parseInt(v))}>
              <SelectTrigger className="h-6 text-[9px] w-20 bg-slate-800/50 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[100, 200, 300, 500, 1000, 2000].map(r => (
                  <SelectItem key={r} value={String(r)}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center justify-between bg-slate-800/30 rounded-lg p-1.5 border border-blue-500/20">
            <div className="flex items-center gap-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
              </span>
              <span className="text-[8px] text-gray-400">Live Ticks</span>
            </div>
            <Badge variant="outline" className="text-[8px] bg-slate-800/50 border-blue-500/30 text-blue-300">
              {totalTicks} ticks
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-slate-800/30 rounded-lg p-1.5 text-center border border-blue-500/20">
              <div className="text-[7px] text-blue-300">Odd</div>
              <div className="font-mono text-[11px] font-bold text-yellow-400">{oddPercentage.toFixed(1)}%</div>
              <div className="h-1 bg-slate-700 rounded-full mt-0.5">
                <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${oddPercentage}%` }} />
              </div>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-1.5 text-center border border-blue-500/20">
              <div className="text-[7px] text-blue-300">Even</div>
              <div className="font-mono text-[11px] font-bold text-green-400">{evenPercentage.toFixed(1)}%</div>
              <div className="h-1 bg-slate-700 rounded-full mt-0.5">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${evenPercentage}%` }} />
              </div>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-1.5 text-center border border-blue-500/20">
              <div className="text-[7px] text-blue-300">Over 4</div>
              <div className="font-mono text-[11px] font-bold text-blue-400">{overPercentage.toFixed(1)}%</div>
              <div className="h-1 bg-slate-700 rounded-full mt-0.5">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${overPercentage}%` }} />
              </div>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-1.5 text-center border border-blue-500/20">
              <div className="text-[7px] text-blue-300">Under 5</div>
              <div className="font-mono text-[11px] font-bold text-yellow-400">{underPercentage.toFixed(1)}%</div>
              <div className="h-1 bg-slate-700 rounded-full mt-0.5">
                <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${underPercentage}%` }} />
              </div>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-1.5 text-center border border-purple-500/20">
              <div className="text-[7px] text-purple-300">Over 3</div>
              <div className="font-mono text-[11px] font-bold text-purple-400">{over3Percentage.toFixed(1)}%</div>
              <div className="h-1 bg-slate-700 rounded-full mt-0.5">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${over3Percentage}%` }} />
              </div>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-1.5 text-center border border-purple-500/20">
              <div className="text-[7px] text-purple-300">Under 6</div>
              <div className="font-mono text-[11px] font-bold text-purple-400">{under6Percentage.toFixed(1)}%</div>
              <div className="h-1 bg-slate-700 rounded-full mt-0.5">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${under6Percentage}%` }} />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-5 gap-1">
            {Array.from({ length: 10 }, (_, d) => {
              const pct = percentages[d] || 0;
              const isHot = pct > 12;
              const isBestMatch = d === mostCommon;
              const isSecondBest = d === secondMost;
              return (
                <button
                  key={d}
                  onClick={() => setSelectedPrediction(String(d))}
                  className={`rounded-lg p-1.5 text-center transition-all border cursor-pointer ${
                    selectedPrediction === String(d) ? 'ring-2 ring-blue-500' : ''
                  } ${isHot ? 'bg-red-500/20 border-red-500/40 text-red-400' :
                    isBestMatch ? 'bg-green-500/20 border-green-500/40 text-green-400' :
                    isSecondBest ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' :
                    'bg-slate-800/30 border-slate-700 text-gray-300'}`}
                >
                  <div className="font-mono text-[13px] font-bold">{d}</div>
                  <div className="text-[7px]">{pct.toFixed(1)}%</div>
                  <div className="h-0.5 bg-slate-700 rounded-full mt-0.5">
                    <div className={`h-full rounded-full ${isHot ? 'bg-red-500' : isBestMatch ? 'bg-green-500' : isSecondBest ? 'bg-blue-500' : 'bg-gray-500'}`} style={{ width: `${Math.min(100, pct * 5)}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
          
          <div className="grid grid-cols-3 gap-1.5">
            <div className="bg-slate-800/30 rounded-lg p-1.5 text-center border border-green-500/20">
              <div className="text-[7px] text-green-400">🔥 Most Appearing</div>
              <div className="font-mono text-[13px] font-bold text-green-400">{mostCommon}</div>
              <div className="text-[6px] text-gray-500">{percentages[mostCommon]?.toFixed(1)}%</div>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-1.5 text-center border border-blue-500/20">
              <div className="text-[7px] text-blue-400">⭐ Second Most</div>
              <div className="font-mono text-[13px] font-bold text-blue-400">{secondMost}</div>
              <div className="text-[6px] text-gray-500">{percentages[secondMost]?.toFixed(1)}%</div>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-1.5 text-center border border-red-500/20">
              <div className="text-[7px] text-red-400">❄️ Least Appearing</div>
              <div className="font-mono text-[13px] font-bold text-red-400">{leastCommon}</div>
              <div className="text-[6px] text-gray-500">{percentages[leastCommon]?.toFixed(1)}%</div>
            </div>
          </div>
          
          <div className="bg-slate-800/30 rounded-lg p-1.5 text-center border border-blue-500/20">
            <div className="text-[7px] text-blue-300">Even/Odd Recommendation</div>
            <div className={`font-mono text-[11px] font-bold ${evenPercentage > 50 ? 'text-green-400' : 'text-yellow-400'}`}>
              {evenPercentage > 50 ? 'EVEN' : 'ODD'}
            </div>
            <div className="text-[6px] text-gray-500">Confidence: {Math.max(evenPercentage, oddPercentage).toFixed(1)}%</div>
          </div>
          
          <div className="flex flex-wrap gap-2 text-[7px] justify-center border-t border-slate-800 pt-2">
            {legend.symbol1 && (
              <div className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded flex items-center justify-center text-[6px] font-bold ${
                  legend.symbol1 === 'R' ? 'bg-green-500/20 text-green-400' :
                  legend.symbol1 === 'F' ? 'bg-red-500/20 text-red-400' :
                  legend.symbol1 === 'O' ? 'bg-red-500/20 text-red-400' :
                  legend.symbol1 === 'U' ? 'bg-green-500/20 text-green-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {legend.symbol1}
                </div>
                <span className="text-gray-400">{legend.meaning1}</span>
              </div>
            )}
            {legend.symbol2 && (
              <div className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded flex items-center justify-center text-[6px] font-bold ${
                  legend.symbol2 === 'R' ? 'bg-green-500/20 text-green-400' :
                  legend.symbol2 === 'F' ? 'bg-red-500/20 text-red-400' :
                  legend.symbol2 === 'O' ? 'bg-red-500/20 text-red-400' :
                  legend.symbol2 === 'U' ? 'bg-green-500/20 text-green-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {legend.symbol2}
                </div>
                <span className="text-gray-400">{legend.meaning2}</span>
              </div>
            )}
            {legend.symbol3 && (
              <div className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded flex items-center justify-center text-[6px] font-bold ${
                  legend.symbol3 === 'R' ? 'bg-green-500/20 text-green-400' :
                  legend.symbol3 === 'F' ? 'bg-red-500/20 text-red-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {legend.symbol3}
                </div>
                <span className="text-gray-400">{legend.meaning3}</span>
              </div>
            )}
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-[9px] font-semibold text-blue-300">Filtration Chamber</h4>
              <Badge className="text-[6px] bg-blue-500/20 text-blue-400 border-blue-500/30">
                {selectedContractType === 'CALL' ? 'Rise' : 
                 selectedContractType === 'PUT' ? 'Fall' :
                 selectedContractType === 'DIGITOVER' ? `Over ${selectedPrediction}` :
                 selectedContractType === 'DIGITUNDER' ? `Under ${selectedPrediction}` :
                 selectedContractType === 'DIGITEVEN' ? 'Even' :
                 selectedContractType === 'DIGITODD' ? 'Odd' :
                 selectedContractType === 'DIGITMATCH' ? `Match ${selectedPrediction}` :
                 `Diff ${selectedPrediction}`}
              </Badge>
            </div>
            <div className="flex gap-1 flex-wrap justify-center">
              {displaySymbols.length > 0 ? (
                displaySymbols.map((sym, i) => {
                  const isLast = i === displaySymbols.length - 1;
                  let bgColor = '';
                  let textColor = '';
                  
                  if (sym === 'R' || sym === 'U') {
                    bgColor = 'bg-green-500/20';
                    textColor = 'text-green-400';
                  } else if (sym === 'F' || sym === 'O') {
                    bgColor = 'bg-red-500/20';
                    textColor = 'text-red-400';
                  } else if (sym === 'E') {
                    bgColor = 'bg-green-500/20';
                    textColor = 'text-green-400';
                  } else if (sym === 'S') {
                    bgColor = 'bg-blue-500/20';
                    textColor = 'text-blue-400';
                  } else if (sym === 'D') {
                    bgColor = 'bg-yellow-500/20';
                    textColor = 'text-yellow-400';
                  } else {
                    bgColor = 'bg-slate-700/50';
                    textColor = 'text-gray-300';
                  }
                  
                  return (
                    <div
                      key={i}
                      className={`w-6 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-[11px] border ${
                        isLast ? 'ring-2 ring-blue-500 w-7 h-8 text-sm' : ''
                      } ${bgColor} ${textColor} border-slate-700`}
                    >
                      {sym}
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-[9px] text-gray-500 py-2">Waiting for ticks...</div>
              )}
            </div>
          </div>
          
          <div className="text-center text-[6px] text-gray-500 py-1">
            🔄 Updates in real-time with each new tick | Analysis based on last {tickRange} ticks
          </div>
        </div>
      </div>
    </div>
  );
};

const SCANNER_MARKETS: { symbol: string; name: string }[] = [
  { symbol: 'R_10', name: 'Vol 10' },
  { symbol: 'R_25', name: 'Vol 25' },
  { symbol: 'R_50', name: 'Vol 50' },
  { symbol: 'R_75', name: 'Vol 75' },
  { symbol: 'R_100', name: 'Vol 100' },
  { symbol: '1HZ10V', name: 'V10 1s' },
  { symbol: '1HZ15V', name: 'V15 1s' },
  { symbol: '1HZ25V', name: 'V25 1s' },
  { symbol: '1HZ30V', name: 'V30 1s' },
  { symbol: '1HZ50V', name: 'V50 1s' },
  { symbol: '1HZ75V', name: 'V75 1s' },
  { symbol: '1HZ90V', name: 'V90 1s' },
  { symbol: '1HZ100V', name: 'V100 1s' },
  { symbol: 'JD10', name: 'Jump 10' },
  { symbol: 'JD25', name: 'Jump 25' },
  { symbol: 'RDBEAR', name: 'Bear' },
  { symbol: 'RDBULL', name: 'Bull' },
];

const CONTRACT_TYPES = [
  'DIGITEVEN', 'DIGITODD', 'DIGITMATCH', 'DIGITDIFF', 'DIGITOVER', 'DIGITUNDER',
] as const;

const needsBarrier = (ct: string) => ['DIGITMATCH', 'DIGITDIFF', 'DIGITOVER', 'DIGITUNDER'].includes(ct);

type BotStatus = 'idle' | 'trading_m1' | 'recovery' | 'waiting_pattern' | 'pattern_matched' | 'virtual_hook' | 'reconnecting';

interface LogEntry {
  id: number;
  time: string;
  market: 'M1' | 'M2' | 'VH' | 'SYSTEM';
  symbol: string;
  contract: string;
  stake: number;
  martingaleStep: number;
  exitDigit: string;
  result: 'Win' | 'Loss' | 'Pending' | 'V-Win' | 'V-Loss' | 'Failed';
  pnl: number;
  balance: number;
  switchInfo: string;
}

interface BotState {
  cStake: number;
  mStep: number;
  inRecovery: boolean;
  currentPnl: number;
  currentBalance: number;
  currentMarket: 1 | 2;
  vhFakeWins: number;
  vhFakeLosses: number;
  vhConsecLosses: number;
  vhStatus: 'idle' | 'waiting' | 'confirmed' | 'failed';
  patternTradeTaken: boolean;
}

class CircularTickBuffer {
  private buffer: { digit: number; ts: number }[];
  private head = 0;
  private count = 0;
  constructor(private capacity = 1000) {
    this.buffer = new Array(capacity);
  }
  push(digit: number) {
    this.buffer[this.head] = { digit, ts: performance.now() };
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }
  last(n: number): number[] {
    const result: number[] = [];
    const start = (this.head - Math.min(n, this.count) + this.capacity) % this.capacity;
    for (let i = 0; i < Math.min(n, this.count); i++) {
      result.push(this.buffer[(start + i) % this.capacity].digit);
    }
    return result;
  }
  lastTs(): number { return this.count > 0 ? this.buffer[(this.head - 1 + this.capacity) % this.capacity].ts : 0; }
  get size() { return this.count; }
}

function waitForNextTick(symbol: string): Promise<{ quote: number }> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      unsub();
      resolve({ quote: 0 });
    }, 5000);
    const unsub = derivApi.onMessage((data: any) => {
      if (data.tick && data.tick.symbol === symbol) { 
        clearTimeout(timeout);
        unsub(); 
        resolve({ quote: data.tick.quote }); 
      }
    });
  });
}

function simulateVirtualContract(
  contractType: string, barrier: string, symbol: string
): Promise<{ won: boolean; digit: number }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsub();
      reject(new Error('Virtual contract timeout'));
    }, 5000);
    const unsub = derivApi.onMessage((data: any) => {
      if (data.tick && data.tick.symbol === symbol) {
        clearTimeout(timeout);
        unsub();
        const digit = getLastDigit(data.tick.quote);
        const b = parseInt(barrier) || 0;
        let won = false;
        switch (contractType) {
          case 'DIGITEVEN': won = digit % 2 === 0; break;
          case 'DIGITODD': won = digit % 2 !== 0; break;
          case 'DIGITMATCH': won = digit === b; break;
          case 'DIGITDIFF': won = digit !== b; break;
          case 'DIGITOVER': won = digit > b; break;
          case 'DIGITUNDER': won = digit < b; break;
        }
        resolve({ won, digit });
      }
    });
  });
}

class BalanceCache {
  private static instance: BalanceCache;
  private cache: number | null = null;
  private lastFetch: number = 0;
  private updateCallbacks: Set<(balance: number) => void> = new Set();
  
  private constructor() {}
  
  static getInstance(): BalanceCache {
    if (!BalanceCache.instance) {
      BalanceCache.instance = new BalanceCache();
    }
    return BalanceCache.instance;
  }
  
  async getBalance(refreshFn: () => Promise<number>, force: boolean = false): Promise<number> {
    const now = Date.now();
    
    if (!force && this.cache !== null && (now - this.lastFetch) < 500) {
      return this.cache;
    }
    
    try {
      const newBalance = await refreshFn();
      this.cache = newBalance;
      this.lastFetch = now;
      this.notifyCallbacks(newBalance);
      return newBalance;
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      return this.cache ?? 0;
    }
  }
  
  optimisticUpdate(newBalance: number): void {
    this.cache = newBalance;
    this.lastFetch = Date.now();
    this.notifyCallbacks(newBalance);
  }
  
  subscribe(callback: (balance: number) => void): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }
  
  private notifyCallbacks(balance: number): void {
    this.updateCallbacks.forEach(callback => callback(balance));
  }
  
  clear(): void {
    this.cache = null;
    this.lastFetch = 0;
  }
}

export default function ProScannerBot() {
  const { isAuthorized, balance: authBalance, activeAccount, refreshBalance } = useAuth();
  const { recordLoss } = useLossRequirement();
  const location = useLocation();
  
  const [showSocialPopup, setShowSocialPopup] = useState(true);
  const [showTradingChart, setShowTradingChart] = useState(false);
  const chartButtonRef = useRef<HTMLButtonElement>(null);
  const [isChartAnimating, setIsChartAnimating] = useState(false);

  const balanceCache = useRef(BalanceCache.getInstance()).current;
  const [localBalance, setLocalBalance] = useState(authBalance);
  const patternTradeTakenRef = useRef(false);
  
  const [isReconnecting, setIsReconnecting] = useState(false);
  const savedBotStateRef = useRef<BotState | null>(null);
  
  useEffect(() => {
    const unsubscribe = balanceCache.subscribe((newBalance) => {
      setLocalBalance(newBalance);
    });
    return unsubscribe;
  }, [balanceCache]);

  useEffect(() => {
    balanceCache.optimisticUpdate(authBalance);
  }, [authBalance, balanceCache]);

  const [m1Enabled, setM1Enabled] = useState(true);
  const [m1Contract, setM1Contract] = useState('DIGITEVEN');
  const [m1Barrier, setM1Barrier] = useState('5');
  const [m1Symbol, setM1Symbol] = useState('R_100');

  const [m2Enabled, setM2Enabled] = useState(true);
  const [m2Contract, setM2Contract] = useState('DIGITODD');
  const [m2Barrier, setM2Barrier] = useState('5');
  const [m2Symbol, setM2Symbol] = useState('R_50');

  const [m1HookEnabled, setM1HookEnabled] = useState(false);
  const [m1VirtualLossCount, setM1VirtualLossCount] = useState('3');
  const [m1RealCount, setM1RealCount] = useState('2');

  const [m2HookEnabled, setM2HookEnabled] = useState(false);
  const [m2VirtualLossCount, setM2VirtualLossCount] = useState('3');
  const [m2RealCount, setM2RealCount] = useState('2');

  const [vhFakeWins, setVhFakeWins] = useState(0);
  const [vhFakeLosses, setVhFakeLosses] = useState(0);
  const [vhConsecLosses, setVhConsecLosses] = useState(0);
  const [vhStatus, setVhStatus] = useState<'idle' | 'waiting' | 'confirmed' | 'failed'>('idle');

  const [stake, setStake] = useState('0.6');
  const [martingaleOn, setMartingaleOn] = useState(false);
  const [martingaleMultiplier, setMartingaleMultiplier] = useState('2.0');
  const [martingaleMaxSteps, setMartingaleMaxSteps] = useState('5');
  const [takeProfit, setTakeProfit] = useState('5');
  const [stopLoss, setStopLoss] = useState('30');

  const [strategyEnabled, setStrategyEnabled] = useState(false);
  const [strategyM1Enabled, setStrategyM1Enabled] = useState(false);
  const [m1StrategyMode, setM1StrategyMode] = useState<'pattern' | 'digit'>('pattern');
  const [m2StrategyMode, setM2StrategyMode] = useState<'pattern' | 'digit'>('pattern');

  const [m1Pattern, setM1Pattern] = useState('');
  const [m1DigitCondition, setM1DigitCondition] = useState('==');
  const [m1DigitCompare, setM1DigitCompare] = useState('5');
  const [m1DigitWindow, setM1DigitWindow] = useState('3');

  const [m2Pattern, setM2Pattern] = useState('');
  const [m2DigitCondition, setM2DigitCondition] = useState('==');
  const [m2DigitCompare, setM2DigitCompare] = useState('5');
  const [m2DigitWindow, setM2DigitWindow] = useState('3');

  const [scannerActive, setScannerActive] = useState(false);
  const [turboMode, setTurboMode] = useState(false);
  const [botName, setBotName] = useState('');
  const [turboLatency, setTurboLatency] = useState(0);
  const [ticksCaptured, setTicksCaptured] = useState(0);
  const [ticksMissed, setTicksMissed] = useState(0);
  const turboBuffersRef = useRef<Map<string, CircularTickBuffer>>(new Map());
  const lastTickTsRef = useRef(0);

  const [botStatus, setBotStatus] = useState<BotStatus>('idle');
  const [isRunning, setIsRunning] = useState(false);
  const runningRef = useRef(false);
  const [currentMarket, setCurrentMarket] = useState<1 | 2>(1);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [totalStaked, setTotalStaked] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [currentStake, setCurrentStakeState] = useState(0);
  const [martingaleStep, setMartingaleStepState] = useState(0);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);

  const tickMapRef = useRef<Map<string, number[]>>(new Map());
  const [tickCounts, setTickCounts] = useState<Record<string, number>>({});
  
  const [isConnected, setIsConnected] = useState(derivApi.isConnected);
  const connectionRetryCountRef = useRef(0);
  const MAX_CONNECTION_RETRIES = 5;
  const RECONNECT_DELAY = 2000;

  const lastPnlRef = useRef(0);
  const tpNotifiedRef = useRef(false);
  const slNotifiedRef = useRef(false);
  const shouldStopRef = useRef(false);

  const updateBalanceImmediately = useCallback(async (pnl?: number): Promise<number> => {
    try {
      if (pnl !== undefined && activeAccount?.balance !== undefined) {
        const newBalance = activeAccount.balance + pnl;
        balanceCache.optimisticUpdate(newBalance);
        return newBalance;
      }
      
      const newBalance = await refreshBalance();
      balanceCache.optimisticUpdate(newBalance);
      return newBalance;
    } catch (error) {
      console.error('Failed to refresh balance:', error);
      return localBalance;
    }
  }, [refreshBalance, activeAccount?.balance, localBalance, balanceCache]);

  const addLog = useCallback((id: number, entry: Omit<LogEntry, 'id'>) => {
    setLogEntries(prev => [{ ...entry, id }, ...prev].slice(0, 100));
  }, []);

  const updateLog = useCallback((id: number, updates: Partial<LogEntry>) => {
    setLogEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const clearLog = useCallback(() => {
    setLogEntries([]);
    setWins(0); setLosses(0); setTotalStaked(0); setNetProfit(0);
    setMartingaleStepState(0);
    setVhFakeWins(0); setVhFakeLosses(0); setVhConsecLosses(0); setVhStatus('idle');
    setTicksCaptured(0); setTicksMissed(0);
    tpNotifiedRef.current = false;
    slNotifiedRef.current = false;
    lastPnlRef.current = 0;
    patternTradeTakenRef.current = false;
    shouldStopRef.current = false;
    savedBotStateRef.current = null;
  }, []);

  const ensureConnection = useCallback(async (): Promise<boolean> => {
    if (derivApi.isConnected) {
      setIsConnected(true);
      connectionRetryCountRef.current = 0;
      return true;
    }

    for (let i = 0; i < MAX_CONNECTION_RETRIES; i++) {
      try {
        await derivApi.connect();
        await new Promise(r => setTimeout(r, 2000));
        
        if (derivApi.isConnected) {
          for (const market of SCANNER_MARKETS) {
            await derivApi.subscribeTicks(market.symbol as MarketSymbol, () => {}).catch(console.error);
          }
          setIsConnected(true);
          setBotStatus(savedBotStateRef.current?.inRecovery ? 'recovery' : 'trading_m1');
          connectionRetryCountRef.current = 0;
          return true;
        }
      } catch (error) {
        console.error(`Reconnection attempt ${i + 1} failed:`, error);
        await new Promise(r => setTimeout(r, RECONNECT_DELAY * (i + 1)));
      }
    }
    
    setIsConnected(false);
    return false;
  }, []);

  const saveBotState = useCallback(() => {
    if (isRunning && runningRef.current) {
      savedBotStateRef.current = {
        cStake: currentStake,
        mStep: martingaleStep,
        inRecovery: currentMarket === 2,
        currentPnl: netProfit,
        currentBalance: localBalance,
        currentMarket: currentMarket,
        vhFakeWins: vhFakeWins,
        vhFakeLosses: vhFakeLosses,
        vhConsecLosses: vhConsecLosses,
        vhStatus: vhStatus,
        patternTradeTaken: patternTradeTakenRef.current,
      };
    }
  }, [isRunning, currentStake, martingaleStep, currentMarket, netProfit, localBalance, vhFakeWins, vhFakeLosses, vhConsecLosses, vhStatus]);

  const restoreBotState = useCallback(() => {
    if (savedBotStateRef.current && isRunning && runningRef.current) {
      setCurrentStakeState(savedBotStateRef.current.cStake);
      setMartingaleStepState(savedBotStateRef.current.mStep);
      setCurrentMarket(savedBotStateRef.current.currentMarket);
      setNetProfit(savedBotStateRef.current.currentPnl);
      setLocalBalance(savedBotStateRef.current.currentBalance);
      setVhFakeWins(savedBotStateRef.current.vhFakeWins);
      setVhFakeLosses(savedBotStateRef.current.vhFakeLosses);
      setVhConsecLosses(savedBotStateRef.current.vhConsecLosses);
      setVhStatus(savedBotStateRef.current.vhStatus);
      patternTradeTakenRef.current = savedBotStateRef.current.patternTradeTaken;
      
      const logId = ++logIdRef.current;
      addLog(logId, {
        time: new Date().toLocaleTimeString(),
        market: 'SYSTEM',
        symbol: 'RECONNECT',
        contract: 'RESUME',
        stake: 0,
        martingaleStep: savedBotStateRef.current.mStep,
        exitDigit: '-',
        result: 'Pending',
        pnl: 0,
        balance: savedBotStateRef.current.currentBalance,
        switchInfo: `🔄 Connection restored! Resuming with Stake: $${savedBotStateRef.current.cStake}, Step: ${savedBotStateRef.current.mStep}, P/L: $${savedBotStateRef.current.currentPnl.toFixed(2)}`,
      });
      
      savedBotStateRef.current = null;
      return true;
    }
    return false;
  }, [isRunning, addLog]);

  // Tick subscription
  useEffect(() => {
    if (!derivApi.isConnected) return;
    let active = true;
    const handler = (data: any) => {
      if (!data.tick || !active) return;
      const sym = data.tick.symbol as string;
      const digit = getLastDigit(data.tick.quote);
      const now = performance.now();

      const map = tickMapRef.current;
      const arr = map.get(sym) || [];
      arr.push(digit);
      if (arr.length > 200) arr.shift();
      map.set(sym, arr);
      setTickCounts(prev => ({ ...prev, [sym]: arr.length }));

      if (!turboBuffersRef.current.has(sym)) {
        turboBuffersRef.current.set(sym, new CircularTickBuffer(1000));
      }
      const buf = turboBuffersRef.current.get(sym)!;
      buf.push(digit);

      if (lastTickTsRef.current > 0) {
        const lat = now - lastTickTsRef.current;
        setTurboLatency(Math.round(lat));
        if (lat > 50) setTicksMissed(prev => prev + 1);
      }
      lastTickTsRef.current = now;
      setTicksCaptured(prev => prev + 1);
    };
    const unsub = derivApi.onMessage(handler);
    SCANNER_MARKETS.forEach(m => { derivApi.subscribeTicks(m.symbol as MarketSymbol, () => {}).catch(() => {}); });
    return () => { active = false; unsub(); };
  }, []);

  // Connection checker
  useEffect(() => {
    const connectionChecker = setInterval(async () => {
      const connected = derivApi.isConnected;
      const wasConnected = isConnected;
      setIsConnected(connected);
      
      if (!connected && isRunning && runningRef.current) {
        saveBotState();
        const reconnected = await ensureConnection();
        if (reconnected) {
          restoreBotState();
        } else {
          if (connectionRetryCountRef.current >= MAX_CONNECTION_RETRIES) {
            shouldStopRef.current = true;
            runningRef.current = false;
            setIsRunning(false);
            setBotStatus('idle');
            addLog(++logIdRef.current, {
              time: new Date().toLocaleTimeString(),
              market: 'SYSTEM',
              symbol: 'ERROR',
              contract: 'DISCONNECT',
              stake: 0,
              martingaleStep: 0,
              exitDigit: '-',
              result: 'Pending',
              pnl: 0,
              balance: localBalance,
              switchInfo: '❌ Failed to reconnect after multiple attempts. Bot stopped.',
            });
          }
        }
      } else if (connected && !wasConnected && !isRunning) {
        setIsConnected(true);
        connectionRetryCountRef.current = 0;
      }
    }, 3000);
    
    return () => clearInterval(connectionChecker);
  }, [isRunning, ensureConnection, saveBotState, restoreBotState, isConnected, localBalance, addLog]);

  const cleanM1Pattern = m1Pattern.toUpperCase().replace(/[^EO]/g, '');
  const m1PatternValid = cleanM1Pattern.length >= 2;
  const cleanM2Pattern = m2Pattern.toUpperCase().replace(/[^EO]/g, '');
  const m2PatternValid = cleanM2Pattern.length >= 2;

  const checkPatternMatchWith = useCallback((symbol: string, cleanPat: string): boolean => {
    const digits = tickMapRef.current.get(symbol) || [];
    if (digits.length < cleanPat.length) return false;
    const recent = digits.slice(-cleanPat.length);
    for (let i = 0; i < cleanPat.length; i++) {
      const expected = cleanPat[i];
      const actual = recent[i] % 2 === 0 ? 'E' : 'O';
      if (expected !== actual) return false;
    }
    return true;
  }, []);

  const checkDigitConditionWith = useCallback((symbol: string, condition: string, compare: string, window: string): boolean => {
    const digits = tickMapRef.current.get(symbol) || [];
    const win = parseInt(window) || 3;
    const comp = parseInt(compare);
    if (digits.length < win) return false;
    const recent = digits.slice(-win);
    return recent.every(d => {
      switch (condition) {
        case '>': return d > comp;
        case '<': return d < comp;
        case '>=': return d >= comp;
        case '<=': return d <= comp;
        case '==': return d === comp;
        default: return false;
      }
    });
  }, []);

  const checkStrategyForMarket = useCallback((symbol: string, market: 1 | 2): boolean => {
    const mode = market === 1 ? m1StrategyMode : m2StrategyMode;
    if (mode === 'pattern') {
      const pat = market === 1 ? cleanM1Pattern : cleanM2Pattern;
      return checkPatternMatchWith(symbol, pat);
    }
    const cond = market === 1 ? m1DigitCondition : m2DigitCondition;
    const comp = market === 1 ? m1DigitCompare : m2DigitCompare;
    const win = market === 1 ? m1DigitWindow : m2DigitWindow;
    return checkDigitConditionWith(symbol, cond, comp, win);
  }, [m1StrategyMode, m2StrategyMode, cleanM1Pattern, cleanM2Pattern, checkPatternMatchWith, checkDigitConditionWith, m1DigitCondition, m1DigitCompare, m1DigitWindow, m2DigitCondition, m2DigitCompare, m2DigitWindow]);

  const findScannerMatchForMarket = useCallback((market: 1 | 2): string | null => {
    for (const m of SCANNER_MARKETS) {
      if (checkStrategyForMarket(m.symbol, market)) return m.symbol;
    }
    return null;
  }, [checkStrategyForMarket]);

  const executeRealTrade = useCallback(async (
    cfg: { contract: string; barrier: string; symbol: string },
    tradeSymbol: string,
    cStake: number,
    mStep: number,
    mkt: 1 | 2,
    currentBalance: number,
    currentPnl: number,
    baseStake: number,
  ): Promise<{ 
    localPnl: number; 
    localBalance: number; 
    cStake: number; 
    mStep: number; 
    inRecovery: boolean; 
    shouldBreak: boolean;
    won: boolean;
    contractExecuted: boolean;
    errorMessage?: string;
  }> => {
    if (!derivApi.isConnected) {
      const connected = await ensureConnection();
      if (!connected) {
        throw new Error('No connection available');
      }
    }
    
    if (currentBalance < cStake) {
      const errorMsg = `Insufficient balance! Required: $${cStake.toFixed(2)}, Available: $${currentBalance.toFixed(2)}`;
      addLog(++logIdRef.current, {
        time: new Date().toLocaleTimeString(),
        market: 'SYSTEM',
        symbol: tradeSymbol,
        contract: cfg.contract,
        stake: cStake,
        martingaleStep: mStep,
        exitDigit: '-',
        result: 'Failed',
        pnl: 0,
        balance: currentBalance,
        switchInfo: `❌ ${errorMsg} - Trade skipped`,
      });
      return { 
        localPnl: currentPnl, 
        localBalance: currentBalance, 
        cStake, 
        mStep, 
        inRecovery: mkt === 2, 
        shouldBreak: false,
        won: false,
        contractExecuted: false,
        errorMessage: errorMsg
      };
    }
    
    const logId = ++logIdRef.current;
    const now = new Date().toLocaleTimeString();
    
    setTotalStaked(prev => prev + cStake);
    setCurrentStakeState(cStake);

    addLog(logId, {
      time: now, 
      market: mkt === 1 ? 'M1' : 'M2', 
      symbol: tradeSymbol,
      contract: cfg.contract, 
      stake: cStake, 
      martingaleStep: mStep,
      exitDigit: '...', 
      result: 'Pending', 
      pnl: 0, 
      balance: currentBalance,
      switchInfo: '',
    });

    let inRecovery = mkt === 2;
    let updatedBalance = currentBalance;
    let updatedPnl = currentPnl;
    let won = false;
    let contractExecuted = false;

    try {
      if (!turboMode) {
        await waitForNextTick(tradeSymbol as MarketSymbol);
      }

      const buyParams: any = {
        contract_type: cfg.contract, 
        symbol: tradeSymbol,
        duration: 1, 
        duration_unit: 't', 
        basis: 'stake', 
        amount: cStake,
      };
      if (needsBarrier(cfg.contract)) buyParams.barrier = cfg.barrier;

      const buyResponse = await derivApi.buyContract(buyParams);
      
      if (!buyResponse || !buyResponse.contractId) {
        throw new Error('Contract purchase failed - no contract ID returned');
      }
      
      contractExecuted = true;
      
      if (copyTradingService.enabled) {
        copyTradingService.copyTrade({
          ...buyParams,
          masterTradeId: buyResponse.contractId,
        }).catch(err => console.error('Copy trading error:', err));
      }
      
      const result = await derivApi.waitForContractResult(buyResponse.contractId);
      won = result.status === 'won';
      const pnl = result.profit;
      
      updatedPnl = currentPnl + pnl;
      updatedBalance = currentBalance + pnl;
      
      setLocalBalance(updatedBalance);
      balanceCache.optimisticUpdate(updatedBalance);
      setNetProfit(updatedPnl);
      
      updateBalanceImmediately(pnl).catch(console.error);

      const exitDigit = String(getLastDigit(result.sellPrice || 0));

      let switchInfo = '';
      let newCStake = cStake;
      let newMStep = mStep;
      let newInRecovery = inRecovery;

      if (won) {
        setWins(prev => prev + 1);
        if (inRecovery) {
          switchInfo = '✓ Recovery WIN → Back to M1';
          newInRecovery = false;
        } else {
          switchInfo = '→ Continue M1';
        }
        newMStep = 0;
        newCStake = baseStake;
      } else {
        setLosses(prev => prev + 1);
        if (activeAccount?.is_virtual) {
          recordLoss(cStake, tradeSymbol, 6000);
        }
        if (!inRecovery && m2Enabled) {
          newInRecovery = true;
          switchInfo = '✗ Loss → Switch to M2';
        } else {
          switchInfo = inRecovery ? '→ Stay M2' : '→ Continue M1';
        }
        if (martingaleOn) {
          const maxS = parseInt(martingaleMaxSteps) || 5;
          if (mStep < maxS) {
            newCStake = parseFloat((cStake * (parseFloat(martingaleMultiplier) || 2)).toFixed(2));
            newMStep++;
          } else {
            newMStep = 0;
            newCStake = baseStake;
          }
        }
      }

      setMartingaleStepState(newMStep);
      setCurrentStakeState(newCStake);

      updateLog(logId, { 
        exitDigit, 
        result: won ? 'Win' : 'Loss', 
        pnl, 
        balance: updatedBalance, 
        switchInfo 
      });

      let shouldBreak = false;
      const tpValue = parseFloat(takeProfit);
      const slValue = parseFloat(stopLoss);
      
      if (updatedPnl >= tpValue) {
        showTPNotification('tp', `Take Profit Target Hit!`, updatedPnl);
        shouldBreak = true;
        shouldStopRef.current = true;
      }
      if (updatedPnl <= -slValue) {
        showTPNotification('sl', `Stop Loss Target Hit!`, Math.abs(updatedPnl));
        shouldBreak = true;
        shouldStopRef.current = true;
      }
      if (updatedBalance < newCStake) {
        shouldBreak = true;
        shouldStopRef.current = true;
      }

      return { 
        localPnl: updatedPnl, 
        localBalance: updatedBalance, 
        cStake: newCStake, 
        mStep: newMStep, 
        inRecovery: newInRecovery, 
        shouldBreak,
        won,
        contractExecuted: true
      };
    } catch (err: any) {
      console.error('Trade execution error:', err);
      
      if (!contractExecuted) {
        updateLog(logId, { 
          result: 'Failed', 
          pnl: 0, 
          exitDigit: '-', 
          switchInfo: `❌ Contract failed: ${err.message || 'Unknown error'} - No money deducted` 
        });
      } else {
        updateLog(logId, { 
          result: 'Failed', 
          pnl: 0, 
          exitDigit: '-', 
          switchInfo: `⚠️ Contract placed but result unknown: ${err.message}` 
        });
      }
      
      if (err.message?.includes('connection') || !derivApi.isConnected) {
        saveBotState();
        const reconnected = await ensureConnection();
        if (reconnected) {
          restoreBotState();
        }
      }
      
      if (!turboMode) await new Promise(r => setTimeout(r, 2000));
      
      return { 
        localPnl: updatedPnl, 
        localBalance: updatedBalance, 
        cStake, 
        mStep, 
        inRecovery, 
        shouldBreak: false,
        won: false,
        contractExecuted: false,
        errorMessage: err.message
      };
    }
  }, [addLog, updateLog, m2Enabled, martingaleOn, martingaleMultiplier, martingaleMaxSteps, takeProfit, stopLoss, turboMode, ensureConnection, saveBotState, restoreBotState, activeAccount, recordLoss, updateBalanceImmediately, balanceCache]);

  const startBot = useCallback(async () => {
    if (!isAuthorized || isRunning) return;
    
    let currentBalanceLocal: number;
    let baseStakeLocal = parseFloat(stake);
    let cStakeLocal = baseStakeLocal;
    let mStepLocal = 0;
    let inRecoveryLocal = false;
    let currentPnlLocal = 0;
    
    if (savedBotStateRef.current) {
      cStakeLocal = savedBotStateRef.current.cStake;
      mStepLocal = savedBotStateRef.current.mStep;
      inRecoveryLocal = savedBotStateRef.current.inRecovery;
      currentPnlLocal = savedBotStateRef.current.currentPnl;
      currentBalanceLocal = savedBotStateRef.current.currentBalance;
      setCurrentMarket(savedBotStateRef.current.currentMarket);
      setVhFakeWins(savedBotStateRef.current.vhFakeWins);
      setVhFakeLosses(savedBotStateRef.current.vhFakeLosses);
      setVhConsecLosses(savedBotStateRef.current.vhConsecLosses);
      setVhStatus(savedBotStateRef.current.vhStatus);
      patternTradeTakenRef.current = savedBotStateRef.current.patternTradeTaken;
      savedBotStateRef.current = null;
    } else {
      const connected = await ensureConnection();
      if (!connected) {
        addLog(++logIdRef.current, {
          time: new Date().toLocaleTimeString(),
          market: 'SYSTEM',
          symbol: 'ERROR',
          contract: 'CONNECTION',
          stake: 0,
          martingaleStep: 0,
          exitDigit: '-',
          result: 'Failed',
          pnl: 0,
          balance: authBalance,
          switchInfo: '❌ Failed to connect to Deriv. Please check your connection.',
        });
        return;
      }
      currentBalanceLocal = await balanceCache.getBalance(async () => {
        await refreshBalance();
        return authBalance;
      }, true);
    }
    
    if (baseStakeLocal < 0.35) { 
      addLog(++logIdRef.current, {
        time: new Date().toLocaleTimeString(),
        market: 'SYSTEM',
        symbol: 'ERROR',
        contract: 'STAKE',
        stake: 0,
        martingaleStep: 0,
        exitDigit: '-',
        result: 'Failed',
        pnl: 0,
        balance: currentBalanceLocal,
        switchInfo: '❌ Minimum stake is $0.35. Please increase stake amount.',
      });
      return; 
    }
    if (!m1Enabled && !m2Enabled) { 
      addLog(++logIdRef.current, {
        time: new Date().toLocaleTimeString(),
        market: 'SYSTEM',
        symbol: 'ERROR',
        contract: 'CONFIG',
        stake: 0,
        martingaleStep: 0,
        exitDigit: '-',
        result: 'Failed',
        pnl: 0,
        balance: currentBalanceLocal,
        switchInfo: '❌ Both M1 and M2 are disabled. Enable at least one market.',
      });
      return; 
    }
    if (strategyM1Enabled && m1StrategyMode === 'pattern' && !m1PatternValid) { 
      addLog(++logIdRef.current, {
        time: new Date().toLocaleTimeString(),
        market: 'SYSTEM',
        symbol: 'ERROR',
        contract: 'STRATEGY',
        stake: 0,
        martingaleStep: 0,
        exitDigit: '-',
        result: 'Failed',
        pnl: 0,
        balance: currentBalanceLocal,
        switchInfo: '❌ M1 pattern is invalid. Please enter a valid pattern (E/O only, min 2 chars).',
      });
      return; 
    }
    if (strategyEnabled && m2StrategyMode === 'pattern' && !m2PatternValid) { 
      addLog(++logIdRef.current, {
        time: new Date().toLocaleTimeString(),
        market: 'SYSTEM',
        symbol: 'ERROR',
        contract: 'STRATEGY',
        stake: 0,
        martingaleStep: 0,
        exitDigit: '-',
        result: 'Failed',
        pnl: 0,
        balance: currentBalanceLocal,
        switchInfo: '❌ M2 pattern is invalid. Please enter a valid pattern (E/O only, min 2 chars).',
      });
      return; 
    }

    if (currentBalanceLocal < baseStakeLocal) {
      addLog(++logIdRef.current, {
        time: new Date().toLocaleTimeString(),
        market: 'SYSTEM',
        symbol: 'ERROR',
        contract: 'BALANCE',
        stake: 0,
        martingaleStep: 0,
        exitDigit: '-',
        result: 'Failed',
        pnl: 0,
        balance: currentBalanceLocal,
        switchInfo: `❌ Insufficient balance! Required: $${baseStakeLocal.toFixed(2)}, Available: $${currentBalanceLocal.toFixed(2)}`,
      });
      return;
    }

    shouldStopRef.current = false;
    setIsRunning(true);
    runningRef.current = true;
    setBotStatus(inRecoveryLocal ? 'recovery' : 'trading_m1');
    setCurrentStakeState(cStakeLocal);
    setMartingaleStepState(mStepLocal);
    setNetProfit(currentPnlLocal);
    tpNotifiedRef.current = false;
    slNotifiedRef.current = false;
    lastPnlRef.current = currentPnlLocal;

    let cStake = cStakeLocal;
    let mStep = mStepLocal;
    let inRecovery = inRecoveryLocal;
    let currentPnl = currentPnlLocal;
    let currentBalance = currentBalanceLocal;

    const getConfig = (market: 1 | 2) => ({
      contract: market === 1 ? m1Contract : m2Contract,
      barrier: market === 1 ? m1Barrier : m2Barrier,
      symbol: market === 1 ? m1Symbol : m2Symbol,
    });

    while (runningRef.current && !shouldStopRef.current) {
      if (currentPnl >= parseFloat(takeProfit) || currentPnl <= -parseFloat(stopLoss)) {
        shouldStopRef.current = true;
        break;
      }
      
      if (!derivApi.isConnected) {
        saveBotState();
        const reconnected = await ensureConnection();
        if (!reconnected) {
          break;
        }
        restoreBotState();
        cStake = currentStake;
        mStep = martingaleStep;
        inRecovery = currentMarket === 2;
        currentPnl = netProfit;
        currentBalance = localBalance;
      }
      
      const mkt: 1 | 2 = inRecovery ? 2 : 1;
      setCurrentMarket(mkt);

      if (mkt === 1 && !m1Enabled) { 
        if (m2Enabled) { 
          inRecovery = true; 
          continue; 
        } else break; 
      }
      if (mkt === 2 && !m2Enabled) { 
        inRecovery = false; 
        continue; 
      }

      let tradeSymbol: string;
      const cfg = getConfig(mkt);
      const hookEnabled = mkt === 1 ? m1HookEnabled : m2HookEnabled;
      const requiredLosses = parseInt(mkt === 1 ? m1VirtualLossCount : m2VirtualLossCount) || 3;
      const realCount = parseInt(mkt === 1 ? m1RealCount : m2RealCount) || 2;

      if ((mkt === 2 && strategyEnabled) || (mkt === 1 && strategyM1Enabled)) {
        patternTradeTakenRef.current = false;
      }

      if (inRecovery && strategyEnabled) {
        setBotStatus('waiting_pattern');
        let matched = false;
        let matchedSymbol = '';
        let attempts = 0;
        const MAX_ATTEMPTS = 100;
        
        while (runningRef.current && !matched && attempts < MAX_ATTEMPTS && !shouldStopRef.current) {
          if (!derivApi.isConnected) {
            const reconnected = await ensureConnection();
            if (!reconnected) break;
          }
          
          if (scannerActive) {
            const found = findScannerMatchForMarket(2);
            if (found) { 
              matched = true; 
              matchedSymbol = found; 
            }
          } else {
            if (checkStrategyForMarket(cfg.symbol, 2)) { 
              matched = true; 
              matchedSymbol = cfg.symbol; 
            }
          }
          if (!matched) {
            await new Promise<void>(r => {
              if (turboMode) requestAnimationFrame(() => r());
              else setTimeout(r, 100);
            });
            attempts++;
          }
        }
        if (!runningRef.current || !matched || shouldStopRef.current) continue;

        setBotStatus('pattern_matched');
        tradeSymbol = matchedSymbol;
        if (!turboMode) await new Promise(r => setTimeout(r, 300));
      }
      else if (!inRecovery && strategyM1Enabled) {
        setBotStatus('waiting_pattern');
        let matched = false;
        let attempts = 0;
        const MAX_ATTEMPTS = 100;
        
        while (runningRef.current && !matched && attempts < MAX_ATTEMPTS && !shouldStopRef.current) {
          if (!derivApi.isConnected) {
            const reconnected = await ensureConnection();
            if (!reconnected) break;
          }
          
          if (checkStrategyForMarket(cfg.symbol, 1)) { 
            matched = true; 
          }
          if (!matched) {
            await new Promise<void>(r => {
              if (turboMode) requestAnimationFrame(() => r());
              else setTimeout(r, 100);
            });
            attempts++;
          }
        }
        if (!runningRef.current || !matched || shouldStopRef.current) continue;

        setBotStatus('pattern_matched');
        tradeSymbol = cfg.symbol;
        if (!turboMode) await new Promise(r => setTimeout(r, 300));
      } else {
        setBotStatus(mkt === 1 ? 'trading_m1' : 'recovery');
        tradeSymbol = cfg.symbol;
      }

      if (shouldStopRef.current) break;

      if (((inRecovery && strategyEnabled) || (!inRecovery && strategyM1Enabled)) && patternTradeTakenRef.current) {
        patternTradeTakenRef.current = false;
        continue;
      }

      if (hookEnabled) {
        setBotStatus('virtual_hook');
        setVhStatus('waiting');
        setVhFakeWins(0);
        setVhFakeLosses(0);
        setVhConsecLosses(0);
        let consecLosses = 0;
        let virtualTradeNum = 0;

        while (consecLosses < requiredLosses && runningRef.current && !shouldStopRef.current) {
          if (!derivApi.isConnected) {
            const reconnected = await ensureConnection();
            if (!reconnected) break;
          }
          
          virtualTradeNum++;
          const vLogId = ++logIdRef.current;
          const vNow = new Date().toLocaleTimeString();
          addLog(vLogId, {
            time: vNow, 
            market: 'VH', 
            symbol: tradeSymbol,
            contract: cfg.contract, 
            stake: 0, 
            martingaleStep: 0,
            exitDigit: '...', 
            result: 'Pending', 
            pnl: 0, 
            balance: currentBalance,
            switchInfo: `Virtual #${virtualTradeNum} (losses: ${consecLosses}/${requiredLosses})`,
          });

          try {
            const vResult = await simulateVirtualContract(cfg.contract, cfg.barrier, tradeSymbol);
            if (!runningRef.current || shouldStopRef.current) break;

            if (vResult.won) {
              consecLosses = 0;
              setVhConsecLosses(0);
              setVhFakeWins(prev => prev + 1);
              updateLog(vLogId, { 
                exitDigit: String(vResult.digit), 
                result: 'V-Win', 
                switchInfo: `Virtual WIN → Losses reset (0/${requiredLosses})` 
              });
            } else {
              consecLosses++;
              setVhConsecLosses(consecLosses);
              setVhFakeLosses(prev => prev + 1);
              updateLog(vLogId, { 
                exitDigit: String(vResult.digit), 
                result: 'V-Loss', 
                switchInfo: `Virtual LOSS (${consecLosses}/${requiredLosses})` 
              });
            }
          } catch (err) {
            console.error('Virtual simulation error:', err);
            updateLog(vLogId, { result: 'V-Loss', exitDigit: '-', switchInfo: `Error: ${err}` });
            break;
          }
        }

        if (!runningRef.current || shouldStopRef.current) break;

        setVhStatus('confirmed');

        let winOccurred = false;
        
        for (let ri = 0; ri < realCount && runningRef.current && !winOccurred && !shouldStopRef.current; ri++) {
          const result = await executeRealTrade(
            cfg, tradeSymbol, cStake, mStep, mkt, currentBalance, currentPnl, baseStakeLocal
          );
          if (!result || !runningRef.current) break;
          
          if (result.contractExecuted) {
            currentPnl = result.localPnl;
            currentBalance = result.localBalance;
            cStake = result.cStake;
            mStep = result.mStep;
            inRecovery = result.inRecovery;
          }

          if (result.shouldBreak) {
            shouldStopRef.current = true;
            runningRef.current = false;
            break;
          }

          if (result.won) {
            winOccurred = true;
            const winLogId = ++logIdRef.current;
            addLog(winLogId, {
              time: new Date().toLocaleTimeString(),
              market: 'VH',
              symbol: tradeSymbol,
              contract: cfg.contract,
              stake: 0,
              martingaleStep: 0,
              exitDigit: '-',
              result: 'Pending',
              pnl: 0,
              balance: currentBalance,
              switchInfo: `✅ REAL WIN DETECTED! Immediate exit from hook mode.`
            });
            break;
          }
        }

        setVhStatus('idle');
        setVhConsecLosses(0);
        
        if ((inRecovery && strategyEnabled) || (!inRecovery && strategyM1Enabled)) {
          patternTradeTakenRef.current = true;
        }
        
        if (!runningRef.current || shouldStopRef.current) break;
        continue;
      }

      const result = await executeRealTrade(
        cfg, tradeSymbol, cStake, mStep, mkt, currentBalance, currentPnl, baseStakeLocal
      );
      if (!result || !runningRef.current) break;
      
      if (result.contractExecuted) {
        currentPnl = result.localPnl;
        currentBalance = result.localBalance;
        cStake = result.cStake;
        mStep = result.mStep;
        inRecovery = result.inRecovery;
      }

      if (result.shouldBreak) {
        shouldStopRef.current = true;
        break;
      }

      if ((inRecovery && strategyEnabled) || (!inRecovery && strategyM1Enabled)) {
        patternTradeTakenRef.current = true;
      }

      if (!turboMode) await new Promise(r => setTimeout(r, 400));
    }

    setIsRunning(false);
    runningRef.current = false;
    setBotStatus('idle');
    patternTradeTakenRef.current = false;
    shouldStopRef.current = false;
    savedBotStateRef.current = null;
    
    updateBalanceImmediately().catch(console.error);
  }, [isAuthorized, isRunning, stake, m1Enabled, m2Enabled, m1Contract, m2Contract,
    m1Barrier, m2Barrier, m1Symbol, m2Symbol, martingaleOn, martingaleMultiplier, martingaleMaxSteps,
    takeProfit, stopLoss, strategyEnabled, strategyM1Enabled, m1StrategyMode, m2StrategyMode, 
    m1PatternValid, m2PatternValid, scannerActive, findScannerMatchForMarket, checkStrategyForMarket, 
    addLog, updateLog, turboMode, m1HookEnabled, m2HookEnabled, m1VirtualLossCount, m2VirtualLossCount, 
    m1RealCount, m2RealCount, ensureConnection, executeRealTrade, updateBalanceImmediately, 
    balanceCache, refreshBalance, authBalance, currentStake, martingaleStep, currentMarket, 
    netProfit, localBalance, vhFakeWins, vhFakeLosses, vhConsecLosses, vhStatus, saveBotState, 
    restoreBotState]);

  const stopBot = useCallback(() => {
    shouldStopRef.current = true;
    runningRef.current = false;
    setIsRunning(false);
    setBotStatus('idle');
    patternTradeTakenRef.current = false;
  }, []);

  const statusConfig: Record<BotStatus, { icon: string; label: string; color: string }> = {
    idle: { icon: '⚪', label: 'IDLE', color: 'text-muted-foreground' },
    trading_m1: { icon: '🟢', label: 'TRADING M1', color: 'text-profit' },
    recovery: { icon: '🟣', label: 'RECOVERY MODE', color: 'text-purple-400' },
    waiting_pattern: { icon: '🟡', label: 'WAITING PATTERN', color: 'text-warning' },
    pattern_matched: { icon: '✅', label: 'PATTERN MATCHED', color: 'text-profit' },
    virtual_hook: { icon: '🎣', label: 'VIRTUAL HOOK', color: 'text-primary' },
    reconnecting: { icon: '🔄', label: 'RECONNECTING...', color: 'text-orange-400' },
  };

  const status = statusConfig[botStatus];
  const winRate = wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : '0.0';

  const currentConfig = useMemo<BotConfig>(() => ({
    version: 1,
    m1: { enabled: m1Enabled, symbol: m1Symbol, contract: m1Contract, barrier: m1Barrier, hookEnabled: m1HookEnabled, virtualLossCount: m1VirtualLossCount, realCount: m1RealCount },
    m2: { enabled: m2Enabled, symbol: m2Symbol, contract: m2Contract, barrier: m2Barrier, hookEnabled: m2HookEnabled, virtualLossCount: m2VirtualLossCount, realCount: m2RealCount },
    risk: { stake, martingaleOn, martingaleMultiplier, martingaleMaxSteps, takeProfit, stopLoss },
    strategy: { m1Enabled: strategyM1Enabled, m2Enabled: strategyEnabled, m1Mode: m1StrategyMode, m2Mode: m2StrategyMode, m1Pattern, m1DigitCondition, m1DigitCompare, m1DigitWindow, m2Pattern, m2DigitCondition, m2DigitCompare, m2DigitWindow },
    scanner: { active: scannerActive },
    turbo: { enabled: turboMode },
  }), [m1Enabled, m1Symbol, m1Contract, m1Barrier, m1HookEnabled, m1VirtualLossCount, m1RealCount, m2Enabled, m2Symbol, m2Contract, m2Barrier, m2HookEnabled, m2VirtualLossCount, m2RealCount, stake, martingaleOn, martingaleMultiplier, martingaleMaxSteps, takeProfit, stopLoss, strategyM1Enabled, strategyEnabled, m1StrategyMode, m2StrategyMode, m1Pattern, m1DigitCondition, m1DigitCompare, m1DigitWindow, m2Pattern, m2DigitCondition, m2DigitCompare, m2DigitWindow, scannerActive, turboMode]);

  const handleLoadConfig = useCallback((cfg: BotConfig) => {
    if (cfg.m1) {
      if (cfg.m1.enabled !== undefined) setM1Enabled(cfg.m1.enabled);
      if (cfg.m1.symbol) setM1Symbol(cfg.m1.symbol);
      if (cfg.m1.contract) setM1Contract(cfg.m1.contract);
      if (cfg.m1.barrier) setM1Barrier(cfg.m1.barrier);
      if (cfg.m1.hookEnabled !== undefined) setM1HookEnabled(cfg.m1.hookEnabled);
      if (cfg.m1.virtualLossCount) setM1VirtualLossCount(cfg.m1.virtualLossCount);
      if (cfg.m1.realCount) setM1RealCount(cfg.m1.realCount);
    }
    if (cfg.m2) {
      if (cfg.m2.enabled !== undefined) setM2Enabled(cfg.m2.enabled);
      if (cfg.m2.symbol) setM2Symbol(cfg.m2.symbol);
      if (cfg.m2.contract) setM2Contract(cfg.m2.contract);
      if (cfg.m2.barrier) setM2Barrier(cfg.m2.barrier);
      if (cfg.m2.hookEnabled !== undefined) setM2HookEnabled(cfg.m2.hookEnabled);
      if (cfg.m2.virtualLossCount) setM2VirtualLossCount(cfg.m2.virtualLossCount);
      if (cfg.m2.realCount) setM2RealCount(cfg.m2.realCount);
    }
    if (cfg.risk) {
      if (cfg.risk.stake) setStake(cfg.risk.stake);
      if (cfg.risk.martingaleOn !== undefined) setMartingaleOn(cfg.risk.martingaleOn);
      if (cfg.risk.martingaleMultiplier) setMartingaleMultiplier(cfg.risk.martingaleMultiplier);
      if (cfg.risk.martingaleMaxSteps) setMartingaleMaxSteps(cfg.risk.martingaleMaxSteps);
      if (cfg.risk.takeProfit) setTakeProfit(cfg.risk.takeProfit);
      if (cfg.risk.stopLoss) setStopLoss(cfg.risk.stopLoss);
    }
    if (cfg.strategy) {
      if (cfg.strategy.m1Enabled !== undefined) setStrategyM1Enabled(cfg.strategy.m1Enabled);
      if (cfg.strategy.m2Enabled !== undefined) setStrategyEnabled(cfg.strategy.m2Enabled);
      if (cfg.strategy.m1Mode) setM1StrategyMode(cfg.strategy.m1Mode);
      if (cfg.strategy.m2Mode) setM2StrategyMode(cfg.strategy.m2Mode);
      if (cfg.strategy.m1Pattern !== undefined) setM1Pattern(cfg.strategy.m1Pattern);
      if (cfg.strategy.m1DigitCondition) setM1DigitCondition(cfg.strategy.m1DigitCondition);
      if (cfg.strategy.m1DigitCompare) setM1DigitCompare(cfg.strategy.m1DigitCompare);
      if (cfg.strategy.m1DigitWindow) setM1DigitWindow(cfg.strategy.m1DigitWindow);
      if (cfg.strategy.m2Pattern !== undefined) setM2Pattern(cfg.strategy.m2Pattern);
      if (cfg.strategy.m2DigitCondition) setM2DigitCondition(cfg.strategy.m2DigitCondition);
      if (cfg.strategy.m2DigitCompare) setM2DigitCompare(cfg.strategy.m2DigitCompare);
      if (cfg.strategy.m2DigitWindow) setM2DigitWindow(cfg.strategy.m2DigitWindow);
    }
    if (cfg.scanner?.active !== undefined) setScannerActive(cfg.scanner.active);
    if (cfg.turbo?.enabled !== undefined) setTurboMode(cfg.turbo.enabled);
    if ((cfg as any).botName) setBotName((cfg as any).botName);
  }, []);

  useEffect(() => {
    const state = location.state as { loadConfig?: BotConfig } | null;
    if (state?.loadConfig) {
      handleLoadConfig(state.loadConfig);
      window.history.replaceState({}, '');
    }
  }, [location.state, handleLoadConfig]);

  const activeSymbol = currentMarket === 1 ? m1Symbol : m2Symbol;
  const activeDigits = (tickMapRef.current.get(activeSymbol) || []).slice(-8);

  const handleOpenTradingChart = () => {
    setIsChartAnimating(true);
    setShowTradingChart(true);
    setTimeout(() => setIsChartAnimating(false), 400);
  };

  const handleCloseTradingChart = () => {
    setIsChartAnimating(true);
    setShowTradingChart(false);
    setTimeout(() => setIsChartAnimating(false), 400);
  };

  const handleCloseSocialPopup = () => {
    setShowSocialPopup(false);
  };

  return (
    <>
      <style>{notificationStyles}</style>
      
      {/* Floating Chart Button - Positioned at bottom right */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          ref={chartButtonRef}
          onClick={handleOpenTradingChart}
          className={`
            group relative w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 
            shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 
            transition-all duration-300 hover:scale-110 active:scale-95
            flex items-center justify-center
            before:absolute before:inset-0 before:rounded-full before:bg-blue-500/30 before:animate-ping before:opacity-75
          `}
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
          <BarChart3 className="w-5 h-5 text-white relative z-10" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse ring-2 ring-white" />
        </button>
      </div>

      {/* Social Notification Popup */}
      {showSocialPopup && <SocialNotificationPopup onClose={handleCloseSocialPopup} />}

      {/* Trading Chart Popup */}
      {showTradingChart && (
        <TradingChartPopup onClose={handleCloseTradingChart} isRunning={isRunning} />
      )}

      <div className="space-y-3 max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-card/80 to-card/50 backdrop-blur-sm border border-blue-500/20 rounded-xl px-4 py-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
              <Scan className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Ramzfx Pro Scanner Bot</h1>
              <p className="text-[10px] text-blue-300/80">Ramzfx Advanced Market Scanning & Recovery System</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${status.color} text-[9px] px-2 py-0.5 bg-muted/50 border-blue-500/20`}>
              {status.icon} {status.label}
            </Badge>
            {isRunning && (
              <Badge variant="outline" className="text-[9px] text-warning animate-pulse font-mono border-yellow-500/30">
                P/L: ${netProfit.toFixed(2)}
              </Badge>
            )}
          </div>
        </div>

        {/* Scanner + Turbo + Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-card border border-blue-500/20 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-semibold">Scan All Markets </span>
                <Badge variant={scannerActive ? 'default' : 'secondary'} className="text-[9px] h-4 px-1.5">
                  {scannerActive ? '🟢 ON' : '⚫ OFF'}
                </Badge>
              </div>
              <Switch checked={scannerActive} onCheckedChange={setScannerActive} disabled={isRunning} />
            </div>
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {SCANNER_MARKETS.map(m => {
                const count = tickCounts[m.symbol] || 0;
                return (
                  <Badge key={m.symbol} variant="outline"
                    className={`text-[8px] h-5 px-1 font-mono ${count > 0 ? 'border-blue-500/50 text-blue-400' : 'text-muted-foreground'}`}>
                    {m.name}
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="bg-card border border-blue-500/20 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Zap className={`w-3.5 h-3.5 ${turboMode ? 'text-blue-400 animate-pulse' : 'text-muted-foreground'}`} />
                <span className="text-xs font-semibold">Turbo Mode</span>
              </div>
              <Button
                size="sm"
                variant={turboMode ? 'default' : 'outline'}
                className={`h-6 text-[9px] px-2 ${turboMode ? 'bg-blue-500 hover:bg-blue-600 text-white animate-pulse' : ''}`}
                onClick={() => setTurboMode(!turboMode)}
                disabled={isRunning}
              >
                {turboMode ? '⚡ ON' : 'OFF'}
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-1 text-center">
              <div className="bg-muted/50 rounded p-1">
                <div className="text-[8px] text-muted-foreground">Latency</div>
                <div className="font-mono text-[10px] text-blue-400 font-bold">{turboLatency}ms</div>
              </div>
              <div className="bg-muted/50 rounded p-1">
                <div className="text-[8px] text-muted-foreground">Captured</div>
                <div className="font-mono text-[10px] text-profit font-bold">{ticksCaptured}</div>
              </div>
              <div className="bg-muted/50 rounded p-1">
                <div className="text-[8px] text-muted-foreground">Missed</div>
                <div className="font-mono text-[10px] text-loss font-bold">{ticksMissed}</div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-blue-500/20 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold">Live Stats</span>
              <span className="font-mono text-sm font-bold text-blue-400">${localBalance.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-center">
              <div className="bg-muted/50 rounded p-1">
                <div className="text-[8px] text-muted-foreground">W/L</div>
                <div className="font-mono text-[10px] font-bold"><span className="text-profit">{wins}</span>/<span className="text-loss">{losses}</span></div>
              </div>
              <div className="bg-muted/50 rounded p-1">
                <div className="text-[8px] text-muted-foreground">P/L</div>
                <div className={`font-mono text-[10px] font-bold ${netProfit >= 0 ? 'text-profit' : 'text-loss'}`}>${netProfit.toFixed(2)}</div>
              </div>
              <div className="bg-muted/50 rounded p-1">
                <div className="text-[8px] text-muted-foreground">Stake</div>
                <div className="font-mono text-[10px] font-bold text-foreground">${currentStake.toFixed(2)}{martingaleStep > 0 && <span className="text-warning ml-0.5">M{martingaleStep}</span>}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* LEFT: Config Column */}
          <div className="lg:col-span-4 space-y-3">
            {/* Market Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3">
              <div className="bg-card border-2 border-blue-500/30 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-blue-400 flex items-center gap-1"><Home className="w-3.5 h-3.5" /> M1 — Home</h3>
                  <div className="flex items-center gap-1.5">
                    {currentMarket === 1 && isRunning && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
                    <Switch checked={m1Enabled} onCheckedChange={setM1Enabled} disabled={isRunning} />
                  </div>
                </div>
                <Select value={m1Symbol} onValueChange={v => setM1Symbol(v)} disabled={isRunning}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{SCANNER_MARKETS.map(m => <SelectItem key={m.symbol} value={m.symbol}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={m1Contract} onValueChange={v => setM1Contract(v)} disabled={isRunning}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{CONTRACT_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                {needsBarrier(m1Contract) && (
                  <Input type="number" min="0" max="9" value={m1Barrier} onChange={e => setM1Barrier(e.target.value)} className="h-7 text-xs" disabled={isRunning} />
                )}
                <div className="border-t border-border/30 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold text-blue-400 flex items-center gap-1"><Anchor className="w-3 h-3" /> Virtual Hook</span>
                    <Switch checked={m1HookEnabled} onCheckedChange={setM1HookEnabled} disabled={isRunning} />
                  </div>
                  {m1HookEnabled && (
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      <div>
                        <label className="text-[8px] text-muted-foreground">V-Losses</label>
                        <Input type="number" min="1" max="20" value={m1VirtualLossCount} onChange={e => setM1VirtualLossCount(e.target.value)} disabled={isRunning} className="h-6 text-[10px]" />
                      </div>
                      <div>
                        <label className="text-[8px] text-muted-foreground">Real Trades</label>
                        <Input type="number" min="1" max="10" value={m1RealCount} onChange={e => setM1RealCount(e.target.value)} disabled={isRunning} className="h-6 text-[10px]" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-card border-2 border-purple-500/30 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-purple-400 flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> M2 — Recovery</h3>
                  <div className="flex items-center gap-1.5">
                    {currentMarket === 2 && isRunning && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />}
                    <Switch checked={m2Enabled} onCheckedChange={setM2Enabled} disabled={isRunning} />
                  </div>
                </div>
                <Select value={m2Symbol} onValueChange={v => setM2Symbol(v)} disabled={isRunning}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{SCANNER_MARKETS.map(m => <SelectItem key={m.symbol} value={m.symbol}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={m2Contract} onValueChange={v => setM2Contract(v)} disabled={isRunning}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{CONTRACT_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                {needsBarrier(m2Contract) && (
                  <Input type="number" min="0" max="9" value={m2Barrier} onChange={e => setM2Barrier(e.target.value)} className="h-7 text-xs" disabled={isRunning} />
                )}
                <div className="border-t border-border/30 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold text-blue-400 flex items-center gap-1"><Anchor className="w-3 h-3" /> Virtual Hook</span>
                    <Switch checked={m2HookEnabled} onCheckedChange={setM2HookEnabled} disabled={isRunning} />
                  </div>
                  {m2HookEnabled && (
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      <div>
                        <label className="text-[8px] text-muted-foreground">V-Losses</label>
                        <Input type="number" min="1" max="20" value={m2VirtualLossCount} onChange={e => setM2VirtualLossCount(e.target.value)} disabled={isRunning} className="h-6 text-[10px]" />
                      </div>
                      <div>
                        <label className="text-[8px] text-muted-foreground">Real Trades</label>
                        <Input type="number" min="1" max="10" value={m2RealCount} onChange={e => setM2RealCount(e.target.value)} disabled={isRunning} className="h-6 text-[10px]" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Virtual Hook Stats */}
            {(m1HookEnabled || m2HookEnabled) && (
              <div className="bg-card border border-blue-500/30 rounded-xl p-3">
                <h3 className="text-[10px] font-semibold text-blue-400 flex items-center gap-1 mb-2"><Anchor className="w-3 h-3" /> Hook Status</h3>
                <div className="grid grid-cols-4 gap-1 text-center">
                  <div className="bg-muted/50 rounded p-1">
                    <div className="text-[8px] text-muted-foreground">V-Win</div>
                    <div className="font-mono text-[10px] font-bold text-profit">{vhFakeWins}</div>
                  </div>
                  <div className="bg-muted/50 rounded p-1">
                    <div className="text-[8px] text-muted-foreground">V-Loss</div>
                    <div className="font-mono text-[10px] font-bold text-loss">{vhFakeLosses}</div>
                  </div>
                  <div className="bg-muted/50 rounded p-1">
                    <div className="text-[8px] text-muted-foreground">Streak</div>
                    <div className="font-mono text-[10px] font-bold text-warning">{vhConsecLosses}</div>
                  </div>
                  <div className="bg-muted/50 rounded p-1">
                    <div className="text-[8px] text-muted-foreground">State</div>
                    <div className={`text-[9px] font-bold ${vhStatus === 'confirmed' ? 'text-profit' : vhStatus === 'waiting' ? 'text-warning animate-pulse' : 'text-muted-foreground'}`}>
                      {vhStatus === 'confirmed' ? '✓' : vhStatus === 'waiting' ? '⏳' : '—'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Risk */}
            <div className="bg-card border border-blue-500/20 rounded-xl p-3 space-y-2">
              <h3 className="text-xs font-semibold flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Risk Management</h3>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[8px] text-muted-foreground">Stake ($)</label>
                  <Input type="number" min="0.35" step="0.01" value={stake} onChange={e => setStake(e.target.value)} disabled={isRunning} className="h-7 text-xs" />
                </div>
                <div>
                  <label className="text-[8px] text-muted-foreground">Take Profit</label>
                  <Input type="number" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} disabled={isRunning} className="h-7 text-xs" />
                </div>
                <div>
                  <label className="text-[8px] text-muted-foreground">Stop Loss</label>
                  <Input type="number" value={stopLoss} onChange={e => setStopLoss(e.target.value)} disabled={isRunning} className="h-7 text-xs" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[10px]">Martingale</label>
                <Switch checked={martingaleOn} onCheckedChange={setMartingaleOn} disabled={isRunning} />
              </div>
              {martingaleOn && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[8px] text-muted-foreground">Multiplier</label>
                    <Input type="number" min="1.1" step="0.1" value={martingaleMultiplier} onChange={e => setMartingaleMultiplier(e.target.value)} disabled={isRunning} className="h-7 text-xs" />
                  </div>
                  <div>
                    <label className="text-[8px] text-muted-foreground">Max Steps</label>
                    <Input type="number" min="1" max="10" value={martingaleMaxSteps} onChange={e => setMartingaleMaxSteps(e.target.value)} disabled={isRunning} className="h-7 text-xs" />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-1 text-[10px]">
                  <input type="checkbox" checked={strategyM1Enabled} onChange={e => setStrategyM1Enabled(e.target.checked)} disabled={isRunning} className="rounded w-3 h-3" />
                  Strategy M1
                </label>
                <label className="flex items-center gap-1 text-[10px]">
                  <input type="checkbox" checked={strategyEnabled} onChange={e => setStrategyEnabled(e.target.checked)} disabled={isRunning} className="rounded w-3 h-3" />
                  Strategy M2
                </label>
              </div>
            </div>

            {/* Strategy Card */}
            {(strategyEnabled || strategyM1Enabled) && (
              <div className="bg-card border border-yellow-500/30 rounded-xl p-3 space-y-2">
                <h3 className="text-xs font-semibold text-yellow-500 flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Strategy Conditions</h3>
                {strategyM1Enabled && (
                  <div className="border border-blue-500/20 rounded-lg p-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-semibold text-blue-400">M1 Strategy</label>
                      <div className="flex gap-0.5">
                        <Button size="sm" variant={m1StrategyMode === 'pattern' ? 'default' : 'outline'} className="text-[9px] h-5 px-1.5" onClick={() => setM1StrategyMode('pattern')} disabled={isRunning}>Pattern</Button>
                        <Button size="sm" variant={m1StrategyMode === 'digit' ? 'default' : 'outline'} className="text-[9px] h-5 px-1.5" onClick={() => setM1StrategyMode('digit')} disabled={isRunning}>Digit</Button>
                      </div>
                    </div>
                    {m1StrategyMode === 'pattern' ? (
                      <>
                        <Textarea placeholder="E=Even O=Odd e.g. EEEOE" value={m1Pattern} onChange={e => setM1Pattern(e.target.value.toUpperCase().replace(/[^EO]/g, ''))} disabled={isRunning} className="h-10 text-[10px] font-mono min-h-0" />
                        <div className={`text-[9px] font-mono ${m1PatternValid ? 'text-profit' : 'text-loss'}`}>
                          {cleanM1Pattern.length === 0 ? 'Enter pattern...' : m1PatternValid ? `✓ ${cleanM1Pattern}` : `✗ Need 2+`}
                        </div>
                      </>
                    ) : (
                      <div className="grid grid-cols-3 gap-1">
                        <Input type="number" min="1" max="50" value={m1DigitWindow} onChange={e => setM1DigitWindow(e.target.value)} disabled={isRunning} className="h-6 text-[10px]" placeholder="Window" />
                        <Select value={m1DigitCondition} onValueChange={setM1DigitCondition} disabled={isRunning}>
                          <SelectTrigger className="h-6 text-[10px]"><SelectValue /></SelectTrigger>
                          <SelectContent>{['==', '>', '<', '>=', '<='].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input type="number" min="0" max="9" value={m1DigitCompare} onChange={e => setM1DigitCompare(e.target.value)} disabled={isRunning} className="h-6 text-[10px]" placeholder="Digit" />
                      </div>
                    )}
                  </div>
                )}
                {strategyEnabled && (
                  <div className="border border-purple-500/20 rounded-lg p-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-semibold text-purple-400">M2 Strategy</label>
                      <div className="flex gap-0.5">
                        <Button size="sm" variant={m2StrategyMode === 'pattern' ? 'default' : 'outline'} className="text-[9px] h-5 px-1.5" onClick={() => setM2StrategyMode('pattern')} disabled={isRunning}>Pattern</Button>
                        <Button size="sm" variant={m2StrategyMode === 'digit' ? 'default' : 'outline'} className="text-[9px] h-5 px-1.5" onClick={() => setM2StrategyMode('digit')} disabled={isRunning}>Digit</Button>
                      </div>
                    </div>
                    {m2StrategyMode === 'pattern' ? (
                      <>
                        <Textarea placeholder="E=Even O=Odd e.g. OOEEO" value={m2Pattern} onChange={e => setM2Pattern(e.target.value.toUpperCase().replace(/[^EO]/g, ''))} disabled={isRunning} className="h-10 text-[10px] font-mono min-h-0" />
                        <div className={`text-[9px] font-mono ${m2PatternValid ? 'text-profit' : 'text-loss'}`}>
                          {cleanM2Pattern.length === 0 ? 'Enter pattern...' : m2PatternValid ? `✓ ${cleanM2Pattern}` : `✗ Need 2+`}
                        </div>
                      </>
                    ) : (
                      <div className="grid grid-cols-3 gap-1">
                        <Input type="number" min="1" max="50" value={m2DigitWindow} onChange={e => setM2DigitWindow(e.target.value)} disabled={isRunning} className="h-6 text-[10px]" placeholder="Window" />
                        <Select value={m2DigitCondition} onValueChange={setM2DigitCondition} disabled={isRunning}>
                          <SelectTrigger className="h-6 text-[10px]"><SelectValue /></SelectTrigger>
                          <SelectContent>{['==', '>', '<', '>=', '<='].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input type="number" min="0" max="9" value={m2DigitCompare} onChange={e => setM2DigitCompare(e.target.value)} disabled={isRunning} className="h-6 text-[10px]" placeholder="Digit" />
                      </div>
                    )}
                  </div>
                )}
                {botStatus === 'waiting_pattern' && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-1.5 text-[9px] text-yellow-500 animate-pulse text-center font-semibold">⏳ WAITING FOR PATTERN...</div>
                )}
                {botStatus === 'pattern_matched' && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded p-1.5 text-[9px] text-green-500 text-center font-semibold animate-pulse">✅ PATTERN MATCHED! Taking trade...</div>
                )}
              </div>
            )}

            {/* Config Save/Load */}
            <div className="bg-card border border-blue-500/20 rounded-xl p-3 space-y-2">
              <h3 className="text-xs font-semibold">💾 Bot Config</h3>
              <Input placeholder="Enter bot name..." value={botName} onChange={e => setBotName(e.target.value)} disabled={isRunning} className="h-7 text-xs" />
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" disabled={isRunning || !botName.trim()} onClick={() => {
                  const safeName = botName.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
                  const config = { version: 1, botName: botName.trim(), m1: { enabled: m1Enabled, symbol: m1Symbol, contract: m1Contract, barrier: m1Barrier, hookEnabled: m1HookEnabled, virtualLossCount: m1VirtualLossCount, realCount: m1RealCount }, m2: { enabled: m2Enabled, symbol: m2Symbol, contract: m2Contract, barrier: m2Barrier, hookEnabled: m2HookEnabled, virtualLossCount: m2VirtualLossCount, realCount: m2RealCount }, risk: { stake, martingaleOn, martingaleMultiplier, martingaleMaxSteps, takeProfit, stopLoss }, strategy: { m1Enabled: strategyM1Enabled, m2Enabled: strategyEnabled, m1Mode: m1StrategyMode, m2Mode: m2StrategyMode, m1Pattern, m1DigitCondition, m1DigitCompare, m1DigitWindow, m2Pattern, m2DigitCondition, m2DigitCompare, m2DigitWindow }, scanner: { active: scannerActive }, turbo: { enabled: turboMode } };
                  const ts = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
                  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = `${safeName}_${ts}.json`; a.click();
                  URL.revokeObjectURL(url);
                }}>
                  <Download className="w-3 h-3" /> Save
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" disabled={isRunning} onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file'; input.accept = '.json';
                  input.onchange = (ev: any) => {
                    const file = ev.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      try {
                        const cfg = JSON.parse(e.target?.result as string);
                        if (!cfg.version || !cfg.m1 || !cfg.m2 || !cfg.risk) return;
                        handleLoadConfig(cfg);
                      } catch {}
                    };
                    reader.readAsText(file);
                  };
                  input.click();
                }}>
                  <Upload className="w-3 h-3" /> Load
                </Button>
              </div>
            </div>
          </div>

          {/* RIGHT: Digit Stream + Activity Log */}
          <div className="lg:col-span-8 space-y-3">
            {/* Live Digits */}
            <div className="bg-card border border-blue-500/20 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-semibold">Live Digits — {activeSymbol}</h3>
                <span className="text-[9px] text-muted-foreground font-mono">Win Rate: {winRate}% | Staked: ${totalStaked.toFixed(2)}</span>
              </div>
              <div className="flex gap-1 justify-center flex-wrap">
                {activeDigits.length === 0 ? (
                  <span className="text-[10px] text-muted-foreground">Waiting for ticks...</span>
                ) : activeDigits.map((d, i) => {
                  const isOver = d >= 5;
                  const isEven = d % 2 === 0;
                  const isLast = i === activeDigits.length - 1;
                  return (
                    <div key={i} className={`w-8 h-10 rounded-lg flex flex-col items-center justify-center text-xs font-mono font-bold border ${isLast ? 'ring-2 ring-blue-500 shadow-lg' : ''} ${isOver ? 'bg-loss/10 border-loss/30 text-loss' : 'bg-profit/10 border-profit/30 text-profit'}`}>
                      <span className="text-sm">{d}</span>
                      <span className="text-[7px] opacity-60">{isOver ? 'O' : 'U'}{isEven ? 'E' : 'O'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Animated Single Start/Stop Button */}
            <div className="relative">
              <button
                onClick={isRunning ? stopBot : startBot}
                disabled={(!isRunning && (!isAuthorized || localBalance < parseFloat(stake) || (!isConnected && !isReconnecting)))}
                className={`
                  relative w-full h-16 text-lg font-bold rounded-xl transition-all duration-300 ease-out overflow-hidden group
                  ${isRunning 
                    ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-500/30 animate-glow-pulse' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/30'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                  active:scale-98 transform
                `}
              >
                {isRunning && (
                  <>
                    <span className="absolute inset-0 bg-white/20 animate-pulse rounded-xl" />
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  </>
                )}
                
                <div className="relative flex items-center justify-center gap-3">
                  {isRunning ? (
                    <>
                      <StopCircle className="w-6 h-6 animate-pulse" />
                      <span className="flex items-center gap-2">
                        STOP BOT
                        <span className="flex gap-0.5">
                          <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      </span>
                    </>
                  ) : (
                    <>
                      <Play className="w-6 h-6 transition-transform group-hover:scale-110" />
                      <span className="flex items-center gap-2">
                        START BOT
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                        </span>
                      </span>
                    </>
                  )}
                </div>
              </button>
              
              {isRunning && botStatus !== 'idle' && (
                <div className="absolute -top-2 -right-2">
                  <Badge className="bg-blue-500 text-white text-[8px] animate-pulse">
                    {botStatus === 'trading_m1' ? '🟢 ACTIVE' : 
                     botStatus === 'recovery' ? '🟣 RECOVERY' :
                     botStatus === 'waiting_pattern' ? '🟡 SCANNING' :
                     botStatus === 'virtual_hook' ? '🎣 HOOK' : 
                     botStatus === 'pattern_matched' ? '✅ MATCHED' : 
                     botStatus === 'reconnecting' ? '🔄 RECONNECTING' : '⚪ RUNNING'}
                  </Badge>
                </div>
              )}
            </div>

            {/* DUPLICATE LIVE STATUS */}
            <div className="bg-card border border-blue-500/20 rounded-xl p-3 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-blue-400" />
                  Live Status (Realtime)
                </h3>
                {isRunning && (
                  <span className="flex items-center gap-1 text-[9px] text-profit animate-pulse">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-profit opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-profit"></span>
                    </span>
                    ACTIVE
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="bg-muted/40 rounded-lg p-2 text-center">
                  <div className="text-[8px] text-muted-foreground uppercase tracking-wider">Status</div>
                  <div className={`text-[11px] font-bold ${status.color} flex items-center justify-center gap-1`}>
                    <span>{status.icon}</span> {status.label}
                  </div>
                </div>
                <div className="bg-muted/40 rounded-lg p-2 text-center">
                  <div className="text-[8px] text-muted-foreground uppercase tracking-wider">Market</div>
                  <div className={`text-[11px] font-bold ${currentMarket === 1 ? 'text-blue-400' : 'text-purple-400'}`}>
                    {currentMarket === 1 ? 'M1 (HOME)' : 'M2 (RECOVERY)'}
                  </div>
                </div>
                <div className="bg-muted/40 rounded-lg p-2 text-center">
                  <div className="text-[8px] text-muted-foreground uppercase tracking-wider">Win Rate</div>
                  <div className="text-[11px] font-bold font-mono text-blue-400">{winRate}%</div>
                </div>
                <div className="bg-muted/40 rounded-lg p-2 text-center">
                  <div className="text-[8px] text-muted-foreground uppercase tracking-wider">Current P/L</div>
                  <div className={`text-[11px] font-bold font-mono ${netProfit >= 0 ? 'text-profit' : 'text-loss'}`}>
                    ${netProfit.toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                <div className="bg-muted/40 rounded-lg p-2 text-center">
                  <div className="text-[8px] text-muted-foreground uppercase tracking-wider">Current Stake</div>
                  <div className="text-[11px] font-bold font-mono">
                    ${currentStake.toFixed(2)}
                    {martingaleStep > 0 && <span className="text-warning ml-1">M{martingaleStep}</span>}
                  </div>
                </div>
                <div className="bg-muted/40 rounded-lg p-2 text-center">
                  <div className="text-[8px] text-muted-foreground uppercase tracking-wider">Balance</div>
                  <div className="text-[11px] font-bold font-mono text-blue-400">${localBalance.toFixed(2)}</div>
                </div>
                <div className="bg-muted/40 rounded-lg p-2 text-center">
                  <div className="text-[8px] text-muted-foreground uppercase tracking-wider">Total Staked</div>
                  <div className="text-[11px] font-bold font-mono">${totalStaked.toFixed(2)}</div>
                </div>
                <div className="bg-muted/40 rounded-lg p-2 text-center">
                  <div className="text-[8px] text-muted-foreground uppercase tracking-wider">W/L (Session)</div>
                  <div className="text-[11px] font-bold font-mono">
                    <span className="text-profit">{wins}</span>
                    <span className="text-muted-foreground mx-0.5">/</span>
                    <span className="text-loss">{losses}</span>
                  </div>
                </div>
              </div>
              {botStatus === 'virtual_hook' && (
                <div className="mt-2 text-center bg-blue-500/10 border border-blue-500/30 rounded-lg p-1.5">
                  <div className="text-[9px] text-blue-400 animate-pulse flex items-center justify-center gap-2">
                    <Anchor className="w-3 h-3" />
                    Virtual Hook Active — Waiting for {m1HookEnabled ? m1VirtualLossCount : m2VirtualLossCount} consecutive losses...
                    <span className="font-bold">({vhConsecLosses}/{m1HookEnabled ? m1VirtualLossCount : m2VirtualLossCount})</span>
                  </div>
                </div>
              )}
              {botStatus === 'waiting_pattern' && (
                <div className="mt-2 text-center bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-1.5">
                  <div className="text-[9px] text-yellow-500 animate-pulse flex items-center justify-center gap-2">
                    <Scan className="w-3 h-3" />
                    Scanning for pattern match...
                  </div>
                </div>
              )}
              {botStatus === 'reconnecting' && (
                <div className="mt-2 text-center bg-orange-500/10 border border-orange-500/30 rounded-lg p-1.5">
                  <div className="text-[9px] text-orange-500 animate-pulse flex items-center justify-center gap-2">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Reconnecting to Deriv... Preserving bot state...
                  </div>
                </div>
              )}
            </div>

            {/* Activity Log */}
            <div className="bg-card border border-blue-500/20 rounded-xl overflow-hidden shadow-lg flex flex-col">
              <div className="px-4 py-3 border-b border-blue-500/20 flex items-center justify-between gap-3 bg-muted/20">
                <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                  Activity Log
                  <Badge variant="outline" className="text-[9px] bg-blue-500/10 border-blue-500/30 text-blue-400">
                    {logEntries.length} entries
                  </Badge>
                </h3>
                <div className="flex items-center gap-2">
                  {logEntries.length > 0 && logEntries[0].switchInfo && (
                    <span className="text-[9px] text-muted-foreground font-mono hidden md:inline-block truncate max-w-[300px]">
                      📊 {logEntries[0].switchInfo}
                    </span>
                  )}
                  <Button variant="ghost" size="sm" onClick={clearLog} className="h-7 w-7 p-0 text-muted-foreground hover:text-loss transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 max-h-[calc(100vh-300px)] min-h-[400px] overflow-auto">
                <table className="w-full text-[10px]">
                  <thead className="text-[9px] text-muted-foreground bg-muted/40 sticky top-0 z-10">
                    <tr className="border-b border-blue-500/20">
                      <th className="text-left p-2 font-semibold">Time</th>
                      <th className="text-left p-2 font-semibold">Mkt</th>
                      <th className="text-left p-2 font-semibold">Symbol</th>
                      <th className="text-left p-2 font-semibold">Type</th>
                      <th className="text-right p-2 font-semibold">Stake</th>
                      <th className="text-center p-2 font-semibold">Digit</th>
                      <th className="text-center p-2 font-semibold">Result</th>
                      <th className="text-right p-2 font-semibold">P/L</th>
                      <th className="text-right p-2 font-semibold">Bal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logEntries.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center text-muted-foreground py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Zap className="w-8 h-8 text-muted-foreground/30" />
                            <span className="text-xs">No trades yet — configure and start the bot</span>
                          </div>
                        </td>
                      </tr>
                    ) : logEntries.map(e => (
                      <tr key={e.id} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                        e.market === 'M1' ? 'border-l-2 border-l-blue-500' :
                        e.market === 'VH' ? 'border-l-2 border-l-indigo-500' :
                        e.market === 'SYSTEM' ? 'border-l-2 border-l-orange-500' :
                        'border-l-2 border-l-purple-500'
                      }`}>
                        <td className="p-2 font-mono text-[9px] text-muted-foreground">{e.time}</td>
                        <td className={`p-2 font-bold text-[10px] ${
                          e.market === 'M1' ? 'text-blue-400' :
                          e.market === 'VH' ? 'text-indigo-400' :
                          e.market === 'SYSTEM' ? 'text-orange-500' :
                          'text-purple-400'
                        }`}>{e.market}</td>
                        <td className="p-2 font-mono text-[9px] text-foreground">{e.symbol}</td>
                        <td className="p-2 text-[9px] text-muted-foreground">{e.contract.replace('DIGIT', '')}</td>
                        <td className="p-2 font-mono text-right text-[9px]">
                          {e.market === 'VH' ? (
                            <span className="text-indigo-400">FAKE</span>
                          ) : e.market === 'SYSTEM' ? (
                            <span className="text-orange-500">SYS</span>
                          ) : (
                            <span className="text-foreground">${e.stake.toFixed(2)}</span>
                          )}
                          {e.martingaleStep > 0 && e.market !== 'VH' && e.market !== 'SYSTEM' && <span className="text-warning ml-1 font-bold">M{e.martingaleStep}</span>}
                        </td>
                        <td className="p-2 text-center font-mono text-[10px] font-bold">{e.exitDigit}</td>
                        <td className="p-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${
                            e.result === 'Win' ? 'bg-profit/20 text-profit border border-profit/30' :
                            e.result === 'Loss' ? 'bg-loss/20 text-loss border border-loss/30' :
                            e.result === 'V-Win' ? 'bg-profit/20 text-profit border border-profit/30' :
                            e.result === 'V-Loss' ? 'bg-loss/20 text-loss border border-loss/30' :
                            e.result === 'Failed' ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30' :
                            'bg-warning/20 text-warning animate-pulse border border-warning/30'
                          }`}>
                            {e.result === 'Pending' ? '...' : e.result === 'V-Win' ? '✓' : e.result === 'V-Loss' ? '✗' : e.result === 'Failed' ? '⚠️' : e.result}
                          </span>
                        </td>
                        <td className={`p-2 font-mono text-right text-[9px] font-bold ${
                          e.pnl > 0 ? 'text-profit' : e.pnl < 0 ? 'text-loss' : 'text-muted-foreground'
                        }`}>
                          {e.result === 'Pending' ? '...' : e.market === 'VH' || e.market === 'SYSTEM' || e.result === 'Failed' ? '-' : `${e.pnl > 0 ? '+' : ''}${e.pnl.toFixed(2)}`}
                        </td>
                        <td className="p-2 font-mono text-right text-[9px] text-muted-foreground">
                          {e.market === 'VH' || e.market === 'SYSTEM' || e.result === 'Failed' ? '-' : `$${e.balance.toFixed(2)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* TP/SL Notification Popup */}
      <TPSLNotificationPopup />
    </>
  );
}