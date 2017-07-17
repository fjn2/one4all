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
Winston.info('SPINNER LISTENING AT PORT ', configuration.spinnerPort);

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
        return;
      }
      pm2.start({
        script: 'server/index.js',
        name: `room${port}`,
        exec_mode: 'cluster',
        instances: 1,
        env: {
          PORT: port,
          args: id // room name
        },
      }, function(err, apps) {
        if (err) throw err;
        if (apps) {
          if (!rooms[id]) {
            rooms[id] = {
              url,
              port,
              proc: apps[0]
            };
            Winston.info('Added new room', id, 'in the port', port, 'process id =', apps[0].pm_id);
          } else {
            Winston.warn('Condition race detected and saved. The spinner tries to create two times the same room', id, 'returning the port', rooms[id].port);
          }
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
    const sanitizedId = id ? id.toLowerCase() : '';
    const room = rooms[sanitizedId];

    // Create new room.
    if (!room) {
      Winston.info('CREATE room:', sanitizedId);
      createRoom(sanitizedId, (room) => {
        socket.emit('room', { url: room.url });
      });
      return;
    }

    // Existing room.
    Winston.info('CONNECT to existing room:', room.url);
    pm2.connect(function(err) {
      pm2.list((err, apps) => {
        if (err) throw err;
        let isRunning = false;
        apps.forEach((app) => {
          if(app.pm_id === room.proc.pm_id && app.monit.memory !== 0) {
            isRunning = true;
          }
        });
        if (!isRunning) {
          Winston.info(`The room '${sanitizedId}' was down, re-starting...`, 'process id:', room.proc.pm_id);
          pm2.restart(room.proc.pm_id, (err, apps) => {
            if (err) throw err;
            socket.emit('room', { url: room.url });
            pm2.disconnect();
          });
        } else {
          socket.emit('room', { url: room.url });
          pm2.disconnect();
        }
      });
    });
  });
});


process.on('uncaughtException', function(err) {
  Winston.error('Caught exception:', err);
});

