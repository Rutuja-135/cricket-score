import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');
const filePath = path.join(__dirname, '..', 'data', 'scorebook.json');
const port = Number(process.env.PORT) || 3001;
const databaseUrl = process.env.DATABASE_URL;

const emptyPayload = {
  version: 1,
  state: { players: [], squadIds: [], liveMatch: null, matches: [] },
};

function sslFor(connectionString) {
  if (/render\.com|sslmode=require/i.test(connectionString)) return { rejectUnauthorized: false };
  return undefined;
}

function isScorebook(value) {
  if (!value || typeof value !== 'object') return false;
  if (value.version !== 1 || !value.state || typeof value.state !== 'object') return false;
  const state = value.state;
  return (
    Array.isArray(state.players) &&
    Array.isArray(state.matches) &&
    Array.isArray(state.squadIds) &&
    (state.liveMatch === null || (typeof state.liveMatch === 'object' && !Array.isArray(state.liveMatch)))
  );
}

function readFilePayload() {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return isScorebook(parsed) ? parsed : emptyPayload;
  } catch {
    return emptyPayload;
  }
}

function writeFilePayload(payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload));
}

const pool = databaseUrl ? new Pool({ connectionString: databaseUrl, ssl: sslFor(databaseUrl) }) : null;

async function prepareDatabase() {
  if (!pool) return;
  for (let attempt = 1; attempt <= 15; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS scorebook (
          id text PRIMARY KEY,
          payload jsonb NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Waiting for Postgres (${attempt}/15): ${message}`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw new Error('Could not connect to the Render Postgres database.');
}

async function readPayload() {
  if (!pool) return readFilePayload();
  const result = await pool.query('SELECT payload FROM scorebook WHERE id = $1', ['default']);
  const payload = result.rows[0]?.payload;
  return isScorebook(payload) ? payload : emptyPayload;
}

async function writePayload(payload) {
  if (!pool) {
    writeFilePayload(payload);
    return;
  }
  await pool.query(
    `INSERT INTO scorebook (id, payload, updated_at)
     VALUES ('default', $1::jsonb, now())
     ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()`,
    [JSON.stringify(payload)],
  );
}

const app = express();

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, storage: pool ? 'postgres' : 'file' });
});

app.get('/api/state', async (_request, response, next) => {
  try {
    response.json(await readPayload());
  } catch (error) {
    next(error);
  }
});

app.put('/api/state', express.json({ limit: '2mb' }), async (request, response, next) => {
  try {
    if (!isScorebook(request.body)) {
      response.status(400).json({ error: 'Invalid scorebook.' });
      return;
    }
    await writePayload(request.body);
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

if (fs.existsSync(path.join(distDir, 'index.html'))) {
  app.use(express.static(distDir));
  app.use((request, response, next) => {
    if (request.path.startsWith('/api/')) {
      next();
      return;
    }
    response.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: 'The scorebook could not be saved.' });
});

await prepareDatabase();
app.listen(port, '0.0.0.0', () => {
  console.log(`Crease listening on ${port} using ${pool ? 'Postgres' : 'a local file'}`);
});
