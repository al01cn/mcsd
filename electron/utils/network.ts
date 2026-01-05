import net from 'net';

/**
 * 测试指定 IP/域名 和 端口的 TCP 延迟
 * @param host 目标地址 (例如: '1.1.1.1' 或 'google.com')
 * @param port 目标端口 (例如: 80, 443)
 * @param timeout 超时时间，默认 5000ms
 * @returns 返回延迟毫秒数，若连接失败则抛出错误
 */
export const checkTcpDelay = (host: string, port: number, timeout: number = 5000): Promise<number> => {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const socket = new net.Socket();

    // 设置超时处理
    socket.setTimeout(timeout);

    socket.connect(port, host, () => {
      const delay = Date.now() - start;
      socket.destroy(); // 成功后立即销毁连接
      resolve(delay);
    });

    socket.on('error', (err) => {
      socket.destroy();
      reject(new Error(`连接失败: ${err.message}`));
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('连接超时'));
    });
  });
};