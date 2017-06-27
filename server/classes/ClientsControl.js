const Winston = require('winston');
const configuration = require('../../configuration.json');
const express = require('express');
const path = require('path');
const fs = require('fs');

const http = require('http');
const app = http.createServer(function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  if (~req.url.indexOf('resources')) {
    const extname = path.extname(req.url);
    let contentType = 'text/html';
    switch (extname) {
      case '.js':
        contentType = 'text/javascript';
        break;
      case '.css':
        contentType = 'text/css';
        break;
      case '.json':
        contentType = 'application/json';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.jpg':
        contentType = 'image/jpg';
        break;
      case '.wav':
        contentType = 'audio/wav';
        break;
      case '.mp3':
        contentType = 'audio/mpeg';
        break;
    }

    fs.readFile(`.${req.url}`, (error, content) => {
      if (error) {
        if (error.code === 'ENOENT') {
          res.setHeader('Content-Type', contentType);
          res.statusCode = 200;
          res.end(error.toString(), 'utf-8');
        } else {
          res.statusCode = 500;
          res.end(`Sorry, check with the site admin for error: ${error.code} ..\n`);
          res.end();
        }
      } else {
        res.setHeader('Content-Type', contentType);
        res.statusCode = 200;
        res.end(content, 'utf-8');
      }
    });
  } else {
    res.end('Hello World');
  }
});

const io = require('socket.io').listen(app);

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
    app.listen(configuration.port);
  }
  addClient(socket) {
    Winston.verbose('ClientControls -> addClient');
    this.clients.push({
      id: socket.id,
      socket,
    });
    this.sendNumberOfConections();
  }
  removeClient(socket) {
    Winston.verbose('ClientControls -> removeClient');
    for (var i = 0; i < this.clients.length; i++) {
      if (this.clients[i].socket === socket) {
        this.clients.splice(i, 1);
        break;
      }
    }

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
    const clientsData = this.clients.map(client => {
      return {
        id: client.socket.id,
        ip: client.socket.handshake.address,
        username: client.username,
        detour: client.detour,
        playOffset: client.playOffset,
        playDiff: client.playDiff,
        isPlaying: client.isPlaying,
      };
    });

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
  setUserSatus({ id, username, detour, playOffset, playDiff, isPlaying }) {
    Winston.info('ClientControls -> setUserSatus', id);
    for (let i = 0; i < this.clients.length; i += 1) {
      if (this.clients[i].id === id) {
        this.clients[i].username = username;
        this.clients[i].detour = detour;
        this.clients[i].playOffset = playOffset;
        this.clients[i].playDiff = playDiff;
        this.clients[i].isPlaying = isPlaying;
        break;
      }
    }
    this.sendNumberOfConections();
  }
}


module.exports = ClientControls;

