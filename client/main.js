class ServerTime {
  constructor(intercommunication) {
    this.intercommunication = intercommunication;
    this.detour = undefined; // desvio
    this.maxSampleritems = 20;
    this.minDetour = 20;
    this.minValidSamples = 5;
    this.sampler = [];
    // at first, the server time is equals to local time (with a big detour)
    this.realServerTime = {
      detour: 999999,
      localTime: new Date(),
      time: new Date()
    };
  }
  getSampler() {
    return new Promise((resolve) => {
      const t = new Date();
      this.intercommunication.get('serverTime', ({ data }) => {
        const now = new Date();
        const latency = new Date() - t;

        this.sampler.push({
          serverTime: new Date(new Date(data).getTime() + (latency / 2)),
          localTime: now,
          latency
        });

        if (this.sampler.length > this.maxSampleritems) {
          const latencyArray = this.sampler.map(item => item.latency);
          const maxLatency = Math.max(...latencyArray);
          // remove the one with more latency
          this.sampler.splice(latencyArray.indexOf(maxLatency), 1);
        }
        resolve();
      });
    });
  }
  get() {
    return this.realServerTime.time + (new Date() - this.realServerTime.localTime);
  }
  getDetour() {
    const now = new Date();
    const values = this.sampler.map(
      sample => sample.serverTime.getTime() + (now - sample.localTime)
    );
    let acum = 0;

    for (let i = 0; i < values.length; i += 1) {
      acum += values[i];
    }

    const media = acum / values.length;
    acum = 0;
    for (let i = 0; i < values.length; i+= 1) {
      acum += Math.pow(values[i] - media, 2);
    }

    return Math.sqrt((1 / (values.length - 1)) * acum);
  }
  calculateSeverTime([sample, ...tail], { now = new Date(), samplerCount = 0, samplerAcum = 0 }) {
    if (sample) {
      const count = samplerCount + 1;
      const acum = samplerAcum + sample.serverTime.getTime() + (now - sample.localTime);
      return this.calculateSeverTime(tail, { now, samplerCount: count, samplerAcum: acum });
    }
    return samplerAcum / samplerCount;
  }
  startSynchronization(interval = 1000) {
    setTimeout(() => {
      const detour = this.getDetour();
      let nextInterval = - 20 * detour + 2100;
      nextInterval = nextInterval > 100 ? nextInterval : 100;
      if (this.getDetour() > this.minDetour || this.sampler.length <= this.minValidSamples) {
        this.getSampler().then(() => {
            this.startSynchronization(nextInterval);
        });
      } else {
        console.log('Synchronization finish');
      }
      // wait for 5 samples to have a better result
      if (detour < this.realServerTime.detour && this.sampler.length > this.minValidSamples) {
        let time = this.calculateSeverTime(this.sampler, {});
        if (!Number.isNaN(time)) {
          this.realServerTime.detour = detour;
          this.realServerTime.localTime = new Date();
          this.realServerTime.time = this.calculateSeverTime(this.sampler, {});
        }
      }
      window.document.getElementById('detour').innerHTML = Math.round(detour) + ' &#177; ms';
      window.document.getElementById('bestDetour').innerHTML = Math.round(this.realServerTime.detour) + ' &#177; ms';
    }, interval);
  }
  startPlayDiffSynchronization() {
    setInterval(() => {
      audioPlayer.getPlayListDiff();
      user.render();
      user.sendStatus();
    }, 5000);
  }
}

//---------------------------------------------------------------------------

