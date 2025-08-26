"use strict";
class Square extends Shape {
    constructor(color, size) {
        super(color);
        this.size = size * gridSize;
    }
    getSize() { return this.size; }
    draw(ctx, x, y, rotation, label) {
        ctx.fillStyle = this.color;
        ctx.fillRect(x, y, this.size, this.size);
        this.drawLabel(ctx, x, y, rotation, label);
    }
    drawOutline(ctx, x, y) {
        ctx.strokeStyle = "black";
        ctx.beginPath();
        ctx.roundRect(x - gridSize / 4, y - gridSize / 4, this.size + gridSize / 2, this.size + gridSize / 2, [5, 5, 5, 5]);
        ctx.stroke();
    }
}
class Circle extends Shape {
    constructor(color, radius) {
        super(color);
        this.size = radius * gridSize;
    }
    getSize() { return this.size * 2; }
    draw(ctx, x, y, rotation, label) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(x + this.size, y + this.size, this.size, 0, Math.PI * 2);
        ctx.fill();
        this.drawLabel(ctx, x, y, rotation, label);
    }
    drawOutline(ctx, x, y) {
        ctx.strokeStyle = "black";
        ctx.beginPath();
        ctx.arc(x + this.size, y + this.size, this.size + gridSize / 4, 0, Math.PI * 2);
        ctx.stroke();
    }
}
class Wire extends PlaceableConnection {
    constructor() {
        super(...arguments);
        this.endX = 0;
        this.endY = 0;
        this.color = "#1d5723";
    }
    _checkGhost(startX, startY) {
        const isHoriztonal = Math.abs(startX - this.endX) > Math.abs(startY - this.endY);
        if (isHoriztonal) {
            this.endY += gridSize / 2;
            this.endX += gridSize / 2;
            return startY === this.endY;
        }
        this.endX += gridSize / 2;
        this.endY += gridSize / 2;
        return startX === this.endX;
    }
    valid(connection1, connection2) {
        if (connection1.x === connection2.x)
            return true;
        if (connection1.y === connection2.y)
            return true;
        return false;
    }
    drawGhost(ctx, startX, startY, endX, endY, connector) {
        if (connector) {
            this.endX = connector.x - gridSize / 2; // No need to offset because connector is already offset.
            this.endY = connector.y - gridSize / 2; // No need to offset because connector is already offset.
        }
        else {
            this.endX = endX;
            this.endY = endY;
        }
        const isValid = this._checkGhost(startX, startY);
        if (!isValid)
            ctx.globalAlpha = 0.5;
        this.draw(ctx, startX, startY, this.endX, this.endY, isValid ? this.color : "#a60000");
        if (!isValid)
            ctx.globalAlpha = 1;
    }
    draw(ctx, startX, startY, endX, endY, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }
}
let editor;
window.onload = () => {
    editor = new Editor("editor", new Wire());
    const INPUT = new Placeable(new Square("#1d5723", 1), "IN", { top: 0, left: 1, radius: .20, align: false, color: "#000" });
    editor.registerPlaceable(INPUT);
    const OUTPUT = new Placeable(new Circle("#1d5723", .5), "OUT", { top: 0, left: 0, radius: .20, align: false, color: "#000" });
    editor.registerPlaceable(OUTPUT);
    const AND = new Placeable(new Square("#ffcc00", 3), "AND", { top: 0, left: 0, radius: .20, align: false, color: "#000" }, { top: 1, left: 0, radius: .20, align: false, color: "#000" }, { top: 2, left: 0, radius: .20, align: false, color: "#000" }, { top: 1, left: 3, radius: .20, align: false, color: "#000" });
    editor.registerPlaceable(AND);
    editor.registerListener("click", clickListener);
    function clickListener(event) {
        const hovering = editor.getHovering();
        if (!(hovering instanceof Connection))
            return;
        const [worldX, wordlY] = editor.getWorldCoordinates();
        const connector = new Connector(worldX + gridSize / 2, wordlY + gridSize / 2, gridSize / 5, "#000");
        editor.addConnector(connector);
        editor.connect(connector);
        console.log(hovering);
    }
    console.log(editor);
};
