const canvas = document.getElementById("game");
const context = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const bufferCanvas = document.createElement("canvas");
const bufferContext = bufferCanvas.getContext("2d");
bufferCanvas.width = canvas.width;
bufferCanvas.height = canvas.height - 40;

let camX = 0;
let camY = 0;
let zoom = 1;

const gridSize = 20;
const objects = {
    AND: {
        label: "AND",
        color: "#ffcc00",
        type: "GATE",
        size: 3,
        inputs: [{ x: 0, y: 10 }, { x: 0, y: 30 }, { x: 0, y: 50 }],
        output: { x: 60, y: 30 },
        evaluate: (states) => (states.filter(s => s === 1).length === states.filter(s => s !== null).length) ? 1 : 0,
    },
    OR: {
        label: "OR",
        color: "#0099ff",
        type: "GATE",
        size: 3,
        inputs: [{ x: 0, y: 10 }, { x: 0, y: 30 }, { x: 0, y: 50 }],
        output: { x: 60, y: 30 },
        evaluate: (states) => states.find(s => s === 1) ? 1 : 0,
    },
    NOT: {
        label: "NOT",
        color: "#ff6666",
        type: "GATE",
        size: 1,
        inputs: [{ x: 0, y: 10 }],
        output: { x: 20, y: 10 },
        evaluate: (states) => states[0]? 0: 1,
    },
    XOR: {
        label: "XOR",
        color: "#da42fc",
        type: "GATE",
        size: 3,
        inputs: [{ x: 0, y: 10 }, { x: 0, y: 30 }, { x: 0, y: 50 }],
        output: { x: 60, y: 30 },
        evaluate: (states) => states.filter(state => state).length === 1? 1: 0,
    },
    INPUT: {
        label: "IN",
        color: "#acbaba",
        type: "GATE",
        size: 1,
        inputs: [],
        output: { x: 20, y: 10},
        value: 0,
        evaluate: (states, input) => input.value,
    },
    OUTPUT: {
        label: "OUT",
        color: "#acbaba",
        type: "GATE",
        size: 1,
        inputs: [{ x: 0, y: 10 }],
        output: {},
        evaluate: (states) => states[0] ?? 0,
    }
};

let placedGates = [];
let placedConnectors = [];
let selectedGate = null;
let showGhostGate = false;
let movingGate = null;
let rotation = 0;

let placedWires = [];
let wireStart = null;

let mouseX = 0, mouseY = 0;
let editing = false;
let debug = false;

function editMode() {
    selectedGate = null;
    showGhostGate = false;
    wireStart = false;
    editing = true;
    debug = false;

    drawCanvas();
    canvas.style.cursor = "default";
}

function debugMode() {
    selectedGate = null;
    showGhostGate = false;
    wireStart = false;
    editing = false;
    debug = true;

    drawCanvas();
    canvas.style.cursor = "pointer";
}

function toggleSelectGate(type) {
    if (!type) return;
    selectedGate = selectedGate === type? null: type;
    showGhostGate = selectedGate === type? true: false;
    wireStart = null;
    editing = false;
    debug = false;

    drawCanvas();
    canvas.style.cursor = selectedGate? "pointer": "default";
}

function prepareTransform(ctx = context) {
    ctx.save();
    ctx.translate(camX, camY);
    ctx.scale(zoom, zoom);
}

function undoTransform(ctx = context) {
    ctx.restore();
}

function drawGrid() {
    placedGates.forEach(gate => {
        bufferContext.globalAlpha = gate === movingGate? 0.5: 1.0;
        drawGate(gate.x, gate.y, gate.type, gate.rotation, gate.id, bufferContext);
        bufferContext.globalAlpha = 1.0;
    });

    const points = [];
    placedWires.forEach(wire => {
        drawWire(wire.startX, wire.startY, wire.endX, wire.endY, wire.state, bufferContext);

        const startPoint = `${wire.startX},${wire.startY}`;
        points[startPoint] = (points[startPoint] || 0) + 1;
        
        const endPoint = `${wire.endX},${wire.endY}`;
        points[endPoint] = (points[endPoint] || 0) + 1;
    });

    for (const [point, occurances] of Object.entries(points)) {
        if (occurances < 3) continue;

        const [x, y] = point.split(",").map(Number)
        drawIntersection(x, y, bufferContext)
    }
}

