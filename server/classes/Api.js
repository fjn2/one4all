const express = require('express');
const configuration = require('../../configuration.json');
const Winston = require('winston');

const app = express();
const port = configuration.port;

class Api {
  constructor(server) {
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });

    app.get('/', (req, res) => {
      res.send('Hello World');
    });

    app.get('/serverTime', (req, res) => {
      res.send({
        time: new Date().getTime(),
      });
    });

    app.get('/currentSong', (req, res) => {
      res.send({
        song: server.getCurrentSong(),
      });
    });

    app.get('/songList', (req, res) => {
      res.send({
        songs: server.getSongList(),
      });
    });

    app.get('/songTime', (req, res) => {
      res.send({
        time: server.getSeverTime(),
      });
    });
    Winston.info('Api -> Application starting at port ', port);
    app.listen(port);
  }
}

module.exports = Api;
