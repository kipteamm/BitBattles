class Square extends Shape {
    constructor (color: string, size: number) {
        super(color);

        this.size = size * gridSize;
    }

    getSize() { return this.size; }

    draw(ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number, label: string) {
        ctx.fillStyle = this.color;
        ctx.fillRect(x, y, this.size, this.size);

        this.drawLabel(ctx, x, y, rotation, label);
    }
    drawOutline(ctx: CanvasRenderingContext2D, x: number, y: number) {
        ctx.strokeStyle = "black";
        ctx.beginPath();
        ctx.roundRect(x - gridSize/4, y - gridSize/4, this.size + gridSize/2, this.size + gridSize/2, [5, 5, 5, 5]);
        ctx.stroke();
    }
}

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

class Wire extends PlaceableConnection {
    endX: number = 0;
    endY: number = 0;
    color = "#1d5723";

    _checkGhost(startX: number, startY: number) {
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

    valid(connection1: Connector, connection2: Connector): boolean {
        if (connection1.x === connection2.x) return true;
        if (connection1.y === connection2.y) return true;
        return false;
    }

    drawGhost(ctx: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number, connector: Connector | undefined): void {
        if (connector) {
            this.endX = connector.x - gridSize / 2; // No need to offset because connector is already offset.
            this.endY = connector.y - gridSize / 2; // No need to offset because connector is already offset.
        } else {
            this.endX = endX;
            this.endY = endY;
        }

        const isValid = this._checkGhost(startX, startY);

        if (!isValid) ctx.globalAlpha = 0.5;
        this.draw(ctx, startX, startY, this.endX, this.endY, isValid? this.color: "#a60000");
        if (!isValid) ctx.globalAlpha = 1;
    }

    draw(ctx: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number, color: string): void {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }
}


window.onload = () => {
const editor = new Editor("editor", new Wire());

const INPUT = new Placeable(
    new Square("#1d5723", 1), 
    "IN",
    { top: 0, left: 1, radius: .20, align: false, color: "#000" },
);
editor.registerPlaceable(INPUT);

const AND = new Placeable(
    new Square("#ffcc00", 3), 
    "AND",
    { top: 0, left: 0, radius: .20, align: false, color: "#000" },
    { top: 1, left: 0, radius: .20, align: false, color: "#000" },
    { top: 2, left: 0, radius: .20, align: false, color: "#000" },
    { top: 1, left: 3, radius: .20, align: false, color: "#000" },
);
editor.registerPlaceable(AND);

console.log(editor);

};