function drawGate(x, y, gateType, rotation, id, ctx = context) {
    const gate = objects[gateType];
    if (!gate) return;

    const gateSizePx = gridSize * gate.size;

    // Translate to the center of the gate, then rotate
    prepareTransform(ctx);
    ctx.translate(x + gateSizePx / 2, y + gateSizePx / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    // Draw the gate at the transformed origin
    ctx.fillStyle = gate.color;
    ctx.fillRect(-gateSizePx / 2, -gateSizePx / 2, gateSizePx, gateSizePx);

    // Draw the label
    ctx.fillStyle = "white";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(id? isNaN(id)? id: gate.label: gate.label, 0, 4);

    // Draw input connectors
    ctx.fillStyle = "black";
    gate.inputs.forEach(input => {
        ctx.beginPath();
        ctx.arc(input.x - gateSizePx / 2, input.y - gateSizePx / 2, 3, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw output connector
    ctx.beginPath();
    ctx.arc(gate.output.x - gateSizePx / 2, gate.output.y - gateSizePx / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    undoTransform(ctx);
}

const wireColors = {"off": "#1d5723", "on": "#1cba2e", "invalid": "#A60000"};
function drawWire(startX, startY, endX, endY, state, ctx = context) {
    prepareTransform(ctx);
    ctx.strokeStyle = wireColors[state];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    undoTransform(ctx);
}

function drawIntersection(x, y, ctx = context) {
    prepareTransform(ctx);
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
    undoTransform(ctx);
}

function findGate(snappedX, snappedY) {
    return placedGates.find(_gate => {
        const gateSize = gridSize * objects[_gate.type].size;
        const overlapSize = gridSize * (selectedGate? objects[selectedGate].size: 0);

        return (
            snappedX + overlapSize > _gate.x &&
            snappedX < _gate.x + gateSize &&
            snappedY + overlapSize > _gate.y &&
            snappedY < _gate.y + gateSize &&
            _gate !== movingGate
        );
    });
}

function findWire(snappedX, snappedY) {
    return placedWires.find(_wire => {
        const horizontal = _wire.startY === _wire.endY;

        if (horizontal) {
            const minX = Math.min(_wire.startX, _wire.endX);
            const maxX = Math.max(_wire.startX, _wire.endX);  

            return (
                snappedY === _wire.startY - 10 &&
                snappedX >= minX - 10 && snappedX <= maxX
            );
        }
        
        const minY = Math.min(_wire.startY, _wire.endY);
        const maxY = Math.max(_wire.startY, _wire.endY);

        return (
            snappedX === _wire.startX - 10 &&
            snappedY >= minY - 10 && snappedY <= maxY
        );
    });
}

function rotatePoint(px, py, angle, gateCenterX, gateCenterY) {
    const radians = (angle * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const dx = px - gateCenterX;
    const dy = py - gateCenterY;
    return {
        x: gateCenterX + dx * cos - dy * sin,
        y: gateCenterY + dx * sin + dy * cos
    };
}

function setConnectors(gate, snappedX, snappedY) {
    const outputCoordinates = rotatePoint(snappedX + gate.output.x, snappedY + gate.output.y, rotation, snappedX + (gridSize * gate.size) / 2, snappedY + (gridSize * gate.size) / 2);
    const inputCoordinates = [];
    gate.inputs.forEach(input => {
        inputCoordinates.push(rotatePoint(
            snappedX + input.x, 
            snappedY + input.y, 
            rotation, snappedX + (gridSize * gate.size) / 2, 
            snappedY + (gridSize * gate.size) / 2)
        );
    });

    placedConnectors.push(...inputCoordinates);
    placedConnectors.push(outputCoordinates);

    return [inputCoordinates, outputCoordinates];
}

function removeConnectors(gate) {
    gate.inputs.forEach(input => {
        placedConnectors.splice(placedConnectors.indexOf(input), 1);
    })
    placedConnectors.splice(placedConnectors.indexOf(gate.output), 1);
}

function placeGate(snappedX, snappedY) {
    if (debug) return;
    const _gate = objects[selectedGate];

    if (movingGate) {
        removeConnectors(movingGate);

        movingGate.x = snappedX;
        movingGate.y = snappedY;
        movingGate.rotation = rotation;
        
        const [inputCoordinates, outputCoordinates] = setConnectors(_gate, snappedX, snappedY);
        movingGate.inputs =  inputCoordinates;
        movingGate.output = outputCoordinates;
        
        movingGate = null;
        selectedGate = null;
        showGhostGate = false;

        bufferContext.clearRect(0, 0, bufferCanvas.width, bufferCanvas.height);
        drawGrid();
        return drawCanvas();
    }

    const [inputCoordinates, outputCoordinates] = setConnectors(_gate, snappedX, snappedY);
    placedGates.push({
        x: snappedX, 
        y: snappedY, 
        type: selectedGate, 
        rotation: rotation, 
        inputs: inputCoordinates, 
        output: outputCoordinates,
        id: null,
    });
    drawGrid();
}

function splitWire(wire, snappedX, snappedY, startFrom) {
    if (
        (wire.startX === wireStart.x && wire.startY === wireStart.y)  || 
        (wire.startX === snappedX && wire.startY === snappedY) ||
        (wire.endX === wireStart.x && wire.endY === wireStart.y) ||
        (wire.endX === snappedX && wire.endY === snappedY)
    ) return;

    placedWires.push({
        startX: wire.startX, 
        startY: wire.startY, 
        endX: startFrom? wireStart.x: snappedX, 
        endY: startFrom? wireStart.y: snappedY,
        state: "off",
    });
    placedWires.push({
        startX: startFrom? wireStart.x: snappedX,
        startY: startFrom? wireStart.y: snappedY,
        endX: wire.endX,
        endY: wire.endY,
        state: "off",
    });
    placedWires.splice(placedWires.indexOf(wire), 1);
}

function placeWire(snappedX, snappedY, startWire) {
    if (debug) return;
    if (!wireStart) {
        wireStart = {x: snappedX, y: snappedY, direction: null, state: "off", valid: true};
        return;
    }

    if (!wireStart.valid) return;
    if (snappedX !== wireStart.x && snappedY !== wireStart.y) return;
    if (snappedX === wireStart.x && snappedY === wireStart.y) return;
    const endWire = findWire(snappedX - 10, snappedY - 10);
    startWire = findWire(wireStart.x - 10, wireStart.y - 10);

    placedWires.push({
        startX: wireStart.x, 
        startY: wireStart.y, 
        endX: snappedX, 
        endY: snappedY, 
        state: "off"
    });

    if (startWire) splitWire(startWire, snappedX, snappedY, true);
    if (endWire) splitWire(endWire, snappedX, snappedY, false);

    wireStart = null;
    drawGrid();
    drawCanvas();
}

function moveGate(gate) {
    movingGate = gate;
    showGhostGate = true;
    selectedGate = gate.type;

    bufferContext.clearRect(0, 0, canvas.width, canvas.height);

    drawGrid();
    drawCanvas();
}

function findConnector(x, y) {
    return placedConnectors.find(connector => 
        (x - 5 <= connector.x && connector.x <= x + 5) &&
        (y - 5 <= connector.y && connector.y <= y + 5)
    );
}

canvas.addEventListener("click", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - camX) / zoom;
    const y = (event.clientY - rect.top - camY) / zoom;

    const snappedX = Math.floor(x / gridSize) * gridSize;
    const snappedY = Math.floor(y / gridSize) * gridSize;
    const gate = findGate(snappedX, snappedY);
    
    if (selectedGate && !gate) return placeGate(snappedX, snappedY);
    const connector = findConnector(x, y);
    
    if (connector) return placeWire(connector.x, connector.y, null);
    if (gate && movingGate === null) {
        if (!editing && gate.type === "INPUT") {
            gate.value = gate.value? 0: 1;
            return inputClicked();
        }
        if (!editing) return;
        return moveGate(gate);
    }

    if (wireStart) return placeWire(snappedX + 10, snappedY + 10, null);
    const wire = findWire(snappedX, snappedY);
    
    if (wire) return placeWire(snappedX + 10, snappedY + 10, wire);
});

function removeGate(gate) {
    removeConnectors(gate);
    placedGates.splice(placedGates.indexOf(gate), 1);
}

canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();

    if (wireStart) {
        wireStart = null;
        bufferContext.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid();
        drawCanvas();
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - camX) / zoom;
    const y = (event.clientY - rect.top - camY) / zoom;

    const snappedX = Math.floor(x / gridSize) * gridSize;
    const snappedY = Math.floor(y / gridSize) * gridSize;
    const gate = findGate(snappedX, snappedY)
    
    if (gate && debug) return console.log(gate);
    if (gate && !gate.id) removeGate(gate);
    else {
        const wire = findWire(snappedX, snappedY);
        if (!wire) return;
        if (debug) return console.log(wire);

        placedWires.splice(placedWires.indexOf(wire), 1);
    }

    bufferContext.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawCanvas();
})

function updateBackgroundPosition() {
    canvas.style.backgroundPosition = `${(gridSize * zoom) / 2 + camX}px ${(gridSize * zoom) / 2 + camY}px`;
}

let draggingCamera = false;
let screenMouseX, screenMouseY;

canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();

    let newScreenMouseX = (event.clientX - rect.left);
    let newScreenMouseY = (event.clientY - rect.top);
    
    mouseX = (event.clientX - rect.left - camX) / zoom;
    mouseY = (event.clientY - rect.top - camY) / zoom;

    if (!(event.buttons & (2))) return drawCanvas();
    if (!draggingCamera) {
        draggingCamera = true;
        screenMouseX = newScreenMouseX;
        screenMouseY = newScreenMouseY;
        return;
    }
    camX += (newScreenMouseX - screenMouseX);
    camY += (newScreenMouseY - screenMouseY);
    screenMouseX = newScreenMouseX;
    screenMouseY = newScreenMouseY;
    
    updateBackgroundPosition();
    bufferContext.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawCanvas();
});