class Intercommunication {
  constructor(url) {
    this.socket = io(url, {transports: ['websocket', 'polling', 'flashsocket']});
    // these events require the petition of the client
    this.eventList = ['serverTime', 'currentTrack', 'timeCurrentTrack', 'addSong', 'removeSong', 'playMusic', 'pauseMusic', 'nextMusic', 'sendMessage', 'sendUserStatus'];
    // these events are fired by the server
    this.eventSubscribe = ['startPlay', 'stopPlay', 'playlist', 'numberOfConections', 'activityStream'];

    this.pendingMessages = [];
    this.subscribers = [];

    this.processCallbacks = (eventName, data) => {
      this.pendingMessages.forEach((message, index) => {
        if (message.guid === data.guid) {
          if (typeof message.callback ===  'function') {
            message.callback(data);
          }
          this.pendingMessages.splice(index, 1);
        }
      });
    };

    this.eventList.forEach((eventName) => {
      this.socket.on(`${eventName}-S`, (data) => {
        this.processCallbacks(eventName, data);
      });
    });

    this.processHandlers = (eventName, data) => {
      this.subscribers.forEach((subscribe) => {
        if (subscribe.eventName === eventName) {
          subscribe.handler(data);
        }
      });
    };
    this.eventSubscribe.forEach((eventName) => {
      this.socket.on(`${eventName}`, (data) => {
        this.processHandlers(eventName, data);
      });
    });
  }

  get(eventName, callback, data) {
    // TODO: Generate GUIDs on the server.
    const guid = Math.floor(Math.random() * 1000000);

    if (~this.eventList.indexOf(eventName)) {
      this.pendingMessages.push({
        guid,
        callback
      });
      this.socket.emit(eventName, {
        guid,
        data
      });
    } else {
      console.warn(`The event '${eventName}' is not defined`);
    }
  }
  subscribe(eventName, handler) {
    const subs = {
      eventName,
      handler
    };

    this.subscribers.push(subs);

    return subs;
  }
  unsubscribe(reference) {
    this.subscribers.splice(this.subscribers.indexOf(reference), 1);
  }
}

// firstPatrol -> omg!
let firstPatrol = true;

//---------------------------------------------------------------------------

class AudioPlayer {
  constructor(intercommunication, serverTime, percentEl) {
    this.intercommunication = intercommunication;
    this.percentEl = percentEl;
    // initialize audio control
    this.audioElement = window.document.createElement('AUDIO');

    if (isMobile()) {
      this.audioElement.controls = true;
    }
    this.src = './beep.mp3';
    this.maxDiferenceTolerance = 100;

    this.serverTime = serverTime;
    // these two variables are to set an small offset for mobiles or other devices that have problems with playing music
    this.hardwareDeviceOffset = 0;
    this.hardwareDeviceCuantum = 10;

    window.document.querySelector('.menu-fill').appendChild(this.audioElement);
  }
  loadAudio() {
    return new Promise((resolve) => {
      this.intercommunication.get('currentTrack', ({ data }) => {
        if (data) {
          if (downloader.cachedSongs[data.url] && downloader.cachedSongs[data.url].tmpUrl) {
            if (this.audioElement.src !== downloader.cachedSongs[data.url].tmpUrl) {
              this.setThumbnail();
              this.setSong(downloader.cachedSongs[data.url].tmpUrl);
            }
          } else {
            console.log('The song is not ready');
            this.setSong(undefined);
            downloader.startDownload(data.url, firstPatrol).then(() => {
              console.log('Trying loading again!');
              this.loadAudio();
            });
            firstPatrol = false;
          }
        } else {
          console.error('The play list looks like empty dude :(');
        }
        resolve();
      });
    });
  }
  setSong(songURL = '') {
    this.audioElement.src = songURL;
  }
  seek(time) {
    this.audioElement.currentTime = time / 1000;
  }
  setThumbnail() {
    const src = playlist.currentSong.metadata.thumbnails.medium.url;
    $currentThumbnail
      .src(src)
      .show();

    $background.style('backgroundImage', `url(${src})`);
  }
  play() {
    this.intercommunication.get('timeCurrentTrack', ({ data }) => {
      const { serverTime, trackTime, playing } = data;
      const delay = 2000;
      const timeDifference = Math.round(new Date(serverTime).getTime() + delay) - this.serverTime.get() - this.hardwareDeviceOffset;

      if (timeDifference >= 0 && !Number.isNaN(this.serverTime.getDetour())) {
        setTimeout(() => {
          this.seek(trackTime + delay + ($rangeAdjustment.val() * 1));
          const initialTime = new Date();
          // 100ms looping to have a better performance
          while (new Date() - initialTime < 100) {}
          if (playing) {
            isPlaying = true;
            this.audioElement.play();
          } else {
            isPlaying = false;
            this.audioElement.pause();
          }
          playlist.render();
        }, timeDifference - 100);
      } else {
        console.error('You have too much delay dude :(');
      }
    });
  }
  getPlayListDiff() {
    this.intercommunication.get('timeCurrentTrack', ({ data }) => {
      const { serverTime, trackTime, playing } = data;

      const delay = 2000;
      const timeDifference = Math.round(new Date(serverTime).getTime() + delay) - this.serverTime.get() + ($rangeAdjustment.val() * -1);

      setTimeout(() => {
        const diff = Math.round((trackTime + delay) - this.audioElement.currentTime * 1000);
        this.diff = diff;
        if (playing) {
          let diffToShow = diff;
          if ($rangeAdjustment.val() !== '0') {
            diffToShow = '(' + diff + ' + ' + ($rangeAdjustment.val() * 1) + ')';
          }
          window.document.getElementById('playDiff').innerHTML = diffToShow + ' ms';
          if (Math.abs(diff) > this.maxDiferenceTolerance || diff < 0) {
            console.log('Re-play');
            if (!audioPlayer.audioElement.paused && audioPlayer.audioElement.readyState) {
              this.hardwareDeviceOffset += this.hardwareDeviceCuantum * Math.sign(diff);
            }

            this.play();
          }

          document.getElementById('hardwareOffset').innerHTML = this.hardwareDeviceOffset + ' ms';
        } else {
          window.document.getElementById('playDiff').innerHTML = '-';
          isPlaying = false;
          this.audioElement.pause();
        }
      }, timeDifference);
    });
  }
  waitForPlay() {
    this.intercommunication.subscribe('startPlay', () => {
      console.log('PLAY');
      this.play();
    });
    this.intercommunication.subscribe('stopPlay', () => {
      console.log('STOP');
      this.stop();
    });
  }
  stop() {
    isPlaying = false;
    this.audioElement.pause();
    playlist.render();
  }
}

