const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const morgan = require('morgan');
const mongoose = require('mongoose');
const config = require('../bot/config');
const logger = require('../bot/utils/logger');
const { connectDatabase } = require('../bot/db');

const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

let appPromise = null;

async function createApp() {
  await connectDatabase();

  const app = express();

  app.set('trust proxy', 1);
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(morgan('dev', { stream: { write: (msg) => logger.info(`[web] ${msg.trim()}`) } }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  let store;
  try {
    store = MongoStore.create({ client: mongoose.connection.getClient(), ttl: 60 * 60 * 24 * 7 });
  } catch {
    store = new session.MemoryStore();
    logger.warn('Falling back to in-memory session store');
  }

  app.use(
    session({
      name: 'brobot.sid',
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      store,
      cookie: {
        httpOnly: true,
        secure: config.dashboardUrl.startsWith('https'),
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7
      }
    })
  );

  app.use('/auth', authRoutes);
  app.use('/api', apiRoutes);

  app.get('/', (req, res) => {
    res.render('index', {
      title: '✨ Brobot',
      loggedIn: Boolean(req.session.user),
      user: req.session.user || null,
      loginUrl: '/auth/login',
      inviteUrl: config.inviteUrl
    });
  });

  app.get('/dashboard', requireLogin, (req, res) => {
    res.render('dashboard', {
      title: 'Dashboard • Brobot',
      user: req.session.user,
      userJson: JSON.stringify(req.session.user),
      inviteUrl: config.inviteUrl
    });
  });

  app.use((req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
    res.status(404).redirect('/');
  });

  app.use((err, req, res, next) => {
    logger.error(`Web error: ${err.stack || err.message}`);
    if (req.path.startsWith('/api/')) return res.status(500).json({ error: 'Internal server error' });
    res.status(500).redirect('/');
  });

  return app;
}

function getApp() {
  if (!appPromise) {
    appPromise = createApp().catch((err) => {
      appPromise = null;
      throw err;
    });
  }
  return appPromise;
}

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/');
  next();
}

if (!process.env.VERCEL) {
  getApp()
    .then((app) => {
      app.listen(config.port, () => {
        logger.success(`Dashboard running at ${config.dashboardUrl} (port ${config.port})`);
      });
    })
    .catch((err) => {
      logger.error(`Dashboard failed to start: ${err.stack || err.message}`);
      process.exit(1);
    });
}

module.exports = async (req, res) => {
  const app = await getApp();
  return app(req, res);
};
