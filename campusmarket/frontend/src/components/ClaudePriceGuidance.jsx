import React, { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

const formatFCFA = (value) => `${Number(value).toLocaleString('fr-FR')} FCFA`;

const isValidGuidance = (result) => {
  if (result?.confidence === 'low') {
    return result.suggestion === null
      && Number.isInteger(result.count)
      && result.count >= 0
      && result.count < 3;
  }
  if (result?.confidence !== 'high' || result.provider !== 'anthropic') return false;
  const values = [result.suggestion, result.range?.min, result.range?.max];
  return values.every((value) => Number.isFinite(value) && value > 0)
    && result.range.min <= result.suggestion
    && result.suggestion <= result.range.max
    && Number.isInteger(result.count)
    && result.count >= 3
    && typeof result.explanation === 'string'
    && result.explanation.length >= 10
    && result.explanation.length <= 320
    && typeof result.model === 'string'
    && /^[a-zA-Z0-9._:-]{1,100}$/.test(result.model);
};

const getAskButtonLabel = (status) => {
  if (status === 'loading') return 'Asking Claude…';
  if (status === 'idle') return 'Ask Claude';
  return 'Ask Claude again';
};

const getGuidanceErrorMessage = (error) => {
  if (error?.status === 401) {
    return 'Please sign in with your ICT University account before asking Claude.';
  }
  if (error?.status === 400) {
    return 'Choose a supported category and condition, then ask Claude again.';
  }
  if (error?.status === 429 || error?.code === 'CLAUDE_RATE_LIMITED') {
    return 'The Claude guidance limit has been reached. Please wait about 15 minutes and try again.';
  }
  if (error?.code === 'PRICE_DATA_UNAVAILABLE') {
    return 'Completed-sale price data is temporarily unavailable. You can still choose your own price and publish.';
  }
  if (error?.status === 503) {
    return 'Claude guidance is temporarily unavailable. You can still choose your own price and publish.';
  }
  if (error?.status === 0 || error?.code === 'NETWORK_ERROR') {
    return 'Could not reach CampusTrade. Check your connection and try again.';
  }
  return 'Claude guidance could not be loaded. You can still choose your own price and publish.';
};

const ClaudePriceGuidance = ({ category, condition, onApply }) => {
  const requestSequence = useRef(0);
  const [status, setStatus] = useState('idle');
  const [guidance, setGuidance] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    requestSequence.current += 1;
    setStatus('idle');
    setGuidance(null);
    setError('');
    return () => { requestSequence.current += 1; };
  }, [category, condition]);

  const askClaude = async () => {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    setStatus('loading');
    setGuidance(null);
    setError('');

    try {
      const result = await api.priceSuggestion({ category, condition });
      if (requestId !== requestSequence.current) return;
      if (!isValidGuidance(result)) throw new Error('Invalid price guidance response');
      setGuidance(result);
      setStatus('success');
    } catch (requestError) {
      if (requestId !== requestSequence.current) return;
      setError(getGuidanceErrorMessage(requestError));
      setStatus('error');
    }
  };

  const hasEstimate = status === 'success' && guidance?.confidence === 'high';
  const hasInsufficientData = status === 'success' && guidance?.confidence === 'low';
  const isLoading = status === 'loading';

  return (
    <section
      aria-label="Claude price guidance"
      aria-busy={isLoading}
      className="h-fit rounded-2xl border border-emerald-200 bg-emerald-50 p-6"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="material-symbols-outlined text-[22px] text-emerald-600">
            auto_awesome
          </span>
          <h3 className="text-[15px] font-black text-[#1b1c1c]">Claude price guidance</h3>
        </div>
        {hasEstimate && guidance.provider === 'anthropic' && (
          <span className="shrink-0 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[10px] font-bold text-emerald-700">
            Claude · {guidance.model}
          </span>
        )}
      </div>

      <div aria-live="polite">
        {status === 'idle' && (
          <p className="mb-4 text-[13px] leading-relaxed text-gray-600">
            Ask for a range calculated from completed campus sales and a short Claude explanation.
            Nothing is sent until you ask.
          </p>
        )}

        {isLoading && (
          <output className="mb-4 flex items-center gap-3 text-[13px] text-gray-600">
            <span aria-hidden="true" className="material-symbols-outlined animate-spin text-[20px] text-emerald-600">
              progress_activity
            </span>
            <span>Checking completed campus sales and asking Claude…</span>
          </output>
        )}

        {status === 'error' && (
          <p className="mb-4 rounded-xl border border-red-200 bg-white p-3 text-[13px] leading-relaxed text-red-700" role="alert">
            {error}
          </p>
        )}

        {hasInsufficientData && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-white p-4">
            <p className="mb-1 text-[13px] font-bold text-[#1b1c1c]">More sales are needed</p>
            <p className="text-[12px] leading-relaxed text-gray-600">
              Only {guidance.count} comparable completed {guidance.count === 1 ? 'sale is' : 'sales are'} available.
              Claude was not called because the evidence is too limited.
            </p>
          </div>
        )}

        {hasEstimate && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-white p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">CampusTrade estimate</p>
            <div className="my-2 flex flex-wrap items-baseline gap-2">
              <span className="text-[18px] font-black text-[#ff6b1a]">{formatFCFA(guidance.range.min)}</span>
              <span className="sr-only">to</span>
              <span aria-hidden="true" className="text-gray-400">–</span>
              <span className="text-[18px] font-black text-[#ff6b1a]">{formatFCFA(guidance.range.max)}</span>
            </div>
            <p className="mb-3 text-[11px] text-gray-500">
              Calculated from {guidance.count} completed campus sales. Claude explains the numbers; it does not set them.
            </p>
            <p className="text-[13px] leading-relaxed text-gray-700">{guidance.explanation}</p>
            <button
              type="button"
              onClick={() => onApply(guidance.suggestion)}
              className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-[12px] font-black uppercase tracking-widest text-white transition-colors hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:w-auto"
            >
              Use {formatFCFA(guidance.suggestion)}
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={askClaude}
        disabled={isLoading || !category || !condition}
        className="w-full rounded-xl border border-emerald-600 bg-white px-4 py-2.5 text-[12px] font-black uppercase tracking-widest text-emerald-700 transition-colors hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {getAskButtonLabel(status)}
      </button>
    </section>
  );
};

export default ClaudePriceGuidance;
