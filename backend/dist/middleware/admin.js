"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminGuard = adminGuard;
/**
 * 管理接口鉴权：
 * - 若未设置环境变量 ADMIN_TOKEN，则默认放行（便于本地开发）
 * - 若设置了 ADMIN_TOKEN，则请求需携带 header: x-admin-token
 */
function adminGuard(req, res, next) {
    const required = process.env.ADMIN_TOKEN;
    if (!required) {
        return next();
    }
    const token = req.header('x-admin-token');
    if (token && token === required) {
        return next();
    }
    return res.status(401).json({ ok: false, error: 'Unauthorized: invalid x-admin-token' });
}
