// constants
const fieldWidth  = 652; // inches
const fieldHeight = 324; // inches

// initialize canvas & context
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

const pixelRatio = window.devicePixelRatio || 1;
var scale;
function onResize() {
    console.log("onResize()");
    const width  = canvas.clientWidth;
    const height = width * fieldHeight/fieldWidth;
    canvas.width  = width*pixelRatio;
    canvas.height = height*pixelRatio;
    scale = width/fieldWidth;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(pixelRatio*scale, pixelRatio*scale);
    
    dotBuf  = createBuffer();
    lineBuf = createBuffer();
    lineBuf.ctx.strokeStyle = LINE_COLOR;
    lineBuf.ctx.lineWidth = 3;
    editBuf = createBuffer();
    editBuf.ctx.strokeStyle = LINE_COLOR;
    editBuf.ctx.lineWidth = 3;
    
    drawIndex = 0;
    drawAll();
}
window.addEventListener("load", function() {
    // somehow the scale is slightly off after the first onResize()
    onResize();
    onResize();
});

// state & related functions

var waypoints = [];
var editPoints = [];

function addEditPoint(x, y) {
    editPoints.push({x, y});
    if (editPoints.length > 1) {
        editBuf.ctx.beginPath();
        var {x:x0, y:y0} = editPoints[editPoints.length-2];
        editBuf.ctx.moveTo(x0, y0);
        editBuf.ctx.lineTo(x, y);
        editBuf.ctx.stroke();
    }
    drawAll();
}

function addWaypoint(x, y) {
    waypoints.push({x, y});
    updateSegments();
    drawAll();
    updatePathNeeders();
}

function clearWaypoints() {
    stopPP();
    waypoints = [];
    updateSegments();
    clearBuffer(trailBuf);
    drawAll();
    updatePathNeeders();
}

function simplifyPath() {
    waypoints = simplify(waypoints, 5, true);
    updateSegments();
    drawIndex = Infinity;
    drawAll();
}

var segments = [];
function updateSegments() {
    segments = [];
    for (var i = 0; i < waypoints.length-1; i++) {
        var {x:x1, y:y1} = waypoints[i];
        var {x:x2, y:y2} = waypoints[i+1];
        var dx = x2-x1, dy = y2-y1;
        var length = Math.hypot(dx, dy);
        var ndx = dx/length, ndy = dy/length;
        var angle = Math.atan2(dy, dx);
        segments.push({x1, y1, x2, y2, dx, dy, ndx, ndy, length, angle});
    }
}

function jointAngle(seg1, seg2) {
    var a = seg2.angle - seg1.angle;
    if (a > +Math.PI) a -= 2*Math.PI;
    if (a < -Math.PI) a += 2*Math.PI;
    return a;
}

function printCommands() {
    for (var i = 0; i < segments.length; i++) {
        if (i != 0) {
            var angle = jointAngle(segments[i-1], segments[i]) * 180/Math.PI;
            console.log("TurnAngle "+angle.toFixed(0)+"°");
        }
        console.log("DriveDist "+segments[i].length.toFixed(0)+" in.");
    }
}

function updatePathNeeders() {
    for (var ele of document.getElementsByClassName("needs-path")) {
        ele.disabled = waypoints.length < 2;
    }
}
updatePathNeeders();

// pure pursuit control

const PURSUIT_DIST = 60;
const ROBOT_SPEED = 250;
const MIN_TURN_RADIUS = 50;
const SKIP_DIST = 40; // must be less than PURSUIT_DIST
var segments, curSeg;
var robotX, robotY, robotDir;
function updatePP() {
    // find the closest point on the current segment (and advance if necessary)
    var px0, py0;
    var d;
    for (; curSeg < segments.length; curSeg++) {
        // calculate the distance from the robot to the segment
        var seg = segments[curSeg];
        var x = robotX - seg.x1;
        var y = robotY - seg.y1;
        d = x*seg.ndx + y*seg.ndy;
        d /= seg.length;
        if (d < 1.0) {
            if (d < 0.0) d = 0.0;
            px0 = seg.x1 + d*seg.dx;
            py0 = seg.y1 + d*seg.dy;
            break;
        }
    }
    if (curSeg == segments.length) {
        // at the end of the path!
        return {done: true};
    }
    
    // advance that point forward to get the pursuit point
    d = -d*segments[curSeg].length;
    var seg;
    for (var i = curSeg; i < segments.length; i++) {
        seg = segments[i];
        if (d + seg.length > PURSUIT_DIST) {
            d = PURSUIT_DIST - d;
            break;
        }
        d += seg.length;
    }
    if (i == segments.length) { // after the last segment; cap to end
        i--;
        d = seg.length;
    }
    var px = seg.x1 + d*seg.ndx;
    var py = seg.y1 + d*seg.ndy;
    
    // if the robot is close to the pursuit point (tight corner), skip ahead
    var pdx = px-robotX, pdy = py-robotY;
    d = Math.hypot(pdx, pdy);
    if (d < SKIP_DIST && curSeg != i) {
        curSeg = i; // advance to the segment containing the pursuit point
        return updatePP(); // try again
    }
    
    // calculate the (inverse) arc radius (sign tells left/right turn)
    d /= 2;
    var a = Math.PI/2 - (Math.atan2(pdy, pdx) - robotDir);
    var radiusInv = Math.cos(a) / d; // reciprocal, to avoid divide-by-zero
    var badRadius = false; // used for drawing effect
    if (normalizeAngle(a) > Math.PI || Math.abs(radiusInv) > 1/MIN_TURN_RADIUS) {
        radiusInv = Math.sign(radiusInv) * 1/MIN_TURN_RADIUS;
        badRadius = true;
    }
    
    return {radiusInv, badRadius, px0, py0, px, py, done: false};
}

