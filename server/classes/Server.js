const Winston = require('winston');
const HostControl = require('./HostControl');
const ClientsControl = require('./ClientsControl');
const PlayList = require('./PlayList');
const SongPlayer = require('./SongPlayer');

class Server {
  constructor() {
    this.songPlayer = new SongPlayer();
    this.playList = new PlayList(this.songPlayer);
    this.songPlayer.setPlayList(this.playList);

    this.clientActions = {
      serverTime: () => new Date(),
      currentTrack: () => this.playList.getCurrentSong(),
      timeCurrentTrack: () => ({
        trackTime: this.songPlayer.getCurrentTime(),
        serverTime: new Date(),
      }),
      addSong: (data) => {
        this.playList.addSong(data.url);
        this.clientsControl.sendPlayList({
          songs: this.playList.songs,
          currentSong: this.playList.getCurrentSong(),
        });
      },
    };
    this.welcomeActions = {
      playList: () => ({
        songs: this.playList.songs,
        currentSong: this.playList.getCurrentSong(),
      }),
    };

    this.clientsControl = new ClientsControl(this.clientActions, this.welcomeActions);
    this.hostControl = new HostControl(this.playList, this.clientsControl);

    this.playList.init();
  }
  // external methods
  play() {
    Winston.info('Server -> play');
    this.playList.play();
  }
  stop() {
    Winston.info('Server -> stop');
    this.playList.stop();
  }
  nextSong() {
    Winston.info('Server -> nextSong');
    this.currentSong += 1;
    this.playList.play();

    if (this.currentSong > this.songs.length) {
      this.currentSong = 0;
    }
  }
  getSongTime() {
    Winston.debug('Server -> getSongTime', this.songPlayer.getCurrentTime());
    return this.songPlayer.getCurrentTime();
  }
}

module.exports = Server;
