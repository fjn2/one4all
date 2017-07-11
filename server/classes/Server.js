const Winston = require('winston');
const HostControl = require('./HostControl');
const ClientsControl = require('./ClientsControl');
const Playlist = require('./Playlist');
const SongPlayer = require('./SongPlayer');
const yas = require('youtube-audio-server');
const configuration = require('../../configuration.json');
const url = require('url');
const request = require('request');
const args = require('minimist')(process.argv.slice(2));
const storage = require('node-persist');

// TODO: update this later.
// Override port to support multiple channels / processes.
configuration.port = args.port || configuration.port;
Winston.info('Starting SERVER on PORT', configuration.port);

class Server {
  constructor(roomName) {
    this.roomName = roomName;
    // to store the playlist
    Winston.debug('Reading from', `./playlistStoredData_${this.roomName}`);
    storage.initSync({
      dir: `./playlistStoredData_${this.roomName}`
    });
    Winston.debug('Reading finish');
    this.songPlayer = new SongPlayer();


    this.clientActions = {
      serverTime: () => new Date(),
      currentTrack: () => this.playlist.getCurrentSong(),
      timeCurrentTrack: () => ({
        trackTime: this.songPlayer.getCurrentTime(),
        playing: this.songPlayer.playing,
        serverTime: new Date()
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
              kind: 'youtube'
            }));
          }
          return Promise.resolve({
            url: data.url,
            metadata: {
              title: 'No information'
            },
            kind: 'unknown'
          });
        }).then((song) => new Promise((resolve, reject) => {
          request.get(song.url).on('response', (response) => {
            Winston.debug('Verification ok', song.url);
            if (response.headers['content-type'] !== 'audio/mpeg') {
              reject('Error in the content-type of the URL');
             return;
            }
            resolve(song);
          }).on('error', (err) => {
            Winston.error('Verification fail ', song.url);
            reject(err);
          });
        })).then((song) => {
          this.playlist.addSong(song);
          this.clientsControl.sendPlaylist({
            songs: this.playlist.songs,
            currentSong: this.playlist.getCurrentSong()
          });

          // this is for the first track in the playlist
          if (this.playlist.songs.length === 1) {
            this.songPlayer.reset();
          }
          return song;
        })
        .catch((err) => {
          Winston.error('Error on addSong', err);
          return Promise.resolve({
            error: 'The song is not valid'
          });
        })
      ),
      removeSong: song => {
        this.playlist.removeSong(song.url);
        this.clientsControl.sendPlaylist({
          songs: this.playlist.songs,
          currentSong: this.playlist.getCurrentSong()
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
      sendMessage: ({ userName, message, guid }) => {
        const messageToSend = `
          <div class="message ${guid}">
            <p class="username">${userName}</p>
            <p class="text">${message}</p>
          </div>
        `;
        this.clientsControl.sendActivityStream(messageToSend);
      },
      sendUserStatus: (data) => {
        this.clientsControl.setUserSatus(data);
      }
    };
    this.welcomeActions = {
      playlist: () => {
        storage.setItemSync('playlist', this.playlist.songs);
        return {
          songs: this.playlist.songs,
          currentSong: this.playlist.getCurrentSong()
        };
      }
    };

    this.clientsControl = new ClientsControl(this.clientActions, this.welcomeActions);

    this.playlist = new Playlist(this.songPlayer, this.clientsControl);
    this.songPlayer.setPlaylist(this.playlist);
    const storedPlaylistSongs = storage.getItemSync('playlist');
    if (storedPlaylistSongs) {
      this.playlist.songs = storedPlaylistSongs;
    }

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
    const file = `${process.cwd()}/resources/${id}.mp3`;
    return new Promise((resolve, reject) => {
      Winston.verbose(`Server -> createMp3FromYoutube -> Downloading ${id} into ${file}...`);
      yas.downloader.onSuccess(() => {
        Winston.info(`Yay! Audio (${id}) downloaded successfully into "${file}"!`);
        resolve(`http://${configuration.host}:${configuration.port}/resources/${id}.mp3`);
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
            thumbnails: {}
          };
        } else {
          Winston.info(`getYouTubeMetadata finish for "${video}"!`, err, metadata);
          resp = {
            id: metadata.items[0].id,
            title: metadata.items[0].snippet.title,
            thumbnails: metadata.items[0].snippet.thumbnails
          };
        }
        resolve(resp);
      });
    });
  }
}

module.exports = Server;
