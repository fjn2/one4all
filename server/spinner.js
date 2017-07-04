require('./configuration/Winston');

const Winston = require('winston');
const cp = require('child_process');
const path = require('path');
const http = require('http');

const configuration = require('../configuration.json');
const serverFile = path.join(__dirname, './index.js');
const rooms = {};
const firstPort = 55535;
const lastPort = 65535;
let actualPort = firstPort;
const pm2 = require('pm2');


const app = http.createServer(function (req, res) {
  res.end('Running');
});
const io = require('socket.io')(app);

app.listen(configuration.spinnerPort);
Winston.info('SERVER LISTENING AT PORT ', configuration.spinnerPort);

function getPort() {
  actualPort += 2;
  if (actualPort > lastPort - 2) {
    actualPort = firstPort;
  }
  return actualPort;
}

function createRoom(id, callback) {
  const port = getPort();
  const url = `http://${configuration.host}:${port}`;
  Winston.info('createRoom -> PORT', port);

  pm2.connect(function(err) {
      if (err) {
        Winston.error(err);
        process.exit(2);
      }
      pm2.start({
        script: 'server/index.js',
        name: `room${port}`,
        exec_mode: 'cluster',
        instances: 1,
        env: {
          PORT: port,
        },
      }, function(err, apps) {
        if (apps) {
          if (err) throw err;
          rooms[id] = {
            url,
            port,
            proc: apps[0],
          };
          Winston.info('Added new room', port);
          callback(rooms[id]);
        } else {
          Winston.error('The room was not created propperly', port);
        }
        pm2.disconnect();
      });
  });
}

io.on('connection', function (socket) {
  socket.on('room', function ({ id }) {
    // Connect to existing room.
    const room = rooms[id];

    if (room) {
      Winston.info('CONNECT to existing room:', rooms[id].url);
      pm2.connect(function(err) {
        pm2.list((err, apps) => {
          if (err) throw err;
          let isRunning = false;
          apps.forEach((app) => {
            if(app.pm_id === rooms[id].proc.pm_id && app.monit.memory !== 0) {
              isRunning = true;
            }
          });
          if (!isRunning) {
            Winston.info('The room', id, 'was down, re-starting...');
            pm2.restart(rooms[id].proc.pm_id);
          }

          // pm2.disconnect();
          socket.emit('room', { url: room.url });
        });
      });
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

