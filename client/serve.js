const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const compression = require('compression');
const ejs = require('ejs');
const Guid = require('guid');

const app = express();
const port = 2001;

app.use(cookieParser());

app.get('/', function(req, res, next) {
  if(!req.cookies.user) {
    console.log('Creating new guid for the user');
    res.cookie('user', Guid.raw(), {
      expires: new Date('01-01-2100')
    });
  } else {
    console.log('Using an existing guid for the user');
  }
  next();
});

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
