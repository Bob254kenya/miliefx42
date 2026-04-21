/**
 * Copy Trading Service
 * Manages follower WebSocket connections and trade replication
 */

const DERIV_APP_ID = 131592;
const DERIV_WS_URL = `wss://ws.derivws.com/websockets/v3?app_id=${DERIV_APP_ID}`;

export interface FollowerAccount {
  id: string;
  nickname: string;
  token: string;
  status: 'active' | 'paused' | 'error' | 'pending' | 'connecting';
  balance: number;
  currency: string;
  loginid: string;
  landingCompany: string;
  email: string;
  fullname: string;
  isVirtual: boolean;
  totalTrades: number;
  totalProfit: number;
  wins: number;
  losses: number;
  lastError?: string;
  createdAt: string;
  minBalance: number;
  maxStakePercent: number;
  pauseOnLosses: number;
  consecutiveLosses: number;
}

export interface CopyTradeLog {
  id: string;
  followerId: string;
  followerNickname: string;
  masterTradeId: string;
  contractId?: string;
  status: 'pending' | 'success' | 'failed';
  errorMessage?: string;
  stakeAmount: number;
  profit?: number;
  contractType: string;
  symbol: string;
  timestamp: string;
}

type TradeHandler = (trade: CopyTradeLog) => void;
type FollowerUpdateHandler = (follower: FollowerAccount) => void;

class FollowerConnection {
  private ws: WebSocket | null = null;
  private reqId = 0;
  private handlers: Map<number, (data: any) => void> = new Map();
  private connected = false;
  private follower: FollowerAccount;
  private onUpdate: FollowerUpdateHandler;

  constructor(follower: FollowerAccount, onUpdate: FollowerUpdateHandler) {
    this.follower = follower;
    this.onUpdate = onUpdate;
  }

  get isConnected() { return this.connected; }
  get account() { return this.follower; }

  async connect(): Promise<FollowerAccount> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(DERIV_WS_URL);
      
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
        this.disconnect();
      }, 15000);

      this.ws.onopen = async () => {
        try {
          // Authorize with token
          const authResponse = await this.send({ authorize: this.follower.token });
          
          if (authResponse.error) {
            clearTimeout(timeout);
            this.follower.status = 'error';
            this.follower.lastError = authResponse.error.message;
            this.onUpdate(this.follower);
            reject(new Error(authResponse.error.message));
            return;
          }

          const auth = authResponse.authorize;
          this.follower.loginid = auth.loginid;
          this.follower.balance = auth.balance;
          this.follower.currency = auth.currency;
          this.follower.email = auth.email || '';
          this.follower.fullname = auth.fullname || '';
          this.follower.isVirtual = auth.is_virtual === 1;
          this.follower.landingCompany = auth.landing_company_name || '';
          this.follower.status = 'active';
          this.follower.lastError = undefined;
          this.connected = true;

          // Subscribe to balance updates
          this.subscribeToBalance();

          clearTimeout(timeout);
          this.onUpdate(this.follower);
          resolve(this.follower);
        } catch (err: any) {
          clearTimeout(timeout);
          this.follower.status = 'error';
          this.follower.lastError = err.message;
          this.onUpdate(this.follower);
          reject(err);
        }
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.req_id && this.handlers.has(data.req_id)) {
          this.handlers.get(data.req_id)!(data);
          this.handlers.delete(data.req_id);
        }

        // Handle balance updates
        if (data.balance) {
          this.follower.balance = data.balance.balance;
          this.onUpdate(this.follower);
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        if (this.follower.status === 'active') {
          this.follower.status = 'error';
          this.follower.lastError = 'Connection closed';
          this.onUpdate(this.follower);
        }
      };

      this.ws.onerror = () => {
        clearTimeout(timeout);
        this.connected = false;
        this.follower.status = 'error';
        this.follower.lastError = 'WebSocket error';
        this.onUpdate(this.follower);
        reject(new Error('WebSocket error'));
      };
    });
  }

  private send(data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      const reqId = ++this.reqId;
      data.req_id = reqId;
      this.handlers.set(reqId, resolve);
      this.ws.send(JSON.stringify(data));
      
      setTimeout(() => {
        if (this.handlers.has(reqId)) {
          this.handlers.delete(reqId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  private async subscribeToBalance() {
    try {
      await this.send({ balance: 1, subscribe: 1 });
    } catch { }
  }

  async executeTrade(params: {
    contract_type: string;
    symbol: string;
    duration: number;
    duration_unit: string;
    basis: string;
    amount: number;
    barrier?: string;
  }): Promise<{ contractId: string; buyPrice: number }> {
    // Check minimum balance
    if (this.follower.balance < this.follower.minBalance) {
      throw new Error(`Balance $${this.follower.balance.toFixed(2)} below minimum $${this.follower.minBalance}`);
    }

    // Calculate max stake based on percentage
    const maxStake = (this.follower.balance * this.follower.maxStakePercent) / 100;
    const actualStake = Math.min(params.amount, maxStake);

    if (actualStake < 0.35) {
      throw new Error('Stake too low after applying limits');
    }

    // Get proposal
    const proposalReq: any = {
      proposal: 1,
      contract_type: params.contract_type,
      symbol: params.symbol,
      duration: params.duration,
      duration_unit: params.duration_unit,
      basis: params.basis,
      amount: actualStake,
      currency: this.follower.currency,
    };
    if (params.barrier !== undefined) {
      proposalReq.barrier = params.barrier;
    }

    const proposal = await this.send(proposalReq);
    if (proposal.error) throw new Error(proposal.error.message);

    // Buy contract
    const buyResponse = await this.send({
      buy: proposal.proposal.id,
      price: actualStake,
    });
    if (buyResponse.error) throw new Error(buyResponse.error.message);

    return {
      contractId: String(buyResponse.buy.contract_id),
      buyPrice: buyResponse.buy.buy_price,
    };
  }

  async waitForResult(contractId: string): Promise<{ profit: number; won: boolean }> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Contract result timeout'));
      }, 60000);

      const checkResult = async () => {
        try {
          const response = await this.send({
            proposal_open_contract: 1,
            contract_id: contractId,
          });

          if (response.error) {
            clearTimeout(timeout);
            reject(new Error(response.error.message));
            return;
          }

          const poc = response.proposal_open_contract;
          if (poc.is_expired === 1 || poc.is_sold === 1 || poc.status === 'sold') {
            clearTimeout(timeout);
            const profit = poc.profit || (poc.sell_price - poc.buy_price) || 0;
            resolve({ profit, won: profit > 0 });
          } else {
            // Check again in 1 second
            setTimeout(checkResult, 1000);
          }
        } catch (err) {
          clearTimeout(timeout);
          reject(err);
        }
      };

      checkResult();
    });
  }

  updateSettings(settings: Partial<Pick<FollowerAccount, 'minBalance' | 'maxStakePercent' | 'pauseOnLosses'>>) {
    Object.assign(this.follower, settings);
    this.onUpdate(this.follower);
  }

  pause() {
    this.follower.status = 'paused';
    this.onUpdate(this.follower);
  }

  resume() {
    if (this.connected) {
      this.follower.status = 'active';
      this.follower.lastError = undefined;
      this.onUpdate(this.follower);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connected = false;
    }
  }
}

