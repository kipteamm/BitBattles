"use strict";
window.onload = () => {
    const editor = new Editor("editor");
    editor.registerPlaceable(new Placeable(new Square("#ffcc00", 3), "AND"));
    editor.registerPlaceable(new Placeable(new Circle("#9b9b9bff", 1.5), "STATE"));
};