canvas.addEventListener("mouseup", () => {
    draggingCamera = false;
});

function drawGhostGate(snappedX, snappedY) {
    if (!selectedGate) return;
    if (findGate(snappedX, snappedY)) return;
        
    context.globalAlpha = editing? 1.0: 0.5;
    drawGate(snappedX, snappedY, selectedGate, rotation, movingGate?.id, context);
    context.globalAlpha = 1.0;

    return;
}

function hasInput(gate, connector) {
    if (!gate || !connector) return false;

    for (const input of gate.inputs) {
        if (input.x === connector.x && input.y === connector.y) return true;
    }
    return false;
}

function drawGhostWire(snappedX, snappedY, connector) {
    let offsetComponent = wireStart.y % gridSize;
    if (offsetComponent < 0) offsetComponent = (offsetComponent + gridSize) % gridSize;
    const direction = wireStart.y - (offsetComponent) === snappedY? "HORIZONTAL": "VERTICAL";
    const wireX = direction === "VERTICAL"? wireStart.x - 10: wireStart.x;
    const wireY = direction === "HORIZONTAL"? wireStart.y - 10: wireStart.y;
    wireStart.valid = true;

    if (wireStart.direction === "HORIZONTAL") {
        for (let startX = wireStart.x; startX <= snappedX; startX += 20) {
            const gate = findGate(startX, wireStart.y);

            if (gate && !hasInput(gate, connector)) {
                wireStart.valid = false;
                break;
            };
        }
    }

    if (!wireStart.valid || snappedX !== wireX && snappedY !== wireY || snappedX === wireX && snappedX === wireY) {
        context.globalAlpha = 0.125;
        drawWire(
            wireStart.x, 
            wireStart.y,
            connector? connector.x: snappedX + 10, 
            connector? connector.y: snappedY + 10, 
            "invalid",
            context,
            );
        context.globalAlpha = 1.0;
        return;
    }
    wireStart.direction = direction;

    drawWire(
        wireStart.x, 
        wireStart.y,
        connector? connector.x: snappedX + 10, 
        connector? connector.y: snappedY + 10, 
        "off",
        context,
    )
}

