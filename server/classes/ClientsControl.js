const Winston = require('winston');
const configuration = require('../../configuration.json');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const args = require('minimist')(process.argv.slice(2));
const app = express();
const resourcesPath = path.join(__dirname, '../../resources');

app.use(cors());
app.use('/resources', express.static(resourcesPath));

// TODO: update this later.
// Override port to support multiple channels / processes.
configuration.port = args.port || configuration.port;

const server = require('http').createServer(app);
const io = require('socket.io').listen(server);
server.listen(configuration.port);

class ClientControls {
  constructor(clientActions, welcomeActions) {
    Winston.verbose('ClientControls -> constructor');
    this.clients = [];

    io.on('connection', (socket) => {
      Winston.info('ClientControls -> new connection');
      this.addClient(socket);

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
                data: pData,
              });
            })
            .catch((err) => {
              console.error('ERROR:', err)
            });
          } else {
            // it is some other value
            socket.emit(`${key}-S`, {
              guid: data.guid,
              data: serverData,
            });
          }
        });
      });

      setTimeout(() => {
        Object.keys(welcomeActions).forEach((key) => {
          Winston.info(`ClientActions -> sending ${key}`);
          socket.emit(`${key}`, {
            data: welcomeActions[key](),
          });
        });
      }, 1000); // wait for one second to stablish the conection

      socket.on('disconnect', () => {
        Winston.info('ClientControls -> disconnect');
        this.removeClient(socket);
      });
    });
  }
  addClient(client) {
    Winston.verbose('ClientControls -> addClient');
    this.clients.push(client);
    this.sendNumberOfConections();
  }
  removeClient(client) {
    Winston.verbose('ClientControls -> removeClient');
    this.clients.splice(this.clients.indexOf(client), 1);
    this.sendNumberOfConections();
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
    Winston.info('ClientControls -> sendNumberOfConections');
    const clientsData = this.clients.map(socket => ({
      ip: socket.handshake.address,
    }));

    io.emit('numberOfConections', {
      data: clientsData,
    });
  }
  sendPlaylist({ songs, currentSong }) {
    Winston.info('ClientControls -> sendPlaylist');
    io.emit('playlist', {
      data: {
        songs,
        currentSong,
      },
    });
  }
  sendActivityStream(message) {
    Winston.info('ClientControls -> sendActivityStream', message);
    io.emit('activityStream', {
      data: {
        type: 'normal',
        message,
      },
    });
  }
}


module.exports = ClientControls;

