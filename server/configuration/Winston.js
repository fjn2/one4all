const Winston = require('winston');
const configuration = require('../../configuration');

Winston.configure({
  // { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
  level: configuration.debug,
  transports: [
    new (Winston.transports.Console)({ colorize: true }),
  ],
});
