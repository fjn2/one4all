const Winston = require('winston');
const configuration = require('../../configuration.json');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const args = require('minimist')(process.argv.slice(2));
const app = express();
const pm2 = require('pm2');
const storage = require('node-persist');

app.use(cors());

configuration.port = process.env.PORT || configuration.port;

const server = require('http').createServer(app);
const io = require('socket.io').listen(server);

Winston.info('Running socket at port:', configuration.port);
server.listen(configuration.port);

class ClientControls {
  constructor(clientActions, welcomeActions, administrators = []) {
    Winston.verbose('ClientControls -> constructor');
    this.clients = [];
    this.administrators = administrators;

    io.on('connection', (socket) => {
      Winston.info('ClientControls -> new connection');
      this.addClient(socket);

      // if there is no administrators, the new user becomes an administrator
      if (this.administrators.length === 0) {
        Winston.warn(`ClientControls -> the user ${this.clients[this.clients.length - 1].id} is the first admin of the room.`);
        this.addAdmin(this.clients[this.clients.length - 1].id);
      }

      // load all the events dynamicly
      Object.keys(clientActions).forEach((key) => {
        Winston.debug(`ClientControls -> defining ${key} method`);
        socket.on(`${key}`, (data) => {
          Winston.info(`ClientControls -> ${key}`);
          const serverData = clientActions[key](data.data);
          if (serverData instanceof Promise) {
            // it is a promise
            serverData
            .then((pData) => {
              socket.emit(`${key}-S`, {
                guid: data.guid,
                data: pData
              });
            })
            .catch((err) => {
              Winston.error('ERROR IN ACTION', key, err);
            });
          } else {
            // it is some other value
            socket.emit(`${key}-S`, {
              guid: data.guid,
              data: serverData
            });
          }
        });
      });

      setTimeout(() => {
        Object.keys(welcomeActions).forEach((key) => {
          Winston.info(`ClientActions -> sending ${key}`);
          socket.emit(`${key}`, {
            data: welcomeActions[key]()
          });
        });
      }, 1000); // wait for one second to stablish the conection
      socket.on('disconnect', () => {
        Winston.info('ClientControls -> disconnect');
        this.removeClient(socket);
      });
    });

    this.isTheRoomEmpty = false;
    setInterval(() => {
      if (this.isTheRoomEmpty && this.clients.length === 0) {
        this.killMyself();
      }
      if (this.clients.length === 0) {
        Winston.warn('I am going to die...');
        this.isTheRoomEmpty = true;
      } else {
        this.isTheRoomEmpty = false;
      }
    }, 60000);
    setInterval(() => {
      this.sendNumberOfConections();
    }, 3000);
  }
  readUserIdFromCookie(socket) {
    if (socket.request.headers.cookie) {
      const cookieObj = socket.request.headers.cookie.replace(/ /g, '').split(';').reduce((acum, item) => {
        const [key, value] = item.split('=');
        acum[key] = value;
        return acum;
      }, {});
      if (cookieObj.user) {
        return cookieObj.user;
      } else {
        Winston.warn('The user id was not defined');
      }
    } else {
      Winston.warn('The cookie is missing');
    }

  }
  addClient(socket) {
    Winston.verbose('ClientControls -> addClient');
    const userId = this.readUserIdFromCookie(socket);
    this.clients.push({
      id: userId,
      socket
    });
  }
  removeClient(socket) {
    Winston.verbose('ClientControls -> removeClient');
    for (let i = 0; i < this.clients.length; i++) {
      if (this.clients[i].socket === socket) {
        this.clients.splice(i, 1);
        break;
      }
    }
  }
  setVolume(value) {
    Winston.verbose('ClientControls -> setVolume');
  }
  startPlay() {
    Winston.info('ClientControls -> startPlay');
    io.emit('startPlay');
  }
  stopPlay() {
    Winston.info('ClientControls -> stopPlay');
    io.emit('stopPlay');
  }
  sendNumberOfConections() {
    Winston.info('ClientControls -> sendNumberOfConections', this.clients.length);
    const clientsData = this.clients.map(client => {
      return {
        id: client.id,
        ip: client.socket.handshake.address,
        username: client.username,
        detour: client.detour,
        playOffset: client.playOffset,
        playDiff: client.playDiff,
        isPlaying: client.isPlaying,
        hardwareOffset: client.hardwareOffset,
        admin: this.isAdmin(client.id)
      };
    });

    io.emit('numberOfConections', {
      data: clientsData
    });
  }
  isAdmin(id) {
    return this.administrators.includes(id);
  }
  addAdmin(id) {
    Winston.info('ClientControls -> addAdmin', id);
    this.administrators.push(id);
    storage.setItemSync('administrators', this.administrators);
  }
  sendPlaylist({ songs, currentSong }) {
    Winston.info('ClientControls -> sendPlaylist');
    io.emit('playlist', {
      data: {
        songs,
        currentSong
      }
    });
  }
  sendActivityStream(message) {
    Winston.info('ClientControls -> sendActivityStream', message);
    io.emit('activityStream', {
      data: {
        type: 'normal',
        message
      }
    });
  }
  setUserSatus({ id, username, detour, playOffset, playDiff, isPlaying, hardwareOffset }) {
    Winston.info('ClientControls -> setUserSatus', id);
    for (let i = 0; i < this.clients.length; i += 1) {
      if (this.clients[i].id === id) {
        this.clients[i].username = username;
        this.clients[i].detour = detour;
        this.clients[i].playOffset = playOffset;
        this.clients[i].playDiff = playDiff;
        this.clients[i].isPlaying = isPlaying;
        this.clients[i].hardwareOffset = hardwareOffset;
        break;
      }
    }
  }
  killMyself() {
    Winston.info('ClientControls -> killMyself');
    pm2.connect(function(err) {
      pm2.stop(`room${process.env.PORT}`);
      // pm2.disconnect();
    });
  }
}


module.exports = ClientControls;

