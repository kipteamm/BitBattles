function hasInput(gate, inputX, inputY) {
    return gate.inputs.find(input => input.x === inputX && input.y === inputY);
}

function simulateGate(_gate) {
    if (!_gate) return;
    if (isNaN(_gate.output.x) || isNaN(_gate.output.y)) return;

    const wire = placedWires.find(_wire => _wire.startX === _gate.output.x && _wire.startY === _gate.output.y);
    const gate = placedGates.find(_gate => hasInput(_gate, wire.endX, wire.endY));
    console.log(gate);
    wire.state = "test";
    drawGrid();

    return simulateGate(gate);
}

function simulate() {
    placedGates.filter(_gate => _gate.type === "INPUT").forEach(input => {
        simulateGate(input);
    })
}