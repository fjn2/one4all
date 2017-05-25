const Winston = require('winston');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});


class HostControl {
  constructor(playList) {
    this.playList = playList;

    rl.on('line', (line) => {
      Winston.verbose('HostControl -> read line from stdin: ', line);
      if (this[line]) {
        this[line]();
      } else {
        Winston.info('HostControl -> command unknown', line);
      }
    });
  }
  play() {
    this.playList.play();
  }
  stop() {
    this.playList.stop();
  }
}

module.exports = HostControl;
