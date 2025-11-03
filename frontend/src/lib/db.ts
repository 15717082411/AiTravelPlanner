import { supabase } from './supabase';
import type { PlanResponse, PlanInput } from '../types/plan';
import type { Expense } from '../types/budget';

export async function savePlanToCloud(plan: PlanResponse, input: PlanInput) {
  if (!supabase) throw new Error('Supabase 未初始化');
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;
  if (!uid) throw new Error('请登录后再保存行程');
  const { data, error } = await supabase
    .from('plans')
    .insert({
      user_id: uid,
      destination: plan.destination,
      startDate: plan.startDate,
      endDate: plan.endDate,
      partySize: plan.partySize,
      preferences: plan.preferences,
      currency: plan.currency,
      budget: plan.budget,
      itinerary: plan.itinerary,
      sourceInput: input,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listPlansFromCloud() {
  const { data, error } = await supabase!.from('plans').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function saveExpensesToCloud(expenses: Expense[], currency: string, budgetCap?: number) {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;
  if (!uid) throw new Error('请登录后再同步开销');
  const rows = expenses.map((e) => ({
    user_id: uid,
    description: e.description,
    category: e.category,
    amount: e.amount,
    date: e.date,
    currency,
    budgetCap: budgetCap ?? null,
  }));
  const { data, error } = await supabase!.from('expenses').insert(rows).select('*');
  if (error) throw error;
  return data;
}

export async function listExpensesFromCloud(limit = 100) {
  const { data, error } = await supabase!.from('expenses').select('*').order('date', { ascending: false }).limit(limit);
  if (error) throw error;
  return data;
}