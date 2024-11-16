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

function updatePath(path1, path2) {
    if (path1 === path2) return;
    if (path1.path.gates > path2.path.gates) return;
    path1.path.input = path2.path.input;
    path1.path.gates = path2.path.gates;
}

function evaluateGate(gate, wire, value) {
    const inputWire = gate.inputStates.find(_wire => _wire === wire);

    if (!inputWire) return;
    gate.inputStates[gate.inputStates.indexOf(inputWire)] = value;
    updatePath(gate, wire);

    if (gate.inputStates.find(_wire => isNaN(_wire))) return;
    const _gate = objects[gate.type];

    if (!_gate) return;
    const _value = _gate.evaluate(gate.inputStates, gate);
    const _wire = getOutputWire(gate);
    gate.path.gates += 1;

    propagateSignal(_wire, _value, gate);
}

function propagateSignal(wire, value, path2) {
    if (!wire || wire.visited) return;
    updatePath(wire, path2);
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
        ) propagateSignal(_wire, value, wire);
    }
}

function resetCircuit() {
    outputGates = [];
    placedGates.forEach(gate => {
        gate.inputStates = getInputWires(gate);
        gate.path = {input: null, gates: 0}
    });
    
    placedWires.forEach(wire => {
        wire.state = "off";
        wire.visited = false;
        wire.path = {input: null, gates: 0}
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
        wire.path.input = gate;
        propagateSignal(wire, states[gate.id] !== undefined? states[gate.id]: 0, wire);
    }

    drawGrid();
    drawCanvas();

    console.log("simulation finished");
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function test() {
    let longestPath = 0;
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
            longestPath = Math.max(longestPath, gate.path.gates - 1);
        });

        await delay(2000);
    }

    sendAlert("Your tests finished.");
    console.log(`Longest path: ${longestPath}`);
}

function inputClicked() {
    const states = {};
    for (let i = 0; i < placedGates.length; i++) {
        const gate = placedGates[i];
        if (gate.type !== "INPUT") continue;
        gate.id = gate.id? gate.id: i;
        states[gate.id] = gate.value;
    }
    
    simulate(states);
}

function findLongestPath() {
    let longestPath = 0;
    
    outputGates.forEach(gate => {
        longestPath = Math.max(longestPath, gate.path.gates - 1);
    });

    console.log(longestPath);
}