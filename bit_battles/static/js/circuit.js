let truthtableElement;

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

    if (!truthtable) return;
    truthtableElement = document.getElementById("truthtable");
    loadTruthtable(truthtable);
}

function loadTruthtable(data) {
    const testColumn = document.getElementById("test-column");
    let firstOutput = false;
    let columnLength = 0;

    for (const [key, values] of Object.entries(data)) {
        const column = document.createElement("div");
        const title = document.createElement("div");
        title.classList.add("title")
        title.innerText = key

        column.appendChild(title);
        values.forEach(value => {
            const cell = document.createElement("div");
            cell.classList.add("cell");
            cell.classList.add(value? "on": "off");
            cell.innerText = value;

            column.appendChild(cell);
        });
        
        if (key.charCodeAt(0) > 77 && !firstOutput) {
            column.classList.add("output");
            firstOutput = true;
        }

        truthtableElement.appendChild(column);
        columnLength = values.length;
    }

    for (let i = 0; i < columnLength; i++) {
        const cell = document.createElement("div");
        cell.classList.add("cell");
        cell.classList.add("passed");
        cell.innerText = "v";
        cell.id = `test-${i}`;

        testColumn.appendChild(cell);
    }
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