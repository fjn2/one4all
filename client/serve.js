const express = require('express');
const cors = require('cors');
const compression = require('compression');
const ejs = require('ejs');

const app = express();
const port = 2001;

app.set('view engine', 'html');
app.engine('html', ejs.renderFile);
app.set('views', __dirname);
app.use(compression());

app.use(cors());
app.use('/dist', express.static(`${__dirname}/../node_modules/socket.io-client/dist/`));
app.use('/dist', express.static(`${__dirname}/../node_modules/material-components-web/dist/`));
app.use('/room/:roomId', express.static(__dirname));

// Set routes.
app.get('/room.html', (req, res) => {
  res.render('room');
});

app.use(express.static(__dirname));

// Start app.
app.listen(port);
