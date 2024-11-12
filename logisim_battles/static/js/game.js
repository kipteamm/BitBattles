let timerElement;
let truthtable;
let alertsElement;

window.addEventListener("DOMContentLoaded", (event) => {
    timerElement = document.getElementById("timer");
    truthtable = document.getElementById("truthtable");
    alertsElement = document.getElementById("alerts");
    loadTruthtable(battle.truthtable);
    loadGates(battle.truthtable);
    requestAnimationFrame(updateTimer);
});

function loadTruthtable(data) {
    let firstOutput = false;

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

        truthtable.appendChild(column);
    }
}

function loadGates(data) {
    let inputY = 60;
    let outputY = 60;

    for (const key of Object.keys(data)) {
        if (key.charCodeAt(0) > 77) {
            const gate = objects["OUTPUT"];

            placedGates.push({
                x: 550, 
                y: outputY, 
                type: "OUTPUT", 
                rotation: 0, 
                inputs: gate.inputs.map((input) => ({x: 550 + input.x, y: outputY + input.y})), 
                output: {x: 550 + gate.output.x, y: outputY + gate.output.y},
                id: key,
            });
            outputY += 2 * gridSize;
            continue;
        }

        const gate = objects["INPUT"];

        placedGates.push({
            x: 20, 
            y: inputY, 
            type: "INPUT",
            rotation: 0, 
            inputs: gate.inputs.map((input) => ({x: 20 + input.x, y: inputY + input.y})), 
            output: {x: 20 + gate.output.x, y: inputY + gate.output.y},
            id: key,
        });
        inputY += 2 * gridSize;
    }

    drawGrid();
    drawCanvas();
}

let secondsElapsed = 0;
let lastTime = performance.now();

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secondsRemaining = seconds % 60;
    return (
        String(minutes).padStart(2, '0') + ':' +
        String(secondsRemaining).padStart(2, '0')
    );
}

function updateTimer(timestamp) {
    const elapsed = timestamp - lastTime;

    if (elapsed >= 1000) {
        secondsElapsed++;
        timerElement.textContent = formatTime(secondsElapsed);
               
        lastTime = timestamp;
    }
    requestAnimationFrame(updateTimer);
}

async function submit() {
    const response = await fetch(`/api/battle/${battle.id}/submit`, {
        method: "POST",
        body: JSON.stringify({"gates": placedGates, "wires": placedWires}),
        headers: {"Authorization": `Bearer ${getCookie("bt")}`, "Content-Type": "application/json"}
    });

    try {
        const json = await response.json()
        if (!response.ok) return sendAlert(json.error);
        if (!json.passed) return sendAlert("You did not pass the test.");
    } catch {
        sendAlert("Unexpected error.");
    }
}

let alerts = [];

function sendAlert(message) {
    if (alerts.length >= 5) {
        const element = alerts.shift();
        element.remove();
    }

    const alertElement = document.createElement("div");
    alertElement.classList.add("alert");
    alertElement.innerText = message;
    alerts.push(alertElement);
    alertsElement.appendChild(alertElement);

    updateAlertPositions();

    setTimeout(() => {
        const index = alerts.indexOf(alertElement);
        if (index > -1) {
            alerts.splice(index, 1);
            alertElement.remove();
            updateAlertPositions();
        }
    }, 30000);
}

function updateAlertPositions() {
    alerts.forEach((alert, index) => {
        alert.style.bottom = `${10 + (30 * index)}px`;
    });
}