const gateEvaluators = {
    INPUT: (states) => states[0] ?? 1,
    OUTPUT: (states) => states[0] ?? 0,
    AND: (states) => (states.filter(s => s === 1).length >= 2) ? 1 : 0,
    OR: (states) => states.some(s => s === 1) ? 1 : 0,
    NOT: (states) => (states[0] === 1) ? 0 : 1
};


function resetCircuit() {
    placedGates.forEach(gate => {
        gate.inputStates = gate.inputs.map(() => null);
        gate.outputValue = null;
    });

    placedWires.forEach(wire => {
        wire.state = "off";
        wire.visited = false;
    });
}

function findConnectedGate(wire) {
    return placedGates.find(gate => 
        gate.inputs.find(input => input.x === wire.endX && input.y === wire.endY)
    );
}

function findOutputWire(gate) {
    if (!gate.output.x || !gate.output.y) return null;
    
    return placedWires.find(wire => 
        wire.startX === gate.output.x && 
        wire.startY === gate.output.y
    );
}

function evaluateGate(gate) {
    const evaluator = gateEvaluators[gate.type];
    if (!evaluator) return 0;

    // Default any null inputs to 0 for evaluation
    const inputStates = gate.inputStates.map(state => state ?? 0);
    return evaluator(inputStates);
}

function propagateSignal(gate, visited = new Set()) {
    const gateId = `${gate.x},${gate.y},${gate.type}`;
    if (visited.has(gateId)) return;
    visited.add(gateId);

    const outputValue = evaluateGate(gate);
    gate.outputValue = outputValue;

    const outputWire = findOutputWire(gate);
    if (!outputWire) return;

    outputWire.state = outputValue ? "on" : "off";

    const connectedGate = findConnectedGate(outputWire);
    const inputIndex = connectedGate.inputs.findIndex(
        input => input.x === outputWire.endX && input.y === outputWire.endY
    );

    if (inputIndex < 0) return;
    connectedGate.inputStates[inputIndex] = outputValue;
    propagateSignal(connectedGate, visited);
}

function simulate() {
    resetCircuit();

    const inputGates = placedGates.filter(gate => gate.type === "INPUT");
    inputGates.forEach(inputGate => {
        propagateSignal(inputGate, new Set());
    });

    console.log("finish simulation");
    drawGrid();
    drawCanvas();
}