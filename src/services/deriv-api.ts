// =============================
// CONFIG
// =============================
const DERIV_APP_ID = 131037;
const DERIV_WS_URL = `wss://ws.derivws.com/websockets/v3?app_id=${DERIV_APP_ID}`;

// Generate secure state
function generateState(): string {
  return Math.random().toString(36).substring(2) + Date.now();
}

// OAuth URL (FIXED - removed duplicate)
export function getOAuthUrl(): string {
  const state = generateState();
  localStorage.setItem('oauth_state', state);

  return `https://oauth.deriv.com/oauth2/authorize?app_id=${DERIV_APP_ID}&redirect_uri=${encodeURIComponent(window.location.origin)}&response_type=token&scope=read,trade&state=${state}`;
}

// =============================
// TYPES
// =============================
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

export interface ContractResult {
  contractId: string;
  profit: number;
  status: 'won' | 'lost' | 'open';
  isExpired: boolean;
  buyPrice: number;
  sellPrice: number;
}

export type MessageHandler = (data: any) => void;

// =============================
// MAIN CLASS
// =============================
class DerivAPI {
  private ws: WebSocket | null = null;
  private reqId = 0;
  private handlers = new Map<number, (data: any) => void>();
  private subscriptionHandlers = new Map<string, MessageHandler[]>();
  private tickSubscriptions = new Map<string, string>();
  private globalHandlers: MessageHandler[] = [];
  private connected = false;
  private connectPromise: Promise<void> | null = null;
  private activeCurrency: string = 'USD';
  private reconnectTimer: number | null = null;

  get isConnected() {
    return this.connected;
  }

  setActiveCurrency(currency: string) {
    this.activeCurrency = currency;
  }

