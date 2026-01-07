// logger.ts
export const logger = {
    info: (msg: string, data?: any) => (window as any).system.log('info', msg, data),
    error: (msg: string, data?: any) => (window as any).system.log('error', msg, data),
    warn: (msg: string, data?: any) => (window as any).system.log('warn', msg, data),
    debug: (msg: string, data?: any) => (window as any).system.log('debug', msg, data),
};

// 使用示例：
// logger.info('用户点击了登录按钮', { userId: 123 });