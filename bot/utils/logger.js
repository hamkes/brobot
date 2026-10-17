const ts = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

const logger = {
  info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m  ${ts()}  ${msg}`),
  success: (msg) => console.log(`\x1b[32m[OK]\x1b[0m    ${ts()}  ${msg}`),
  warn: (msg) => console.log(`\x1b[33m[WARN]\x1b[0m  ${ts()}  ${msg}`),
  error: (msg) => console.error(`\x1b[31m[ERROR]\x1b[0m ${ts()}  ${msg}`),
  debug: (msg) => {
    if (process.env.DEBUG === 'true') console.log(`\x1b[35m[DEBUG]\x1b[0m ${ts()}  ${msg}`);
  }
};

module.exports = logger;