  // =============================
  // CONNECT (AUTO RECONNECT)
  // =============================
  connect(): Promise<void> {
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = new Promise((resolve, reject) => {
      this.ws = new WebSocket(DERIV_WS_URL);

      this.ws.onopen = () => {
        this.connected = true;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        resolve();
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        // Handle request responses
        if (data.req_id && this.handlers.has(data.req_id)) {
          const handler = this.handlers.get(data.req_id);
          if (handler) {
            handler(data);
            this.handlers.delete(data.req_id);
          }
        }

        // Handle tick messages
        if (data.tick) {
          const symbol = data.tick.symbol;
          const handlers = this.subscriptionHandlers.get(symbol);
          if (handlers) {
            handlers.forEach(h => h(data));
          }
        }

        // Handle balance updates
        if (data.balance) {
          this.globalHandlers.forEach(h => h(data));
        }

        // Handle proposal open contract updates
        if (data.proposal_open_contract) {
          this.globalHandlers.forEach(h => h(data));
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.connectPromise = null;

        // AUTO RECONNECT
        if (this.reconnectTimer === null) {
          this.reconnectTimer = window.setTimeout(() => {
            this.reconnectTimer = null;
            if (!this.connected) {
              this.connect().catch(() => {});
            }
          }, 2000);
        }
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
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.connected = false;
    this.connectPromise = null;
    this.handlers.clear();
    this.subscriptionHandlers.clear();
    this.tickSubscriptions.clear();
    this.globalHandlers = [];
    this.reqId = 0;
  }

  // =============================
  // SAFE SEND (AUTO CONNECT)
  // =============================
  private async send(data: any): Promise<any> {
    if (!this.connected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const reqId = ++this.reqId;
      data.req_id = reqId;

      const timeoutId = setTimeout(() => {
        if (this.handlers.has(reqId)) {
          this.handlers.delete(reqId);
          reject(new Error(`Request timeout for ${Object.keys(data)[0]}`));
        }
      }, 30000);

      this.handlers.set(reqId, (response) => {
        clearTimeout(timeoutId);
        resolve(response);
      });
      
      try {
        this.ws.send(JSON.stringify(data));
      } catch (error) {
        clearTimeout(timeoutId);
        this.handlers.delete(reqId);
        reject(error);
      }
    });
  }

  // =============================
  // AUTH
  // =============================
  async authorize(token: string): Promise<AuthorizeResponse> {
    const response = await this.send({ authorize: token });

    if (response.error) {
      throw new Error(response.error.message || response.error.code);
    }

    if (response.authorize?.currency) {
      this.setActiveCurrency(response.authorize.currency);
    }

    return response;
  }

  // =============================
  // BALANCE STREAM
  // =============================
  async subscribeBalance(handler: MessageHandler): Promise<() => void> {
    await this.send({ balance: 1, subscribe: 1 });

    const balanceHandler = (data: any) => {
      if (data.balance) handler(data);
    };
    
    this.globalHandlers.push(balanceHandler);
    
    // Return unsubscribe function
    return () => {
      const index = this.globalHandlers.indexOf(balanceHandler);
      if (index !== -1) {
        this.globalHandlers.splice(index, 1);
      }
    };
  }

  // =============================
  // TICKS
  // =============================
  async subscribeTicks(symbol: string, handler: MessageHandler): Promise<void> {
    const list = this.subscriptionHandlers.get(symbol) || [];
    list.push(handler);
    this.subscriptionHandlers.set(symbol, list);

    if (list.length === 1) {
      const res = await this.send({ ticks: symbol, subscribe: 1 });
      if (res.subscription?.id) {
        this.tickSubscriptions.set(symbol, res.subscription.id);
      }
    }
  }

  async unsubscribeTicks(symbol: string): Promise<void> {
    this.subscriptionHandlers.delete(symbol);

    const subId = this.tickSubscriptions.get(symbol);
    if (subId) {
      await this.send({ forget: subId });
      this.tickSubscriptions.delete(symbol);
    }
  }

  // =============================
  // GET CONTRACT PROPOSAL
  // =============================
  async getProposal(params: {
    amount: number;
    contract_type: string;
    duration: number;
    duration_unit: string;
    symbol: string;
    currency?: string;
  }): Promise<any> {
    const response = await this.send({
      proposal: 1,
      amount: params.amount,
      basis: 'stake',
      contract_type: params.contract_type,
      currency: params.currency || this.activeCurrency,
      duration: params.duration,
      duration_unit: params.duration_unit,
      symbol: params.symbol,
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response;
  }

  // =============================
  // BUY CONTRACT
  // =============================
  async buyContract(params: {
    amount: number;
    contract_type: string;
    duration: number;
    duration_unit: string;
    symbol: string;
    currency?: string;
  }): Promise<{ contractId: string; buyPrice: number }> {
    // First get proposal
    const proposal = await this.getProposal(params);

    if (!proposal.proposal?.id) {
      throw new Error('No proposal ID received');
    }

    // Then buy the contract
    const buy = await this.send({
      buy: proposal.proposal.id,
      price: params.amount,
    });

    if (buy.error) {
      throw new Error(buy.error.message);
    }

    if (!buy.buy?.contract_id) {
      throw new Error('No contract ID received');
    }

    return {
      contractId: String(buy.buy.contract_id),
      buyPrice: buy.buy.buy_price,
    };
  }

  // =============================
  // SELL CONTRACT
  // =============================
  async sellContract(contractId: string, price: number): Promise<any> {
    const response = await this.send({
      sell: contractId,
      price: price,
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response;
  }

  // =============================
  // GET OPEN CONTRACTS
  // =============================
  async getOpenContracts(): Promise<any[]> {
    const response = await this.send({
      proposal_open_contract: 1,
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.proposal_open_contract || [];
  }

  // =============================
  // WAIT FOR CONTRACT RESULT
  // =============================
  waitForContractResult(contractId: string, duration: number): Promise<ContractResult> {
    return new Promise((resolve, reject) => {
      let subId: string | null = null;
      let isResolved = false;

      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          if (subId) {
            this.send({ forget: subId }).catch(() => {});
          }
          removeHandler();
          reject(new Error(`Timeout waiting for contract ${contractId}`));
        }
      }, duration * 1000 + 10000);

      const handler = (data: any) => {
        if (isResolved) return;
        
        const poc = data.proposal_open_contract;
        if (!poc) return;
        
        if (String(poc.contract_id) !== contractId) return;

        const isSold = poc.is_sold === 1;
        const isExpired = poc.is_expired === 1;
        const settled = isExpired || isSold;

        if (settled) {
          isResolved = true;
          clearTimeout(timeout);

          // Unsubscribe
          if (subId) {
            this.send({ forget: subId }).catch(() => {});
          }

          // Remove handler
          removeHandler();

          // Calculate profit
          let profit = 0;
          if (typeof poc.profit === 'number') {
            profit = poc.profit;
          } else if (typeof poc.sell_price === 'number' && typeof poc.buy_price === 'number') {
            profit = poc.sell_price - poc.buy_price;
          }

          resolve({
            contractId,
            profit,
            status: profit > 0 ? 'won' : profit < 0 ? 'lost' : 'open',
            isExpired,
            buyPrice: poc.buy_price || 0,
            sellPrice: poc.sell_price || 0,
          });
        }
      };

      const removeHandler = () => {
        const index = this.globalHandlers.indexOf(handler);
        if (index !== -1) {
          this.globalHandlers.splice(index, 1);
        }
      };

      this.globalHandlers.push(handler);

      // Subscribe to contract updates
      this.send({
        proposal_open_contract: 1,
        contract_id: contractId,
        subscribe: 1,
      })
        .then(res => {
          if (res.subscription?.id) {
            subId = res.subscription.id;
          }
          if (res.error) {
            throw new Error(res.error.message);
          }
          // Check initial state
          handler(res);
        })
        .catch(error => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeout);
            removeHandler();
            reject(error);
          }
        });
    });
  }

  // =============================
  // UTIL
  // =============================
  extractLastDigit(price: number): number {
    const str = price.toString();
    // Handle scientific notation
    const numStr = str.includes('e') ? price.toFixed(10) : str;
    const lastChar = numStr.slice(-1);
    const digit = parseInt(lastChar);
    return isNaN(digit) ? 0 : digit;
  }

  onMessage(handler: MessageHandler): () => void {
    this.globalHandlers.push(handler);
    return () => {
      const index = this.globalHandlers.indexOf(handler);
      if (index !== -1) {
        this.globalHandlers.splice(index, 1);
      }
    };
  }
}

// =============================
// INSTANCE
// =============================
export const derivApi = new DerivAPI();

// =============================
// OAUTH PARSER (SECURE)
// =============================
export function parseOAuthRedirect(search: string): DerivAccount[] {
  const params = new URLSearchParams(search);

  const state = params.get('state');
  const saved = localStorage.getItem('oauth_state');

  if (state !== saved) {
    localStorage.removeItem('oauth_state');
    throw new Error('Invalid OAuth state - possible CSRF attack');
  }

  // Clear used state
  localStorage.removeItem('oauth_state');

  const accounts: DerivAccount[] = [];
  let i = 1;

  while (params.has(`acct${i}`)) {
    const loginid = params.get(`acct${i}`);
    const token = params.get(`token${i}`);
    const currency = params.get(`cur${i}`) || 'USD';
    
    if (loginid && token) {
      accounts.push({
        loginid,
        token,
        currency,
        is_virtual: loginid.startsWith('VRTC'),
      });
    }
    i++;
  }

  return accounts;
}

// =============================
// HELPER FUNCTIONS
// =============================
export function isConnectionError(error: any): boolean {
  return error?.message?.includes('WebSocket') || 
         error?.message?.includes('timeout') ||
         error?.code === 'ECONNREFUSED';
}

export function formatDerivError(error: any): string {
  if (error?.error?.message) return error.error.message;
  if (error?.message) return error.message;
  return 'Unknown Deriv API error';
}
