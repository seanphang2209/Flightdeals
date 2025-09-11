import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

export type Env = {
  DB: D1Database;
  CACHE: KVNamespace;
  ALERT_QUEUE: Queue<any>;
  API_PREFIX: string;
  NODE_ENV?: string;
  SENTRY_DSN?: string;
  CF_REGION?: string;
};

type Variables = {
  requestId: string;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// CORS middleware
app.use('*', cors({
  origin: (origin, c) => {
    const env = c.env;
    if (env.NODE_ENV !== 'production') return '*';
    return ['https://getaway-sg-api.seanphang220900-19a.workers.dev', 'https://tripz.app'].includes(origin || '') ? origin : null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'If-None-Match'],
}));

// Logger middleware
app.use('*', logger());

// Request ID middleware
app.use('*', async (c, next) => {
  const requestId = crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('x-request-id', requestId);
  await next();
});

// Error handling middleware
app.onError((err, c) => {
  const requestId = c.get('requestId') || 'unknown';
  const error = {
    error: {
      code: err.name || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred',
      details: c.env.NODE_ENV !== 'production' ? err.stack : undefined,
    },
    requestId,
    ts: new Date().toISOString(),
  };
  
  console.error({ requestId, error: err.message, stack: err.stack });
  
  return c.json(error, 500);
});

// API routes
const api = new Hono<{ Bindings: Env; Variables: Variables }>();

// Health endpoint
api.get('/health', async (c) => {
  const requestId = c.get('requestId');
  const region = c.env.CF_REGION || 'unknown';
  
  return c.json({
    status: 'ok',
    ts: new Date().toISOString(),
    region,
    version: '1.0.0',
    requestId,
  });
});

// SG Holidays endpoint
api.get('/holidays/sg', async (c) => {
  const requestId = c.get('requestId');
  
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT date, name FROM sg_holidays WHERE date >= date("now") ORDER BY date LIMIT 60'
    ).all();
    
    const etag = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(results)));
    const etagHex = [...new Uint8Array(etag)].map(b => b.toString(16).padStart(2, '0')).join('');
    
    const ifNoneMatch = c.req.header('If-None-Match');
    if (ifNoneMatch === etagHex) {
      return c.newResponse(null, 304, { 
        ETag: etagHex, 
        'Cache-Control': 'public, max-age=3600' 
      });
    }
    
    return c.json({ holidays: results }, 200, {
      ETag: etagHex,
      'Cache-Control': 'public, max-age=3600',
    });
  } catch (err) {
    throw new Error(`Failed to fetch holidays: ${err}`);
  }
});

// Weekend suggestions endpoint
api.get('/suggestions/weekends', async (c) => {
  const requestId = c.get('requestId');
  const limit = parseInt(c.req.query('limit') || '12');
  
  const now = new Date();
  const start = new Date(now);
  const day = start.getDay();
  const diffToFri = (5 - day + 7) % 7; // 5 = Fri
  start.setDate(start.getDate() + diffToFri);
  
  const weekends = Array.from({ length: limit }).map((_, i) => {
    const fri = new Date(start);
    fri.setDate(fri.getDate() + i * 7);
    const sun = new Date(fri);
    sun.setDate(sun.getDate() + 2);
    return {
      start: fri.toISOString().slice(0, 10),
      end: sun.toISOString().slice(0, 10),
      isLeaveHack: i % 3 === 0, // Every 3rd weekend is a "leave hack"
    };
  });
  
  const etag = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(weekends)));
  const etagHex = [...new Uint8Array(etag)].map(b => b.toString(16).padStart(2, '0')).join('');
  
  const ifNoneMatch = c.req.header('If-None-Match');
  if (ifNoneMatch === etagHex) {
    return c.newResponse(null, 304, { 
      ETag: etagHex, 
      'Cache-Control': 'public, max-age=1800' 
    });
  }
  
  return c.json({ weekends }, 200, {
    ETag: etagHex,
    'Cache-Control': 'public, max-age=1800',
  });
});

