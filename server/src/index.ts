import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { HTTPException } from 'hono/http-exception'
import { existsSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'

import publicRoutes, { allowedOrigins } from '../routes/public'
import management from '../routes/management'
import { logTime } from '../utils/logTime'
import { initMongo } from './dbConnection'
import { isDemoResetEnabled, restoreSeed } from './demoReset'

export const PROJECT_ROOT = process.cwd();

const app = new Hono()
app.use(logger())
// allow communication between front and back
app.use('/*', cors({
  origin: allowedOrigins, // frontend address
  allowMethods: ['POST', 'GET', 'OPTIONS', 'DELETE', 'PATCH'], // only allow these actions
  maxAge: 600,
  credentials: true,
}))

app.route('/api/public', publicRoutes);
app.route('/api/management', management);

/*** serve the built client ***/
// in production this server hands out the vite build too, so front and back are
// one origin and there's nothing to CORS. skipped in dev, there's no dist yet
// and vite proxies /api over here anyway.
const CLIENT_DIST = resolve(process.env.CLIENT_DIST ?? join(import.meta.dir, '..', '..', 'client', 'dist'));
const INDEX_HTML = join(CLIENT_DIST, 'index.html');
const hasClientBuild = existsSync(INDEX_HTML);

if (hasClientBuild) {
  console.info(logTime(), 'Serving client build from', CLIENT_DIST);

  app.get('/*', async (c) => {
    const rawPath = new URL(c.req.url).pathname;

    // A malformed escape like /%  makes decodeURIComponent throw; that is a bad
    // request, not a server fault, so answer 404 rather than letting it 500.
    let pathname: string;
    try {
      pathname = decodeURIComponent(rawPath);
    } catch {
      return c.json({ message: 'Not found' }, 404);
    }

    // resolve it and make sure we didn't get walked out of the folder
    const requested = resolve(join(CLIENT_DIST, pathname));
    const isInsideDist = requested === CLIENT_DIST || requested.startsWith(CLIENT_DIST + sep);

    if (isInsideDist) {
      const file = Bun.file(requested);

      if (await file.exists()) {
        // /assets filenames are hashed by vite so they can be cached forever.
        // everything else can change under the same name on the next deploy.
        const isFingerprinted = pathname.startsWith('/assets/');

        return new Response(file, {
          headers: {
            'Cache-Control': isFingerprinted
              ? 'public, max-age=31536000, immutable'
              : 'public, max-age=0, must-revalidate',
          },
        });
      }
    }

    // if it looks like a file and isn't there, it's a real 404. handing back
    // index.html for a missing script just hides the actual problem.
    if (/\.[a-z0-9]+$/i.test(pathname)) {
      return c.json({ message: 'Not found' }, 404);
    }

    // anything else is a react-router route, let the client handle it
    return new Response(Bun.file(INDEX_HTML), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  });
} else {
  console.warn(logTime(), 'No client build found at', CLIENT_DIST, '- serving API only');

  app.get('/', (c) => {
    return c.text('Backend is running. No client build found - run `bun run build` in /client to serve the UI from here.')
  })
}

app.onError((error, c) => {
  // csrf() rejects by throwing an HTTPException. without this an ordinary 403
  // comes back to the client as a 500, with a stack trace in the log for
  // something that's working as intended.
  if (error instanceof HTTPException) {
    return error.getResponse()
  }

  console.error(logTime(), "[onError handler]", error)
  return c.json({ message: "Unexpected error" }, 500)
})

app.notFound((c) => {
  return c.json({ message: "Not found" }, 404)
})

// better to die here than to boot and 500 on everything
try {
  await initMongo();
} catch (error) {
  console.error(logTime(), 'Could not connect to MongoDB:', (error as Error).message);
  process.exit(1);
}

// /management is open to everyone, so the DB is shared state. restore the
// committed snapshot on each cold start. see demoReset.ts
if (isDemoResetEnabled()) {
  await restoreSeed();
} else {
  console.info(logTime(), 'Demo reset is off (DEMO_RESET=false) - the database persists between restarts.');
}

const port = Number(process.env.PORT) || 32432;

console.info(logTime(), `Listening on port ${port}`);

export default {
  port,
  hostname: '0.0.0.0',
  fetch: app.fetch,
}