function drawConnectorOutline(x, y) {
    prepareTransform();
    context.fillStyle = "black";
    context.beginPath();
    context.arc(x, y, 5, 0, Math.PI * 2);
    context.stroke();
    undoTransform();
}

function drawGateOutline(gate) {
    const _gate = objects[gate.type];
    prepareTransform();
    context.fillStyle = "black";
    context.beginPath();
    context.roundRect(gate.x - 5, gate.y - 5, _gate.size * gridSize + 10, _gate.size * gridSize + 10, [5, 5, 5, 5]);
    context.stroke();
    undoTransform();
}

function drawCanvas() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bufferCanvas, 0, 0);

    if (debug) return;
    const snappedX = Math.floor(mouseX / gridSize) * gridSize;
    const snappedY = Math.floor(mouseY / gridSize) * gridSize;
    
    if (showGhostGate) return drawGhostGate(snappedX, snappedY);
    const connector = findConnector(mouseX, mouseY);

    if (wireStart) drawGhostWire(snappedX, snappedY, connector);
    const wire = findWire(snappedX, snappedY);

    if (wire) return drawConnectorOutline(snappedX + 10, snappedY + 10);
    if (connector) return drawConnectorOutline(connector.x, connector.y);
    const gate = findGate(snappedX, snappedY);

    if (gate && editing) return drawGateOutline(gate);
}

function setZoom(newZoom) {
    if (newZoom <= 0) return;

    let oldMouseX = (mouseX) * zoom;
    let oldMouseY = (mouseY) * zoom;
    zoom = newZoom;
    mouseX = (oldMouseX) / zoom;
    mouseY = (oldMouseY) / zoom;

    canvas.style.backgroundSize = `${gridSize * zoom}px ${gridSize * zoom}px`;
    updateBackgroundPosition();
    canvas.style.backgroundImage = `radial-gradient(circle, var(--bg-sec) ${Math.floor(zoom)}px, rgba(0, 0, 0, 0) 1px)`

    bufferContext.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawCanvas();
}

document.addEventListener("keydown", (event) => {
    switch(event.key) {
        case "+":
        case "=":
            setZoom(zoom + 0.5);
            return;
        case "-":
            setZoom(zoom - 0.5);
            return;
        case "z":
            rotation = rotation === 360? 90: rotation + 90;
            break;
        case "ArrowUp":
            rotation = 90;
            break;
        case "ArrowLeft":
            rotation = 0;
            break;
        case "ArrowDown":
            rotation = 270;
            break;
        case "ArrowRight":
            rotation = 180;
            break;
        case "Escape":
            editMode();
            break;
        default:
            return;
    }
    drawCanvas();
})

drawGrid();
drawCanvas();