// Flight search endpoint
const SearchSchema = z.object({
  origin: z.string().min(3).max(3),
  destination: z.string().min(3).max(3).optional(),
  dateRange: z.object({
    depart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    return: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  pax: z.number().min(1).max(9).default(1),
  cabin: z.enum(['M', 'W', 'C', 'F']).default('M'),
  maxStops: z.number().min(0).max(3).default(1),
  budgetMax: z.number().min(100).max(5000).default(1000),
});

api.post('/search/flights', async (c) => {
  const requestId = c.get('requestId');
  
  try {
    const body = await c.req.json();
    const parsed = SearchSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid search parameters',
          details: parsed.error.errors,
        },
        requestId,
        ts: new Date().toISOString(),
      }, 400);
    }

    const { origin, destination, dateRange, pax, cabin, maxStops, budgetMax } = parsed.data;
    const key = `search:${JSON.stringify({ origin, destination, dateRange, pax, cabin, maxStops, budgetMax })}`;

    const etag = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
    const etagHex = [...new Uint8Array(etag)].map(b => b.toString(16).padStart(2, '0')).join('');
    const ifNoneMatch = c.req.header('If-None-Match');

    // Check cache first
    const cached = await c.env.CACHE.get(key, { type: 'json' }) as { results: any[] } | null;
    if (cached) {
      if (ifNoneMatch === etagHex) {
        return c.newResponse(null, 304, { 
          ETag: etagHex, 
          'Cache-Control': 'public, max-age=1800' 
        });
      }
      return c.json({
        results: cached.results,
        cache: { hit: true, etag: etagHex },
        requestId,
      }, 200, { 
        ETag: etagHex, 
        'Cache-Control': 'public, max-age=1800' 
      });
    }

    // Generate mock results (replace with real Kiwi integration)
    const results = Array.from({ length: 6 }).map((_, i) => ({
      id: `deal-${i + 1}`,
      price: Math.round(120 + i * 20 + Math.random() * 50),
      currency: 'SGD',
      airline: ['SQ', 'TR', 'QZ', 'MH', 'AK', 'GA'][i % 6],
      durationMinutes: 90 + i * 25,
      departISO: `${dateRange.depart}T${8 + i}:00:00`,
      returnISO: `${dateRange.return}T${20 + i}:00:00`,
      stops: i % 2,
      bookingUrl: `https://kiwi.com/book/deal-${i + 1}`,
      baggageIncluded: i % 3 === 0,
      destination: destination || ['BKK', 'KUL', 'DPS', 'HKT', 'HKG', 'TPE'][i % 6],
    }));

    const payload = { results };
    await c.env.CACHE.put(key, JSON.stringify(payload), { expirationTtl: 1800 });

    // Log search
    await c.env.DB.prepare('INSERT INTO search_logs (id, origin, destination, budget, request_id) VALUES (?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), origin, destination || null, budgetMax, requestId)
      .run();

    return c.json({
      results,
      cache: { hit: false, etag: etagHex },
      requestId,
    }, 200, { 
      ETag: etagHex, 
      'Cache-Control': 'public, max-age=1800' 
    });
  } catch (err) {
    throw new Error(`Flight search failed: ${err}`);
  }
});

// Tracks CRUD
const TrackSchema = z.object({ 
  userId: z.string().min(1), 
  origin: z.string().min(3).max(3), 
  destination: z.string().min(3).max(3), 
  maxPrice: z.number().min(100).max(5000) 
});

api.post('/tracks', async (c) => {
  const requestId = c.get('requestId');
  
  try {
    const body = await c.req.json();
    const parsed = TrackSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid track parameters',
          details: parsed.error.errors,
        },
        requestId,
        ts: new Date().toISOString(),
      }, 400);
    }

    const id = crypto.randomUUID();
    await c.env.DB.prepare('INSERT INTO tracks (id, user_id, origin, destination, max_price, request_id) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, parsed.data.userId, parsed.data.origin, parsed.data.destination, parsed.data.maxPrice, requestId)
      .run();
    
    return c.json({ 
      id, 
      message: 'Track created successfully',
      requestId 
    });
  } catch (err) {
    throw new Error(`Failed to create track: ${err}`);
  }
});

