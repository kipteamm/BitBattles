if (document.readyState !== 'loading') {
    circuitInit();
} else {
    document.addEventListener('DOMContentLoaded', function () {
        circuitInit();
    });
}


function circuitInit() {
    debugMode();

    loadGates(circuit.g);
    loadWires(circuit.w);

    drawGrid();
    drawCanvas();
}

function loadGates(gates) {
    gates.forEach(gate => {
        rotation = gate.n;

        const _gate = objects[gate.e];
        const [inputCoordinates, outputCoordinates] = setConnectors(_gate, gate.x, gate.y);
        placedGates.push({
            x: gate.x, 
            y: gate.y, 
            type: gate.e, 
            state: "off",
            rotation: gate.n, 
            inputs: inputCoordinates, 
            output: outputCoordinates,
            id: gate.d,
        });
    });
}

function loadWires(wires) {
    wires.forEach(wire => {
        placedWires.push({
            startX: wire.Xt, 
            startY: wire.Yt, 
            endX: wire.Xd, 
            endY: wire.Yd, 
            state: "off"
        });
    });;
}