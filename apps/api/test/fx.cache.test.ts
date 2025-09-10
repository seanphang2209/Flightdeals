import { describe, it, expect, vi } from 'vitest';
import { searchKiwi } from '../src/adapters/flight/kiwi';

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

describe('FX cache', () => {
  it('caches rate for 24h', async () => {
    let fetchCount = 0;
    vi.stubGlobal('fetch', vi.fn(async (input: any) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/v2/search')) {
        return new Response(JSON.stringify({ currency: 'USD', data: [] }), { status: 200 });
      }
      if (url.includes('frankfurter')) {
        fetchCount++;
        return new Response(JSON.stringify({ rates: { SGD: 1.3 } }), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    }) as any);

    const env = makeEnv();
    await searchKiwi({ origin: 'SIN', destination: 'BKK', dateFromISO: '2025-02-14', dateToISO: '2025-02-17' }, env);
    await searchKiwi({ origin: 'SIN', destination: 'DPS', dateFromISO: '2025-02-14', dateToISO: '2025-02-17' }, env);
    expect(fetchCount).toBe(1);
  });
});


