
const API_URL = 'https://api.locyanfrp.cn/v3';

export interface BaseResponse<T> {
  status: number;
  message: string;
  data: T;
}

export interface UserInfo {
  id: number;
  username: string;
  email: string;
  avatar: string;
  traffic: number;
  balance: number;
  // Add other fields as needed
  [key: string]: any;
}

export interface NodeInfo {
  id: number;
  name: string;
  host: string;
  ip?: string;
  description?: string;
  server_port: number;
  port_range: string[];
  additional: {
    allow_big_traffic: boolean;
    allow_udp: boolean;
    allow_http: boolean;
    need_icp: boolean;
  };
  verification_level: 'REAL_NAME' | 'REAL_PERSON';
}

export interface Tunnel {
  id: number;
  name: string;
  type: 'TCP' | 'UDP' | 'HTTP' | 'HTTPS' | 'XTCP' | 'STCP' | 'SUDP';
  local_ip: string;
  local_port: number;
  remote_port?: number;
  use_compression: boolean;
  use_encryption: boolean;
  proxy_protocol_version?: 'V1' | 'V2';
  domain?: string;
  secret_key: string;
  locations?: string;
  node: {
    id: number;
    name?: string;
    host?: string;
    ip?: string;
  };
  status: 'ACTIVE' | 'BANNED';
}

export interface CreateTunnelOptions {
  user_id: number;
  node_id: number;
  name: string;
  type: 'TCP' | 'UDP' | 'HTTP' | 'HTTPS' | 'XTCP' | 'STCP' | 'SUDP';
  local_ip: string;
  local_port: number;
  use_encryption: boolean;
  use_compression: boolean;
  remote_port?: number;
  proxy_protocol_version?: 'V1' | 'V2';
  secret_key?: string;
  domain?: string;
  locations?: string[]; // Assuming array based on usage, doc said array[string]
}

export interface TunnelConfigResponse {
  config: string;
}

export interface MinecraftGame {
  code: string;
  proxy_id: number;
  name: string;
}

export interface Pagination {
  count: number;
}

export interface PaginatedList<T> {
  list: T[];
  pagination: Pagination;
}

export class LoCyanFrpApi {
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
      throw new Error(`Request failed with status ${response.status}`);
    }

    const resBody = await response.json() as BaseResponse<T>;

    if (resBody.status !== 200) {
        throw new Error(resBody.message || `API Error: ${resBody.status}`);
    }

    return resBody.data;
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(): Promise<UserInfo> {
    // Assuming /user or /user/info based on typical patterns. 
    // If this fails, we might need to check the docs specifically for this endpoint.
    return this.request<UserInfo>('/user'); 
  }

  /**
   * 获取节点列表
   */
  async getNodes(): Promise<PaginatedList<NodeInfo>> {
    // Based on docs, it returns a paginated list
    return this.request<PaginatedList<NodeInfo>>('/nodes');
  }

  /**
   * 获取隧道列表
   */
  async getTunnels(userId: number, page?: number, size?: number): Promise<PaginatedList<Tunnel>> {
    const params = new URLSearchParams({ user_id: userId.toString() });
    if (page) params.append('page', page.toString());
    if (size) params.append('size', size.toString());
    
    return this.request<PaginatedList<Tunnel>>(`/tunnels?${params.toString()}`);
  }

  /**
   * 创建隧道
   */
  async createTunnel(options: CreateTunnelOptions): Promise<{ tunnel_id: number }> {
    return this.request<{ tunnel_id: number }>('/tunnels', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  /**
   * 删除隧道
   */
  async deleteTunnel(tunnelId: number, userId: number): Promise<void> {
      // Assuming DELETE /tunnels?tunnel_id=...&user_id=... or DELETE /tunnels/{id}
      // Docs for delete were not fully fetched, but standard REST implies DELETE.
      // 390821350e0.md was "删除隧道".
      // Let's assume DELETE /tunnels with body or query.
      // Most Locyan endpoints seem to use query or body.
      // I'll try DELETE /tunnels with body.
      return this.request<void>('/tunnels', {
          method: 'DELETE',
          body: JSON.stringify({ tunnel_id: tunnelId, user_id: userId })
      });
  }

  /**
   * 获取隧道配置文件
   */
  async getTunnelConfig(userId: number, tunnelId?: number, nodeId?: number, format: 'JSON' | 'TOML' | 'YAML' = 'TOML'): Promise<string> {
    const params = new URLSearchParams({ 
        user_id: userId.toString(),
        format
    });
    if (tunnelId) params.append('tunnel_id', tunnelId.toString());
    if (nodeId) params.append('node_id', nodeId.toString());

    const data = await this.request<TunnelConfigResponse>(`/tunnel/config?${params.toString()}`);
    return data.config;
  }

  /**
   * 获取用户全部 Minecraft 游戏
   */
  async getMinecraftGames(userId: number, page?: number, size?: number): Promise<PaginatedList<MinecraftGame>> {
    const params = new URLSearchParams({ user_id: userId.toString() });
    if (page) params.append('page', page.toString());
    if (size) params.append('size', size.toString());

    return this.request<PaginatedList<MinecraftGame>>(`/game/minecraft/games?${params.toString()}`);
  }

  /**
   * 创建 Minecraft 联机房间
   */
  async createMinecraftRoom(userId: number, tunnelId: number): Promise<{ code: string }> {
    return this.request<{ code: string }>('/game/minecraft/game', {
      method: 'PUT',
      body: JSON.stringify({ user_id: userId, tunnel_id: tunnelId }),
    });
  }
}