//---------------------------------------------------------------------------

class PlayList {
  constructor(id, intercommunication, audioPlayer) {
    this.intercommunication = intercommunication;
    this.audioPlayer = audioPlayer;
    this.songs = [];
    this.users = [];
    this.currentSong = 0;
    this.id = id;
  }
  get() {

  }
  addSong(url) {
    console.log('Playlist: Adding song...', url);
    $loading.show();
    $songUrl.disable();
    this.intercommunication.get('addSong', (resp) => {
      if (resp.data.error) {
        alert('There was an error when we try to add the song. Try with another one');
      } else {
        console.log('Song added successfully!');
      }

      $loading.hide();
      $songUrl
        .val('')
        .enable();
    }, {
      url
    });
  }
  removeSong(url) {
    $loading.show();
    this.intercommunication.get('removeSong', () => {
      $loading.hide();
    }, {
      url
    });
  }
  waitForPlayList() {
    this.intercommunication.subscribe('playlist', ({ data }) => {
      const { songs, currentSong } = data;
      this.songs = songs;
      if (!currentSong || !this.currentSong || this.currentSong.url !== currentSong.url) {
        this.audioPlayer.stop();
        this.audioPlayer.loadAudio().then(() => {
          this.audioPlayer.play();
        });
      }
      this.currentSong = currentSong || {};

      this.render();

      menu.playlistPage.addClass('new-activity');
    });
  }

  waitForNumberOfConections() {
    this.intercommunication.subscribe('numberOfConections', ({ data }) => {
      this.users = data;
      window.document.getElementById('userConected').innerHTML = this.users.length;
    });
  }

  isPlayingSong(song) {
    return (isPlaying && this.currentSong.url === song.url);
  }

