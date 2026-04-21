import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  BarChart3,
  Bot,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const { activeAccount, balance, accountInfo } = useAuth();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const stats = [
    {
      label: 'Balance',
      value: `${balance.toFixed(2)} ${activeAccount?.currency || ''}`,
      icon: DollarSign,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      glow: 'shadow-emerald-500/20',
    },
    {
      label: 'Account Type',
      value: activeAccount?.is_virtual ? 'Demo' : 'Real',
      icon: activeAccount?.is_virtual ? Activity : TrendingUp,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      glow: 'shadow-blue-500/20',
    },
    {
      label: 'Login ID',
      value: activeAccount?.loginid || '-',
      icon: BarChart3,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      glow: 'shadow-amber-500/20',
    },
    {
      label: 'Email',
      value: accountInfo?.email || '-',
      icon: Bot,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      glow: 'shadow-purple-500/20',
    },
  ];

  const quickLinks = [
    {
      title: 'Markets',
      desc: 'View live markets & digit analysis',
      url: '/markets',
      icon: BarChart3,
      color: 'blue',
    },
    {
      title: 'Analyzer',
      desc: 'Deep digit analysis with signals',
      url: '/analyzer',
      icon: Activity,
      color: 'green',
    },
    {
      title: 'Auto Trade',
      desc: 'Configure and run auto-trading',
      url: '/auto-trade',
      icon: Bot,
      color: 'emerald',
    },
    {
      title: 'History',
      desc: 'View trade history & performance',
      url: '/history',
      icon: TrendingDown,
      color: 'amber',
    },
  ];

  // Generate floating dollar signs
  const floatingDollars = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: Math.random() * 5,
    duration: 10 + Math.random() * 10,
    size: 12 + Math.floor(Math.random() * 24),
    opacity: 0.1 + Math.random() * 0.2,
  }));

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated background with dollars */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {/* Gradient orb following mouse */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(16, 185, 129, 0.15) 0%, transparent 50%)`,
          }}
        />

        {/* Floating dollar signs */}
        {floatingDollars.map((dollar) => (
          <motion.div
            key={dollar.id}
            className="absolute text-emerald-500/20 font-mono font-bold pointer-events-none"
            style={{
              left: dollar.left,
              top: dollar.top,
              fontSize: dollar.size,
              opacity: dollar.opacity,
              zIndex: 0,
            }}
            animate={{
              y: [0, -30, 0],
              rotate: [0, 10, -10, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: dollar.duration,
              delay: dollar.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            $
          </motion.div>
        ))}

        {/* Additional decorative gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,rgba(16,185,129,0.02)_0deg,transparent_60deg,transparent_300deg,rgba(16,185,129,0.02)_360deg)]" />

        {/* Grid overlay (fixed, Vite-compatible) */}
        <div
          className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath d=%22M0 0 L60 0 L60 60 L0 60 Z%22 fill=%22none%22 stroke=%22rgba(16,185,129,0.03)%22 stroke-width=%220.5%22/%3E%3C/svg%3E')]"
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 space-y-8 p-6 md:p-8">
        {/* Welcome header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between backdrop-blur-sm bg-white/5 rounded-2xl p-6 border border-white/10 shadow-xl"
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-emerald-300 to-emerald-500 bg-clip-text text-transparent">
              Welcome back,{' '}
              <span className="text-emerald-400">
                {accountInfo?.fullname || 'Trader'}
              </span>
            </h1>
            <p className="text-sm text-emerald-100/60 mt-1 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400 animate-pulse" />
              Here's your trading overview
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3 bg-black/40 backdrop-blur-xl rounded-xl px-5 py-2.5 border border-emerald-500/20 shadow-lg">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                activeAccount?.is_virtual ? 'bg-blue-400' : 'bg-emerald-400'
              } animate-pulse shadow-lg shadow-current/50`}
            />
            <span className="text-xs font-medium text-emerald-100/80">
              {activeAccount?.is_virtual ? 'Demo Mode' : 'Live Trading'}
            </span>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className={`group relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 hover:border-${stat.color.replace(
                'text-',
                ''
              )}/30 transition-all duration-300 shadow-xl hover:shadow-2xl ${stat.glow}`}
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 translate-x-[-100%] group-hover:translate-x-[100%]" />
              <div className="flex items-center justify-between mb-4 relative">
                <span className="text-xs font-medium text-emerald-100/60 uppercase tracking-wider">
                  {stat.label}
                </span>
                <div
                  className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center backdrop-blur-sm border border-white/5 group-hover:scale-110 transition-transform duration-300`}
                >
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <div className="font-mono text-2xl font-bold text-white truncate relative flex items-center gap-1">
                {stat.label === 'Balance' && (
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                )}
                {stat.value}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickLinks.map((link, i) => (
              <motion.div
                key={link.title}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                whileHover={{ scale: 1.02 }}
                className="group"
              >
                <Link
                  to={link.url}
                  className="relative flex items-center gap-4 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 hover:border-emerald-500/30 hover:from-white/15 hover:to-white/10 transition-all duration-300 overflow-hidden shadow-xl hover:shadow-2xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 translate-x-[-100%] group-hover:translate-x-[100%]" />
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br from-${link.color}-500/20 to-${link.color}-500/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-white/5 backdrop-blur-sm relative`}
                  >
                    <link.icon className={`w-6 h-6 text-${link.color}-400`} />
                  </div>
                  <div className="flex-1 min-w-0 relative">
                    <div className="font-semibold text-white flex items-center gap-2">
                      {link.title}
                      <DollarSign className={`w-3 h-3 text-${link.color}-400 opacity-0 group-hover:opacity-100 transition-opacity`} />
                    </div>
                    <div className="text-xs text-emerald-100/50">{link.desc}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-emerald-400/50 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all shrink-0 relative" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Decorative bottom gradient */}
        <div className="h-20 bg-gradient-to-t from-emerald-500/5 to-transparent rounded-full blur-3xl -mt-10" />
      </div>
    </div>
  );
}
