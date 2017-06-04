const Winston = require('winston');
const HostControl = require('./HostControl');
const ClientsControl = require('./ClientsControl');
const PlayList = require('./PlayList');
const SongPlayer = require('./SongPlayer');
const yas = require('youtube-audio-server');
const configuration = require('../../configuration.json');
const url = require('url');

class Server {
  constructor() {
    this.songPlayer = new SongPlayer();

    this.clientActions = {
      serverTime: () => new Date(),
      currentTrack: () => this.playList.getCurrentSong(),
      timeCurrentTrack: () => ({
        trackTime: this.songPlayer.getCurrentTime(),
        serverTime: new Date(),
      }),
      addSong: data => (
        Promise.resolve(data.url).then((songUrl) => {
          if (~songUrl.indexOf('youtube')) {
            return this.createMp3FromYoutube(songUrl);
          }
          return Promise.resolve(songUrl);
        }).then((songUrl) => {
          this.playList.addSong(songUrl);
          this.clientsControl.sendPlayList({
            songs: this.playList.songs,
            currentSong: this.playList.getCurrentSong(),
          });
          return songUrl;
        })
      ),
      playMusic: () => {
        this.playList.play();
        this.clientsControl.startPlay();
      },
      pauseMusic: () => {
        this.playList.stop();
        this.clientsControl.stopPlay();
      },
      nextMusic: () => {
        this.playList.nextSong();
        this.clientsControl.startPlay();
      },
    };
    this.welcomeActions = {
      playList: () => ({
        songs: this.playList.songs,
        currentSong: this.playList.getCurrentSong(),
      }),
    };

    this.clientsControl = new ClientsControl(this.clientActions, this.welcomeActions);

    this.playList = new PlayList(this.songPlayer, this.clientsControl);
    this.songPlayer.setPlayList(this.playList);

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
  createMp3FromYoutube(songUrl) {
    Winston.info('Server -> createMp3FromYoutube');
    // Download video.
    const video = url.parse(songUrl, true).query.v;
    const file = `${process.cwd()}/resources/${video}`;
    return new Promise((resolve, reject) => {
      Winston.verbose(`Server -> createMp3FromYoutube -> Downloading ${video} into ${file}...`);
      yas.downloader.onSuccess(() => {
        Winston.info(`Yay! Video (${video}) downloaded successfully into "${file}"!`);
        resolve(`http://${configuration.host}:${configuration.port}/resources/${video}`);
      }).onError(({ v, error }) => {
        Winston.error(`Sorry, an error ocurred when trying to download ${v}`, error);
        reject(error);
      }).download({ video, file });
    });
  }
}

module.exports = Server;
