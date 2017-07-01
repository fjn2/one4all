const express = require('express');
const cors = require('cors');

const app = express();
const port = 2001;

app.use(cors());
app.use('/dist', express.static(`${__dirname}/../node_modules/socket.io-client/dist/`));
app.use('/dist', express.static(`${__dirname}/../node_modules/material-components-web/dist/`));
app.use('/room/:roomId', express.static(__dirname));
app.use(express.static(__dirname));

app.listen(port);
