function findConnectedGate(wire) {
    return placedGates.find(gate => 
        gate.inputs.find(input =>
            (input.x === wire.endX && input.y === wire.endY) ||
            (input.x === wire.startX && input.y === wire.startY )
        )
    );
}

function findOutputWire(gate) {
    if (!gate.output.x || !gate.output.y) return null;
    
    return placedWires.find(wire => 
        wire.startX === gate.output.x && 
        wire.startY === gate.output.y
    );
}

function findInputWires(gate) {
    const wires = [];
    for (const input of gate.inputs) {
        if (!input.x || !input.y) return;

        const wire = placedWires.find(wire => 
            (wire.endX === input.x && wire.endY === input.y) ||
            (wire.startX === input.x && wire.startY === input.y)
        )

        if (!wire) continue;
        wires.push(wire);
    }

    return wires;
}

function evaluateGate(gate, wire, value) {
    const inputWire = gate.inputStates.find(_wire => _wire === wire);

    if (!inputWire) return;
    gate.inputStates[gate.inputStates.indexOf(inputWire)] = value;

    if (gate.inputStates.find(_wire => isNaN(_wire))) return;
    const _gate = objects[gate.type];

    if (!_gate) return;
    const _value = _gate.evaluate(gate.inputStates, gate);

    propagateSignal(findOutputWire(gate), _value);
}

const simulatedWires = [];

function propagateSignal(wire, value) {
    if (!wire) return;
    wire.state = value? "on": "off";
    simulatedWires.push(wire);

    const gate = findConnectedGate(wire);
    if (gate) return evaluateGate(gate, wire, value);

    for (const _wire of placedWires) {
        if (simulatedWires.indexOf(_wire) !== -1) continue;
        if (
            (_wire.startX === wire.startX && _wire.startY === wire.startY) || 
            (_wire.startX === wire.endX && _wire.startY === wire.endY) ||
            (_wire.endX === wire.endX && _wire.endY === wire.endY) ||
            (_wire.endX === wire.startX && _wire.endY === wire.startY)
        ) propagateSignal(_wire, value);
    }
}

function resetCircuit() {
    placedGates.forEach(gate => {
        gate.inputStates = findInputWires(gate);
        gate.outputValue = null;
    });

    placedWires.forEach(wire => {
        wire.state = "off";
        wire.visited = false;
    });

    simulatedWires.length = 0;
}

function simulate() {
    resetCircuit();

    console.log(placedGates);

    for (const gate of placedGates) {
        if (gate.type !== "INPUT") continue;

        const wire = findOutputWire(gate);
        propagateSignal(wire, 1);
    }

    drawGrid();
    drawCanvas();

    console.log("simulation finished");
}