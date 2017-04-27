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
ac.play();
document.body.appendChild(ac)


var sampler = []
var sampleCount = 0;
var initialTime = new Date();
var acumServerTime = 0
var highestServerTime = new Date();
var lowestServerTime = new Date();

setInterval(function() {
	if (ac.readyState !== 4) {
		return
	}
	sampleCount++
	let initialRequestTime = new Date()
	getCurrentServerData((response) => {
		var resp = JSON.parse(response.target.response)

		let latencyTime = (new Date() - initialRequestTime) / 1000 / 2; // only the time from the server to the client

		//resp.time += latencyTime;

		acumServerTime += (new Date() - initialTime) / 1000 + resp.time

		sampler.push({
			time: resp.time,
			at: new Date()
		})
		let avgAcumPower = 0;
		sampler.forEach((sample) => {
			avgAcumPower += (new Date() - sample.at) / 1000 + sample.time
		})


		// audio player
		if(Math.abs(ac.currentTime - resp.time) > 30) {
			ac.currentTime = resp.time
			console.log('AJUST!')
		} else {
			ac.playbackRate = 1 + (avgAcumPower / sampler.length) - ac.currentTime
		}



		// server time
		drawPixel(zeroWidth + sampleCount, zeroHeight - Math.round(resp.time * 10), 255)

		// local reference time
		drawPixel(zeroWidth + sampleCount, zeroHeight - Math.round(((new Date() - initialTime) / 1000) * 10 ), 0, 255)

		// avg server time
		//drawPixel(zeroWidth + sampleCount, zeroHeight - Math.round((acumServerTime / sampleCount) * 2 ), 0, 0, 255)

		// avg server time ( with extra power)
		drawPixel(zeroWidth + sampleCount, zeroHeight - Math.round((avgAcumPower / sampler.length) * 10 ), 150, 0, 150)

		// player time
		drawPixel(zeroWidth + sampleCount, zeroHeight - Math.round((ac.currentTime) * 10 ), 100, 100, 100)

		ctx.putImageData(canvasData, 0, 0);
	})

}, 100)


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



var socket = io('http://192.168.0.101:2002');
socket.on('serverTime', function (data) {
	console.log(data);
});



