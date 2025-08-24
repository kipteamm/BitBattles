window.onload = () => {
const editor = new Editor("editor");

const AND = new Placeable(
    new Square("#ffcc00", 3), 
    "AND",
    { top: 0, left: 0, radius: .20, align: false, color: "#000" },
    { top: 1, left: 0, radius: .20, align: false, color: "#000" },
    { top: 2, left: 0, radius: .20, align: false, color: "#000" },
    { top: 1, left: 3, radius: .20, align: false, color: "#000" },
);
editor.registerPlaceable(AND);


const state = new Placeable(
    new Circle("#949494ff", 1.5), 
    "STATE",
    { top: 0, left: 0, radius: 1.5, align: true, color: null },
);
editor.registerPlaceable(state);

state.listen("place", placeState);

function placeState(placed: Placed) {
    placed.setLabel(`q${editor.getPlaced().length - 1}`);
    console.log("here", placed)
}

console.log(editor);

};