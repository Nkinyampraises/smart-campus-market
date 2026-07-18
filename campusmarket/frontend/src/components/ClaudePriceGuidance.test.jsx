import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ClaudePriceGuidance from './ClaudePriceGuidance';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: { priceSuggestion: vi.fn() },
}));

const highGuidance = {
  suggestion: 90000,
  range: { min: 81000, max: 99000 },
  confidence: 'high',
  count: 3,
  explanation: 'Recent campus demand and the stated condition support pricing within the calculated range.',
  provider: 'anthropic',
  model: 'claude-sonnet-5',
};

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

describe('ClaudePriceGuidance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is accessible and never calls Claude until the user explicitly clicks', () => {
    render(<ClaudePriceGuidance category="Electronics" condition="Like New" onApply={vi.fn()} />);

    expect(screen.getByRole('region', { name: 'Claude price guidance' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ask Claude' })).toBeEnabled();
    expect(screen.getByText(/Nothing is sent until you ask/i)).toBeInTheDocument();
    expect(api.priceSuggestion).not.toHaveBeenCalled();
  });

  it('shows loading and a high-confidence result, exposes an audible range, and applies the estimate', async () => {
    const pending = deferred();
    const onApply = vi.fn();
    api.priceSuggestion.mockReturnValueOnce(pending.promise);
    const user = userEvent.setup();
    render(<ClaudePriceGuidance category="Electronics" condition="Like New" onApply={onApply} />);

    await user.click(screen.getByRole('button', { name: 'Ask Claude' }));
    expect(api.priceSuggestion).toHaveBeenCalledWith({ category: 'Electronics', condition: 'Like New' });
    expect(screen.getByRole('status')).toHaveTextContent(/asking Claude/i);

    pending.resolve(highGuidance);

    expect(await screen.findByText(highGuidance.explanation)).toBeInTheDocument();
    expect(screen.getByText(/Claude · claude-sonnet-5/i)).toBeInTheDocument();
    expect(screen.getByText('to')).toHaveClass('sr-only');
    await user.click(screen.getByRole('button', { name: /^Use /i }));
    expect(onApply).toHaveBeenCalledWith(90000);
  });

  it('shows low confidence honestly and confirms Claude was not called', async () => {
    api.priceSuggestion.mockResolvedValueOnce({
      suggestion: null,
      confidence: 'low',
      count: 2,
      message: 'Not enough completed campus sales for reliable price guidance',
    });
    const user = userEvent.setup();
    render(<ClaudePriceGuidance category="Other" condition="Used" onApply={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Ask Claude' }));

    expect(await screen.findByText(/Only 2 comparable completed sales are available/i)).toBeInTheDocument();
    expect(screen.getByText(/Claude was not called/i)).toBeInTheDocument();
    expect(screen.queryByText(/Claude ·/i)).not.toBeInTheDocument();
  });

  it('accepts one FCFA as the minimum usable estimate and rejects zero-valued guidance', async () => {
    const onApply = vi.fn();
    api.priceSuggestion
      .mockResolvedValueOnce({
        ...highGuidance,
        suggestion: 1,
        range: { min: 1, max: 1 },
      })
      .mockResolvedValueOnce({
        ...highGuidance,
        suggestion: 0,
        range: { min: 0, max: 0 },
      });
    const user = userEvent.setup();
    render(<ClaudePriceGuidance category="Electronics" condition="Old" onApply={onApply} />);

    await user.click(screen.getByRole('button', { name: 'Ask Claude' }));
    await user.click(await screen.findByRole('button', { name: /Use 1 FCFA/i }));
    expect(onApply).toHaveBeenCalledWith(1);

    await user.click(screen.getByRole('button', { name: 'Ask Claude again' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be loaded/i);
    expect(screen.queryByRole('button', { name: /Use 0 FCFA/i })).not.toBeInTheDocument();
  });

  it.each([
    [401, 'UNAUTHORIZED', /sign in with your ICT University account/i],
    [400, 'BAD_REQUEST', /choose a supported category and condition/i],
    [429, 'CLAUDE_RATE_LIMITED', /wait about 15 minutes/i],
    [503, 'PRICE_DATA_UNAVAILABLE', /completed-sale price data is temporarily unavailable/i],
    [503, 'CLAUDE_UNAVAILABLE', /temporarily unavailable.*still choose your own price and publish/i],
    [0, 'NETWORK_ERROR', /could not reach CampusTrade.*check your connection/i],
  ])('shows an honest message for status %s', async (status, code, expectedMessage) => {
    api.priceSuggestion.mockRejectedValueOnce(Object.assign(new Error('internal detail'), { status, code }));
    const user = userEvent.setup();
    render(<ClaudePriceGuidance category="Electronics" condition="Used" onApply={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Ask Claude' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(expectedMessage);
    expect(screen.getByRole('button', { name: 'Ask Claude again' })).toBeEnabled();
  });

  it('discards a response after the category or condition changes', async () => {
    const pending = deferred();
    api.priceSuggestion.mockReturnValueOnce(pending.promise);
    const user = userEvent.setup();
    const { rerender } = render(
      <ClaudePriceGuidance category="Electronics" condition="Used" onApply={vi.fn()} />
    );

    await user.click(screen.getByRole('button', { name: 'Ask Claude' }));
    rerender(<ClaudePriceGuidance category="Books" condition="Used" onApply={vi.fn()} />);
    pending.resolve(highGuidance);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Ask Claude' })).toBeEnabled());
    expect(screen.queryByText(highGuidance.explanation)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
