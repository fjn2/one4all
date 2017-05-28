const Winston = require('winston');

class PlayList {
  constructor(songPlayer) {
    Winston.info('PlayList -> constructor');
    this.songPlayer = songPlayer;
    // Temporal song
    this.songs = [];
    this.currentSong = 0;

    setInterval(() => {
      // check the current time, and check if the track is finish
      // remove the last second
      if (this.songPlayer.getCurrentTime() + 1 > this.songPlayer.songDuration) {
        this.nextSong();
        this.songPlayer.reset();
      }
    }, 1000);

    const testSongUrl = 'http://localhost:2000/resources/test.mp3';
    this.addSong(testSongUrl);
  }
  addSong(songUrl) {
    Winston.info('PlayList -> addSong ', songUrl);
    this.songs.push(songUrl);
  }
  play() {
    this.songPlayer.play();
  }
  stop() {
    Winston.info('PlayList -> stop');
    this.songPlayer.stop();
  }
  getCurrentSong() {
    Winston.info('PlayList -> getCurrentSong ', this.songs[this.currentSong]);
    return this.songs[this.currentSong];
  }
  setVolume(value) {
    this.songPlayer.setVolume(value);
  }
  init() {
    Winston.info('PlayList -> init');
    this.songPlayer.init();
  }
  nextSong() {
    Winston.info('PlayList -> nextSong');
    this.currentSong += 1;

    if (this.currentSong > this.songs.length) {
      this.currentSong = 0;
    }
  }
}

module.exports = PlayList;
