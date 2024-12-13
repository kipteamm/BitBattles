let outputElement;
let inputElement;
let outputData;
let inputData;
let outputs = 1;
let inputs = 1;

if (document.readyState !== 'loading') {
    createChallengeInit();
} else {
    document.addEventListener('DOMContentLoaded', function () {
        createChallengeInit();
    });
}

function createChallengeInit() {
    outputElement = document.getElementById("outputs");
    outputData = document.getElementById("outputData");
    inputElement = document.getElementById("inputs");
    inputData = document.getElementById("inputData");

    inputs = challengeData.inputs;
    outputs = Object.keys(challengeData.outputs).length;
    renderInputs();
    loadOutputs(challengeData.outputs);
}

UPPERCASE_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function addInput(key, value, isOutput) {
    let column = document.getElementById(`column-${key}`);
    if (!column) {
        column = document.createElement("div");
        column.id = `column-${key}`;
        column.innerHTML = `<div class="title">${key}</div>`

        if (isOutput) {
            outputElement.appendChild(column);
        } else {
            inputElement.appendChild(column);
        }
    }

    column.innerHTML += `<div class="cell ${value? 'on': 'off'}"${isOutput? 'onclick="toggleValue(this)"': ''}>${value}</div>`;
}

function renderInputs() {
    inputElement.innerHTML = "";
    for (let row = 0; row < Math.pow(2, inputs); row++) {
        for (let column = 0; column < inputs; column++) {
            addInput(UPPERCASE_LETTERS[column], Math.floor(row / (2 ** (inputs - column - 1)) % 2), false)
        }
    }

    for (let i = 0; i < outputElement.childElementCount; i++) {
        const child = outputElement.children[i];
        for (let j = child.childElementCount - 1; j < Math.pow(2, inputs); j++) {
            addInput(child.id.replace("column-", ""), 0, true);
        }
    }

    updateOutputForm();
}

function increaseInputs() {
    if (inputs >= 4) return;

    inputs++;
    inputData.value = inputs;

    renderInputs();
    updateOutputForm();
}

function increaseOutputs() {
    if (outputs >= 12) return;
    outputs++;

    for (let i = 0; i < Math.pow(2, inputs); i++) {
        addInput(UPPERCASE_LETTERS[26 - outputs], 0, true);
    }
}

function toggleValue(div) {
    div.innerText = div.innerText === "0"? "1": "0";
    div.classList.toggle("on");
    div.classList.toggle("off");

    updateOutputForm();
}

function updateOutputForm() {
    data = {}
    for (let columnIndex = 0; columnIndex < outputElement.childElementCount; columnIndex++) {
        const column = outputElement.children[columnIndex];
        const id = column.id.replace("column-", "");

        for (let rowIndex = 0; rowIndex < column.childElementCount; rowIndex++) {
            const child = column.children[rowIndex];
            if (child.classList.contains("title")) continue;
            if (data[id]) {
                data[id].push(parseInt(child.innerText));
                continue;
            }
            data[id] = [parseInt(child.innerText)];
        }
    }

    outputData.value = JSON.stringify(data);
}

function loadOutputs(outputs) {    
    outputElement.innerHTML = "";
    for (const [key, values] of Object.entries(outputs)) {
        values.forEach(value => {
            addInput(key, value, true);
        });
    }
    outputData.value = JSON.stringify(outputs);
}