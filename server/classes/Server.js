const Winston = require('winston');
const HostControl = require('./HostControl');
const ClientsControl = require('./ClientsControl');
const Playlist = require('./Playlist');
const SongPlayer = require('./SongPlayer');
const yas = require('youtube-audio-server');
const configuration = require('../../configuration.json');
const url = require('url');
const args = require('minimist')(process.argv.slice(2));

// TODO: update this later.
// Override port to support multiple channels / processes.
configuration.port = args.port || configuration.port;
console.log('Starting SERVER on PORT', configuration.port);

class Server {
  constructor() {
    this.songPlayer = new SongPlayer();

    this.clientActions = {
      serverTime: () => new Date(),
      currentTrack: () => this.playlist.getCurrentSong(),
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
          this.playlist.addSong(song);
          this.clientsControl.sendPlaylist({
            songs: this.playlist.songs,
            currentSong: this.playlist.getCurrentSong(),
          });
          return song;
        })
      ),
      removeSong: song => {
        this.playlist.removeSong(song.url);
        this.clientsControl.sendPlaylist({
          songs: this.playlist.songs,
          currentSong: this.playlist.getCurrentSong(),
        });
      },
      playMusic: () => {
        this.playlist.play();
        this.clientsControl.startPlay();
      },
      pauseMusic: () => {
        this.playlist.stop();
        this.clientsControl.stopPlay();
      },
      nextMusic: () => {
        this.playlist.nextSong();
        this.playMusic();
      },
      sendMessage: ({ userName, message }) => {
        const messageToSend = `
          <div class="message">
            <p class="username">${userName}:</p>
            <p class="text">${message}</p>
          </div>
        `;
        this.clientsControl.sendActivityStream(messageToSend);
      },
    };
    this.welcomeActions = {
      playlist: () => ({
        songs: this.playlist.songs,
        currentSong: this.playlist.getCurrentSong(),
      }),
    };

    this.clientsControl = new ClientsControl(this.clientActions, this.welcomeActions);

    this.playlist = new Playlist(this.songPlayer, this.clientsControl);
    this.songPlayer.setPlaylist(this.playlist);

    this.hostControl = new HostControl(this.playlist, this.clientsControl);

    this.playlist.init();
  }
  // external methods
  play() {
    Winston.info('Server -> play');
    this.playlist.play();
  }
  stop() {
    Winston.info('Server -> stop');
    this.playlist.stop();
  }
  nextSong() {
    Winston.info('Server -> nextSong');
    this.currentSong += 1;
    this.playlist.play();

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
    const id = url.parse(songUrl, true).query.v;
    const file = `${process.cwd()}/resources/${id}`;
    return new Promise((resolve, reject) => {
      Winston.verbose(`Server -> createMp3FromYoutube -> Downloading ${id} into ${file}...`);
      yas.downloader.onSuccess(() => {
        Winston.info(`Yay! Audio (${id}) downloaded successfully into "${file}"!`);
        resolve(`http://${configuration.host}:${configuration.port}/resources/${id}`);
      }).onError(({ v, error }) => {
        Winston.error(`Sorry, an error ocurred when trying to download ${v}`, error);
        reject(error);
      }).download({ id, file });
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