  getPlayingStatus(song) {
    let playingStatus = '<img class="playing" src="playing.gif" />';
    if (!this.isPlayingSong(song)) playingStatus = '';
    return playingStatus;
  }

  getSongActions(song) {
    let actions = '';

    // Get percentage downloaded.
    let percent = 0;
    if (downloader.cachedSongs[song.url]) {
      percent = downloader.cachedSongs[song.url].percentComplete;
    }

    const deleteAction = `
      <a onclick="removeSongToPlayList('${song.url}')">
        <i class="material-icons">cancel</i>
      </a>
    `;
    // const playingStatus = '<img class="playing" src="playing.gif" />';
    const downloadSong = `
      <a onclick="downloadSong('${song.url}')">
        <i class="material-icons">cloud_download</i>
      </a>
    `;
    const downloadFile = `
      <a onclick="downloadFile('${song.url}')">
        <i class="material-icons">file_download</i>
      </a>
    `;
    const downloadingStatus = `
      <a onclick="cancelDownload('${song.url}')">
        <span class="downloaded">${percent}%</span>
      </a>
    `;

    // Paused, fully downloaded.
    if (percent === 100) actions = downloadFile;

    // Downloading.
    if (percent > 0 && percent < 100) actions = downloadingStatus;

    // Not started.
    if (percent === 0) actions = downloadSong;

    // Delete action
    actions += deleteAction;

    // Playing.
    // if (isPlayingCurrentSong && percent === 100) {
    //   actions = downloadFile + playingStatus;
    // }

    return actions;
  }

  getSongId(song) {
    return this.currentSong.metadata.id; // YouTube
  }

  render() {
    let el = '';
    let currentSongId = 'No song.';
    const songsLabel = (this.songs.length === 1) ? 'song' : 'songs';

    el = `
    <label>
      ${this.songs.length} ${songsLabel} added
    </label>`;

    if (this.currentSong && this.currentSong.metadata) {
      currentSongId = this.getSongId(this.currentSong);
    }

    for (let i = 0; i < this.songs.length; i += 1) {
      const song = this.songs[i];
      let currentSongClass = this.currentSong.url === song.url ? ' current-song' : '';

      const playingStatus = this.getPlayingStatus(song);
      const playingClass = (isPlaying)? ' is-playing' : '';
      const actions = this.getSongActions(song);
      el += `
      <ul>
        <li class="song-row${currentSongClass}">
          ${playingStatus}
          <span id="song-${currentSongId}" class="song-title${playingClass}" title="${song.metadata.title}">
            ${song.metadata.title}
          </span>
          <span class="song-actions">${actions}</span>
        </li>
      </ul>
      `;
    }

    $playlist.html(el);
    if (menu.active === 'playlistPage') $playlist.show();
  }
}

//---------------------------------------------------------------------------

class User {
  constructor() {
    this.temporalName = ('Guest' + Math.round(Math.random() * 1000 + 1000));
  }
  getName() {
    let username = window.document.getElementById('userName').value;
    if (username === '') {
      username = this.temporalName;
    }
    return username;
  }
  sendStatus() {
    intercommunication.get('sendUserStatus', () => {}, {
      id: intercommunication.socket.id,
      username: this.getName(),
      detour: serverTime.realServerTime.detour,
      playDiff: audioPlayer.diff,
      playOffset: window.document.getElementById('rangeAdjustment').value,
      isPlaying: isPlaying && downloader.cachedSongs[playlist.currentSong.url].percentComplete === 100
    });
  }
  render() {
    let el = `
    <label>
      ${playlist.users.length} users
    </label>
    <ul>
    `;

    for (let i = 0; i < playlist.users.length; i += 1) {
      let diffToShow = Math.round(playlist.users[i].playDiff) + ' ms';
      if (playlist.users[i].playOffset !== '0') {
        diffToShow = '(' + playlist.users[i].playDiff + ' + ' + (playlist.users[i].playOffset * 1) + ') ms';
      }
      let detour = Math.round(playlist.users[i].detour);
      let playing =  '';
      if (playlist.users[i].isPlaying) {
        playing = '<img class="playing" src="playing.gif" />';
      } else {
        diffToShow = '-';
      }
      el += `
      <li>
        <b>
          ${playlist.users[i].username} -
        </b>
        <span>
          <b>Detour:</b> ${detour} &#177; ms /
        </span>
        <span>
          <b>Play diff:</b> ${diffToShow}
        </span>
        <span>
          ${playing}
        </span>

      </li>`;
    }
    el += '</ul>';

    $users.html(el);
  }
}

