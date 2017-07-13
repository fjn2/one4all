const Winston = require('winston');
const configuration = require('../configuration.json');
const express = require('express');
const path = require('path');
const cors = require('cors');

Winston.info('Starting resource manager at port', configuration.resourceManagerPort);

const app = express();
const resourcesPath = path.join(__dirname, '../resources');

app.use(cors());
app.use('/resources', express.static(resourcesPath));

const server = require('http').createServer(app);

server.listen(configuration.resourceManagerPort);

process.on('uncaughtException', function(err) {
  Winston.error(`Caught exception: ${err}`);
});
