function findConnectedGate(wire) {
    return placedGates.find(gate => 
        gate.inputs.find(input =>
            (input.x === wire.endX && input.y === wire.endY) ||
            (input.x === wire.startX && input.y === wire.startY )
        )
    );
}

function getOutputWire(gate) {
    if (!gate.output.x || !gate.output.y) return null;
    
    return placedWires.find(wire => 
        (wire.startX === gate.output.x && wire.startY === gate.output.y) ||
        (wire.endX === gate.output.x && wire.endY === gate.output.y)
    );
}

function getInputWires(gate) {
    const wires = [];
    for (const input of gate.inputs) {
        if (!input.x || !input.y) continue;

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
    gate.visits += 1;
    gate.inputStates[gate.inputStates.indexOf(inputWire)] = value;

    if (gate.inputStates.find(_wire => isNaN(_wire))) return;
    const _gate = objects[gate.type];

    if (!_gate) return;
    const _value = _gate.evaluate(gate.inputStates, gate);

    propagateSignal(getOutputWire(gate), _value);
}

function propagateSignal(wire, value) {
    if (!wire || wire.visited) return;
    wire.state = value? "on": "off";
    wire.visited = true;

    const gate = findConnectedGate(wire);
    if (gate) return evaluateGate(gate, wire, value);

    for (const _wire of placedWires) {
        if (_wire.visited) continue;
        if (
            (_wire.startX === wire.startX && _wire.startY === wire.startY) || 
            (_wire.startX === wire.endX && _wire.startY === wire.endY) ||
            (_wire.endX === wire.endX && _wire.endY === wire.endY) ||
            (_wire.endX === wire.startX && _wire.endY === wire.startY)
        ) propagateSignal(_wire, value);
    }
}

function resetCircuit() {
    outputGates = [];
    placedGates.forEach(gate => {
        gate.visits = 0;
        gate.inputStates = getInputWires(gate);
    });

    placedWires.forEach(wire => {
        wire.state = "off";
        wire.visited = false;
    });
}

let outputGates = [];

function simulate(states = {}) {
    resetCircuit();

    for (const gate of placedGates) {
        if (gate.type === "OUTPUT") {
            outputGates.push(gate);
            continue;
        }

        if (gate.type !== "INPUT") continue;

        const wire = getOutputWire(gate);
        propagateSignal(wire, states[gate.id] !== undefined? states[gate.id]: 1);
    }

    drawGrid();
    drawCanvas();

    console.log("simulation finished");
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function test() {
    for (let i = 0; i < battle.truthtable["A"].length; i++) {
        let inputs = {};
        let outputs = {};

        for (const [key, value] of Object.entries(battle.truthtable)) {
            if (key.charCodeAt(0) > 77) {
                outputs[key] = value[i];
            } else {
                inputs[key] = value[i];
            }
        }

        console.log("start simulation");
        simulate(inputs);   

        const test = document.getElementById(`test-${i}`);
        test.classList.remove("passed");
        test.classList.remove("failed");

        outputGates.forEach(gate => {
            if (gate.inputStates[0] !== outputs[gate.id]) {
                test.classList.remove("passed");
                test.classList.add("failed");
                test.innerHTML = "x";
            } else if (!test.classList.contains("failed")) {
                test.classList.add("passed");
                test.classList.remove("failed");
                test.innerHTML = "v";
            }
        });

        await delay(2000);
    }

    sendAlert("Your tests finished.");
}