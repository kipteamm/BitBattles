let playerListElement;

window.addEventListener("DOMContentLoaded", (event) => {
    playerListElement = document.getElementById("player-list");
    
    for (const player of battle.players) {
        if (document.getElementById(player.id)) continue;

        addPlayer(player);
    }
})

function addPlayer(player) {
    const element = document.createElement("div");
    element.id = player.id;
    element.innerHTML = player.username;

    playerListElement.appendChild(element);
}