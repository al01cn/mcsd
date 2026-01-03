import { nanoid } from "nanoid";

type NodeInfo = {
    name: string;
    host: string;
    description: string;
    vip: number;
    flag: number;
};

type NodeStatus = {
    id: string;
    online: number[];
    uptime: number;
    load: number;
};

type NodeMerged = NodeInfo & NodeStatus;

interface NatFrpUserInfoGroup {
    name: string;
    level: string;
    expires: string;
}

export interface NatFrpUserInfo {
    id: number;
    name: string;
    avatar: string;
    speed: string;
    tunnels: string;
    realname: string;
    group: NatFrpUserInfoGroup;
}

export function MinecraftTunnelName() {
    return "mc-" + nanoid(8).toString();
}

export class NatFrp {
    static api_url = "https://api.natfrp.com/v4";

    static async userInfo(token: string) {
        const res = await fetch(`${this.api_url}/user/info?token=${token}`, {
            method: "GET",
        })

        if (!res.ok) {
            return null;
        }

        return (await res.json()) as NatFrpUserInfo;
    }

    static async clients(){
        const res = await fetch(`${this.api_url}/system/clients`, {
            method: "GET",
        })

        return (await res.json()) as any;
    }
    
    static async tunnelInfo(token: string) {
        const res = await fetch(`${this.api_url}/tunnels?token=${token}`, {
            method: "GET",
        })

        if (!res.ok) {
            return null;
        }

        return (await res.json()) as any;
    }

    static async nodes(token: string) {
        const res = await fetch(`${this.api_url}/nodes?token=${token}`, {
            method: "GET",
        })

        if (!res.ok) {
            return null;
        }

        return (await res.json()) as NodeInfo[];
    }

    static async nodeStats(token: string) {
        const res = await fetch(`${this.api_url}/node/stats?token=${token}`, {
            method: "GET",
        })

        if (!res.ok) {
            return null;
        }

        const data = await res.json();

        return data.nodes as NodeStatus[];
    }

    // 合并节点信息和状态
    static async getMergedNodes(token: string): Promise<NodeMerged[] | null> {
        const nodesData = await this.nodes(token);
        const statsData = await this.nodeStats(token);

        if (!nodesData || !statsData) return null;

        const merged: NodeMerged[] = statsData.map(stat => {
            const nodeInfo = nodesData[stat.id as any] as NodeInfo;
            if (!nodeInfo) {
                // 状态存在，但节点信息缺失时，保留状态
                return stat as NodeMerged;
            }
            return { ...nodeInfo, ...stat };
        });

        return merged;
    }

    static async tunnelCreate(token: string, node: number, local_port: number) {
        const tunnel_name = MinecraftTunnelName()
        const raw = {
            "name": tunnel_name,
            "type": "tcp",
            "node": node,
            "local_ip": "127.0.0.1",
            "local_port": local_port,
        }
        const res = await fetch(`${this.api_url}/tunnels?token=${token}`, {
            method: "POST",
            body: JSON.stringify(raw),
        })

        if (!res.ok) {
            return null;
        }

        const data = await res.json();
        return data;
    }

    static async tunnelEdit(token: string, tunnel_id: number, local_port: number) {
        const raw = {
            "id": tunnel_id,
            local_port: local_port
        }

        const res = await fetch(`${this.api_url}/tunnel/edit??token=${token}`, {
            method: "POST",
            body: JSON.stringify(raw),
        })

        if (!res.ok) {
            return null;
        }

        return true;
    }
}