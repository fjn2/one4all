require('./configuration/Winston');

const Winston = require('winston');
const cp = require('child_process');
const path = require('path');
const http = require('http');

const configuration = require('../configuration.json');
const serverFile = path.join(__dirname, './index.js');
const rooms = {};
const usedPorts = {};
const firstPort = 55535;
const lastPort = 65535;
const pm2 = require('pm2');


const app = http.createServer(function (req, res) {
  res.end('Running');
});
const io = require('socket.io')(app);

app.listen(configuration.spinnerPort);
Winston.info('SERVER LISTENING AT PORT ', configuration.spinnerPort);

function getPort() {
  if (!Object.keys(usedPorts).length) return firstPort;

  for (let port = firstPort; port <= lastPort; ++port) {
    if (!usedPorts[port]) return port;
  }

  return false;
}

function createRoom(id, callback) {
  const port = getPort();
  const url = `http://${configuration.host}:${port}`;
  Winston.info('Created child process on port', port);

  usedPorts[port] = true;

  pm2.connect(function(err) {
    if (err) {
      console.error(err);
      process.exit(2);
    }

    pm2.start({
      script: 'server/index.js',
      name: `room${port}`,
      exec_mode: 'cluster',
      instances: 1,
      max_memory_restart: '100M',
      env: {
        "PORT": port,
      }
    }, function(err, apps) {
      pm2.disconnect();
      if (apps) {
        if (err) throw err;
        rooms[id] = {
          url,
          port,
          proc: apps,
        };
        Winston.info('Added new room', port);
      } else {
        Winston.error('The room was not created propperly', port);
      }
    });
  });
}

io.on('connection', function (socket) {
  socket.on('room', function ({ id }) {
    // Connect to existing room.
    const room = rooms[id];
    if (room) {
      Winston.info('CONNECT to existing room:', id);
      socket.emit('room', { url: room.url });
      return;
    }

    // Create new room.
    Winston.info('CREATE room:', id);
    createRoom(id, (room) => {
      socket.emit('room', { url: room.url });
    });
  });
});


process.on('uncaughtException', function(err) {
  Winston.error(`Caught exception: ${err}`);
});

