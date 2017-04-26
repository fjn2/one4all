////////////////////////////////////////////////////
///////////////// GLOBALS //////////////////////////
////////////////////////////////////////////////////

var express = require('express')
var app = express()
var path = require('path');
var port = 2000;


////////////////////////////////////////////////////
/////////// APPLICATION CONFIGURATION //////////////
////////////////////////////////////////////////////


class Reproductor {
	constructor() {
		this.initialTime = new Date()
		this.startSong()
	}
	getTime() {
		return (new Date() - this.initialTime) / 1000
	}
	startSong() {
		console.log('startSong')
		// duraton mario intro song
		this.songDuration = 189.779592 * 1000
		this.initialTime = new Date()
		// to reproduce the next song
		setTimeout(() => this.startSong(), this.songDuration)
	}
}

var reproductor = new Reproductor()
var clients = {}

setInterval(function () {
	console.log('Server time: ', reproductor.getTime())
	for (var i = 0; i < Object.keys(clients).length; i++) {
		var key = Object.keys(clients)[i]

		var actualClientTime  = clients[key].currentTime * 1 + ((new Date() - clients[key].at) / 1000)


		console.log(key, 'diff: ' + 'FOO' + ' seg ')
	}
},1000)



////////////////////////////////////////////////////
/////////// SERVER CONFIGURATION ///////////////////
////////////////////////////////////////////////////


app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/', function (req, res) {
  res.send('Hello World')
})
app.get('/current', function (req, res) {
	//console.log('current', req.connection.remoteAddress, req.query.ct)
	if(!clients[req.connection.remoteAddress]) {
		clients[req.connection.remoteAddress] = {}
	}
	clients[req.connection.remoteAddress].currentTime = req.query.ct
	clients[req.connection.remoteAddress].at = new Date();

	//temporal
	//setTimeout(function() {
		let time = reproductor.getTime()
	//	setTimeout(function() {
			res.send({
				time: time
			})
	//	}, Math.random() * 500)
	//}, Math.random() * 500)
})

app.listen(port)