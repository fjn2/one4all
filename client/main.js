class ServerTime {
  constructor(intercommunication) {
    this.intercommunication = intercommunication;
    this.detour = undefined; // desvio
    this.maxSampleritems = 5;
    this.sampler = [];
  }
  getSampler() {
    const t = new Date();
    this.intercommunication.get('serverTime', ({ data }) => {
      const now = new Date();
      const latency = new Date() - t;

      this.sampler.push({
        serverTime: new Date(new Date(data).getTime() + (latency / 2)),
        localTime: now,
        latency,
      });

      if (this.sampler.length > this.maxSampleritems) {
        const latencyArray = this.sampler.map(item => item.latency);
        const maxLatency = Math.max(...latencyArray);
        this.sampler.splice(latencyArray.indexOf(maxLatency), 1);
      }
    });
  }
  get() {
    return this.calculateSeverTime(this.sampler, {});
  }
  getDetour() {
    const now = new Date();
    const values = this.sampler.map(
      sample => sample.serverTime.getTime() + (now - sample.localTime),
    );
    let acum = 0;

    for (let i = 0; i < values.length; i += 1) {
      acum += values[i];
    }

    const media = acum / values.length;
    acum = 0;
    for (let i = 0; i < values.length; i+= 1) {
      acum += (values[i] - media) ** 2;
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
  startSynchronization() {
    setTimeout(() => {
      this.getSampler();
      this.startSynchronization();
    }, 1000);
  }

}

class Intercommunication {
  constructor(url) {
    this.socket = io(url);
    // this events requires the petition of the client
    this.eventList = ['serverTime', 'currentTrack', 'timeCurrentTrack', 'addSong', 'playMusic', 'pauseMusic', 'nextMusic'];
    // these events are fired by the server
    this.eventSubscribe = ['startPlay', 'stopPlay', 'playList'];

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
    const guid = Math.floor(Math.random() * 1000000);

    if (~this.eventList.indexOf(eventName)) {
      this.pendingMessages.push({
        guid,
        callback,
      });
      this.socket.emit(eventName, {
        guid,
        data,
      });
    } else {
      console.warn(`The event '${eventName}' is not defined`);
    }
  }
  subscribe(eventName, handler) {
    const subs = {
      eventName,
      handler,
    };

    this.subscribers.push(subs);

    return subs;
  }
  unsubscribe(reference) {
    this.subscribers.splice(this.subscribers.indexOf(reference), 1);
  }
}

class AudioPlayer {
  constructor(intercommunication, serverTime, percentEl) {
    this.intercommunication = intercommunication;
    this.percentEl = percentEl;
    // initialize audio control
    this.audioElement = window.document.createElement('AUDIO');
    // this.audioElement.controls = true;
    window.foo = this.audioElement;
    this.serverTime = serverTime;

    window.document.body.appendChild(this.audioElement);
    // status = 0 -> no initialized 1 -> requesting current track 2 -> downloading file  4 -> track loaded
    this.status = 0;
    this.cachedSongs = {};
  }
  loadAudio() {
    this.status = 1;
    this.setSong(undefined);
    this.intercommunication.get('currentTrack', ({ data }) => {
      const download = (filename) => {
        this.status = 2;
        const xhttp = new XMLHttpRequest();
        xhttp.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            this.percentEl.innerHTML = percentComplete;
            console.log(`Downloading: (${filename}) ${percentComplete}%`);
          }
        });

        xhttp.addEventListener('load', () => {
          if (xhttp.status == 200) {
            const tmpUrl = window.URL.createObjectURL(xhttp.response);
            this.cachedSongs[filename] = tmpUrl;
            this.setSong(tmpUrl);
            this.status = 4;
          }
        });

        xhttp.open('GET', filename);
        xhttp.responseType = 'blob';
        xhttp.send();
      };
      if (data) {
        if (this.cachedSongs[data]) {
          this.setSong(this.cachedSongs[data]);
          this.status = 4;
        } else {
          download(data);
        }
      } else {
        console.error('The play list looks like empty dude :(');
      }
    });
  }
  setSong(songURL = '') {
    this.audioElement.src = songURL;
  }
  seek(time) {
    this.audioElement.currentTime = time / 1000;
  }
  play() {
    this.intercommunication.get('timeCurrentTrack', ({ data }) => {
      const { serverTime, trackTime } = data;

      const delay = 2000;
      const timeDifference = Math.round(new Date(serverTime).getTime() + delay) - this.serverTime.get();

      if (timeDifference >= 0 && !Number.isNaN(this.serverTime.getDetour())) {
        setTimeout(() => {
          console.log('DIFF', (trackTime + delay) - this.audioElement.currentTime * 1000);
          this.seek(trackTime + delay);
          const initialTime = new Date();
          // 100ms looping to have a better performance
          while (new Date() - initialTime < 100) {}
          this.audioElement.play();
        }, timeDifference - 100);
      } else {
        console.error('You have too much delay dude :(');
      }
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
    this.audioElement.pause();
  }
}

class PlayList {
  constructor(id, intercommunication, audioPlayer) {
    this.intercommunication = intercommunication;
    this.audioPlayer = audioPlayer;
    this.songs = [];
    this.currentSong = 0;
    this.id = id;
  }
  get() {

  }
  addSong(url) {
    console.log('Sending song...');
    window.document.getElementById('loading').style.display = 'block';
    this.intercommunication.get('addSong', () => {
      console.log('Song added propertly');
      window.document.getElementById('loading').style.display = 'none';
    }, {
      url,
    });
  }
  waitForPlayList() {
    this.intercommunication.subscribe('playList', ({ data }) => {
      const { songs, currentSong } = data;
      this.songs = songs;

      if (this.currentSong !== currentSong) {
        this.audioPlayer.loadAudio();
        this.audioPlayer.stop();
      }

      this.currentSong = currentSong;

      this.render();
    });
  }
  render() {
    let el = `
    <span>
      Playing: <b>${this.currentSong}</b>
    </span>`;

    for (let i = 0; i < this.songs.length; i += 1) {
      const song = this.songs[i];
      el += `
      <ul>
        <li>${song}</li>
      </ul>
      `;
    }
    window.document.getElementById(this.id).innerHTML = el;
  }
}

class App {
  constructor() {
    const percentEl = window.document.getElementById('percent');

    this.intercommunication = new Intercommunication(configuration.server);
    this.serverTime = new ServerTime(this.intercommunication);
    this.audioPlayer = new AudioPlayer(this.intercommunication, this.serverTime, percentEl);
    this.playList = new PlayList('playList', this.intercommunication, this.audioPlayer);

    this.serverTime.startSynchronization();

    // this.audioPlayer.loadAudio();
    this.playList.waitForPlayList();

    const timer = setInterval(() => {
      if (this.serverTime.getDetour() < configuration.maxDetour) {
        console.log('I know the server time ;) with this detour: ', this.serverTime.getDetour());
        // here I know the server time
        this.audioPlayer.waitForPlay();
        clearInterval(timer);
      }
    }, 1000);
  }
  addSongToPlayList(songUrl) {
    this.playList.addSong(songUrl);
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
}


// //////////////////////////////////////////////
// //////////////////////////////////////////////
// application starts

const app = new App();


function addSongToPlayList() {
  const songUrl = window.document.getElementById('urlSong').value;
  if (songUrl) {
    app.addSongToPlayList(songUrl);
  } else {
    window.alert('Why so rude?');
  }
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

