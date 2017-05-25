const Winston = require('winston');

Winston.configure({
  // { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
  level: 'silly',
  transports: [
    new (Winston.transports.Console)({ colorize: true }),
  ],
});
