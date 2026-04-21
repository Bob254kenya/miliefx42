import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Activity, Shield, TrendingUp, Zap, Users, MessageCircle, MessageSquare, Youtube, Instagram, Music, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import bgHero from '@/assets/bg-hero.jpeg';
import InstallButton from '@/components/InstallButton';

// ============================================
// SOCIAL NOTIFICATION POPUP - COMBINED CODE
// ============================================

// Animation Styles (add to your global CSS or component)
const socialNotificationStyles = `
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUpCenter {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
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
    transform: translateY(30px) scale(0.95);
  }
}

@keyframes gradientShift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

@keyframes float {
  0% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-10px) rotate(5deg);
  }
  100% {
    transform: translateY(0px) rotate(0deg);
  }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out forwards;
}

.animate-slide-up-center {
  animation: slideUpCenter 0.4s cubic-bezier(0.34, 1.2, 0.64, 1) forwards;
}

.animate-slide-down-center {
  animation: slideDownCenter 0.3s ease-out forwards;
}

.animate-gradient {
  background-size: 200% 200%;
  animation: gradientShift 3s ease infinite;
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}

.animate-bounce {
  animation: bounce 0.4s ease-in-out 2;
}

.animate-pulse-slow {
  animation: pulse 1s ease-in-out infinite;
}
`;

// Social Notification Component
const SocialNotificationPopup = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Check if notification has been shown before
    const hasBeenShown = localStorage.getItem('social_notification_shown');
    if (!hasBeenShown) {
      // Show after 30 seconds
      const timer = setTimeout(() => {
        setIsVisible(true);
        localStorage.setItem('social_notification_shown', 'true');
      }, 30000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
    }, 300);
  };

  const handleMaybeLater = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
    }, 300);
  };

  const socialLinks = [
    {
      name: 'WhatsApp',
      url: 'https://wa.me/+25494942149',
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
      name: 'Telegram Channel',
      url: ' https://www.instagram.com/aliceousmilliie?igsh=ZHJrZXFtdGViendx',
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

  if (!isVisible) return null;

  return (
    <>
      <style>{socialNotificationStyles}</style>
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div 
          className={`
            pointer-events-auto w-[500px] h-[400px] rounded-2xl shadow-2xl overflow-hidden
            ${isExiting ? 'animate-slide-down-center' : 'animate-slide-up-center'}
          `}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 animate-gradient" />
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className="absolute text-white/20 text-3xl animate-float"
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
          
          <div className="relative z-10 h-full flex flex-col">
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all duration-200 backdrop-blur-sm z-20"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="mb-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-xl animate-pulse-slow">
                  <Users className="w-7 h-7 text-white" />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-1 text-center">
                Join Our Trading Community
              </h2>
              <p className="text-sm text-white/90 mb-3 text-center">
                Connect & Grow Together
              </p>
              
              <p className="text-xs text-white/80 text-center max-w-md mb-4">
                Connect with fellow traders! Share your trading experiences, strategies, and get the latest updates on new features and classes.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4 w-full max-w-md">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleClose}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg bg-white/15 backdrop-blur-sm
                      border border-white/30 text-white transition-all duration-300
                      hover:scale-105 hover:bg-white/25 ${social.color}
                    `}
                  >
                    <div className={`p-1.5 rounded-lg bg-gradient-to-r ${social.bgGradient}`}>
                      {social.icon}
                    </div>
                    <span className="text-[10px] font-medium truncate">{social.name}</span>
                  </a>
                ))}
              </div>
              
              <div className="bg-cyan-500/30 border border-cyan-400/40 rounded-lg p-2 mb-3 max-w-md">
                <p className="text-[9px] text-cyan-100 text-center">
                  📢 Get access to strategies, bots and guides sent earlier on our channels
                </p>
              </div>
            </div>
            
            <div className="p-4 pt-0 flex gap-2">
              <button
                onClick={handleClose}
                className="flex-1 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-semibold transition-all duration-200 backdrop-blur-sm border border-white/30"
              >
                NO THANKS
              </button>
              <button
                onClick={handleMaybeLater}
                className="flex-1 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white text-sm font-semibold transition-all duration-200 shadow-lg"
              >
                MAYBE LATER
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ============================================
// MAIN LOGIN PAGE
// ============================================

export default function LoginPage() {
  const { login, isLoading } = useAuth();

  const affiliateUrl = 'https://partners.deriv.com/rx?sidc=12B9BBE9-886B-4B0A-A906-B5FC911F276A&utm_campaign=dynamicworks&utm_medium=affiliate&utm_source=CU15839';

  return (
    <>
      {/* Social Notification Popup */}
      <SocialNotificationPopup />
      
      {/* Install Button */}
      <InstallButton />
      
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <img src={bgHero} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-background/40" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="w-full max-w-md relative z-10"
        >
          {/* Logo / Brand */}
          <div className="text-center mb-10">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2, type: 'spring', stiffness: 200 }}
              className="inline-flex items-center gap-3 mb-4"
            >
              <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center glow-primary shadow-lg">
                <Activity className="w-7 h-7 text-primary-foreground" />
              </div>
              <div className="text-left">
                <h1 className="text-3xl font-bold text-foreground leading-tight">
                  Millie<span className="text-primary">FX</span>
                </h1>
                <p className="text-xs text-muted-foreground -mt-0.5">MillieFX.SITE</p>
              </div>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-muted-foreground text-sm max-w-xs mx-auto"
            >
              Advanced Digit Analysis & Auto-Trading Platform
            </motion.p>
          </div>

          {/* Login Card */}
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-card border border-border rounded-2xl p-8 glow-primary backdrop-blur-sm"
          >
            {/* Features */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              {[
                { icon: TrendingUp, label: 'Live Analysis', desc: 'Real-time signals' },
                { icon: Zap, label: 'Auto Trading', desc: 'Smart bots' },
                { icon: Shield, label: 'Secure Login', desc: 'Deriv OAuth' },
                { icon: Activity, label: 'Live Data', desc: 'Tick-by-tick' },
              ].map((feature, i) => (
                <motion.div
                  key={feature.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex items-center gap-3 text-sm bg-muted/30 rounded-xl p-3 border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <feature.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground text-xs">{feature.label}</div>
                    <div className="text-[10px] text-muted-foreground">{feature.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Login Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              <Button
                onClick={login}
                disabled={isLoading}
                className="w-full h-12 text-base font-semibold gradient-primary text-primary-foreground hover:opacity-90 transition-all glow-primary rounded-xl"
                size="lg"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Connecting...
                  </span>
                ) : (
                  'Login with Deriv'
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                Securely authenticate via Deriv OAuth 2.0
              </p>

              {/* Create Account Link */}
              <div className="text-center mt-4 pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-2">Don't have a Deriv account?</p>
                <a
                  href={affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Create Free Account
                  <TrendingUp className="w-3.5 h-3.5" />
                </a>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
            }
