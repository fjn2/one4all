const Winston = require('winston');
const configuration = require('../../configuration.json');
const io = require('socket.io')(configuration.port + 2);


class ClientControls {
  constructor() {
    Winston.verbose('ClientControls -> constructor');
    this.clients = [];

    io.on('connection', (socket) => {
      this.addClient(socket);
    });
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

