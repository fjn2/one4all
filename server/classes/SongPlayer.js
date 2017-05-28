const Winston = require('winston');
const Cronometer = require('./Cronometer');
const musicMetadata = require('musicmetadata');
const fs = require('fs');
const request = require('request');

class SongPlayer {
  constructor() {
    Winston.verbose('SongPlayer -> constructor');
    this.volume = 100;
    this.cronometer = new Cronometer();
  }
  init() {
    this.reset();
  }
  setPlayList(playList) {
    Winston.verbose('SongPlayer -> setPlayList');
    this.playList = playList;
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
    this.cronometer.reset();
    this.readSongDuration().then((duration) => {
      this.songDuration = duration;
    });
  }
  readSongDuration() {
    Winston.verbose('SongPlayer -> getSongDuration');
    // get information about the song
    return new Promise((resolve, reject) => {
      const stream = request(this.playList.getCurrentSong()).pipe(fs.createWriteStream('./currentSong.mp3'));
      stream.on('finish', () => {
        musicMetadata(fs.createReadStream('./currentSong.mp3'), { duration: true }, (err, metadata) => {
          if (err) {
            reject(err);
          }
          resolve(metadata.duration);
        });
      });
    });
  }
  getCurrentTime() {
    Winston.verbose('SongPlayer -> getCurrentTime');
    return this.cronometer.get();
  }
  setVolume(value) {
    Winston.verbose('SongPlayer -> setVolume');
    this.volume = value;
  }
}

module.exports = SongPlayer;
