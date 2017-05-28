const Winston = require('winston');

class PlayList {
  constructor(songPlayer, clientsControl) {
    Winston.info('PlayList -> constructor');

    this.songPlayer = songPlayer;
    this.clientsControl = clientsControl;

    // Temporal song
    this.songs = [];
    this.currentSong = 0;

    setInterval(() => {
      // check the current time, and check if the track is finish
      // remove the last second
      if (this.songPlayer.getCurrentTime() + 1 > this.songPlayer.songDuration) {
        this.nextSong();
        this.songPlayer.reset();
        this.clientsControl.sendPlayList({
          songs: this.songs,
          currentSong: this.getCurrentSong(),
        });
        this.clientsControl.startPlay();
        this.play();
      }
    }, 1000);

    const testSongUrl = 'http://192.168.1.113:2000/resources/test.mp3';
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

    if (this.currentSong > this.songs.length - 1) {
      this.currentSong = 0;
    }
    Winston.verbose('PlayList -> nextSong -> now playing #', this.currentSong);
  }
}

module.exports = PlayList;
