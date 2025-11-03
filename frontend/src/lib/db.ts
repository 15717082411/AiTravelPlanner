import { supabase } from './supabase';
import type { PlanResponse, PlanInput } from '../types/plan';
import type { Expense } from '../types/budget';

function getClient() {
  if (!supabase) throw new Error('未配置 Supabase：请在 frontend/.env 设置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY；或设置 VITE_AUTH_MODE=local 使用本地开发模式');
  return supabase;
}

async function requireUserId() {
  const { data: u } = await getClient().auth.getUser();
  const uid = u?.user?.id;
  if (!uid) throw new Error('请登录后再执行云端操作');
  return uid;
}

export async function savePlanToCloud(plan: PlanResponse, input: PlanInput) {
  const uid = await requireUserId();
  const { data, error } = await getClient()
    .from('plans')
    .insert({
      user_id: uid,
      destination: plan.destination,
      startdate: plan.startDate,
      enddate: plan.endDate,
      partysize: plan.partySize,
      preferences: plan.preferences,
      currency: plan.currency,
      budget: plan.budget,
      itinerary: plan.itinerary,
      sourceinput: input,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveExpensesToCloud(expenses: Expense[], currency: string, budgetCap?: number) {
  const uid = await requireUserId();
  const rows = expenses.map((e) => ({ user_id: uid, description: e.description, category: e.category, amount: e.amount, date: e.date, currency, budgetcap: budgetCap ?? null }));
  const { data, error } = await getClient().from('expenses').insert(rows).select('*');
  if (error) throw error;
  return data;
}

export async function listPlans() {
  const uid = await requireUserId();
  const { data, error } = await getClient().from('plans').select('*').eq('user_id', uid).order('created_at', { ascending: false });
  if (error) throw error;
  return data as any[];
}

export async function deletePlan(id: string) {
  const uid = await requireUserId();
  const { error } = await getClient().from('plans').delete().eq('id', id).eq('user_id', uid);
  if (error) throw error;
}

export async function listExpenses() {
  const uid = await requireUserId();
  const { data, error } = await getClient().from('expenses').select('*').eq('user_id', uid).order('date', { ascending: false });
  if (error) throw error;
  return data as any[];
}

export async function getPlanById(id: string) {
  const uid = await requireUserId();
  const { data, error } = await getClient().from('plans').select('*').eq('user_id', uid).eq('id', id).single();
  if (error) throw error;
  return data as any;
}