function normalizeAngle(a) {
    a %= 2*Math.PI;
    if (a < 0) a += 2*Math.PI;
    return a;
}

function stepSimulation(stepSize) {
    // get the controller update
    var res = updatePP();
    if (res.done) return res;
    var {radiusInv, badRadius, px0, py0, px, py} = res;
    
    // move the robot
    var driveDist = stepSize;
    var turnAmount = driveDist * radiusInv;
    robotDir += turnAmount;
    trailBuf.ctx.beginPath();
    trailBuf.ctx.moveTo(robotX, robotY);
    robotX += driveDist * Math.cos(robotDir);
    robotY += driveDist * Math.sin(robotDir);
    trailBuf.ctx.lineTo(robotX, robotY);
    trailBuf.ctx.stroke();
    
    return res;
}

var ppRunning = false;
var trailBuf;
var lastFrame;
function ppFrame(time) {
    if (!ppRunning) return;
    var dt = Math.min((time - lastFrame) / 1000, 1/25);
    lastFrame = time;
    
    var {radiusInv, badRadius, px0, py0, px, py, done} = stepSimulation(ROBOT_SPEED * dt);
    if (done) {
        stopPP();
        return;
    }
    
    // draw stuff
    drawAll();
    drawCircle(px, py, 4, "green");
    ctx.strokeStyle = badRadius? "red" : ctx.fillStyle;
    ctx.beginPath();
    ctx.moveTo(robotX, robotY);
    if (Math.abs(radiusInv) < 1/10000) {
        ctx.lineTo(px, py);
    } else {
        var cx = robotX - 1/radiusInv * Math.sin(robotDir);
        var cy = robotY + 1/radiusInv * Math.cos(robotDir);
        var start = Math.atan2(robotY-cy, robotX-cx);
        var end = Math.atan2(py-cy, px-cx);
        ctx.arc(cx, cy, Math.abs(1/radiusInv), start, end, radiusInv < 0);
    }
    ctx.stroke();
    drawCircle(robotX, robotY, 14, "#333");
    drawCircle(px0, py0, 4, "orange");
    
    requestAnimationFrame(ppFrame);
}

function initPP() {
    robotX = waypoints[0].x;
    robotY = waypoints[0].y;
    robotDir = segments[0].angle;
    curSeg = 0;
    trailBuf = createBuffer();
    trailBuf.ctx.strokeStyle = "gray";
}
function startPP() {
    if (waypoints.length < 2) return;
    document.getElementById("start-stop").textContent = "Stop";
    initPP();
    lastFrame = performance.now();
    ppRunning = true;
    ppFrame(lastFrame);
}
function doPP() {
    stopPP();
    initPP();
    var start = performance.now();
    while (!stepSimulation(5.0).done) {
        if (performance.now() - start > 500) break; // prevent infinite loop
    }
    drawAll();
}
function stopPP() {
    document.getElementById("start-stop").textContent = "Start";
    ppRunning = false;
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
    ctx.lineJoin = "round";
    ctx.lineCap  = "round";
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

const LINE_COLOR = "#009";
const DOT_COLOR = "#00f";

function drawBackground() {
    ctx.fillStyle = "#ddd";
    ctx.fillRect(0, 0, fieldWidth, fieldHeight);
}

var drawIndex = 0;
var dotBuf, lineBuf, editBuf;
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
        drawCircle(x, y, 5, DOT_COLOR, dotBuf.ctx);
    }
    lineBuf.ctx.stroke();
    
    // draw the buffers to the main canvas
    drawBuffer(lineBuf);
    drawBuffer(dotBuf);
}

function drawAll() {
    drawBackground();
    drawWaypoints();
    drawBuffer(editBuf);
    if (trailBuf) drawBuffer(trailBuf);
}

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
    console.log("touchStart");
    if (waypoints.length < 2 || true) {
        // start drawing a new path
        console.log("   new path");
        waypoints = [];
        if (trailBuf) clearBuffer(trailBuf);
        touchMove(x, y, id);
    } else {
        console.log("   edit");
        
    }
}
var simpIndex = 0;
function touchMove(x, y, id) {
    [x, y] = screenToField(x, y);
    addEditPoint(x, y);
}
function touchEnd(x, y, id) {
    [x, y] = screenToField(x, y);
    waypoints = editPoints;
    editPoints = [];
    clearBuffer(editBuf);
    updatePathNeeders();
    simplifyPath();
}