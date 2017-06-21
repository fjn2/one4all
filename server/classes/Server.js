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
            let newUrl;
            return this.createMp3FromYoutube(songUrl).then((newSongUrl) => {
              newUrl = newSongUrl;
              return this.getYouTubeMetadata(songUrl);
            }).then(metadata => ({
              url: newUrl,
              metadata,
              kind: 'youtube',
            }));
          }
          return Promise.resolve({
            url: data.url,
            metadata: data.url,
            kind: 'unknown',
          });
        }).then((song) => {
          this.playList.addSong(song);
          this.clientsControl.sendPlayList({
            songs: this.playList.songs,
            currentSong: this.playList.getCurrentSong(),
          });
          return song;
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
      sendMessage: ({ userName, message }) => {
        const messageToSend = `${userName}: ${message}`;
        this.clientsControl.sendActivityStream(messageToSend);
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
      }).download({ id: video, file });
    });
  }
  getYouTubeMetadata(songUrl) {
    const video = url.parse(songUrl, true).query.v;

    return new Promise((resolve) => {
      Winston.verbose(`Server -> getYouTubeMetadata`);
      yas.get(video, (err, metadata) => {
        let resp;
        if (err) {
          Winston.error('getYouTubeMetadata error', err);
          resp = {
            id: 0,
            title: 'Error in metadata',
            thumbnails: {},
          };
        } else {
          Winston.info(`getYouTubeMetadata finish for "${video}"!`, err, metadata);
          resp = {
            id: metadata.items[0].id,
            title: metadata.items[0].snippet.title,
            thumbnails: metadata.items[0].snippet.thumbnails,
          };
        }
        resolve(resp);
      });
    });
  }
}

module.exports = Server;
