function hasInput(gate, inputX, inputY) {
    return gate.inputs.find(input => input.x === inputX && input.y === inputY);
}

function evaluateGate(gate) {
    if (gate.type === "AND") return gate.inputStates.every(state => state === 1) ? 1 : 0;
    if (gate.type === "OR") return gate.inputStates.some(state => state === 1) ? 1 : 0;
    if (gate.type === "NOT") return gate.inputStates[0] === 1 ? 0 : 1;
    return 0;
}

function propagateGateOutput(gate, value) {
    const wire = placedWires.find(_wire => _wire.startX === gate.output.x && _wire.startY === gate.output.y);
    if (!wire) return;

    wire.state = value ? "on" : "off";

    const nextGate = placedGates.find(_gate => hasInput(_gate, wire.endX, wire.endY));

    console.log(nextGate)

    if (!nextGate) return;
    const inputIndex = nextGate.inputs.findIndex(input => input.x === wire.endX && input.y === wire.endY);

    console.log(inputIndex)

    if (inputIndex < 0) return;
    nextGate.inputStates[inputIndex] = value;

    if (nextGate.inputStates.find(state => state === null)) return;
    const outputValue = evaluateGate(nextGate);
    propagateGateOutput(nextGate, outputValue);
}

function simulate() {
    placedGates.filter(_gate => _gate.type === "INPUT").forEach(input => {
        propagateGateOutput(input, 1);
    });

    console.log("finish simulation");
    drawGrid();
    drawCanvas();
}
