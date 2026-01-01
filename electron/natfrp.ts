
const API_URL = 'https://api.natfrp.com/v4';

export interface ErrorResponse {
  code: number;
  msg: string;
}

// System Schemas
export interface Bulletin {
  title: string;
  content: string;
  icon?: string;
  time: string;
  expand?: boolean;
}

export interface ClientDownloadInfo {
  ver: string;
  time: number;
  note?: string;
  archs?: Record<string, {
    title: string;
    url: string;
    hash: string;
    size: number;
  }>;
}

export interface Policy {
  alert?: string;
  updated?: string;
  content: string;
}

// User Schemas
export interface UserInfo {
  // Defined in ./schemas/UserInfo.yaml, treating as generic object for now
  [key: string]: any;
}

export interface DataPlan {
  // Defined in ./schemas/DataPlan.yaml
  [key: string]: any;
}

export interface TrafficHistoryItem {
  0: string; // Time
  1: number; // Used
  2: number; // Remaining
}

export interface Notification {
  match: string[];
  type: 'default' | 'info' | 'success' | 'warning' | 'error';
  title: string;
  content: string;
}

// Node Schemas
export interface NodeInfo {
  name: string;
  host: string;
  description: string;
  vip?: number;
  flag?: number;
}

export interface NodeStatus {
  id: number;
  online: number;
  uptime: number;
  load: number;
}

export interface NodeStatusResponse {
  time: number;
  nodes: NodeStatus[];
}

// Tunnel Schemas
export interface Tunnel {
  // Defined in ./schemas/Tunnel.yaml
  id: number;
  name: string;
  type: string;
  node: number;
  [key: string]: any;
}

export interface TunnelCreateOptions {
  name: string;
  type: 'tcp' | 'udp' | 'http' | 'https' | 'wol' | 'etcp' | 'eudp';
  node: number;
  note?: string;
  extra?: string; // key=value format
  local_ip?: string;
  local_port?: number;
  remote?: string;
}

export interface TunnelCreatedResponse {
  id: number;
  name: string;
  remote?: string;
}

// Computer Schemas
export interface Computer {
  // Defined in ./schemas/Computer.yaml
  [key: string]: any;
}

export interface ComputerWithId extends Computer {
  id: number;
}

// Domain Schemas
export interface DomainRecord {
  rr: string;
  type: 'CNAME' | 'SRV';
  tunnel: number;
}

export interface DomainInfoResponse {
  domain: string;
  records: DomainRecord[];
  ssl?: {
    created: number;
    expires: number;
  };
  words?: string[];
  srv_apps?: Record<string, string>;
  acquire?: Record<string, {
    desc: string;
    val: string;
  }>;
}

export class SakuraFrpApi {
  private token?: string;

  constructor(token?: string) {
    this.token = token;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_URL}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMsg = `Request failed with status ${response.status}`;
      try {
        const errorBody = await response.json() as ErrorResponse;
        if (errorBody.msg) {
          errorMsg = errorBody.msg;
        }
      } catch (e) {
        // ignore json parse error
      }
      throw new Error(errorMsg);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    // Handle plain text response
    const contentType = response.headers.get('content-type');
    if (contentType && (contentType.includes('text/plain') || contentType.includes('text/toml') || contentType.includes('text/ini'))) {
        return response.text() as unknown as T;
    }

