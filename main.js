// constants
const fieldWidth  = 652; // inches
const fieldHeight = 324; // inches

// initialize canvas & context
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

const pixelRatio = window.devicePixelRatio || 1;
const width  = canvas.clientWidth;
const height = width * fieldHeight/fieldWidth;
canvas.width  = width*pixelRatio;
canvas.height = height*pixelRatio;
const scale = width/fieldWidth;
ctx.scale(pixelRatio*scale, pixelRatio*scale);

// state & related functions

var waypoints = [];

function addWaypoint(x, y) {
    waypoints.push({x, y});
    drawWaypoints();
}

function simplifyPath() {
    waypoints = simplify(waypoints, 10, true);
    drawAll();
}

// graphics functions

function screenToField(x, y) {
    return [x/scale, y/scale];
}
function fieldToScreen(x, y) {
    return [x*scale, y*scale];
}
function drawCircle(x, y, r, color, ct) {
    ct = ct || ctx;
    ct.fillStyle = color;
    ct.beginPath();
    ct.arc(x, y, r, -9, 9);
    ct.fill();
}
function createBuffer() {
    var cvs = document.createElement("canvas");
    cvs.width  = canvas.width;
    cvs.height = canvas.height;
    var ctx = cvs.getContext("2d");
    ctx.scale(pixelRatio*scale, pixelRatio*scale);
    return {canvas:cvs, ctx};
}
function clearBuffer(buf) {
    buf.ctx.save();
    buf.ctx.setTransform(1, 0, 0, 1, 0, 0);
    buf.ctx.clearRect(0, 0, buf.canvas.width, buf.canvas.height);
    buf.ctx.restore();
}
function drawBuffer(buf) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(buf.canvas, 0, 0);
    ctx.restore();
}

function drawBackground() {
    ctx.fillStyle = "#ddd";
    ctx.fillRect(0, 0, fieldWidth, fieldHeight);
}

var drawIndex = 0;
var dotBuf = createBuffer(), lineBuf = createBuffer();
lineBuf.ctx.strokeStyle = "#009";
lineBuf.ctx.lineWidth = 3;
lineBuf.ctx.lineJoin = "bevel";
function drawWaypoints() {
    if (waypoints.length < drawIndex) {
        // redraw all waypoints
        clearBuffer(lineBuf);
        clearBuffer(dotBuf);
        drawIndex = 0;
    }
    
    lineBuf.ctx.beginPath();
    if (drawIndex != 0) {
        var {x, y} = waypoints[drawIndex-1];
        lineBuf.ctx.moveTo(x, y);
    }
    for (; drawIndex < waypoints.length; drawIndex++) {
        var {x, y} = waypoints[drawIndex];
        lineBuf.ctx.lineTo(x, y);
        drawCircle(x, y, 8, "#00f", dotBuf.ctx);
    }
    lineBuf.ctx.stroke();
    
    // draw the buffers to the main canvas
    drawBuffer(lineBuf);
    drawBuffer(dotBuf);
}

function drawAll() {
    drawBackground();
    drawWaypoints();
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
    [x, y] = screenToField(x, y);
    addWaypoint(x, y);
}
var simpIndex = 0;
function touchMove(x, y, id) {
    [x, y] = screenToField(x, y);
    addWaypoint(x, y);
    // if (waypoints.length-simpIndex > 20) {
    //     console.log("Simplifying");
    //     simpIndex = waypoints.length-5;
    //     waypoints = simplify(waypoints.splice(0, simpIndex), 10, true).concat(waypoints);
    //     drawAll();
    // }
}
function touchEnd(x, y, id) {
    [x, y] = screenToField(x, y);
    simplifyPath();
}