class CopyTradingService {
  private followers: Map<string, FollowerConnection> = new Map();
  private tradeHandlers: TradeHandler[] = [];
  private followerHandlers: FollowerUpdateHandler[] = [];
  private isEnabled = false;
  private tradeLogs: CopyTradeLog[] = [];

  constructor() {
    // Load saved followers on init
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem('copyTrading_followers_v2');
      if (saved) {
        const followers: FollowerAccount[] = JSON.parse(saved);
        // Don't auto-connect, just load data
        followers.forEach(f => {
          f.status = 'pending';
        });
      }
      const savedLogs = localStorage.getItem('copyTrading_logs_v2');
      if (savedLogs) {
        this.tradeLogs = JSON.parse(savedLogs);
      }
    } catch { }
  }

  private saveToStorage() {
    const followers = Array.from(this.followers.values()).map(c => c.account);
    localStorage.setItem('copyTrading_followers_v2', JSON.stringify(followers));
    localStorage.setItem('copyTrading_logs_v2', JSON.stringify(this.tradeLogs.slice(-500)));
  }

  onTradeUpdate(handler: TradeHandler) {
    this.tradeHandlers.push(handler);
    return () => {
      this.tradeHandlers = this.tradeHandlers.filter(h => h !== handler);
    };
  }

  onFollowerUpdate(handler: FollowerUpdateHandler) {
    this.followerHandlers.push(handler);
    return () => {
      this.followerHandlers = this.followerHandlers.filter(h => h !== handler);
    };
  }

  private notifyTradeUpdate(log: CopyTradeLog) {
    this.tradeLogs.unshift(log);
    if (this.tradeLogs.length > 500) {
      this.tradeLogs = this.tradeLogs.slice(0, 500);
    }
    this.tradeHandlers.forEach(h => h(log));
    this.saveToStorage();
  }

  private notifyFollowerUpdate(follower: FollowerAccount) {
    this.followerHandlers.forEach(h => h(follower));
    this.saveToStorage();
  }

  async addFollower(nickname: string, token: string): Promise<FollowerAccount> {
    if (this.followers.size >= 50) {
      throw new Error('Maximum 50 followers reached');
    }

    const id = crypto.randomUUID();
    const follower: FollowerAccount = {
      id,
      nickname,
      token,
      status: 'connecting',
      balance: 0,
      currency: 'USD',
      loginid: '',
      landingCompany: '',
      email: '',
      fullname: '',
      isVirtual: false,
      totalTrades: 0,
      totalProfit: 0,
      wins: 0,
      losses: 0,
      createdAt: new Date().toISOString(),
      minBalance: 10,
      maxStakePercent: 100,
      pauseOnLosses: 0,
      consecutiveLosses: 0,
    };

    const connection = new FollowerConnection(follower, (f) => this.notifyFollowerUpdate(f));
    this.followers.set(id, connection);
    this.notifyFollowerUpdate(follower);

    try {
      const result = await connection.connect();
      return result;
    } catch (err) {
      // Keep the follower but with error status
      return connection.account;
    }
  }

  async reconnectFollower(id: string): Promise<FollowerAccount | null> {
    const connection = this.followers.get(id);
    if (!connection) return null;

    connection.account.status = 'connecting';
    this.notifyFollowerUpdate(connection.account);

    try {
      await connection.connect();
      return connection.account;
    } catch {
      return connection.account;
    }
  }

  removeFollower(id: string) {
    const connection = this.followers.get(id);
    if (connection) {
      connection.disconnect();
      this.followers.delete(id);
      this.saveToStorage();
    }
  }

  pauseFollower(id: string) {
    this.followers.get(id)?.pause();
  }

  resumeFollower(id: string) {
    this.followers.get(id)?.resume();
  }

  updateFollowerSettings(id: string, settings: Partial<Pick<FollowerAccount, 'minBalance' | 'maxStakePercent' | 'pauseOnLosses'>>) {
    this.followers.get(id)?.updateSettings(settings);
  }

  getFollowers(): FollowerAccount[] {
    return Array.from(this.followers.values()).map(c => c.account);
  }

  getLogs(): CopyTradeLog[] {
    return this.tradeLogs;
  }

  getActiveFollowers(): FollowerConnection[] {
    return Array.from(this.followers.values()).filter(c => c.isConnected && c.account.status === 'active');
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  get enabled() {
    return this.isEnabled;
  }

  /**
   * Execute a trade on all active followers
   * Called when master places a trade
   */
  async copyTrade(params: {
    contract_type: string;
    symbol: string;
    duration: number;
    duration_unit: string;
    basis: string;
    amount: number;
    barrier?: string;
    masterTradeId: string;
  }): Promise<CopyTradeLog[]> {
    if (!this.isEnabled) {
      return [];
    }

    const activeFollowers = this.getActiveFollowers();
    const results: CopyTradeLog[] = [];

    const promises = activeFollowers.map(async (connection) => {
      const follower = connection.account;
      const logId = crypto.randomUUID();
      
      const log: CopyTradeLog = {
        id: logId,
        followerId: follower.id,
        followerNickname: follower.nickname,
        masterTradeId: params.masterTradeId,
        status: 'pending',
        stakeAmount: params.amount,
        contractType: params.contract_type,
        symbol: params.symbol,
        timestamp: new Date().toISOString(),
      };

      this.notifyTradeUpdate(log);

      try {
        // Check consecutive losses limit
        if (follower.pauseOnLosses > 0 && follower.consecutiveLosses >= follower.pauseOnLosses) {
          throw new Error(`Paused: ${follower.consecutiveLosses} consecutive losses`);
        }

        const { contractId, buyPrice } = await connection.executeTrade({
          contract_type: params.contract_type,
          symbol: params.symbol,
          duration: params.duration,
          duration_unit: params.duration_unit,
          basis: params.basis,
          amount: params.amount,
          barrier: params.barrier,
        });

        log.contractId = contractId;
        log.stakeAmount = buyPrice;
        
        // Wait for result
        const result = await connection.waitForResult(contractId);
        
        log.status = 'success';
        log.profit = result.profit;
        
        // Update follower stats
        follower.totalTrades++;
        follower.totalProfit += result.profit;
        if (result.won) {
          follower.wins++;
          follower.consecutiveLosses = 0;
        } else {
          follower.losses++;
          follower.consecutiveLosses++;
          
          // Auto-pause if consecutive losses limit reached
          if (follower.pauseOnLosses > 0 && follower.consecutiveLosses >= follower.pauseOnLosses) {
            follower.status = 'paused';
            follower.lastError = `Auto-paused: ${follower.consecutiveLosses} consecutive losses`;
          }
        }
        
        this.notifyFollowerUpdate(follower);
      } catch (err: any) {
        log.status = 'failed';
        log.errorMessage = err.message;
        
        follower.lastError = err.message;
        this.notifyFollowerUpdate(follower);
      }

      // Update the log
      const logIndex = this.tradeLogs.findIndex(l => l.id === logId);
      if (logIndex >= 0) {
        this.tradeLogs[logIndex] = log;
      }
      this.tradeHandlers.forEach(h => h(log));
      this.saveToStorage();

      results.push(log);
    });

    await Promise.allSettled(promises);
    return results;
  }

  startAll() {
    this.setEnabled(true);
    this.followers.forEach(connection => {
      if (connection.isConnected && connection.account.status !== 'error') {
        connection.resume();
      }
    });
  }

  pauseAll() {
    this.setEnabled(false);
    this.followers.forEach(connection => {
      if (connection.account.status === 'active') {
        connection.pause();
      }
    });
  }

  disconnectAll() {
    this.followers.forEach(connection => connection.disconnect());
  }
}

// Singleton instance
export const copyTradingService = new CopyTradingService();
