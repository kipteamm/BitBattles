let timerElement;
let truthtable;
let alertsElement;
let resultsPlayerList;
let currentStage = null;

if (document.readyState !== 'loading') {
    pageInit();
} else {
    document.addEventListener('DOMContentLoaded', function () {
        pageInit();
    });
}

function pageInit() {
    timerElement = document.getElementById("timer");
    truthtable = document.getElementById("truthtable");
    alertsElement = document.getElementById("alerts");
    resultsPlayerList = document.getElementById("results-player-list");
    loadStage(battle.stage);
}

function resetGame() {
    secondsElapsed = 0;
    placedGates = [];
    placedWires = [];
    placedConnectors = [];
    rotation = 0;
    
    bufferContext.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawCanvas();

    const children = [...truthtable.children];
    for (const child of children) {
        if (child.id === "test-column") {
            child.innerHTML = '<div class="title">Pass</div>';
            continue;
        }
        child.remove();
    }
}

let gamesCounter = 0;

function loadStage(stage) {
    if (currentStage) currentStage.classList.remove("active");
    currentStage = document.getElementById(stage);
    currentStage.classList.add("active");

    if (stage === "queue" && gamesCounter) {
        resetGame();
    }
    if (stage === "battle") {
        secondsElapsed = Math.round((new Date().getTime() / 1000) - battle.started_on)
        timerElement.textContent = formatTime(secondsElapsed);
        loadGateButtons(battle.gates);
        loadTruthtable(battle.truthtable);
        loadGates(battle.truthtable);
    }
    if (stage === "results") {
        loadResults();
        gamesCounter++;
    }
}

function loadGateButtons(gates) {
    gates.forEach(gate => {
        document.getElementById(`${gate}-btn`).classList.add("active");
    });
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

        truthtable.appendChild(column);
        columnLength = values.length;
    }

    for (let i = 0; i < columnLength; i++) {
        const cell = document.createElement("div");
        cell.classList.add("cell");
        cell.innerText = "v";
        cell.id = `test-${i}`;

        testColumn.appendChild(cell);
    }
}

function loadGates(data) {
    let inputY = 120;
    let outputY = 120;

    for (const key of Object.keys(data)) {
        if (key.charCodeAt(0) > 77) {
            const gate = objects["OUTPUT"];
            const [inputCoordinates, outputCoordinates] = setConnectors(gate, 1000, outputY);

            placedGates.push({
                x: 1000, 
                y: outputY, 
                type: "OUTPUT", 
                rotation: 0, 
                inputs: inputCoordinates, 
                output: outputCoordinates,
                state: "off",
                id: key,
            });
            outputY += 2 * gridSize;
            continue;
        }

        const gate = objects["INPUT"];
        const [inputCoordinates, outputCoordinates] = setConnectors(gate, 520, inputY);

        placedGates.push({
            x: 520, 
            y: inputY, 
            type: "INPUT",
            rotation: 0, 
            inputs: inputCoordinates, 
            output: outputCoordinates,
            state: "off",
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

setInterval(() => {
    secondsElapsed++;
    timerElement.textContent = formatTime(secondsElapsed);
}, 1000);

async function submit() {
    test(battle.truthtable, true);
    const response = await fetch(`/api/battle/${battle.id}/submit`, {
        method: "POST",
        body: JSON.stringify({"gates": placedGates, "wires": placedWires}),
        headers: {"Authorization": `Bearer ${getCookie("bt")}`, "Content-Type": "application/json"}
    });

    try {
        const json = await response.json();
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


function addResultPlayer(_player, gatesAverage, pathAverage, timeAverage) {
    const element = document.createElement("div");
    element.classList.add("player");
    if (_player.id === player.id) element.classList.add("you");
    const timePerformance = (_player.time - timeAverage).toFixed(2);
    const gatePerformance = (_player.gates - gatesAverage).toFixed(2);
    const pathPerformance = (_player.longest_path - pathAverage).toFixed(2);
    element.innerHTML = `
        <h4>[${_player.score}] ${_player.username}${_player.id === player.id? " (you)": ""}</h4>
    `

    if (_player.passed) {
        element.innerHTML += `
            <p>
                <b>Time:</b> ${formatSeconds(_player.time)} (${timePerformance <= 0? 
                    `<span class="good">${timePerformance}s</span>`: 
                    `<span class="bad">+${timePerformance}s</span>`
                }) <b>Gates:</b> ${_player.gates} (${gatePerformance <= 0? 
                    `<span class="good">${gatePerformance}</span>`: 
                    `<span class="bad">+${gatePerformance}</span>`
                }) <b>Longest path:</b> ${_player.longest_path} (${pathPerformance <= 0? 
                    `<span class="good">${pathPerformance}</span>`: 
                    `<span class="bad">+${pathPerformance}</span>`
                })
            </p>
        `
    }
    return element;
}

async function loadResults() {
    const battleElement = document.createElement("div");
    battleElement.classList.add("battle-results");
    battleElement.id = `battle-${gamesCounter + 1}`;

    let gatesAverage = 0;
    let pathAverage = 0;
    let timeAverage = 0;
    let players = 0;

    for (const _player of battle.players) {
        if (!_player.passed) continue;
        
        gatesAverage += _player.gates;
        pathAverage += _player.longest_path;
        timeAverage += _player.time;
        players += 1;
    }

    gatesAverage /= players;
    pathAverage /= players;
    timeAverage /= players;
    
    battleElement.innerHTML += `
        <h2>Battle ${gamesCounter + 1}</h2>
        <ul>
            <li><b>Average gates:</b> ${gatesAverage.toFixed(2)}</li>
            <li><b>Average longest path:</b> ${pathAverage.toFixed(2)}</li>
            <li><b>Average time:</b> ${formatSeconds(timeAverage.toFixed(2))}</li>
        </ul>    
    `
    document.querySelector(".player.you")?.classList.remove("you");
    battle.players.forEach(_player => {
        battleElement.appendChild(addResultPlayer(_player, gatesAverage, pathAverage, timeAverage));
    });

    resultsPlayerList.insertBefore(battleElement, document.getElementById(`battle-${gamesCounter}`));
}

async function restartGame() {
    const response = await fetch(`/api/battle/${battle.id}/restart`, {
        method: "POST",
        headers: {"Authorization": `Bearer ${getCookie("bt")}`}
    });

    if (!response.ok) return;
}

function formatSeconds(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(3);

    return `${minutes}m ${remainingSeconds}s`;
}