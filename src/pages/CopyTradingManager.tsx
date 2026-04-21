import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Plus, Play, Square, Trash2, Settings2, AlertTriangle,
  CheckCircle2, XCircle, Pause, RefreshCw, Upload, Download,
  Shield, Zap, TrendingUp, DollarSign, Activity, Eye, EyeOff,
  Wifi, WifiOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  copyTradingService, 
  type FollowerAccount, 
  type CopyTradeLog 
} from '@/services/copy-trading-service';

interface RiskSettings {
  globalMinBalance: number;
  globalMaxStakePercent: number;
  maxDrawdownPercent: number;
  pauseOnConsecutiveLosses: number;
  autoPauseOnError: boolean;
}

export default function CopyTradingManager() {
  const [followers, setFollowers] = useState<FollowerAccount[]>([]);
  const [copyLogs, setCopyLogs] = useState<CopyTradeLog[]>([]);
  const [riskSettings, setRiskSettings] = useState<RiskSettings>({
    globalMinBalance: 10,
    globalMaxStakePercent: 100,
    maxDrawdownPercent: 20,
    pauseOnConsecutiveLosses: 3,
    autoPauseOnError: true,
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newFollower, setNewFollower] = useState({ nickname: '', token: '' });
  const [bulkTokens, setBulkTokens] = useState('');
  const [selectedFollowers, setSelectedFollowers] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCopyingEnabled, setIsCopyingEnabled] = useState(copyTradingService.enabled);
  const [isAddingFollower, setIsAddingFollower] = useState(false);

  // Load initial data and subscribe to updates
  useEffect(() => {
    setFollowers(copyTradingService.getFollowers());
    setCopyLogs(copyTradingService.getLogs());

    const unsubFollower = copyTradingService.onFollowerUpdate((follower) => {
      setFollowers(prev => {
        const idx = prev.findIndex(f => f.id === follower.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = follower;
          return updated;
        }
        return [...prev, follower];
      });
    });

    const unsubTrade = copyTradingService.onTradeUpdate((log) => {
      setCopyLogs(prev => {
        const idx = prev.findIndex(l => l.id === log.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = log;
          return updated;
        }
        return [log, ...prev].slice(0, 500);
      });
    });

    // Load saved risk settings
    const savedRisk = localStorage.getItem('copyTrading_risk');
    if (savedRisk) setRiskSettings(JSON.parse(savedRisk));

    return () => {
      unsubFollower();
      unsubTrade();
    };
  }, []);

  // Save risk settings
  useEffect(() => {
    localStorage.setItem('copyTrading_risk', JSON.stringify(riskSettings));
  }, [riskSettings]);

  // Stats calculations
  const activeFollowers = followers.filter(f => f.status === 'active').length;
  const totalTradesToday = copyLogs.filter(l => 
    new Date(l.timestamp).toDateString() === new Date().toDateString()
  ).length;
  const successRate = copyLogs.length > 0 
    ? Math.round((copyLogs.filter(l => l.status === 'success').length / copyLogs.length) * 100) 
    : 0;
  const totalVolume = copyLogs.reduce((sum, l) => sum + l.stakeAmount, 0);
  const totalProfit = followers.reduce((sum, f) => sum + f.totalProfit, 0);

  const addFollower = async () => {
    if (!newFollower.nickname.trim() || !newFollower.token.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (followers.length >= 50) {
      toast.error('Maximum 50 followers reached');
      return;
    }

    setIsAddingFollower(true);
    try {
      const follower = await copyTradingService.addFollower(
        newFollower.nickname.trim(),
        newFollower.token.trim()
      );
      
      if (follower.status === 'active') {
        toast.success(`Connected: ${follower.nickname} (${follower.loginid})`);
      } else if (follower.status === 'error') {
        toast.error(`Failed to connect: ${follower.lastError}`);
      }
      
      setNewFollower({ nickname: '', token: '' });
      setIsAddDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsAddingFollower(false);
    }
  };

  const addBulkFollowers = async () => {
    const lines = bulkTokens.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      toast.error('No tokens provided');
      return;
    }

    const remainingSlots = 50 - followers.length;
    if (lines.length > remainingSlots) {
      toast.error(`Only ${remainingSlots} slots available`);
      return;
    }

    setIsAddingFollower(true);
    let added = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const token = lines[i].trim();
      if (token) {
        try {
          await copyTradingService.addFollower(`Follower ${followers.length + i + 1}`, token);
          added++;
        } catch {}
      }
    }

    setIsAddingFollower(false);
    setBulkTokens('');
    setIsBulkDialogOpen(false);
    toast.success(`${added} followers added`);
  };

  const removeFollower = (id: string) => {
    copyTradingService.removeFollower(id);
    setFollowers(prev => prev.filter(f => f.id !== id));
    setDeleteConfirmId(null);
    toast.success('Follower removed');
  };

  const toggleFollowerStatus = (id: string) => {
    const follower = followers.find(f => f.id === id);
    if (!follower) return;

    if (follower.status === 'active') {
      copyTradingService.pauseFollower(id);
    } else {
      copyTradingService.resumeFollower(id);
    }
  };

  const reconnectFollower = async (id: string) => {
    const follower = followers.find(f => f.id === id);
    if (!follower) return;

    toast.info(`Reconnecting ${follower.nickname}...`);
    await copyTradingService.reconnectFollower(id);
  };

  const startAll = () => {
    copyTradingService.startAll();
    setIsCopyingEnabled(true);
    toast.success('Copy trading started for all active followers');
  };

  const pauseAll = () => {
    copyTradingService.pauseAll();
    setIsCopyingEnabled(false);
    toast.success('Copy trading paused');
  };

  const removeSelectedFollowers = () => {
    selectedFollowers.forEach(id => copyTradingService.removeFollower(id));
    setFollowers(prev => prev.filter(f => !selectedFollowers.has(f.id)));
    setSelectedFollowers(new Set());
    toast.success('Selected followers removed');
  };

  const toggleCopyTrading = (enabled: boolean) => {
    copyTradingService.setEnabled(enabled);
    setIsCopyingEnabled(enabled);
    toast.success(enabled ? 'Copy trading enabled' : 'Copy trading disabled');
  };

  const filteredFollowers = followers.filter(f => {
    const matchesStatus = filterStatus === 'all' || f.status === filterStatus;
    const matchesSearch = f.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          f.loginid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          f.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: FollowerAccount['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-profit/20 text-profit border-profit/30"><Wifi className="w-3 h-3 mr-1" />Active</Badge>;
      case 'paused':
        return <Badge variant="secondary"><Pause className="w-3 h-3 mr-1" />Paused</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Error</Badge>;
      case 'connecting':
        return <Badge variant="outline" className="animate-pulse"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Connecting</Badge>;
      default:
        return <Badge variant="outline"><WifiOff className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" />
            Copy Trading Manager
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage up to 50 follower accounts with 1:1 copy trading
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 border">
            <span className="text-sm">Copy Trading</span>
            <Switch 
              checked={isCopyingEnabled} 
              onCheckedChange={toggleCopyTrading}
            />
            {isCopyingEnabled ? (
              <Badge className="bg-profit/20 text-profit">ON</Badge>
            ) : (
              <Badge variant="secondary">OFF</Badge>
            )}
          </div>
          <Button
            onClick={startAll}
            disabled={followers.length === 0}
            className="bg-profit hover:bg-profit/90"
          >
            <Play className="w-4 h-4 mr-2" />
            Start All
          </Button>
          <Button
            onClick={pauseAll}
            disabled={followers.length === 0}
            variant="secondary"
          >
            <Square className="w-4 h-4 mr-2" />
            Pause All
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-card/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{activeFollowers}<span className="text-sm text-muted-foreground">/{followers.length}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent/50">
                <Activity className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">{totalTradesToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-profit/10">
                <TrendingUp className="w-5 h-5 text-profit" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Success</p>
                <p className="text-2xl font-bold">{successRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-secondary">
                <DollarSign className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Volume</p>
                <p className="text-2xl font-bold">${totalVolume.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${totalProfit >= 0 ? 'bg-profit/10' : 'bg-loss/10'}`}>
                <Zap className={`w-5 h-5 ${totalProfit >= 0 ? 'text-profit' : 'text-loss'}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total P/L</p>
                <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-profit' : 'text-loss'}`}>
                  ${totalProfit.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="followers" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="followers">Followers ({followers.length})</TabsTrigger>
          <TabsTrigger value="risk">Risk Settings</TabsTrigger>
          <TabsTrigger value="logs">Activity ({copyLogs.length})</TabsTrigger>
        </TabsList>

        {/* Followers Tab */}
        <TabsContent value="followers" className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={followers.length >= 50}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Follower
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Follower</DialogTitle>
                    <DialogDescription>
                      Enter the follower's nickname and Deriv API token (Trade scope required). 
                      The token will be validated and connected immediately.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nickname</Label>
                      <Input
                        placeholder="e.g., John's Account"
                        value={newFollower.nickname}
                        onChange={e => setNewFollower(prev => ({ ...prev, nickname: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>API Token</Label>
                      <Input
                        type="password"
                        placeholder="Deriv API Token"
                        value={newFollower.token}
                        onChange={e => setNewFollower(prev => ({ ...prev, token: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Token must have Trade scope. Get from Settings → API Token on Deriv.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                    <Button onClick={addFollower} disabled={isAddingFollower}>
                      {isAddingFollower ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        'Add & Connect'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={followers.length >= 50}>
                    <Upload className="w-4 h-4 mr-2" />
                    Bulk Import
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Bulk Import Tokens</DialogTitle>
                    <DialogDescription>
                      Paste multiple API tokens, one per line (max {50 - followers.length} more)
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <textarea
                      className="w-full h-40 p-3 rounded-lg border bg-background text-sm font-mono resize-none"
                      placeholder="Paste tokens here, one per line..."
                      value={bulkTokens}
                      onChange={e => setBulkTokens(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>Cancel</Button>
                    <Button onClick={addBulkFollowers} disabled={isAddingFollower}>
                      {isAddingFollower ? 'Importing...' : 'Import All'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {selectedFollowers.size > 0 && (
                <Button variant="destructive" onClick={removeSelectedFollowers}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove ({selectedFollowers.size})
                </Button>
              )}
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <Input
                placeholder="Search..."
                className="w-full sm:w-40"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Followers Table */}
          <Card>
            <ScrollArea className="h-[450px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={selectedFollowers.size === filteredFollowers.length && filteredFollowers.length > 0}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedFollowers(new Set(filteredFollowers.map(f => f.id)));
                          } else {
                            setSelectedFollowers(new Set());
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Trades</TableHead>
                    <TableHead>P/L</TableHead>
                    <TableHead>Win Rate</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFollowers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        {followers.length === 0 
                          ? "No followers added yet. Click 'Add Follower' to get started."
                          : "No followers match your filters."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredFollowers.map(follower => {
                      const winRate = follower.totalTrades > 0 
                        ? Math.round((follower.wins / follower.totalTrades) * 100) 
                        : 0;
                      return (
                        <TableRow key={follower.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              className="rounded"
                              checked={selectedFollowers.has(follower.id)}
                              onChange={e => {
                                const newSet = new Set(selectedFollowers);
                                if (e.target.checked) {
                                  newSet.add(follower.id);
                                } else {
                                  newSet.delete(follower.id);
                                }
                                setSelectedFollowers(newSet);
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{follower.nickname}</p>
                              <p className="text-xs text-muted-foreground">
                                {follower.loginid || 'Not connected'} 
                                {follower.isVirtual && <span className="ml-1">🎮</span>}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {getStatusBadge(follower.status)}
                              {follower.lastError && (
                                <p className="text-[10px] text-loss max-w-[120px] truncate">
                                  {follower.lastError}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono font-medium">
                            ${follower.balance.toFixed(2)}
                          </TableCell>
                          <TableCell>{follower.totalTrades}</TableCell>
                          <TableCell className={`font-mono font-medium ${follower.totalProfit >= 0 ? 'text-profit' : 'text-loss'}`}>
                            {follower.totalProfit >= 0 ? '+' : ''}${follower.totalProfit.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div 
                                  className="h-full bg-profit rounded-full" 
                                  style={{ width: `${winRate}%` }}
                                />
                              </div>
                              <span className="text-xs">{winRate}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => reconnectFollower(follower.id)}
                                title="Reconnect"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleFollowerStatus(follower.id)}
                                title={follower.status === 'active' ? 'Pause' : 'Resume'}
                              >
                                {follower.status === 'active' ? (
                                  <Pause className="w-3.5 h-3.5" />
                                ) : (
                                  <Play className="w-3.5 h-3.5" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteConfirmId(follower.id)}
                                title="Remove"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>

          <p className="text-xs text-muted-foreground text-center">
            {followers.length}/50 follower slots used • 
            {isCopyingEnabled ? ' ✅ Copy trading is ENABLED - trades will be copied' : ' ⏸️ Copy trading is PAUSED'}
          </p>
        </TabsContent>

        {/* Risk Settings Tab */}
        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Global Risk Management
              </CardTitle>
              <CardDescription>
                These settings apply to all new followers by default
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Minimum Balance ($)</Label>
                  <Input
                    type="number"
                    value={riskSettings.globalMinBalance}
                    onChange={e => setRiskSettings(prev => ({ 
                      ...prev, 
                      globalMinBalance: parseFloat(e.target.value) || 0 
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Followers below this won't copy trades
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Max Stake (% of balance)</Label>
                  <Input
                    type="number"
                    max={100}
                    value={riskSettings.globalMaxStakePercent}
                    onChange={e => setRiskSettings(prev => ({ 
                      ...prev, 
                      globalMaxStakePercent: parseFloat(e.target.value) || 0 
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Cap stake as % of follower balance
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Max Drawdown (%)</Label>
                  <Input
                    type="number"
                    max={100}
                    value={riskSettings.maxDrawdownPercent}
                    onChange={e => setRiskSettings(prev => ({ 
                      ...prev, 
                      maxDrawdownPercent: parseFloat(e.target.value) || 0 
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Auto-pause if drawdown exceeds this
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Pause After Losses</Label>
                  <Select 
                    value={String(riskSettings.pauseOnConsecutiveLosses)}
                    onValueChange={v => setRiskSettings(prev => ({ 
                      ...prev, 
                      pauseOnConsecutiveLosses: parseInt(v) 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Disabled</SelectItem>
                      <SelectItem value="2">2 losses</SelectItem>
                      <SelectItem value="3">3 losses</SelectItem>
                      <SelectItem value="4">4 losses</SelectItem>
                      <SelectItem value="5">5 losses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base">Auto-pause on Error</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically pause followers when they encounter errors
                  </p>
                </div>
                <Switch
                  checked={riskSettings.autoPauseOnError}
                  onCheckedChange={v => setRiskSettings(prev => ({ ...prev, autoPauseOnError: v }))}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={() => toast.success('Risk settings saved')}>
                  <Settings2 className="w-4 h-4 mr-2" />
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="w-5 h-5 text-primary" />
                  Live Activity
                </CardTitle>
              </div>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[450px]">
                {copyLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Activity className="w-12 h-12 mb-4 opacity-20" />
                    <p>No activity yet</p>
                    <p className="text-xs">Logs appear here when trades are copied</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {copyLogs.map(log => (
                      <motion.div 
                        key={log.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        {log.status === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-profit shrink-0" />
                        ) : log.status === 'pending' ? (
                          <RefreshCw className="w-4 h-4 text-muted-foreground shrink-0 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4 text-loss shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{log.followerNickname}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {log.contractType}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{log.symbol}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Stake: ${log.stakeAmount.toFixed(2)}</span>
                            {log.profit !== undefined && (
                              <span className={log.profit >= 0 ? 'text-profit' : 'text-loss'}>
                                {log.profit >= 0 ? '+' : ''}${log.profit.toFixed(2)}
                              </span>
                            )}
                            {log.errorMessage && (
                              <span className="text-loss">• {log.errorMessage}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Follower?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect and remove the follower account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmId && removeFollower(deleteConfirmId)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
