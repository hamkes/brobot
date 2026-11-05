/* ============================================================
 * BroBot — Render launcher (single free web service)
 *
 * Render's free tier has NO background workers, so the bot and the
 * dashboard run together in one web service process tree: the
 * dashboard answers HTTP (which is what UptimeRobot pings to keep
 * the service awake) and the bot runs the Discord gateway in the
 * same container. The dashboard talks to the bot over the internal
 * sync server on 127.0.0.1:INTERNAL_PORT (default 3001), which is
 * loopback-only inside this container.
 *
 * If either child exits, the other is stopped and this launcher
 * exits with the same code so Render restarts the service.
 *
 * Usage (Render start command):  node scripts/render.js
 * ============================================================ */
const { spawn } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const children = new Map(); // name -> ChildProcess
let shuttingDown = false;

function start(name, entry) {
  const child = spawn(process.execPath, [path.join(ROOT, entry)], {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env
  });
  children.set(name, child);
  console.log(`[render] ${name} started (pid ${child.pid})`);

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.log(`[render] ${name} exited (code ${code}, signal ${signal}) — stopping the other process`);
    shutdown(code ?? 1);
  });
  child.on('error', (err) => {
    console.error(`[render] failed to start ${name}: ${err.message}`);
    shutdown(1);
  });
  return child;
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  const remaining = new Set();
  for (const [name, child] of children) {
    if (child.exitCode === null && !child.killed) {
      remaining.add(name);
      try { child.kill('SIGTERM'); } catch { /* already gone */ }
      console.log(`[render] sent SIGTERM to ${name}`);
      child.once('exit', () => {
        remaining.delete(name);
        if (remaining.size === 0) process.exit(code);
      });
    }
  }
  // Backstop: if a child ignores SIGTERM, force-kill and exit anyway.
  // (This timer is deliberately NOT unref'd — it must keep the
  // launcher alive until the exit happens; an unref'd timer lets
  // Node exit 0 as soon as the event loop drains.)
  setTimeout(() => {
    for (const [name, child] of children) {
      if (child.exitCode === null && !child.killed) {
        try { child.kill('SIGKILL'); } catch { /* already gone */ }
        console.log(`[render] sent SIGKILL to ${name}`);
      }
    }
    process.exit(code);
  }, 5000);
  if (remaining.size === 0) process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

start('bot', 'bot/index.js');
start('dashboard', 'dashboard/server.js');
