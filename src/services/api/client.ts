import { getEnv } from '../env';
import { parseApiError } from './errors';

type Json = Record<string, unknown> | unknown[];

function buildHeaders(token: string | null): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function request<T = unknown>(
  endpoint: string,
  init: RequestInit,
): Promise<T> {
  const { EXPO_PUBLIC_API_URL } = getEnv();
  const response = await fetch(`${EXPO_PUBLIC_API_URL}${endpoint}`, init);

  if (!response.ok) {
    throw await parseApiError(response);
  }

  const result = (await response.json()) as { data?: T } & Record<string, unknown>;
  return (result.data ?? (result as unknown)) as T;
}

export function apiGet<T = unknown>(endpoint: string, token: string | null): Promise<T> {
  return request<T>(endpoint, { method: 'GET', headers: buildHeaders(token) });
}

export function apiPost<T = unknown>(
  endpoint: string,
  token: string | null,
  body?: Json,
): Promise<T> {
  return request<T>(endpoint, {
    method: 'POST',
    headers: buildHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiPut<T = unknown>(
  endpoint: string,
  token: string | null,
  body?: Json,
): Promise<T> {
  return request<T>(endpoint, {
    method: 'PUT',
    headers: buildHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete<T = unknown>(endpoint: string, token: string | null): Promise<T> {
  return request<T>(endpoint, { method: 'DELETE', headers: buildHeaders(token) });
}
