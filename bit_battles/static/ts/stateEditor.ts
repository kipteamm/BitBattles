// @ts-expect-error Complains about the Circuit Circle (files cannot intermingle)
class Circle extends Shape {
    constructor (color: string, radius: number) {
        super(color);

        this.size = radius * gridSize;
    }

    getSize() { return this.size * 2; }

    draw(ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number, label: string) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(x + this.size, y + this.size, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        this.drawLabel(ctx, x, y, 0, label);

    }
    drawOutline(ctx: CanvasRenderingContext2D, x: number, y: number) {
        ctx.strokeStyle = "black";
        ctx.beginPath();
        ctx.arc(x + this.size, y + this.size, this.size + gridSize/4, 0, Math.PI * 2);
        ctx.stroke();
    }
}


window.onload = () => {
const editor = new Editor("editor", new Wire());

const state = new Placeable(
    new Circle("#949494ff", 1.5), 
    "STATE",
    { top: 1, left: 1.5, radius: 1.5, align: true, color: null },
);
editor.registerPlaceable(state);

editor.registerListener("place", placeState);
function placeState(placed: Placed) {
    placed.setLabel(`q${editor.getPlaced().length - 1}`);
    console.log("here", placed)
}

console.log(editor);

};