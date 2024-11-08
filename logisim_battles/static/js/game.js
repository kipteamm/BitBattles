const canvas = document.getElementById("game");
const context = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const gridSize = 20;
const gates = {
    AND: {
        label: "AND",
        color: "#ffcc00",
        size: 3,
        inputs: [{ x: 0, y: 10 }, { x: 0, y: 30 }, { x: 0, y: 50 }],
        output: { x: 60, y: 30 }
    },
    OR: {
        label: "OR",
        color: "#0099ff",
        size: 3,
        inputs: [{ x: 0, y: 10 }, { x: 0, y: 30 }, { x: 0, y: 50 }],
        output: { x: 60, y: 30 }
    },
    NOT: {
        label: "NOT",
        color: "#ff6666",
        size: 1,
        inputs: [{ x: 0, y: 10 }],
        output: { x: 20, y: 10 }
    },
};

let selectedGate = null;
let mouseX = 0, mouseY = 0;
let showGhost = false;
const placedGates = [];

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
    const gate = gates[gateType];
    if (!gate) return;
    ctx.fillStyle = gate.color;
    ctx.fillRect(x, y, gridSize * gate.size, gridSize * gate.size);

    ctx.fillStyle = "white";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(gate.label, x + (gridSize * gate.size) / 2, y + (gridSize * gate.size) / 2 + 5);

    // Draw input connectors
    ctx.fillStyle = "black";
    gate.inputs.forEach(input => {
        ctx.beginPath();
        ctx.arc(x + input.x, y + input.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw output connector
    const output = gate.output;
    ctx.beginPath();
    ctx.arc(x + output.x, y + output.y, 3, 0, Math.PI * 2);
    ctx.fill();
}

// Select a gate
function toggleSelectGate(type) {
    if (!type) return;

    if (type === selectedGate) {
        selectedGate = null;
        showGhost = false;
        return;
    }

    selectedGate = type;
    showGhost = true;
}

function findGate(snappedX, snappedY) {
    return placedGates.find(_gate => {
        const gateSize = gridSize * gates[_gate.type].size;
        const newGateSize = selectedGate? gridSize * gates[selectedGate].size: gridSize * 3;
    
        // Check if any part of the new gate overlaps the existing gate
        return (
            snappedX < _gate.x + gateSize &&
            snappedX + newGateSize > _gate.x &&
            snappedY < _gate.y + gateSize &&
            snappedY + newGateSize > _gate.y
        );
    });
}

// Place a gate on click
canvas.addEventListener("click", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const snappedX = Math.floor(x / gridSize) * gridSize;
    const snappedY = Math.floor(y / gridSize) * gridSize;
    const gate = findGate(snappedX, snappedY)

    if (gate) {
        // Check if click is near any connector for this gate
        const gateType = gates[gate.type];
        const clickRadius = 10;

        gateType.inputs.forEach(input => {
            console.log(input)
            if (Math.hypot(x - (gate.x + input.x), y - (gate.y + input.y)) < clickRadius) {
                connectorClicked("IN", gate);
                toggleSelectGate(selectedGate);
                drawCanvas();
                return;
            };
        });

        if (Math.hypot(x - (gate.x + gateType.output.x), y - (gate.y + gateType.output.y)) < clickRadius) {
            connectorClicked("OUT", gate)
            toggleSelectGate(selectedGate);
            drawCanvas();
            return;
        };
        return;
    }

    if (!selectedGate) return;

    // Place new gate if no connector clicked
    placedGates.push({ x: snappedX, y: snappedY, type: selectedGate });
    drawGrid();
});


// Track mouse position for ghost gate
canvas.addEventListener("mousemove", (event) => {
    if (!selectedGate) return;
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;

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

    if (!showGhost) return;
    const snappedX = Math.floor(mouseX / gridSize) * gridSize;
    const snappedY = Math.floor(mouseY / gridSize) * gridSize;
    if (findGate(snappedX, snappedY)) return;

    context.globalAlpha = 0.5;  // Set transparency for ghost gate
    drawGate(snappedX, snappedY, selectedGate, context);
    context.globalAlpha = 1.0;  // Reset transparency
}

function connectorClicked(connectorType, gate) {
    console.log(connectorType)
    toggleSelectGate(selectedGate);
    drawCanvas();
}

// Initial drawing of grid
drawGrid();
drawCanvas();