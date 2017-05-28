const Winston = require('winston');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});


class HostControl {
  constructor(playList, clientControl) {
    this.playList = playList;
    this.clientControl = clientControl;

    rl.on('line', (line) => {
      Winston.verbose('HostControl -> read line from stdin: ', line);
      const [command, ...args] = line.split(' ');
      if (this[command]) {
        this[command](...args);
      } else {
        Winston.info('HostControl -> command unknown', line);
      }
    });
  }
  play() {
    this.playList.play();
    this.clientControl.startPlay();
  }
  stop() {
    this.playList.stop();
    this.clientControl.stopPlay();
  }
  volume(value) {
    this.playList.setVolume(value);
  }
}

module.exports = HostControl;
