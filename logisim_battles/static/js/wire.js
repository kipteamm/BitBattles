const canvas = document.getElementById("game");
const context = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const gridSize = 20;
const gates = {
    AND: { label: "AND", color: "#ffcc00", size: 2},
    OR: { label: "OR", color: "#0099ff", size: 2 },
    NOT: { label: "NOT", color: "#ff6666", size: 2 },
    CROSS: { label: "CROSS", color: "#185818", size: 1 },
};

let selectedGate = null;
let mouseX = 0, mouseY = 0;
let showGhost = false;
const placedGates = [];

let drawingWire = false;
let wireStart = {};

// Off-screen buffer canvas
const bufferCanvas = document.createElement("canvas");
const bufferContext = bufferCanvas.getContext("2d");
bufferCanvas.width = canvas.width;
bufferCanvas.height = canvas.height;

// Draw grid on buffer canvas
function drawGrid() {
    // Draw all placed gates on the buffer
    placedGates.forEach(gate => {
        drawGate(gate.x, gate.y, gate.type, bufferContext);
    });
}

// Draw a gate
function drawGate(x, y, gateType, ctx = context) {
    if (!gates[gateType]) return;
    ctx.fillStyle = gates[gateType].color;
    ctx.fillRect(x, y, gridSize * gates[gateType].size, gridSize * gates[gateType].size);
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(gates[gateType].label, x + 20, y + 26);
}

// Select a gate
function selectGate(type) {
    selectedGate = type;
    showGhost = true;
    drawingWire = false;
    wireStart = {};
}

// Place a gate on click
canvas.addEventListener("click", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const snappedX = Math.floor(x / gridSize) * gridSize;
    const snappedY = Math.floor(y / gridSize) * gridSize;
    const gate = placedGates.find(_gate => 
        _gate.x <= snappedX && snappedX < _gate.x + (gridSize * gates[_gate.type].size) &&
        _gate.y <= snappedY && snappedY < _gate.y + (gridSize * gates[_gate.type].size)
    );

    placedGates.forEach(_gate => {
        console.log(_gate.x, snappedX, _gate.x + (gridSize * gates[_gate.type].size))
        console.log(_gate.y, snappedY, _gate.y + (gridSize * gates[_gate.type].size))
    })

    console.log(gate)

    if (!selectedGate) return;
    if (gate && gate.type === selectedGate) {
        selectedGate = null;
        drawingWire = true;
        wireStart = {x: snappedX, y: snappedY, direction: null}

        return;
    };
    placedGates.push({ x: snappedX, y: snappedY, type: selectedGate });
    drawGrid();  // Update the buffer with the new gate

    if (!gate) return;
    placedGates.splice(placedGates.indexOf(gate), 1);
});

// Track mouse position for ghost gate
canvas.addEventListener("mousemove", (event) => {
    if (!drawingWire && !selectedGate) return;
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;

    if (!drawingWire) {
        showGhost = true;
        drawCanvas();

        return;
    }
    
    const snappedX = Math.floor(mouseX / gridSize) * gridSize;
    const snappedY = Math.floor(mouseY / gridSize) * gridSize;

    if (snappedX === wireStart.x && snappedY === wireStart.y) {
        wireStart.direction = null;
    } else if (wireStart.direction === null) {
        wireStart.direction = snappedX === wireStart.x? "vertical": "horizontal";
    }

    drawCanvas();
});

// Hide ghost gate when mouse leaves canvas
canvas.addEventListener("mouseleave", () => {
    showGhost = false;
    drawCanvas();
});

// Render buffer canvas and ghost gate
function drawCanvas() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bufferCanvas, 0, 0);  // Draw buffer onto main canvas

    if (!showGhost && !drawingWire) return;
    const snappedX = Math.floor(mouseX / gridSize) * gridSize;
    const snappedY = Math.floor(mouseY / gridSize) * gridSize;

    if (showGhost) {
        context.globalAlpha = 0.5;  // Set transparency for ghost gate
        drawGate(snappedX, snappedY, selectedGate, context);
        context.globalAlpha = 1.0;  // Reset transparency
    }

    if (!drawingWire) return;

    if (snappedX === wireStart.x || snappedY === wireStart.y) {
        console.log("straight line");

        return;
    }

    drawGate(
        wireStart.direction === "vertical"? wireStart.x: snappedX, 
        wireStart.direction === "vertical"? snappedY: wireStart.y, 
        "CROSS", 
        context
    );
}

// Initial drawing of grid
drawGrid();
drawCanvas();