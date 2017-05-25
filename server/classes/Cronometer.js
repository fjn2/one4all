const Winston = require('winston');
const STATUS = require('../enums/status');

class Cronometer {
  constructor() {
    Winston.verbose('Cronometer -> constructor');
    this.reset();
  }
  start() {
    Winston.verbose('Cronometer -> start');
    if (this.status === STATUS.STOP) {
      this.status = STATUS.START;
      this.startTime = new Date();
    } else {
      Winston.info('Cronometer -> The cronometer is already running');
    }
  }
  stop() {
    Winston.verbose('Cronometer -> stop');
    if (this.status === STATUS.START) {
      this.status = STATUS.STOP;
      this.time = this.time + (new Date().getTime() - this.startTime);
      this.startTime = undefined;
    } else {
      Winston.info('Cronometer -> The cronometer is already stoped');
    }
  }
  get() {
    Winston.verbose('Cronometer -> get');
    if (this.startTime) {
      return this.time + (new Date().getTime() - this.startTime);
    } else {
      return this.time;
    }

  }
  reset() {
    Winston.verbose('Cronometer -> reset');
    this.time = 0;
    this.status = STATUS.STOP;
  }
}

module.exports = Cronometer;
