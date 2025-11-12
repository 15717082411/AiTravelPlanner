type Keys = {
  deepseekApiKey?: string;
  iflytekAppId?: string;
  iflytekApiKey?: string;
  iflytekApiSecret?: string;
};

let memoryKeys: Keys = {
  deepseekApiKey: process.env.DEEPSEEK_API_KEY,
  iflytekAppId: process.env.IFLYTEK_APP_ID,
  iflytekApiKey: process.env.IFLYTEK_API_KEY,
  iflytekApiSecret: process.env.IFLYTEK_API_SECRET,
};

export function getKeys(): Keys {
  return { ...memoryKeys };
}

export function updateKeys(partial: Keys) {
  memoryKeys = { ...memoryKeys, ...partial };
}

export function maskedKeys(): Keys {
  const mask = (v?: string) => (v ? v.replace(/.(?=.{4})/g, '*') : undefined);
  const k = getKeys();
  return {
    deepseekApiKey: mask(k.deepseekApiKey),
    iflytekAppId: k.iflytekAppId,
    iflytekApiKey: mask(k.iflytekApiKey),
    iflytekApiSecret: mask(k.iflytekApiSecret),
  };
}


