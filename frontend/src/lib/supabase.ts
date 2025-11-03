import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // 在运行时给出提示，但不抛出致命错误
  console.warn('Supabase 未配置: 需要 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY');
}

export const supabase = url && anonKey ? createClient(url, anonKey) : undefined;