//---------------------------------------------------------------------------

class Chat {
  constructor(intercommunication) {
    this.intercommunication = intercommunication;
    this.guid = 'user-' + Math.floor(Math.random() * 1000000); // TODO: set on server!
    this.emoticonsShown = false;

    // Style own messages.
    El.injectStyles(`
      .message.${this.guid} .username {
        background: #9bd979;
      }
    `);
  }

  waitForActivityStream() {
    this.intercommunication.subscribe('activityStream', ({ data }) => {
      menu.chat.addClass('new-activity');
      this.addActivity(data.message);
    });
  }

  setUsername(username) {
    if (!username || !username.trim()) {
      $username.val('');
      return;
    }

    this.username = username;
    $username.hide();
    $message
      .show()
      .focus()
      .html('');
    $emoticonSelector.show();
    setTimeout(() => {
      $message.html('');
    })
  }

  imageTransformation(message) {
    return `<img src="${message}" class="message-image" />`;
  }

  applyTransformations(message) {
    const transformations = {
      imageTransformation: /^http(s)?:\/\/.*\.(jpg|jpeg|png|gif|webp)$/
    }

    Object.keys(transformations)
    .some((transformationName) => {
      if (message.match(transformations[transformationName])) {
        message = this[transformationName](message);
      }
    });

    return message;
  }

  sendMessage(message, event) {
    event.stopPropagation();
    event.preventDefault();

    $message.disable();
    $messageSending.show();
    message = this.applyTransformations(message);
    this.intercommunication.get('sendMessage', ({ data }) => {
      $messageSending.hide();
      $message
        .html('')
        .enable()
        .focus();

      // Ensure emoticons are closed.
      $emoticons.hide();

      setTimeout(() => $activityStream.scrollBottom())
    }, {
      message,
      userName: this.username || 'Anonymous',
      guid: this.guid
    });
  }

  addActivity(message) {
    $activityStream
      .appendHtml(message)
      .scrollBottom();
  }

  toggleEmoticons() {
    $emoticons.toggle()
  }

  addEmoticon(event) {
    const src = event.target.currentSrc;
    $message
      .appendHtml(`<img src="${src}" class="emoticon" />`)
      .caretEnd();
  }
}

//---------------------------------------------------------------------------

class Downloader {
  constructor(playlist) {
    this.playlist = playlist.song;
    this.cachedSongs = {};
  }
  // patrol:bool -> will loop over all songs to check for new downloads
  startDownload(filename, patrol = false) {
    let promise;
    if (!this.cachedSongs[filename]) {
      this.cachedSongs[filename] = {};
      promise = new Promise((resolve) => {
        const xhttp = new XMLHttpRequest();
        xhttp.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            this.cachedSongs[filename].percentComplete = percentComplete;
            console.log(`Downloading: (${filename}) ${percentComplete}%`);
            playlist.render();
          }
        });

        xhttp.addEventListener('load', () => {
          if (xhttp.status == 200) {
            const tmpUrl = window.URL.createObjectURL(xhttp.response);
            this.cachedSongs[filename].tmpUrl = tmpUrl;
            resolve();
          }
        });

        xhttp.open('GET', filename);
        xhttp.responseType = 'blob';
        xhttp.send();
      });
    } else {
      if (this.cachedSongs[filename].tmpUrl) {
        console.log('This song is already downloaded', filename);
      } else {
        console.log('Download is already in progress', filename);
      }
      promise = new Promise((resolve) => {
        // wait for 5 second to check the next song
        setTimeout(resolve, 5000);
      });
    }
    if (patrol) {
      promise.then(() => {
        // Once this finish, start downloading the next song
        let nextSong = playlist.songs[playlist.songs.indexOf(playlist.songs.find((song) => {
          return song.url === filename;
        })) + 1];

        if (!nextSong) {
          nextSong = playlist.songs[0];
        }
        if (!nextSong) {
          // probably the playlist is empty
          nextSong = {};
        }
        this.startDownload(nextSong.url, true);
      });
    }
    return promise;
  }
}

