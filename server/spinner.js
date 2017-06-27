const Winston = require('winston');
const cp = require('child_process');
const path = require('path');
const app = require('http').createServer(onListen);
const io = require('socket.io')(app);
const configuration = require('../configuration.json');
const serverFile = path.join(__dirname, './index.js');
const rooms = {};
const usedPorts = {};
const firstPort = 55535;
const lastPort = 65535;
app.listen(configuration.spinnerPort);

function onListen(req, res) {
  Winston.info('SERVER LISTENING');
}

function getPort() {
  if (!Object.keys(usedPorts).length) return firstPort;

  for (let port = firstPort; port <= lastPort; ++port) {
    if (!usedPorts[port]) return port;
  }

  return false;
}

function createRoom(id, callback) {
  const port = getPort();
  const proc = cp.spawn('node', [serverFile, `--port=${port}`]);
  const url = `http://localhost:${port}`;
  Winston.info('Created child process on port', port);

  rooms[id] = {
    url,
    port,
    proc,
  };

  // Free port when process closes.
  proc.on('close', () => {
    usedPorts[port] = false;
  });

  proc.stdout.pipe(process.stdout);

  usedPorts[port] = true;

  // TODO: Get notified when process finishes starting!
  // Wait for process to finish starting.
  setTimeout(() => {
    callback(rooms[id]);
  }, 4000);
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

