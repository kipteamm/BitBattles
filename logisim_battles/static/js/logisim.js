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
        evaluate: (states) => (states.filter(s => s === 1).length >= 2) ? 1 : 0,
    },
    OR: {
        label: "OR",
        color: "#0099ff",
        type: "GATE",
        size: 3,
        inputs: [{ x: 0, y: 10 }, { x: 0, y: 30 }, { x: 0, y: 50 }],
        output: { x: 60, y: 30 },
        evaluate: (states) => states.some(s => s === 1) ? 1 : 0,
    },
    NOT: {
        label: "NOT",
        color: "#ff6666",
        type: "GATE",
        size: 1,
        inputs: [{ x: 0, y: 10 }],
        output: { x: 20, y: 10 },
        evaluate: (states) => !states[0],
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

const placedGates = [];
let selectedGate = null;
let showGhostGate = false;
let rotation = 0;

const placedWires = [];
let wireStart = null;

let mouseX = 0, mouseY = 0;

function drawGrid() {
    placedGates.forEach(gate => {
        drawGate(gate.x, gate.y, gate.type, gate.rotation, bufferContext);
    });
    placedWires.forEach(wire => {
        drawWire(wire.startX, wire.startY, wire.endX, wire.endY, wire.state, bufferContext);
    });
}

function drawGate(x, y, gateType, rotation, ctx = context) {
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
    ctx.fillText(gate.label, 0, 4);

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

// Draw a wire
function drawWire(startX, startY, endX, endY, state, ctx = context) {
    ctx.strokeStyle = wireColors[state];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
}

// Select a gate
function toggleSelectGate(type) {
    if (!type) return;
    selectedGate = selectedGate === type? null: type;
    showGhostGate = selectedGate === type? true: false;
    wireStart = null;
    
    drawCanvas();
}

function findGate(snappedX, snappedY) {
    return placedGates.find(_gate => {
        const gateSize = gridSize * objects[_gate.type].size;
        const overlapSize = gridSize * (selectedGate? objects[selectedGate].size: 1);
    
        return (
            snappedX < _gate.x + gateSize &&
            snappedX + overlapSize > _gate.x &&
            snappedY < _gate.y + gateSize &&
            snappedY + overlapSize > _gate.y
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
                snappedY === _wire.startY - (_wire.startY % gridSize) &&
                snappedX >= minX && snappedX <= maxX
            );
        }

        const minY = Math.min(_wire.startY, _wire.endY);
        const maxY = Math.max(_wire.startY, _wire.endY);

        return (
            snappedX === _wire.startX - (_wire.startX % gridSize) &&
            snappedY >= minY && snappedY <= maxY
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

function checkConnectorClicked(gate, x, y) {
    const gateType = objects[gate.type];
    const clickRadius = 10;
    const gateCenterX = gate.x + (gridSize * gateType.size) / 2;
    const gateCenterY = gate.y + (gridSize * gateType.size) / 2;
    const rotation = gate.rotation;

    // Check each input connector
    for (const input of gateType.inputs) {
        const rotatedInput = rotatePoint(gate.x + input.x, gate.y + input.y, rotation, gateCenterX, gateCenterY);
        if (Math.hypot(x - rotatedInput.x, y - rotatedInput.y) > clickRadius) continue;
        
        console.log("INPUT");
        placeWire(rotatedInput.x, rotatedInput.y);
        toggleSelectGate(selectedGate);
        drawCanvas();
        return;
    };
    
    // Check the output connector
    const rotatedOutput = rotatePoint(gate.x + gateType.output.x, gate.y + gateType.output.y, rotation, gateCenterX, gateCenterY);
    if (Math.hypot(x - rotatedOutput.x, y - rotatedOutput.y) > clickRadius) return;
    
    console.log("OUTPUT");
    placeWire(rotatedOutput.x, rotatedOutput.y, gate);
    toggleSelectGate(selectedGate);
    drawCanvas();
}

function placeGate(snappedX, snappedY) {
    const _gate = objects[selectedGate]

    placedGates.push({
        x: snappedX, 
        y: snappedY, 
        type: selectedGate, 
        rotation: rotation, 
        inputs: _gate.inputs.map((input) => ({x: snappedX + input.x, y: snappedY + input.y})), 
        output: {x: snappedX + _gate.output.x, y: snappedY + _gate.output.y},
    });
    drawGrid();
}

function placeWire(snappedX, snappedY) {
    if (!wireStart) {
        wireStart = {x: snappedX, y: snappedY, direction: null, state: "off"};
        return;
    }

    placedWires.push({
        startX: wireStart.x, 
        startY: wireStart.y, 
        endX: wireStart.direction === "VERTICAL"? snappedX: snappedX, 
        endY: wireStart.direction === "HORIZONTAL"? snappedY: snappedY, 
        state: "off"
    });

    wireStart = null;
    drawGrid();
}

canvas.addEventListener("click", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const snappedX = Math.floor(x / gridSize) * gridSize;
    const snappedY = Math.floor(y / gridSize) * gridSize;
    const gate = findGate(snappedX, snappedY)

    if (gate) return checkConnectorClicked(gate, x, y);
    if (selectedGate) return placeGate(snappedX, snappedY);
    if (wireStart) return placeWire(snappedX + 10, snappedY + 10);
    const wire = findWire(snappedX, snappedY);
    
    if (wire) return placeWire(snappedX + 10, snappedY + 10);
});

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
    
    if (!gate) return;
    placedGates.splice(placedGates.indexOf(gate), 1);
    bufferContext.clearRect(0, 0, canvas.width, canvas.height);

    drawGrid();
    drawCanvas();
})

// Track mouse position for ghost gate
canvas.addEventListener("mousemove", (event) => {
    if (!selectedGate && !wireStart) return;
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;

    drawCanvas();
});

// Render buffer canvas
function drawGhostGate(snappedX, snappedY) {
    if (!selectedGate) return;
    if (findGate(snappedX, snappedY)) return;
        
    context.globalAlpha = 0.5;  // Set transparency for ghost gate
    drawGate(snappedX, snappedY, selectedGate, rotation, context);
    context.globalAlpha = 1.0;  // Reset transparency

    return;
}

function drawGhostWire(snappedX, snappedY) {
    const direction = wireStart.y - (wireStart.y % gridSize) === snappedY? "HORIZONTAL": "VERTICAL";
    const wireX = direction === "VERTICAL"? wireStart.x - 10: wireStart.x;
    const wireY = direction === "HORIZONTAL"? wireStart.y - 10: wireStart.y;
    
    if (snappedX !== wireX && snappedY !== wireY) return;
    wireStart.direction = direction;
    const offSet = findGate(snappedX, snappedY)? 0: 10;

    context.strokeStyle = wireColors[wireStart.state];
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(wireStart.x, wireStart.y);
    context.lineTo(
        snappedY === wireY? snappedX - offSet: wireStart.x, 
        snappedY === wireY? wireStart.y: snappedY - offSet
    );
    context.stroke();
}

function drawCanvas() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bufferCanvas, 0, 0);
    if (!showGhostGate && !wireStart) return;

    const snappedX = Math.floor(mouseX / gridSize) * gridSize;
    const snappedY = Math.floor(mouseY / gridSize) * gridSize;
    
    if (showGhostGate) return drawGhostGate(snappedX, snappedY);
    if (wireStart) return drawGhostWire(snappedX, snappedY);
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
            rotation = 180;
            break;
        case "ArrowDown":
            rotation = 270;
            break;
        case "ArrowRight":
            rotation = 0;
            break;
        default:
            return;
    }
    drawCanvas();
})

drawGrid();
drawCanvas();