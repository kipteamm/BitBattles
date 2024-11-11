const socket = io();

socket.on("connect", function() {
    console.log("connect");

    socket.emit("join", {battle_id: battle.id, player_id: player.id}); // room=
})

socket.on("disconnect", function() {
    console.log("disconnect");
    return window.location.href = `/app/battles`;
})

socket.on("new_player", function(data) {
    if (document.getElementById(data.id)) return;
    addPlayer(data);
})