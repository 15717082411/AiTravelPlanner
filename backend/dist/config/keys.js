"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKeys = getKeys;
exports.updateKeys = updateKeys;
exports.maskedKeys = maskedKeys;
let memoryKeys = {
    deepseekApiKey: process.env.DEEPSEEK_API_KEY,
    iflytekAppId: process.env.IFLYTEK_APP_ID,
    iflytekApiKey: process.env.IFLYTEK_API_KEY,
    iflytekApiSecret: process.env.IFLYTEK_API_SECRET,
};
function getKeys() {
    return { ...memoryKeys };
}
function updateKeys(partial) {
    memoryKeys = { ...memoryKeys, ...partial };
}
function maskedKeys() {
    const mask = (v) => (v ? v.replace(/.(?=.{4})/g, '*') : undefined);
    const k = getKeys();
    return {
        deepseekApiKey: mask(k.deepseekApiKey),
        iflytekAppId: k.iflytekAppId,
        iflytekApiKey: mask(k.iflytekApiKey),
        iflytekApiSecret: mask(k.iflytekApiSecret),
    };
}
