var ac;

var canvas;
var canvasWidth;
var canvasHeight;
var ctx;
var canvasData;
var zeroHeight = 100

let hiperFoo = []

setTimeout(() => {
	// initialize audio control
	ac = document.createElement("AUDIO");
	ac.controls = true;
	ac.src = "resources/test.mp3";
	document.body.appendChild(ac)

	// get elements from DOM
	var serverTimeEl = document.getElementById('serverTimeEl')
	var playerTimeEl = document.getElementById('playerTimeEl')
	var adjustmentFactorEl = document.getElementById('adjustmentFactorEl')
	var tuneEl = document.getElementById('tuneEl')
	var differenceEl = document.getElementById('differenceEl')

	let firstTime = true



	setInterval(() => {
		let initialRequestTime = new Date()
		var resp = getCurrentServerData()
		let latencyTime = (new Date() - initialRequestTime) / 1000 / 2; // only the time from the server to the client

		resp.time += latencyTime;

		hiperFoo.push({
			serverTime: resp.time,
			at: new Date()
		});

		let adjustmentFactor = 0;
		let adjustmentFactorv2 = 0;
		if (!firstTime) {
			adjustmentFactor = getAdjustmentFactor(ac.currentTime - resp.time - (tuneEl.value * 1 / 100))
			adjustmentFactorv2 = getAdjustmentFactorV2(resp.time)
			adjustmentFactor = 0
		}


		resp.time = (new Date() - adjustmentFactorv2) / 1000

		//console.log('diff playbackRate', ac.playbackRate, latencyTime, adjustmentFactorv2, resp.time)

		// show debug infromation
		serverTimeEl.innerHTML = resp.time
		playerTimeEl.innerHTML = ac.currentTime
		differenceEl.innerHTML = ac.currentTime - resp.time
		adjustmentFactorEl.innerHTML = adjustmentFactor


		if (ac.currentTime === 0) {
			ac.currentTime = 0.01
		}

		if(Math.abs(ac.currentTime - resp.time) > 1) {
			ac.currentTime = resp.time
		} else {





			//ac.playbackRate = resp.time / ac.currentTime
			//ac.playbackRate = (resp.time + adjustmentFactor - ac.currentTime) + 1 + (tuneEl.value * 1 / 100)
			//ac.playbackRate += (resp.time + adjustmentFactor - ac.currentTime)>0?.01:-.01
			//ac.playbackRate = (resp.time + adjustmentFactor - ac.currentTime)>0?1.01:0.99
			//ac.playbackRate = (acum / hiperFoo.length) / (ac.currentTime - (tuneEl.value * 1 / 10))
			// if (ac.playbackRate < 0) {
	 		// 	ac.currentTime = resp.time
	 		// 	ac.playbackRate = 1
	 		// }
		}

		if(firstTime) {
			setInterval(()=> {
				let acum = 0
				let foo2 = 0
				hiperFoo.forEach((item)=>{
					acum += (new Date() - item.at) / 1000 + item.serverTime
					foo2 += (new Date() - item.at) / 1000 - item.serverTime
				})
				ac.playbackRate = ((acum / hiperFoo.length ) - ac.currentTime) + 1 + (tuneEl.value * 1 / 100)
				console.log(foo2 / hiperFoo.length )
			},100)

		}

		var acum = 0;
		hiperFoo.forEach((item)=>{
			acum += (new Date() - item.at) / 1000 + item.serverTime
		})
		var diff2 = ac.currentTime / (acum / hiperFoo.length) / 10
		var diff3 = ac.currentTime / diff2 / 100
		drawGraph(ac.currentTime - resp.time , adjustmentFactor, diff2, diff3)

		ac.play();
		firstTime = false
	}, 1000)


	////////////////////////////////////////////////////
	///////////////// GRAPH ////////////////////////////
	////////////////////////////////////////////////////

	canvas = document.getElementById("graphCanvas");
	canvasWidth = canvas.width;
	canvasHeight = canvas.height;
	ctx = canvas.getContext("2d");
	drawInit();
	canvasData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);

})


function getCurrentServerData() {
    var xmlHttp = new XMLHttpRequest();
    var url = 'http://localhost:2000/current';
    var url = 'http://10.2.1.107:2000/current?ct='+ac.currentTime;
    //var url = 'http://192.168.0.101:2000/current?ct='+ac.currentTime;
    xmlHttp.open( 'GET', url, false ); // false for synchronous request
    xmlHttp.send( null );
    return JSON.parse(xmlHttp.responseText);
}

var samplingCount = 0;
var samplingAcum = 0;
var sampling = [];
function getAdjustmentFactor(diff, adjustmentFactor) {
	// this is to avoid the problem when the song changes
	if (Math.abs(diff) < 10) {
		samplingAcum += diff;
		samplingCount++
	}

	return samplingAcum / samplingCount * -1
}
function getAdjustmentFactorV2(serverTime) {
	let initialTime = new Date((new Date()).getTime() - serverTime * 1000)
	// if there is too many difference between one initial time and other, I suppouse, the track has change

	if(sampling.length && Math.abs(sampling[sampling.length -1].initialTime - initialTime) > 1000) {
		sampling.length = 0
	}
	sampling.push({
		at: new Date(),
		initialTime
	})
	let acum = 0
	sampling.forEach((item)=>{
		acum += item.initialTime.getTime()
	})
	// returns the start time of the track
	return acum / sampling.length
}

function drawInit() {
	ctx.beginPath();
	ctx.moveTo(0,zeroHeight + 1);
	ctx.lineTo(canvasWidth,zeroHeight + 1);
	ctx.stroke();
}

function drawGraph(diff, adjustmentFactor, diff2, diff3) {
	let diffC = Math.round(diff * 100)
	var diff2C = Math.round(diff2 * 100)
	var diff3C = Math.round(diff3 * 100)
	let adjustmentFactorC = Math.round(adjustmentFactor * 100)

	drawPixel(samplingCount, diff2C + zeroHeight, 0, 0, 255)
	drawPixel(samplingCount, diff3C + zeroHeight, 0, 255, 255)


	if (diffC === adjustmentFactorC) {
		drawPixel(samplingCount, diffC + zeroHeight, 255, 255, 0)
	} else {
		drawPixel(samplingCount, diffC + zeroHeight, 255, 0, 0)
		drawPixel(samplingCount, adjustmentFactorC + zeroHeight, 0, 255, 0)
	}

	ctx.putImageData(canvasData, 0, 0);
}

function drawPixel (x, y, r = 0, g = 0, b = 0) {
    var index = (x + y * canvasWidth) * 4;

    canvasData.data[index + 0] = r;
    canvasData.data[index + 1] = g;
    canvasData.data[index + 2] = b;
    canvasData.data[index + 3] = 255;
}

