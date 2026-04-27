const DERIV_APP_ID = 131592;
const DERIV_WS_URL = `wss://ws.derivws.com/websockets/v3?app_id=${DERIV_APP_ID}`;
const DERIV_OAUTH_URL = `https://oauth.deriv.com/oauth2/authorize?app_id=${DERIV_APP_ID}`;

export interface DerivAccount {
  loginid: string;
  token: string;
  currency: string;
  is_virtual: boolean;
}

export interface AuthorizeResponse {
  authorize: {
    loginid: string;
    balance: number;
    currency: string;
    is_virtual: number;
    email: string;
    fullname: string;
    account_list: Array<{
      loginid: string;
      currency: string;
      is_virtual: number;
    }>;
  };
}

export interface TickData {
  tick: {
    symbol: string;
    epoch: number;
    quote: number;
    ask: number;
    bid: number;
  };
}

export interface TickHistoryResponse {
  history: {
    prices: number[];
    times: number[];
  };
}

export interface ContractResult {
  contractId: string;
  profit: number;
  status: 'won' | 'lost' | 'open';
  isExpired: boolean;
  buyPrice: number;
  sellPrice: number;
}

export type MessageHandler = (data: any) => void;

class DerivAPI {
  private ws: WebSocket | null = null;
  private reqId = 0;
  private handlers: Map<number, (data: any) => void> = new Map();
  private subscriptionHandlers: Map<string, MessageHandler[]> = new Map();
  private globalHandlers: MessageHandler[] = [];
  private connected = false;
  private connectPromise: Promise<void> | null = null;

  get isConnected() { return this.connected; }

  connect(): Promise<void> {
    if (this.connectPromise) return this.connectPromise;
    
    this.connectPromise = new Promise((resolve, reject) => {
      this.ws = new WebSocket(DERIV_WS_URL);
      
      this.ws.onopen = () => {
        this.connected = true;
        resolve();
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.req_id && this.handlers.has(data.req_id)) {
          this.handlers.get(data.req_id)!(data);
          this.handlers.delete(data.req_id);
        }

        if (data.tick) {
          const symbol = data.tick.symbol;
          const handlers = this.subscriptionHandlers.get(symbol) || [];
          handlers.forEach(h => h(data));
        }

        this.globalHandlers.forEach(h => h(data));
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.connectPromise = null;
      };

      this.ws.onerror = (err) => {
        this.connected = false;
        this.connectPromise = null;
        reject(err);
      };
    });

    return this.connectPromise;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connected = false;
      this.connectPromise = null;
      this.handlers.clear();
      this.subscriptionHandlers.clear();
    }
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

  async authorize(token: string): Promise<AuthorizeResponse> {
    await this.connect();
    const response = await this.send({ authorize: token });
    if (response.error) throw new Error(response.error.message);
    return response;
  }

  async getBalance(): Promise<any> {
    const response = await this.send({ balance: 1, subscribe: 1 });
    if (response.error) throw new Error(response.error.message);
    return response;
  }

  async subscribeTicks(symbol: string, handler: MessageHandler) {
    const existing = this.subscriptionHandlers.get(symbol) || [];
    existing.push(handler);
    this.subscriptionHandlers.set(symbol, existing);

    if (existing.length === 1) {
      await this.send({ ticks: symbol, subscribe: 1 });
    }
  }

  async unsubscribeTicks(symbol: string) {
    this.subscriptionHandlers.delete(symbol);
    try {
      await this.send({ forget_all: 'ticks' });
    } catch {}
  }

  async getTickHistory(symbol: string, count: number = 100): Promise<TickHistoryResponse> {
    const response = await this.send({
      ticks_history: symbol,
      count,
      end: 'latest',
      style: 'ticks',
    });
    if (response.error) throw new Error(response.error.message);
    return response;
  }

  /**
   * Buy a contract and return the contract_id immediately.
   * Does NOT wait for the contract to settle.
   */
  async buyContract(params: {
    contract_type: string;
    symbol: string;
    duration: number;
    duration_unit: string;
    basis: string;
    amount: number;
    barrier?: string;
  }): Promise<{ contractId: string; buyPrice: number }> {
    // Step 1: Get proposal
    const proposalReq: any = {
      proposal: 1,
      contract_type: params.contract_type,
      symbol: params.symbol,
      duration: params.duration,
      duration_unit: params.duration_unit,
      basis: params.basis,
      amount: params.amount,
      currency: 'USD',
    };
    if (params.barrier !== undefined) {
      proposalReq.barrier = params.barrier;
    }

    const proposal = await this.send(proposalReq);
    if (proposal.error) throw new Error(proposal.error.message);

    // Step 2: Buy
    const buyResponse = await this.send({
      buy: proposal.proposal.id,
      price: params.amount,
    });
    if (buyResponse.error) throw new Error(buyResponse.error.message);

    return {
      contractId: String(buyResponse.buy.contract_id),
      buyPrice: buyResponse.buy.buy_price,
    };
  }

  /**
   * CRITICAL: Wait for a contract to fully settle (expire).
   * Subscribes to proposal_open_contract and resolves only when
   * is_expired === 1 or is_sold === 1.
   * Returns the REAL profit from Deriv API — no local guessing.
   */
  waitForContractResult(contractId: string): Promise<ContractResult> {
    return new Promise((resolve, reject) => {
      let subscriptionId: string | null = null;
      const timeout = setTimeout(() => {
        reject(new Error('Contract result timeout (60s)'));
      }, 60000);

      const checkResult = (data: any) => {
        const poc = data.proposal_open_contract;
        if (!poc) return;
        if (String(poc.contract_id) !== String(contractId)) return;

        const isSettled = poc.is_expired === 1 || poc.is_sold === 1 || poc.status === 'sold';

        if (isSettled) {
          clearTimeout(timeout);

          // Forget this subscription
          if (subscriptionId) {
            this.send({ forget: subscriptionId }).catch(() => {});
          }

          // Remove global handler
          this.globalHandlers = this.globalHandlers.filter(h => h !== checkResult);

          const profit = poc.profit || (poc.sell_price - poc.buy_price) || 0;
          const won = profit > 0;

          resolve({
            contractId: String(poc.contract_id),
            profit,
            status: won ? 'won' : 'lost',
            isExpired: poc.is_expired === 1,
            buyPrice: poc.buy_price || 0,
            sellPrice: poc.sell_price || 0,
          });
        }
      };

      // Register global handler to catch subscription messages
      this.globalHandlers.push(checkResult);

      // Subscribe to the contract
      this.send({
        proposal_open_contract: 1,
        contract_id: contractId,
        subscribe: 1,
      }).then(data => {
        if (data.error) {
          clearTimeout(timeout);
          this.globalHandlers = this.globalHandlers.filter(h => h !== checkResult);
          reject(new Error(data.error.message));
          return;
        }
        if (data.subscription) {
          subscriptionId = data.subscription.id;
        }
        // Check if already settled in the initial response
        checkResult(data);
      }).catch(err => {
        clearTimeout(timeout);
        this.globalHandlers = this.globalHandlers.filter(h => h !== checkResult);
        reject(err);
      });
    });
  }

  /** Legacy buy — kept for backward compat but prefer buyContract + waitForContractResult */
  async buy(params: {
    contract_type: string;
    symbol: string;
    duration: number;
    duration_unit: string;
    basis: string;
    amount: number;
    barrier?: string;
  }): Promise<any> {
    const { contractId, buyPrice } = await this.buyContract(params);
    const result = await this.waitForContractResult(contractId);
    return {
      buy: {
        contract_id: contractId,
        buy_price: buyPrice,
        profit: result.profit,
      },
      contractResult: result,
    };
  }

  onMessage(handler: MessageHandler) {
    this.globalHandlers.push(handler);
    return () => {
      this.globalHandlers = this.globalHandlers.filter(h => h !== handler);
    };
  }
}