api.get('/tracks', async (c) => {
  const requestId = c.get('requestId');
  
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, user_id as userId, origin, destination, max_price as maxPrice, created_at as createdAt FROM tracks ORDER BY created_at DESC LIMIT 50'
    ).all();
    
    return c.json({ 
      tracks: results,
      requestId 
    });
  } catch (err) {
    throw new Error(`Failed to fetch tracks: ${err}`);
  }
});

api.delete('/tracks/:id', async (c) => {
  const requestId = c.get('requestId');
  const id = c.req.param('id');
  
  try {
    const result = await c.env.DB.prepare('DELETE FROM tracks WHERE id = ?').bind(id).run();
    
    if (result.meta.changes === 0) {
      return c.json({
        error: {
          code: 'NOT_FOUND',
          message: 'Track not found',
        },
        requestId,
        ts: new Date().toISOString(),
      }, 404);
    }
    
    return c.json({ 
      message: 'Track deleted successfully',
      requestId 
    });
  } catch (err) {
    throw new Error(`Failed to delete track: ${err}`);
  }
});

// Test alert endpoint
api.post('/alerts/test', async (c) => {
  const requestId = c.get('requestId');
  
  try {
    const body = await c.req.json();
    const { trackId, email } = body;
    
    // Mock alert sending (replace with real Resend integration)
    const alertPreview = {
      to: email || 'test@example.com',
      subject: 'Tripz Price Alert - Test',
      body: `Price drop detected for track ${trackId || 'unknown'}. This is a test alert.`,
      sent: true,
      timestamp: new Date().toISOString(),
    };
    
    return c.json({
      message: 'Test alert sent successfully',
      preview: alertPreview,
      requestId,
    });
  } catch (err) {
    throw new Error(`Failed to send test alert: ${err}`);
  }
});

// Mount API routes
app.route('/api', api);

// API Console UI
app.get('/', async (c) => {
  const html = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tripz API Console</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: '#3B82F6',
            'brand-bg': '#070A12',
            'brand-muted': '#94A3B8',
            'surface-0': '#0B1220',
            'surface-1': '#111827',
            'surface-2': '#1F2937',
            'surface-3': '#273244',
          }
        }
      }
    }
  </script>
