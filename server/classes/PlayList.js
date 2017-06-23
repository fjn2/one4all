const Winston = require('winston');

class Playlist {
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
        this.clientsControl.startPlay();
        this.play();
      }
    }, 1000);
  }
  addSong(songUrl) {
    Winston.info('Playlist -> addSong ', songUrl);
    this.songs.push(songUrl);
  }
  removeSong(songUrl) {
    Winston.info('Playlist -> removeSong ', songUrl, this.songs);

    const songToRemove = this.songs.find(song => song.url === songUrl);
    if (songToRemove) {
      this.songs.splice(this.songs.indexOf(songToRemove), 1);
    } else {
      Winston.warn('Playlist -> removeSong -> The song doesn\'t exit in the list');
    }
  }
  play() {
    this.songPlayer.play();
  }
  stop() {
    Winston.info('Playlist -> stop');
    this.songPlayer.stop();
  }
  getCurrentSong() {
    Winston.info('Playlist -> getCurrentSong ', this.songs[this.currentSong]);
    return this.songs[this.currentSong];
  }
  setVolume(value) {
    this.songPlayer.setVolume(value);
  }
  init() {
    Winston.info('Playlist -> init');
    this.songPlayer.init();
  }
  nextSong() {
    Winston.info('Playlist -> nextSong');
    this.currentSong += 1;

    if (this.currentSong > this.songs.length - 1) {
      this.currentSong = 0;
    }

    this.songPlayer.reset();
    this.clientsControl.sendPlaylist({
      songs: this.songs,
      currentSong: this.getCurrentSong(),
    });
    this.songPlayer.play();
    Winston.verbose('Playlist -> nextSong -> now playing #', this.currentSong);
  }
}

module.exports = Playlist;
