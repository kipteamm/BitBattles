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
    element.innerText = player.username;

    if (player.id === battle.owner_id) {
        element.innerText += " (Host)"
    }

    playerListElement.appendChild(element);
}

async function leaveBattle() {
    const response = await fetch(`/api/battle/${battle.id}/leave`, {
        method: "DELETE",
        headers: {"Authorization": `Bearer ${getCookie("bt")}`}
    });

    if (!response.ok) return;
    return window.location.href="/app/battles"
}