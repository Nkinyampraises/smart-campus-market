import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from './api';

describe('API error contract', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserves the HTTP status and server error code', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: vi.fn().mockResolvedValue({
        error: 'Claude guidance request limit reached; please try again later',
        code: 'CLAUDE_RATE_LIMITED',
      }),
    });

    await expect(api.priceSuggestion({ category: 'Books', condition: 'Used' })).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Claude guidance request limit reached; please try again later',
      status: 429,
      code: 'CLAUDE_RATE_LIMITED',
    });
  });

  it('converts fetch failures into a safe structured network error', async () => {
    fetch.mockRejectedValueOnce(new Error('private browser detail'));

    let error;
    try {
      await api.priceSuggestion({ category: 'Books', condition: 'Used' });
    } catch (requestError) {
      error = requestError;
    }

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      message: 'Unable to reach CampusTrade',
      status: 0,
      code: 'NETWORK_ERROR',
    });
    expect(error.message).not.toContain('private browser detail');
  });
});