export const derivApi = new DerivAPI();

export function getOAuthUrl(): string {
  return DERIV_OAUTH_URL;
}

export function parseOAuthRedirect(search: string): DerivAccount[] {
  const params = new URLSearchParams(search);
  const accounts: DerivAccount[] = [];
  
  let i = 1;
  while (params.has(`acct${i}`)) {
    accounts.push({
      loginid: params.get(`acct${i}`)!,
      token: params.get(`token${i}`)!,
      currency: params.get(`cur${i}`) || 'USD',
      is_virtual: params.get(`acct${i}`)!.startsWith('VRTC'),
    });
    i++;
  }
  
  return accounts;
}

export const MARKETS = [
  { symbol: '1HZ10V', name: 'Volatility 10 (1s)', group: 'vol' },
  { symbol: 'R_10', name: 'Volatility 10', group: 'vol' },
  { symbol: '1HZ15V', name: 'Volatility 15 (1s)', group: 'vol' },
  { symbol: '1HZ25V', name: 'Volatility 25 (1s)', group: 'vol' },
  { symbol: 'R_25', name: 'Volatility 25', group: 'vol' },
  { symbol: '1HZ30V', name: 'Volatility 30 (1s)', group: 'vol' },
  { symbol: '1HZ50V', name: 'Volatility 50 (1s)', group: 'vol' },
  { symbol: 'R_50', name: 'Volatility 50', group: 'vol' },
  { symbol: '1HZ75V', name: 'Volatility 75 (1s)', group: 'vol' },
  { symbol: 'R_75', name: 'Volatility 75', group: 'vol' },
  { symbol: '1HZ90V', name: 'Volatility 90 (1s)', group: 'vol' },
  { symbol: '1HZ100V', name: 'Volatility 100 (1s)', group: 'vol' },
  { symbol: 'R_100', name: 'Volatility 100', group: 'vol' },
  { symbol: 'JD10', name: 'Jump 10', group: 'jump' },
  { symbol: 'JD25', name: 'Jump 25', group: 'jump' },
  { symbol: 'JD50', name: 'Jump 50', group: 'jump' },
  { symbol: 'JD75', name: 'Jump 75', group: 'jump' },
  { symbol: 'JD100', name: 'Jump 100', group: 'jump' },
  { symbol: 'RDBULL', name: 'Bull Market', group: 'bull' },
  { symbol: 'RDBEAR', name: 'Bear Market', group: 'bear' },
] as const;

export type MarketSymbol = typeof MARKETS[number]['symbol'];

export const MARKET_GROUPS = [
  { value: 'vol', label: 'Volatilities' },
  { value: 'jump', label: 'Jump' },
  { value: 'bull', label: 'Bull' },
  { value: 'bear', label: 'Bear' },
] as const;
