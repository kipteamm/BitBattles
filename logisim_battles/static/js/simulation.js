function hasInput(gate, inputX, inputY) {
    return gate.inputs.find(input => input.x === inputX && input.y === inputY);
}

function simulateGate(_gate, value) {
    if (!_gate) return;
    if (isNaN(_gate.output.x) || isNaN(_gate.output.y)) return;

    const wire = placedWires.find(_wire => _wire.startX === _gate.output.x && _wire.startY === _gate.output.y);
    const gate = placedGates.find(_gate => hasInput(_gate, wire.endX, wire.endY));
    wire.state = value? "on": "off";

    return simulateGate(gate, 1);
}

function simulate() {
    placedGates.filter(_gate => _gate.type === "INPUT").forEach(input => {
        simulateGate(input, 0);
    });

    console.log("finish simulation");
    drawGrid();
    drawCanvas();
}