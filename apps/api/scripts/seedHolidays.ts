import type { Env } from '../src/index';

// Minimal static list for MVP; extend as needed
const SEED: Array<{ date: string; name: string }> = [
  { date: '2025-01-01', name: 'New Year’s Day' },
  { date: '2025-01-29', name: 'Chinese New Year' },
  { date: '2025-01-30', name: 'Chinese New Year (Day 2)' },
  { date: '2025-04-18', name: 'Good Friday' },
  { date: '2025-05-01', name: 'Labour Day' },
  { date: '2025-05-12', name: 'Vesak Day (Observed)' },
  { date: '2025-06-06', name: 'Hari Raya Haji' },
  { date: '2025-08-09', name: 'National Day' },
  { date: '2025-10-20', name: 'Deepavali' },
  { date: '2025-12-25', name: 'Christmas Day' }
];

export default {
  async fetch(_req: Request, env: Env) {
    for (const h of SEED) {
      await env.DB.prepare('INSERT OR REPLACE INTO sg_holidays (date, name) VALUES (?, ?)')
        .bind(h.date, h.name)
        .run();
    }
    return new Response(JSON.stringify({ inserted: SEED.length }), { headers: { 'content-type': 'application/json' } });
  },
}; 