    return response.json() as Promise<T>;
  }

  // --- System Information ---

  /**
   * 获取平台公告
   */
  async getBulletin(): Promise<Bulletin[]> {
    return this.request<Bulletin[]>('/system/bulletin');
  }

  /**
   * 获取客户端软件信息
   */
  async getClients(): Promise<Record<string, ClientDownloadInfo>> {
    return this.request<Record<string, ClientDownloadInfo>>('/system/clients');
  }

  /**
   * 获取服务条款和策略
   */
  async getPolicy(type: 'tos' | 'content' | 'privacy' | 'rule' | 'refund'): Promise<Policy> {
    const params = new URLSearchParams({ type });
    return this.request<Policy>(`/system/policy?${params.toString()}`);
  }

  // --- User Information ---

  /**
   * 获取用户基本信息
   */
  async getUserInfo(): Promise<UserInfo> {
    return this.request<UserInfo>('/user/info');
  }

  /**
   * 获取用户流量包
   */
  async getDataPlans(status: 'valid' | 'invalid' | 'all' = 'valid'): Promise<DataPlan[]> {
    const params = new URLSearchParams({ status });
    return this.request<DataPlan[]>(`/user/data_plans?${params.toString()}`);
  }

  /**
   * 获取用户流量历史
   */
  async getTrafficHistory(type: 'day' | 'week' | 'month'): Promise<TrafficHistoryItem[]> { // Corrected type based on example [[string, number, number]]
    const params = new URLSearchParams({ type });
    // The response is array of array: [string, number, number][]
    // But schema says type: array, items: array...
    // Let's use any[][] or specific tuple if possible, but TypeScript tuples in JSON are arrays
    return this.request<any[][]>(`/user/traffic_history?${params.toString()}`) as unknown as Promise<TrafficHistoryItem[]>;
  }

  /**
   * 获取用户通知列表
   */
  async getNotifications(): Promise<Notification[]> {
    return this.request<Notification[]>('/user/notification');
  }

  // --- Node Management ---

  /**
   * 列出所有节点
   */
  async getNodes(): Promise<Record<string, NodeInfo>> {
    return this.request<Record<string, NodeInfo>>('/nodes');
  }

  /**
   * 获取节点状态信息
   */
  async getNodeStats(): Promise<NodeStatusResponse> {
    return this.request<NodeStatusResponse>('/node/stats');
  }

  // --- Tunnel Management ---

  /**
   * 列出所有隧道
   */
  async getTunnels(): Promise<Tunnel[]> {
    return this.request<Tunnel[]>('/tunnels');
  }

  /**
   * 创建隧道
   */
  async createTunnel(options: TunnelCreateOptions): Promise<TunnelCreatedResponse> {
    return this.request<TunnelCreatedResponse>('/tunnels', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  /**
   * 获取隧道配置文件
   * @param query 启动目标查询字符串 (隧道ID 或 n前缀节点ID)
   * @param frpc frpc 版本
   */
  async getTunnelConfig(query: string, frpc: string = '0.59.0'): Promise<string> {
    return this.request<string>('/tunnel/config', {
      method: 'POST',
      body: JSON.stringify({ query, frpc }),
    });
  }

  /**
   * 编辑隧道
   */
  async editTunnel(id: number, options: { note?: string; local_ip?: string; local_port?: number; extra?: string }): Promise<{ extra: string }> {
    return this.request<{ extra: string }>('/tunnel/edit', {
      method: 'POST',
      body: JSON.stringify({ id, ...options }),
    });
  }

  /**
   * 锁定隧道
   */
  async lockTunnel(id: number, options: { edit?: boolean; delete?: boolean; migrate?: boolean }): Promise<void> {
    return this.request<void>('/tunnel/lock', {
      method: 'POST',
      body: JSON.stringify({ id, ...options }),
    });
  }

  /**
   * 迁移隧道
   */
  async migrateTunnel(id: number, targetNodeId: number): Promise<void> {
    return this.request<void>('/tunnel/migrate', {
      method: 'POST',
      body: JSON.stringify({ id, node: targetNodeId }),
    });
  }

  /**
   * 删除隧道
   * @param ids 隧道 ID 列表
   */
  async deleteTunnels(ids: number[]): Promise<{ deleted: number[]; failed: number[] }> {
    return this.request<{ deleted: number[]; failed: number[] }>('/tunnel/delete', {
      method: 'POST',
      body: JSON.stringify({ ids: ids.join(',') }),
    });
  }

  /**
   * 获取流量使用记录
   */
  async getTunnelTraffic(id: number): Promise<Record<string, number>> {
    const params = new URLSearchParams({ id: id.toString() });
    return this.request<Record<string, number>>(`/tunnel/traffic?${params.toString()}`);
  }

  /**
   * 授权 IP 访问隧道
   */
  async authTunnel(id: number, ip?: string): Promise<string> {
    return this.request<string>('/tunnel/auth', {
      method: 'POST',
      body: JSON.stringify({ id, ip }),
    });
  }

  /**
   * 根据节点 IP 和端口查询隧道
   */
  async queryTunnelByRemote(ip: string, port: number): Promise<{ id: number; name: string }> {
    return this.request<{ id: number; name: string }>('/tunnel/auth_query', {
      method: 'POST',
      body: JSON.stringify({ ip, port }),
    });
  }

  // --- Computer Management ---

  /**
   * 获取计算机列表
   */
  async getComputers(): Promise<ComputerWithId[]> {
    return this.request<ComputerWithId[]>('/computers');
  }

  /**
   * 添加计算机
   */
  async addComputer(computer: Computer): Promise<{ id: number }> {
    return this.request<{ id: number }>('/computers', {
      method: 'POST',
      body: JSON.stringify(computer),
    });
  }

  /**
   * 更新计算机信息
   */
  async updateComputer(computer: ComputerWithId): Promise<void> {
    return this.request<void>('/computers', {
      method: 'PATCH',
      body: JSON.stringify(computer),
    });
  }

  /**
   * 删除计算机
   */
  async deleteComputer(id: number): Promise<void> {
    return this.request<void>('/computer/delete', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  }

  /**
   * 执行远程开机
   */
  async powerOnComputer(id: number, password?: string): Promise<void> {
    return this.request<void>('/computer/poweron', {
      method: 'POST',
      body: JSON.stringify({ id, password }),
    });
  }

  // --- Domain Binding ---

  /**
   * 获取子域绑定功能相关数据
   */
  async getDomainInfo(): Promise<DomainInfoResponse> {
    return this.request<DomainInfoResponse>('/domain/get');
  }
}
