const socket = io();

socket.on("connect", function() {
    console.log("connect");

    socket.emit("join", {battle_id: battle.id, player_id: player.id});
});

socket.on("disconnect", function() {
    console.log("disconnect");
    return window.location.href = `/app/battles`;
});

socket.on("new_stage", function() {
    return window.location.reload();
});

socket.on("player_join", function(data) {
    if (document.getElementById(data.id)) return;
    addPlayer(data);
});

socket.on("player_leave", function(data) {
    document.getElementById(data.id)?.remove();
});

socket.on("finish", function(data) {
    sendAlert(`${data.username} finished in ${data.submission_on - battle.started_on} with ${data.gates} gates`);
});

socket.on("disband", function() {
    return window.location.href="/app/battles";
});