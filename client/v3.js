var serverTimeEl = document.getElementById('serverTimeEl')
var playerTimeEl = document.getElementById('playerTimeEl')
var adjustmentFactorEl = document.getElementById('adjustmentFactorEl')
var tuneEl = document.getElementById('tuneEl')
var differenceEl = document.getElementById('differenceEl')

var canvas = document.getElementById("graphCanvas");
var canvasWidth = canvas.width;
var canvasHeight = canvas.height;
var ctx = canvas.getContext("2d");
var zeroHeight = 1190;
var zeroWidth = 10;

drawInit();

var canvasData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);

// initialize audio control
ac = document.createElement("AUDIO");
ac.controls = true;
ac.src = "resources/test.mp3";

ac.onloadeddata = startReproduction
document.body.appendChild(ac)

var socket = io('http://192.168.0.101:2002');

var sampler = [];
var sampleCount;
var initialTime;
var lastServerTime;
function startReproduction() {
	console.log('startReproduction', new Date())


	sampleCount = 0;

	socket.on('serverTime', serverTime)
	socket.on('startSong', startSong)
}


function serverTime (resp) {
	if (sampler.length === 0) {
		initialTime = new Date();
	}
	lastServerTime = resp.time
	sampler.push({
		time: resp.time,
		at: new Date()
	})
	if (sampler.length > 30) {
		sampler.shift()
	}

};

setInterval(()=> {
	if (initialTime) {
		sampleCount++
		let avgAcumPower = 0;
		var actualTime = new Date()
		sampler.forEach((sample) => {
			avgAcumPower += (actualTime - sample.at) / 1000 + sample.time
		})

		let superAvg = (avgAcumPower / sampler.length)
		if (Number.isNaN(superAvg)) {
			return
		}
		// audio player
		if(Math.abs(ac.currentTime - superAvg) > 10) {
			console.log('AJUST!1', (new Date()).getTime(), Math.round((superAvg - ac.currentTime) % 1 * 100), superAvg)
			ac.currentTime = superAvg
			// while ((new Date().getTime() + '').substr(-3) * 1 + Math.round((superAvg - ac.currentTime) % 1 * 100) > 100) {

			// }
			ac.play();

			console.log('AJUST!2', (new Date()).getTime())
		}
		ac.playbackRate = 1 + superAvg - ac.currentTime

		console.log(ac.playbackRate)
		let scaleFactor = 10
		// server time
		drawPixel(zeroWidth + sampleCount, zeroHeight - Math.round(lastServerTime * scaleFactor), 255)

		// local reference time
		drawPixel(zeroWidth + sampleCount, zeroHeight - Math.round(((actualTime - initialTime) / 1000) * scaleFactor ), 0, 255)

		// avg server time ( with extra power)
		drawPixel(zeroWidth + sampleCount, zeroHeight - Math.round(superAvg * scaleFactor ), 150, 0, 150)

		// player time
		drawPixel(zeroWidth + sampleCount, zeroHeight - Math.round((ac.currentTime) * scaleFactor ), 100, 100, 100)

		ctx.putImageData(canvasData, 0, 0);
	}
},100)


function startSong() {
	sampleCount = 0
	sampler.length = 0
	ac.currentTime = 0

	if (ac.paused) {
		ac.play();
	}
}

function drawInit() {
	// x axis
	ctx.beginPath();
	ctx.moveTo(0,zeroHeight + 1);
	ctx.lineTo(canvasWidth,zeroHeight + 1);
	ctx.stroke();
	// y axis
	ctx.beginPath();
	ctx.moveTo(zeroWidth, 0);
	ctx.lineTo(zeroWidth, canvasHeight);
	ctx.stroke();
}
function drawPixel (x, y, r = 0, g = 0, b = 0) {
    var index = (x + y * canvasWidth) * 4;

    canvasData.data[index + 0] = r;
    canvasData.data[index + 1] = g;
    canvasData.data[index + 2] = b;
    canvasData.data[index + 3] = 255;
}