const http = require('http');
const config = require('./config');
const logger = require('./utils/logger');
const { setPrefix, invalidatePrefix, isValidPrefix } = require('./utils/prefixCache');
const { startBuild, getJob } = require('./engines/serverBuilder');

const MAX_BODY = 4096;
const POLL_FALLBACK = 5;

function isLoopback(req) {
  const remote = req.socket.remoteAddress || '';
  return remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1';
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY) {
        reject(new Error('payload_too_large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(new Error('invalid_json'));
      }
    });
    req.on('error', reject);
  });
}

function respond(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function startInternalServer(client) {
  const server = http.createServer(async (req, res) => {
    if (!isLoopback(req)) {
      return respond(res, 403, { error: 'forbidden' });
    }

    if (req.method === 'POST' && req.url === '/internal/prefix') {
      try {
        const { guildId, prefix } = await readJson(req);
        if (!/^\d{17,20}$/.test(String(guildId || ''))) {
          return respond(res, 400, { error: 'invalid_guild_id' });
        }
        if (!isValidPrefix(prefix)) {
          return respond(res, 400, { error: 'invalid_prefix' });
        }
        setPrefix(client, guildId, prefix);
        logger.info(`Prefix cache updated live → guild ${guildId} now uses "${prefix.trim()}"`);
        return respond(res, 200, { ok: true, guildId, prefix: prefix.trim() });
      } catch (err) {
        return respond(res, 400, { error: err.message });
      }
    }

    if (req.method === 'POST' && req.url === '/internal/invalidate') {
      try {
        const { guildId } = await readJson(req);
        if (!/^\d{17,20}$/.test(String(guildId || ''))) {
          return respond(res, 400, { error: 'invalid_guild_id' });
        }
        invalidatePrefix(client, guildId);
        return respond(res, 200, { ok: true, guildId, invalidated: true });
      } catch (err) {
        return respond(res, 400, { error: err.message });
      }
    }

    if (req.method === 'POST' && req.url === '/internal/builder/start') {
      try {
        const { guildId, templateId, mode, confirmName } = await readJson(req);
        if (!/^\d{17,20}$/.test(String(guildId || ''))) {
          return respond(res, 400, { error: 'invalid_guild_id' });
        }
        const { jobId } = await startBuild(client, { guildId, templateId, mode, confirmName });
        return respond(res, 200, { ok: true, jobId });
      } catch (err) {
        const status = err.code === 'build_in_progress' ? 409 : 400;
        return respond(res, status, { error: err.code || err.message || 'builder_error' });
      }
    }

    if (req.method === 'GET' && req.url.startsWith('/internal/builder/status')) {
      try {
        const url = new URL(req.url, 'http://localhost');
        const jobId = url.searchParams.get('jobId') || '';
        const job = getJob(jobId);
        if (!job) return respond(res, 404, { error: 'job_not_found' });
        return respond(res, 200, { ok: true, job });
      } catch (err) {
        return respond(res, 400, { error: err.message });
      }
    }

    return respond(res, 404, { error: 'not_found' });
  });

  server.on('error', (err) => {
    logger.warn(`Internal sync server unavailable (${err.message}) — falling back to ${POLL_FALLBACK}s DB polling`);
  });

  server.listen(config.internalPort, '127.0.0.1', () => {
    logger.success(`Internal sync server listening on 127.0.0.1:${config.internalPort}`);
  });

  if (server.unref) server.unref();
  return server;
}

module.exports = { startInternalServer };
