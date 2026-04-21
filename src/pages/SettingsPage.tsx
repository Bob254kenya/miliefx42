import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle } from 'lucide-react';

export default function SettingsPage() {
  const { activeAccount, accountInfo } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Account information and preferences</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-6 space-y-4 max-w-lg"
      >
        <h2 className="font-semibold text-foreground">Account Details</h2>
        {[
          { label: 'Name', value: accountInfo?.fullname || '-' },
          { label: 'Email', value: accountInfo?.email || '-' },
          { label: 'Login ID', value: activeAccount?.loginid || '-' },
          { label: 'Account Type', value: activeAccount?.is_virtual ? 'Demo' : 'Real' },
          { label: 'Currency', value: activeAccount?.currency || '-' },
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
            <span className="text-sm text-muted-foreground">{item.label}</span>
            <span className="text-sm font-mono text-foreground">{item.value}</span>
          </div>
        ))}
      </motion.div>

      {/* Trading Status */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-xl p-6 space-y-4 max-w-lg"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Trading Status</h2>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 p-3 rounded-lg border bg-profit/10 border-profit/30">
          <CheckCircle className="w-4 h-4 text-profit" />
          <span className="text-sm font-semibold text-profit">Real Trading Available</span>
        </div>

        {/* Account Info Summary */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="text-[10px] text-muted-foreground uppercase">Account Type</div>
            <div className="font-mono text-lg font-bold text-foreground">
              {activeAccount?.is_virtual ? 'Demo' : 'Real'}
            </div>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="text-[10px] text-muted-foreground uppercase">Currency</div>
            <div className="font-mono text-lg font-bold text-foreground">
              {activeAccount?.currency || '-'}
            </div>
          </div>
        </div>

        {/* Trading Info */}
        <div className="bg-muted/20 border border-border/50 rounded-lg p-3 text-[11px] text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground text-xs">Trading Information</p>
          <p>• You can trade real money immediately</p>
          <p>• No restrictions or requirements to start trading</p>
          <p>• Practice with demo account anytime</p>
          <p className="text-profit mt-2">✓ Your account is ready for real trading</p>
        </div>
      </motion.div>
    </div>
  );
}
