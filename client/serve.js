var express = require('express')
var app = express()
var port = 2001;


app.use(express.static('.'))

app.listen(port)