//---------------------------------------------------------------------------

class App {
  constructor(url) {
    const percentEl = window.document.getElementById('percent');

    this.intercommunication = new Intercommunication(url); //configuration.server
    this.serverTime = new ServerTime(this.intercommunication);
    this.downloader = new Downloader(this.intercommunication);
    this.audioPlayer = new AudioPlayer(this.intercommunication, this.serverTime, percentEl);
    this.playlist = new PlayList('playlist', this.intercommunication, this.audioPlayer);
    this.user = new User();
    this.chat = new Chat(this.intercommunication);

    this.serverTime.startSynchronization();
    this.serverTime.startPlayDiffSynchronization();

    this.playlist.waitForPlayList();
    this.playlist.waitForNumberOfConections();
    this.chat.waitForActivityStream();

    const timer = setInterval(() => {
      if (this.serverTime.getDetour() < configuration.maxDetour) {
        // here I know the server time
        this.audioPlayer.waitForPlay();
        clearInterval(timer);
      }
    }, 1000);
  }
  addSongToPlayList(songUrl) {
    this.playlist.addSong(songUrl);
  }
  removeSongToPlaylist(songUrl) {
    this.playlist.removeSong(songUrl);
  }
  play() {
    this.intercommunication.get('playMusic');
  }
  pause() {
    this.intercommunication.get('pauseMusic');
  }
  next() {
    this.intercommunication.get('nextMusic');
  }
  sendMessage(message, userName) {
    this.chat.sendMessage(message, userName);
  }

  onPaste(event) {
    // Do nothing when pasting text in the chat.
    if (event.target.id === 'messageText') return;

    const clipboard = event.clipboardData || window.clipboardData;
    const pasted = clipboard.getData('Text');
    console.log('PASTED:', pasted);

    $songUrl.val(pasted);
    app.addSongToPlayList(pasted);
  }

  onDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    const text = event.dataTransfer.getData('text');
    console.log('DROPPED text', text);

    $songUrl.val(text);
    app.addSongToPlayList(text);
  }
}

//---------------------------------------------------------------------------

class Connection {
  constructor() {
    this.url = `http://${configuration.spinner}`;
    this.onRoomCallback;
  }

  start(callback) {
    console.log('Start websocket');
    this.onRoomCallback = callback;
    this.socket = io(this.url, { transports: ['websocket', 'polling', 'flashsocket'] });
    this.socket.on('connect', () => {
      this.events();
      this.connectRoom();
    });
  }

  events() {
    this.socket.on('room', (data) => {
      console.log('GOT ROOM:', data);
      this.onRoomCallback(data);
    });
  }

  connectRoom() {
    this.roomId = this.getRoomId();
    this.socket.emit('room', { id: this.roomId });
  }

  getRoomId() {
    function getParameterByName(name, url) {
      if (!url) url = window.location.href;
      name = name.replace(/[\[\]]/g, "\\$&");
      var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
          results = regex.exec(url);
      if (!results) return null;
      if (!results[2]) return '';
      return decodeURIComponent(results[2].replace(/\+/g, " "));
    }
    return getParameterByName('id');
  }
}

//---------------------------------------------------------------------------

class Menu {
  constructor() {
    this.playlistPage = new El('#menu-playlist');
    this.chat = new El('#menu-chat');
    this.rooms = new El('#menu-rooms');
    this.users = new El('#menu-users');
    this.active = 'playlistPage';

    this.content = {
      playlistPage: new El('#playlistPage'),
      chat: new El('#chat'),
      users: new El('#users'),
      rooms: new El('#rooms')
    };
  }

