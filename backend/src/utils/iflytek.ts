import crypto from 'crypto';
import { getKeys } from '../config/keys';

/**
 * 构建科大讯飞 WebSocket 鉴权参数。
 * 参考官方文档：https://www.xfyun.cn/doc/asr/iat/API.html
 */
export function buildIFlytekAuth(customHost?: string) {
  const { iflytekAppId, iflytekApiKey, iflytekApiSecret } = getKeys();
  const host = customHost || 'ws-api.xfyun.cn';
  const date = new Date().toUTCString();

  if (!iflytekAppId || !iflytekApiKey || !iflytekApiSecret) {
    throw new Error('缺少讯飞配置，请在设置页填写 iflytekAppId / iflytekApiKey / iflytekApiSecret');
  }

  const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v2/iat HTTP/1.1`;
  const signatureSha = crypto.createHmac('sha256', iflytekApiSecret).update(signatureOrigin).digest('base64');
  const authorizationOrigin = `api_key="${iflytekApiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signatureSha}"`;
  const authorization = Buffer.from(authorizationOrigin).toString('base64');

  return {
    host,
    appId: iflytekAppId,
    date,
    authorization,
  };
}


