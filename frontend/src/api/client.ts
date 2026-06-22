import type { TodayBrief } from '../types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

async function staticBrief(): Promise<TodayBrief> {
  return request<TodayBrief>(`${import.meta.env.BASE_URL}data/brief.json`);
}

export async function getTodayBrief(): Promise<TodayBrief> {
  try {
    return await request<TodayBrief>('/api/brief/today');
  } catch {
    return staticBrief();
  }
}

export async function refreshSignals(): Promise<void> {
  try {
    await request('/api/refresh', { method: 'POST' });
  } catch {
    await staticBrief();
  }
}
