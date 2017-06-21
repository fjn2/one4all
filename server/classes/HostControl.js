const Winston = require('winston');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});


class HostControl {
  constructor(playlist, clientControl) {
    this.playlist = playlist;
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
    this.playlist.play();
    this.clientControl.startPlay();
  }
  stop() {
    this.playlist.stop();
    this.clientControl.stopPlay();
  }
  next() {
    this.playlist.nextSong();
    this.clientControl.startPlay();
  }
  volume(value) {
    this.playlist.setVolume(value);
  }
}

module.exports = HostControl;
