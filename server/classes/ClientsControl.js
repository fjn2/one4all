const Winston = require('winston');
const configuration = require('../../configuration.json');
const express = require('express');
const path = require('path');
const fs = require('fs');
const ms = require('mediaserver');

const http = require('http');
const app = http.createServer(function(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  //   res.header("Access-Control-Allow-Origin", "*");
  //   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

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
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(error.toString(), 'utf-8');
        } else {
          res.writeHead(500);
          res.end(`Sorry, check with the site admin for error: ${error.code} ..\n`);
          res.end();
        }
      } else {
        // res.writeHead(200, { 'Content-Type': contentType });
        // res.end(content, 'utf-8');
        ms.pipe(req, res, `.${req.url}`);
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
          io.emit(`${key}-S`, {
            guid: data.guid,
            data: clientActions[key](data.data),
          });
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
    });
    app.listen(configuration.port);
  }
  addClient(client) {
    Winston.verbose('ClientControls -> addClient');
    this.clients.push(client);
  }
  removeClient(client) {
    Winston.verbose('ClientControls -> removeClient');
    this.clients.splice(this.clients.indexOf(client), 1);
  }
  setVolume(value) {
    Winston.verbose('ClientControls -> setVolume');
  }
  startPlay() {
    Winston.info(`ClientControls -> startPlay`);
    io.emit('startPlay');
  }
  sendPlayList({ songs, currentSong }) {
    Winston.info(`ClientControls -> sendPlayList`);
    io.emit('playList', {
      data: {
        songs,
        currentSong,
      },
    });
  }
}


module.exports = ClientControls;

