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
    this.playing = false;
  }
  init() {
    this.reset();
  }
  setPlaylist(playlist) {
    Winston.verbose('SongPlayer -> setplaylist');
    this.playlist = playlist;
  }
  play() {
    Winston.verbose('SongPlayer -> play');
    this.cronometer.start();
    this.playing = true;
  }
  stop() {
    Winston.verbose('SongPlayer -> stop');
    this.cronometer.stop();
    this.playing = false;
  }
  reset() {
    Winston.verbose('SongPlayer -> reset');
    this.cronometer.reset();
    this.playing = false;
    this.readSongDuration().then((duration) => {
      this.songDuration = duration;
    });
  }
  readSongDuration() {
    Winston.verbose('SongPlayer -> getSongDuration');
    // get information about the song
    return new Promise((resolve, reject) => {
      if (this.playlist.getCurrentSong()) {
        const stream = request(this.playlist.getCurrentSong()).pipe(fs.createWriteStream(`./currentSong${process.env.PORT}.mp3`));
        stream.on('finish', () => {
          musicMetadata(fs.createReadStream(`./currentSong${process.env.PORT}.mp3`), { duration: true }, (err, metadata) => {
            if (err) {
              reject(err);
            }
            resolve(metadata.duration * 1000);
          });
        });
      } else {
        reject(`there isn't a current song`);
      }
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
