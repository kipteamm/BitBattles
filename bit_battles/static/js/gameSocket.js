const socket = io();

socket.on("connect", function() {
    console.log("connect");
    socket.emit("join", {battle_id: battle.id, player_id: player.id});
});

socket.on("disconnect", function() {
    console.log("disconnected");
});

socket.on("player_join", function(data) {
    if (document.getElementById(data.id)) return;
    if (document.readyState !== 'loading') return addPlayer(data);
    document.addEventListener('DOMContentLoaded', function () {
        addPlayer(data);
    });
});

socket.on("player_leave", function(data) {
    document.getElementById(data.id)?.remove();
});

socket.on("finish", function(data) {
    sendAlert(`${data.username} finished in ${formatSeconds(data.submission_on - battle.started_on)} with ${data.gates} gate${data.gates === 1? "": "s"} (longest path: ${data.longest_path})`);
});

socket.on("update_battle", function(data) {
    battle = data;
    loadStage(data.stage);
});

socket.on("disband", function() {
    return window.location.href="/app/battles";
});