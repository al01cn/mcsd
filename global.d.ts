// global.d.ts
export interface MCProxyConfig {
    id: string;
    remoteHost: string;
    remotePort: number;
    localPort: number;
    fakeMotd: string;
}

export interface ProxyStatus {
    id: string;
    success: boolean;
    message?: string;
}

declare global {
    interface Window {
        mcproxy: {
            start: (config: MCProxyConfig) => void;
            stop: (id: string) => void;
            onStatus: (callback: (data: ProxyStatus) => void) => () => void;
        };
    }
}