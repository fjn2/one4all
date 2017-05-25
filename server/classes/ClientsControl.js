const Winston = require('winston');
const configuration = require('../../configuration.json');
const express = require('express');

const http = require('http');
const app = http.createServer(function(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  //   res.header("Access-Control-Allow-Origin", "*");
  //   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.end('Hello World');
});

const io = require('socket.io').listen(app);

class ClientControls {
  constructor() {
    Winston.verbose('ClientControls -> constructor');
    this.clients = [];

    // Emit welcome message on connection
    io.on('connection', (socket) => {
      Winston.info('ClientControls -> new connection');
      this.clients.push(socket);
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
}


module.exports = ClientControls;

