const Winston = require('winston');

class PlayList {
	constructor(songPlayer) {
		Winston.info('PlayList -> constructor');
		this.songPlayer = songPlayer;
		// Temporal song
		const testSongUrl = 'http://localhost/resources/test.mp3';
		this.songs = [testSongUrl];
		this.currentSong = 0;
	}
	addSong(songUrl) {
		Winston.info('PlayList -> addSong');
    this.songs.push(songUrl);
  }
  play() {
  	this.songPlayer.play();
  }
  stop() {
    Winston.info('PlayList -> stop');
    this.songPlayer.stop()
  }
  nextSong() {
  	Winston.info('PlayList -> nextSong');
  	this.currentSong += 1;
  	this.songPlayer

  	if (this.currentSong > this.songs.length) {
      this.currentSong = 0;
    }
  }
}

module.exports = PlayList;
