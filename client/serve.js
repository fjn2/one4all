var express = require('express')
var app = express()
var port = 2001;
console.log(__dirname + '/../node_modules/socket.io-client/dist/socket.io.js')
app.use('/scripts', express.static(__dirname + '/../node_modules/socket.io-client/dist/'));
app.use(express.static('.'))

app.listen(port)