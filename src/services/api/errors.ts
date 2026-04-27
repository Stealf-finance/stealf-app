export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function parseApiError(response: Response): Promise<ApiError> {
  const data = await response.json().catch(() => ({}));
  const message =
    (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
      ? data.error
      : null) || `API error: ${response.status}`;
  return new ApiError(message, response.status, data);
}
