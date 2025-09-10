import { Hono, type Context } from 'hono';
import { z } from 'zod';

export type Env = {
  DB: D1Database;
  CACHE: KVNamespace;
  ALERT_QUEUE: Queue<any>;
  API_PREFIX: string;
};

const app = new Hono<{ Bindings: Env }>().basePath('/api');

// Simple root for sanity
app.get('/', (c) => c.text('ok'));

app.get('/health', (c: Context<{ Bindings: Env }>) => c.json({ ok: true }));
app.get('/health2', (c) => c.json({ ok: true, v: 2 }));

app.get('/holidays/sg', async (c: Context<{ Bindings: Env }>) => {
  const { results } = await c.env.DB.prepare(
    'SELECT date, name FROM sg_holidays WHERE date >= date("now") ORDER BY date LIMIT 60;',
  ).all();
  return c.json({ holidays: results });
});

app.get('/suggestions/weekends', async (c: Context<{ Bindings: Env }>) => {
  const now = new Date();
  const start = new Date(now);
  const day = start.getDay();
  const diffToFri = (5 - day + 7) % 7; // 5 = Fri
  start.setDate(start.getDate() + diffToFri);
  const weekends = Array.from({ length: 12 }).map((_, i) => {
    const fri = new Date(start);
    fri.setDate(fri.getDate() + i * 7);
    const sun = new Date(fri);
    sun.setDate(sun.getDate() + 2);
    return { start: fri.toISOString().slice(0, 10), end: sun.toISOString().slice(0, 10) };
  });
  return c.json({ weekends });
});

const SearchSchema = z.object({ origin: z.string(), destination: z.string().optional(), budget: z.number().optional() });

app.post('/search/flights', async (c: Context<{ Bindings: Env }>) => {
  const body = await c.req.json();
  const parsed = SearchSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'Invalid input' }, 400);
  const key = `search:${JSON.stringify(parsed.data)}`;

  const etag = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  const etagHex = [...new Uint8Array(etag)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const ifNoneMatch = c.req.header('If-None-Match');

  const cached = await c.env.CACHE.get(key, { type: 'json' });
  if (cached) {
    if (ifNoneMatch && ifNoneMatch === etagHex) {
      return c.newResponse(null, 304, { ETag: etagHex, 'Cache-Control': 'max-age=1800' });
    }
    return c.json(cached, 200, { ETag: etagHex, 'Cache-Control': 'max-age=1800' });
  }

  const deals = Array.from({ length: 6 }).map((_, i) => ({
    id: `deal-${i + 1}`,
    price: 120 + i * 20,
    airline: ['SQ', 'TR', 'QZ', 'MH', 'AK', 'GA'][i % 6],
    durationMins: 90 + i * 25,
    leaveHack: i % 2 === 0,
    destination: ['BKK', 'KUL', 'DPS', 'HKT', 'JHB', 'KCH'][i % 6],
  }));
  const payload = { deals };
  await c.env.CACHE.put(key, JSON.stringify(payload), { expirationTtl: 1800 });

  await c.env.DB.prepare('INSERT INTO search_logs (id, origin, destination, budget) VALUES (?, ?, ?, ?)')
    .bind(crypto.randomUUID(), parsed.data.origin, parsed.data.destination ?? null, parsed.data.budget ?? null)
    .run();

  return c.json(payload, 200, { ETag: etagHex, 'Cache-Control': 'max-age=1800' });
});

// Tracks CRUD
const TrackSchema = z.object({ userId: z.string(), origin: z.string(), destination: z.string(), maxPrice: z.number() });

app.post('/tracks', async (c) => {
  const body = await c.req.json();
  const parsed = TrackSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'Invalid input' }, 400);
  const id = crypto.randomUUID();
  await c.env.DB.prepare('INSERT INTO tracks (id, user_id, origin, destination, max_price) VALUES (?, ?, ?, ?, ?)')
    .bind(id, parsed.data.userId, parsed.data.origin, parsed.data.destination, parsed.data.maxPrice)
    .run();
  return c.json({ id });
});

app.get('/tracks', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT id, user_id as userId, origin, destination, max_price as maxPrice FROM tracks ORDER BY created_at DESC').all();
  return c.json({ tracks: results });
});

app.delete('/tracks/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM tracks WHERE id = ?').bind(id).run();
  return c.json({ ok: true });
});

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};