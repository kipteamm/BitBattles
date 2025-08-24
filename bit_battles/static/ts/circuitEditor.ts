window.onload = () => {
const editor = new Editor("editor");

editor.registerPlaceable(
    new Placeable(new Square(
        "#ffcc00",
        3
    ), "AND")
);

const state = new Placeable(new Circle(
        "#9b9b9bff",
        1.5
    ), "STATE")
editor.registerPlaceable(state);
state.listen("place", placeState);

function placeState(placed: Placed) {
    placed.setLabel(`q${editor.getPlaced().length - 1}`);
    console.log("here", placed)
}

};