</head>
<body class="bg-brand-bg text-white min-h-screen">
  <div class="container mx-auto p-4 max-w-4xl">
    <header class="mb-8 text-center">
      <h1 class="text-3xl font-bold text-brand mb-2">Tripz API Console</h1>
      <p class="text-brand-muted">Test endpoints and debug the API</p>
    </header>

    <div class="grid gap-6 md:grid-cols-2">
      <!-- Health Check -->
      <section class="bg-surface-2 rounded-xl p-6 border border-surface-3">
        <h2 class="text-xl font-semibold mb-4">Health Check</h2>
        <button id="btnHealth" class="bg-brand hover:bg-blue-600 text-white px-4 py-2 rounded-lg mb-4 transition">
          Ping Health
        </button>
        <pre id="outHealth" class="bg-surface-1 p-3 rounded text-sm overflow-auto max-h-40"></pre>
      </section>

      <!-- SG Holidays -->
      <section class="bg-surface-2 rounded-xl p-6 border border-surface-3">
        <h2 class="text-xl font-semibold mb-4">SG Holidays</h2>
        <button id="btnHolidays" class="bg-brand hover:bg-blue-600 text-white px-4 py-2 rounded-lg mb-4 transition">
          Load Holidays
        </button>
        <pre id="outHolidays" class="bg-surface-1 p-3 rounded text-sm overflow-auto max-h-40"></pre>
      </section>

      <!-- Weekend Suggestions -->
      <section class="bg-surface-2 rounded-xl p-6 border border-surface-3">
        <h2 class="text-xl font-semibold mb-4">Weekend Suggestions</h2>
        <div class="flex gap-2 mb-4">
          <input id="weekendLimit" type="number" value="12" min="1" max="24" 
                 class="bg-surface-1 border border-surface-3 rounded px-3 py-2 text-sm w-20">
          <button id="btnWeekends" class="bg-brand hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition">
            Load Weekends
          </button>
        </div>
        <pre id="outWeekends" class="bg-surface-1 p-3 rounded text-sm overflow-auto max-h-40"></pre>
      </section>

      <!-- Flight Search -->
      <section class="bg-surface-2 rounded-xl p-6 border border-surface-3">
        <h2 class="text-xl font-semibold mb-4">Flight Search</h2>
        <div class="space-y-3 mb-4">
          <div class="grid grid-cols-2 gap-2">
            <input id="searchOrigin" placeholder="Origin (SIN)" value="SIN" 
                   class="bg-surface-1 border border-surface-3 rounded px-3 py-2 text-sm">
            <select id="searchDestination" class="bg-surface-1 border border-surface-3 rounded px-3 py-2 text-sm">
              <option value="">Any destination</option>
              <option value="BKK">Bangkok</option>
              <option value="DPS">Bali</option>
              <option value="KUL">Kuala Lumpur</option>
              <option value="HKT">Phuket</option>
              <option value="HKG">Hong Kong</option>
              <option value="TPE">Taipei</option>
              <option value="MNL">Manila</option>
              <option value="SGN">Ho Chi Minh</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <input id="searchDepart" type="date" 
                   class="bg-surface-1 border border-surface-3 rounded px-3 py-2 text-sm">
            <input id="searchReturn" type="date" 
                   class="bg-surface-1 border border-surface-3 rounded px-3 py-2 text-sm">
          </div>
          <div class="flex gap-2">
            <input id="searchBudget" type="range" min="100" max="2000" value="500" 
                   class="flex-1">
            <span id="budgetValue" class="text-sm text-brand-muted">S$500</span>
          </div>
        </div>
        <button id="btnSearch" class="bg-brand hover:bg-blue-600 text-white px-4 py-2 rounded-lg mb-4 transition w-full">
          Search Flights
        </button>
        <pre id="outSearch" class="bg-surface-1 p-3 rounded text-sm overflow-auto max-h-40"></pre>
      </section>

      <!-- Track Management -->
      <section class="bg-surface-2 rounded-xl p-6 border border-surface-3">
        <h2 class="text-xl font-semibold mb-4">Track Management</h2>
        <div class="space-y-3 mb-4">
          <div class="grid grid-cols-2 gap-2">
            <input id="trackOrigin" placeholder="Origin" value="SIN" 
                   class="bg-surface-1 border border-surface-3 rounded px-3 py-2 text-sm">
            <input id="trackDestination" placeholder="Destination" value="BKK" 
                   class="bg-surface-1 border border-surface-3 rounded px-3 py-2 text-sm">
          </div>
          <div class="flex gap-2">
            <input id="trackMaxPrice" type="number" placeholder="Max Price" value="300" 
                   class="bg-surface-1 border border-surface-3 rounded px-3 py-2 text-sm flex-1">
            <button id="btnCreateTrack" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition">
              Create
            </button>
          </div>
        </div>
        <button id="btnLoadTracks" class="bg-brand hover:bg-blue-600 text-white px-4 py-2 rounded-lg mb-4 transition w-full">
          Load Tracks
        </button>
        <pre id="outTracks" class="bg-surface-1 p-3 rounded text-sm overflow-auto max-h-40"></pre>
      </section>

      <!-- Test Alert -->
      <section class="bg-surface-2 rounded-xl p-6 border border-surface-3">
        <h2 class="text-xl font-semibold mb-4">Test Alert</h2>
        <div class="space-y-3 mb-4">
          <input id="alertEmail" type="email" placeholder="Email" value="test@example.com" 
                 class="bg-surface-1 border border-surface-3 rounded px-3 py-2 text-sm w-full">
          <input id="alertTrackId" placeholder="Track ID (optional)" 
                 class="bg-surface-1 border border-surface-3 rounded px-3 py-2 text-sm w-full">
        </div>
        <button id="btnTestAlert" class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg mb-4 transition w-full">
          Send Test Alert
        </button>
        <pre id="outAlert" class="bg-surface-1 p-3 rounded text-sm overflow-auto max-h-40"></pre>
      </section>
    </div>
  </div>

  <script>
    const API_BASE = '/api';
    let lastResponse = {};

    function formatResponse(data, status, timing) {
      return JSON.stringify({
        status,
        timing: timing + 'ms',
        data: data
      }, null, 2);
    }

    function showResponse(elementId, data, status = 200, timing = 0) {
      const element = document.getElementById(elementId);
      element.textContent = formatResponse(data, status, timing);
      lastResponse = { data, status, timing };
    }

    async function makeRequest(method, endpoint, body = null) {
      const start = performance.now();
      try {
        const options = {
          method,
          headers: { 'Content-Type': 'application/json' },
        };
        if (body) options.body = JSON.stringify(body);
        
        const response = await fetch(API_BASE + endpoint, options);
        const data = await response.json();
        const timing = Math.round(performance.now() - start);
        
        showResponse('out' + endpoint.split('/').pop().replace(/([A-Z])/g, '$1'), data, response.status, timing);
        return { data, status: response.status, timing };
      } catch (error) {
        const timing = Math.round(performance.now() - start);
        showResponse('out' + endpoint.split('/').pop().replace(/([A-Z])/g, '$1'), { error: error.message }, 0, timing);
        return { data: { error: error.message }, status: 0, timing };
      }
    }

    // Set default dates
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextWeekEnd = new Date(nextWeek.getTime() + 3 * 24 * 60 * 60 * 1000);
    
    document.getElementById('searchDepart').value = nextWeek.toISOString().split('T')[0];
    document.getElementById('searchReturn').value = nextWeekEnd.toISOString().split('T')[0];

    // Budget slider
    document.getElementById('searchBudget').addEventListener('input', (e) => {
      document.getElementById('budgetValue').textContent = 'S$' + e.target.value;
    });

    // Event listeners
    document.getElementById('btnHealth').addEventListener('click', () => makeRequest('GET', '/health'));
    document.getElementById('btnHolidays').addEventListener('click', () => makeRequest('GET', '/holidays/sg'));
    document.getElementById('btnWeekends').addEventListener('click', () => {
      const limit = document.getElementById('weekendLimit').value;
      makeRequest('GET', \`/suggestions/weekends?limit=\${limit}\`);
    });
    document.getElementById('btnSearch').addEventListener('click', () => {
      const body = {
        origin: document.getElementById('searchOrigin').value,
        destination: document.getElementById('searchDestination').value || undefined,
        dateRange: {
          depart: document.getElementById('searchDepart').value,
          return: document.getElementById('searchReturn').value,
        },
        pax: 1,
        cabin: 'M',
        maxStops: 1,
        budgetMax: parseInt(document.getElementById('searchBudget').value),
      };
      makeRequest('POST', '/search/flights', body);
    });
    document.getElementById('btnCreateTrack').addEventListener('click', () => {
      const body = {
        userId: 'console-user',
        origin: document.getElementById('trackOrigin').value,
        destination: document.getElementById('trackDestination').value,
        maxPrice: parseInt(document.getElementById('trackMaxPrice').value),
      };
      makeRequest('POST', '/tracks', body);
    });
    document.getElementById('btnLoadTracks').addEventListener('click', () => makeRequest('GET', '/tracks'));
    document.getElementById('btnTestAlert').addEventListener('click', () => {
      const body = {
        email: document.getElementById('alertEmail').value,
        trackId: document.getElementById('alertTrackId').value || undefined,
      };
      makeRequest('POST', '/alerts/test', body);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        document.getElementById('searchDestination').focus();
      }
      if (e.key === 'Enter' && e.metaKey) {
        e.preventDefault();
        document.getElementById('btnSearch').click();
      }
    });

    // Auto-load health on page load
    document.addEventListener('DOMContentLoaded', () => {
      makeRequest('GET', '/health');
    });
  </script>
</body>
</html>`;

  return c.html(html);
});

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};