const mongoose = require('mongoose');
const config = require('./config');
const logger = require('./utils/logger');

async function connectDatabase() {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => logger.success('MongoDB connected'));
  mongoose.connection.on('error', (err) => logger.error(`MongoDB error: ${err.message}`));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  await mongoose.connect(config.mongodbUri);
  return mongoose.connection;
}

const Guild = require('../models/Guild');
const Warn = require('../models/Warn');
const ModAction = require('../models/ModAction');
const DashLog = require('../models/DashLog');
const Level = require('../models/Level');
const Ticket = require('../models/Ticket');
const BotStatus = require('../models/BotStatus');

module.exports = {
  connectDatabase,
  Guild,
  Warn,
  ModAction,
  DashLog,
  Level,
  Ticket,
  BotStatus
};
