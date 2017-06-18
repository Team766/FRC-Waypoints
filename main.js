// initialize canvas & context
var canvas = document.querySelector("canvas");
var ctx = canvas.getContext("2d");

var ratio = window.devicePixelRatio || 1;
var width  = canvas.clientWidth;
var height = width * 5/9;
canvas.width  = width*ratio;
canvas.height = height*ratio;
ctx.scale(ratio, ratio);

// graphics functions

function drawBackground() {
    ctx.fillStyle = "#ddd";
    ctx.fillRect(0, 0, width, height);
}

drawBackground();

// input (mouse/touch)
function initInputListeners() {
    function onStart(x, y, id) { touchStart(x-canvas.offsetLeft, y-canvas.offsetTop, id) }
    function onMove (x, y, id) { touchMove (x-canvas.offsetLeft, y-canvas.offsetTop, id) }
    function onEnd  (x, y, id) { touchEnd  (x-canvas.offsetLeft, y-canvas.offsetTop, id) }
    canvas.addEventListener("mousedown", function(event) {
        event = event||window.event;
        if (event.buttons != 1) return;
        event.preventDefault();
        onStart(event.pageX, event.pageY, 0);
    }, false);
    canvas.addEventListener("mousemove", function(event) {
        event = event||window.event;
        if (event.buttons != 1) return;
        event.preventDefault();
        onMove(event.pageX, event.pageY, 0);
    }, false);
    canvas.addEventListener("mouseup", function(event) {
        event = event||window.event;
        event.preventDefault();
        onEnd(event.pageX, event.pageY, 0);
    }, false);
    canvas.addEventListener("touchstart", function(event) {
        event.preventDefault();
        var ts = event.changedTouches;
        for (var i=0;i<ts.length;i++)
            onStart(ts[i].pageX, ts[i].pageY, ts[i].identifier);
    }, false);
    canvas.addEventListener("touchmove", function(event) {
        event.preventDefault();
        var ts = event.changedTouches;
        for (var i=0;i<ts.length;i++)
            onMove(ts[i].pageX, ts[i].pageY, ts[i].identifier);
    }, false);
    function tEnd(event) {
        event.preventDefault();
        var ts = event.changedTouches;
        for (var i=0;i<ts.length;i++)
            onEnd(ts[i].pageX, ts[i].pageY, ts[i].identifier);
    }
    canvas.addEventListener("touchend", tEnd, false);
    canvas.addEventListener("touchcancel", tEnd, false);
}
initInputListeners();

function touchStart(x, y, id) {
    ctx.fillStyle = "green";
    ctx.fillRect(x, y, 10, 10);
}
function touchMove(x, y, id) {
    ctx.fillStyle = "blue";
    ctx.fillRect(x, y, 10, 10);
}
function touchEnd(x, y, id) {
    ctx.fillStyle = "red";
    ctx.fillRect(x, y, 10, 10);
}