import { describe, it, expect, beforeAll, vi } from 'vitest';
import { searchKiwi } from '../src/adapters/flight/kiwi';
import sample from './fixtures/kiwi_sample_search.json';
import expected from './fixtures/expected_normalized.json';

type TestEnv = Env & { __kv: Map<string, string> };

function makeEnv(): TestEnv {
  const map = new Map<string, string>();
  return {
    FLIGHT_API_BASE: 'https://tequila-api.kiwi.com',
    FLIGHT_API_KEY: 'test',
    EXR_BASE: 'https://api.frankfurter.app',
    ALERT_BRAND: 'Tripz',
    ALERT_FROM: 'alerts@tripz.app',
    DB: {} as any,
    CACHE: {
      get: async (k: string) => map.get(k) ?? null,
      put: async (k: string, v: string) => { map.set(k, v); },
    } as any,
    ALERT_QUEUE: {} as any,
    __kv: map,
  };
}

describe('Kiwi adapter normalization', () => {
  beforeAll(() => {
    vi.stubGlobal('fetch', vi.fn(async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/v2/search')) {
        return new Response(JSON.stringify(sample), { status: 200 });
      }
      if (url.includes('frankfurter')) {
        // assume USD->SGD ~ 1.33 for test determinism
        return new Response(JSON.stringify({ rates: { SGD: 1.3333 } }), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    }) as any);
  });

  it('maps Kiwi search results to normalized FlightOption[] in SGD', async () => {
    const env = makeEnv();
    const res = await searchKiwi({ origin: 'SIN', destination: 'BKK', dateFromISO: '2025-02-14', dateToISO: '2025-02-17' }, env);
    expect(res.length).toBe(2);
    expect(res).toEqual(expected);
    for (const r of res) {
      expect(typeof r.price).toBe('number');
      expect(r.currency).toBe('SGD');
      expect(r.bookingUrl).toContain('http');
    }
  });
});


