const Winston = require('winston');
const Cronometer = require('./Cronometer');

class SongPlayer {
  constructor(playList) {
    Winston.verbose('SongPlayer -> constructor');
    this.playList = playList;
    this.cronometer = new Cronometer();
    this.reset();
  }
  play() {
    Winston.verbose('SongPlayer -> play');
    this.cronometer.start();
  }
  stop() {
    Winston.verbose('SongPlayer -> stop');
    this.cronometer.stop();
  }
  reset() {
    Winston.verbose('SongPlayer -> reset');
    // get information about the song
    this.songDuration = 1234; // todo
    this.cronometer.reset();
  }
  getCurrentTime() {
    Winston.verbose('SongPlayer -> getCurrentTime');
    return this.cronometer.get();
  }
  onEnd() {
    Winston.verbose('SongPlayer -> onEnd');
    this.cronometer.reset();
  }
}

module.exports = SongPlayer;