  show(name) {
    // Hide previously active.
    this.content[this.active].hide();
    this[this.active].removeClass('active');

    // Show current.
    // TODO: Do something more elegant!
    if (name === 'chat') {
      menu.chat.removeClass('new-activity');
      if ($username.isVisible()) {
        setTimeout(() => {
          $username.focus();
        });
      } else {
        $message.focus();
      }
    } else if (name === 'playlistPage') {
      menu.playlistPage.removeClass('new-activity');
      $songUrl.focus();
    }

    this.active = name;
    this[name].addClass('active');
    this.content[name].show();
  }
}

//---------------------------------------------------------------------------

// //////////////////////////////////////////////
// //////////////////////////////////////////////
// application starts

// expose the object to the entry world

let app;
let intercommunication;
let serverTime;
let downloader;
let audioPlayer;
// the 'var' is needed for safari compatibility, otherwise, a global variable definition conflict error will be triggered
var playlist;
let user;
let menu;

let isPlaying = false;

const connection = new Connection();
connection.start(({url}) => {
  console.log('CONNECTED to SPINNER!');
  // TODO: check why this is treggered multiple times
  if (!app) {
    app = new App(url);
    intercommunication = app.intercommunication;
    serverTime = app.serverTime;
    downloader = app.downloader;
    audioPlayer = app.audioPlayer;
    playlist = app.playlist;
    user = app.user;
    menu = new Menu();
  }
});

// Set elements.
const $loading = new El('#loading');
const $playlist = new El('#playlist');
const $users = new El('#users');
const $background = new El('#background');
const $username = new El('#userName');
const $message = new El('#messageText');
const $messageSending = new El('#message-sending');
const $rangeAdjustment = new El('#rangeAdjustment');
const $emoticonSelector = new El('.emoticon-selector');
const $emoticons = new El('#emoticons');
const $currentThumbnail = new El('#currentThumbnail');
const $songUrl = new El('#songUrl');
const $activityStream = new El('#activityStream')

// Randomize background.
$background.setRandomBackground({
  path: 'backgrounds',
  range: [1, 18]
});


function addSongToPlayList() {
  const songUrl = $songUrl.val();
  if (songUrl) {
    app.addSongToPlayList(songUrl);
  }
}
function removeSongToPlayList(songUrl) {
  app.removeSongToPlaylist(songUrl);
}
function playMusic() {
  app.play();
}
function pauseMusic() {
  app.pause();
}
function nextMusic() {
  app.next();
}
function sendMessage() {
  const message = window.document.getElementById('messageText').value;
  const userName = window.document.getElementById('userName').value;
  if (userName.length) {
    app.sendMessage(message, userName);
    window.document.getElementById('messageText').value = '';
    window.document.getElementById('userName').disabled = true;
  } else {
    window.alert('Hey dude!, don\'t forget your name');
  }
}
function isMobile() {
  var check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
}

function downloadSong(songUrl) {
  console.log('DOWNLOAD:', songUrl);
  downloader.startDownload(songUrl);
}

function downloadFile(songUrl) {
  // TODO: write filename using song title.
  const filename = 'listensync-download.mp3';
  const data = downloader.cachedSongs[songUrl].tmpUrl;
  const element = document.createElement('a');
  element.setAttribute('href', data);
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();
  document.body.removeChild(element);
}

function cancelDownload(songUrl) {
  alert('Comming soon!');
}

function manualAdjustment(val) {
  window.document.getElementById('rangeAdjustmentValue').innerHTML = val + ' ms';
}
function showRange(value) {
  document.getElementById('offsetContainer').style.display = value ? 'block' : 'none';
  if (!value) {
    document.getElementById('rangeAdjustment').value = 0;
    manualAdjustment(0);
  }
}

function toArray (list) {
  return Array.prototype.slice.call(list || [], 0)
}


mdc.autoInit();
