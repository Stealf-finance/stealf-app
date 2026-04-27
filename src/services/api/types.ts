import { apiGet, apiPost, apiPut, apiDelete } from './client';

type JsonBody = Record<string, unknown> | unknown[];

export interface AuthenticatedApi {
  get: <T = unknown>(endpoint: string) => Promise<T>;
  post: <T = unknown>(endpoint: string, body?: JsonBody) => Promise<T>;
  put: <T = unknown>(endpoint: string, body?: JsonBody) => Promise<T>;
  delete: <T = unknown>(endpoint: string) => Promise<T>;
}

export function makeAuthenticatedApi(token: string): AuthenticatedApi {
  return {
    get: (endpoint) => apiGet(endpoint, token),
    post: (endpoint, body) => apiPost(endpoint, token, body),
    put: (endpoint, body) => apiPut(endpoint, token, body),
    delete: (endpoint) => apiDelete(endpoint, token),
  };
}
