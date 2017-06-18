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
function drawCircle(x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, -9, 9);
    ctx.fill();
}
function createBuffer() {
    var cvs = document.createElement("canvas");
    cvs.width = canvas.width;
    
}

function drawBackground() {
    ctx.fillStyle = "#ddd";
    ctx.fillRect(0, 0, fieldWidth, fieldHeight);
}

var drawnIndex = Infinity;
var dotBuf = createBuffer(), lineBuf = createBuffer();
function drawWaypoints() {
    ctx.strokeStyle = "#009";
    ctx.lineWidth = 3;
    ctx.lineJoin = "bevel";
    ctx.beginPath();
    for (var i in waypoints) {
        var {x, y} = waypoints[i];
        if (i==0) ctx.moveTo(x, y);
        else      ctx.lineTo(x, y);
    }
    ctx.stroke();
    for (var {x, y} of waypoints) {
        drawCircle(x, y, 8, "#00f");
    }
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