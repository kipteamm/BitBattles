const canvas = document.getElementById("game");
const context = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const bufferCanvas = document.createElement("canvas");
const bufferContext = bufferCanvas.getContext("2d");
bufferCanvas.width = canvas.width;
bufferCanvas.height = canvas.height;

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
        evaluate: (states) => states.filter(state => state).length === 1,
    },
    INPUT: {
        label: "IN",
        color: "#acbaba",
        type: "GATE",
        size: 1,
        inputs: [],
        output: { x: 20, y: 10},
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

    drawCanvas();
    canvas.style.cursor = "default";
}

function toggleSelectGate(type) {
    if (!type) return;
    selectedGate = selectedGate === type? null: type;
    showGhostGate = selectedGate === type? true: false;
    wireStart = null;
    editing = false;

    drawCanvas();
    canvas.style.cursor = selectedGate? "pointer": "default";
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
    ctx.save();
    ctx.translate(x + gateSizePx / 2, y + gateSizePx / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    // Draw the gate at the transformed origin
    ctx.fillStyle = gate.color;
    ctx.fillRect(-gateSizePx / 2, -gateSizePx / 2, gateSizePx, gateSizePx);

    // Draw the label
    ctx.fillStyle = "white";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(id? id: gate.label, 0, 4);

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

    ctx.restore();
}

const wireColors = {"off": "#1d5723", "on": "#1cba2e"};
function drawWire(startX, startY, endX, endY, state, ctx = context) {
    ctx.strokeStyle = wireColors[state];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
}

function drawIntersection(x, y, ctx = context) {
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
}

function findGate(snappedX, snappedY) {
    return placedGates.find(_gate => {
        const gateSize = gridSize * objects[_gate.type].size;
        const overlapSize = gridSize * (selectedGate? objects[selectedGate].size: 1);
    
        return (
            snappedX < _gate.x + gateSize &&
            snappedX + overlapSize > _gate.x &&
            snappedY < _gate.y + gateSize &&
            snappedY + overlapSize > _gate.y &&
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

function placeWire(snappedX, snappedY, wire) {
    if (!wireStart) {
        wireStart = {x: snappedX, y: snappedY, direction: null, state: "off"};
        return;
    }

    if (snappedX !== wireStart.x && snappedY !== wireStart.y) return;
    let startFrom = false;
    if (!wire) {
        wire = findWire(snappedX - 10, snappedY - 10);
    }

    if (!wire) {
        wire = findWire(wireStart.x - 10, wireStart.y - 10);
        startFrom = true;
    }

    placedWires.push({
        startX: wireStart.x, 
        startY: wireStart.y, 
        endX: snappedX, 
        endY: snappedY, 
        state: "off"
    });

    if (wire) splitWire(wire, snappedX, snappedY, startFrom);

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
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const snappedX = Math.floor(x / gridSize) * gridSize;
    const snappedY = Math.floor(y / gridSize) * gridSize;
    const gate = findGate(snappedX, snappedY);
    
    if (selectedGate && !gate) return placeGate(snappedX, snappedY);
    const connector = findConnector(x, y);

    if (connector && !findWire(connector.x - 10, connector.y - 10)) return placeWire(connector.x, connector.y);
    if (gate && movingGate === null) {
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
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const snappedX = Math.floor(x / gridSize) * gridSize;
    const snappedY = Math.floor(y / gridSize) * gridSize;
    const gate = findGate(snappedX, snappedY)
    
    if (gate && debug) return console.log(gate);
    if (gate && !gate.id) removeGate(gate);
    else {
        const wire = findWire(snappedX, snappedY);
        
        if (!wire) return;
        if (debug) {
            return console.log(wire);
        }
        placedWires.splice(placedWires.indexOf(wire), 1);
    }

    bufferContext.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawCanvas();
})

canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;

    drawCanvas();
});

function drawGhostGate(snappedX, snappedY) {
    if (!selectedGate) return;
    if (findGate(snappedX, snappedY)) return;
        
    context.globalAlpha = editing? 1.0: 0.5;
    drawGate(snappedX, snappedY, selectedGate, rotation, movingGate?.id, context);
    context.globalAlpha = 1.0;

    return;
}

function drawGhostWire(snappedX, snappedY, connector) {
    const direction = wireStart.y - (wireStart.y % gridSize) === snappedY? "HORIZONTAL": "VERTICAL";
    const wireX = direction === "VERTICAL"? wireStart.x - 10: wireStart.x;
    const wireY = direction === "HORIZONTAL"? wireStart.y - 10: wireStart.y;

    if (snappedX !== wireX && snappedY !== wireY) return;
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
    context.fillStyle = "black";
    context.beginPath();
    context.arc(x, y, 5, 0, Math.PI * 2);
    context.stroke();
}

function drawGateOutline(gate) {
    const _gate = objects[gate.type];
    context.fillStyle = "black";
    context.beginPath();
    context.roundRect(gate.x - 5, gate.y - 5, _gate.size * gridSize + 10, _gate.size * gridSize + 10, [5, 5, 5, 5]);
    context.stroke();
}

function drawCanvas() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bufferCanvas, 0, 0);
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

document.addEventListener("keydown", (event) => {
    switch(event.key) {
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
        default:
            return;
    }
    drawCanvas();
})

drawGrid();
drawCanvas();