function getColor() {
    return '#'+(Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0');
}

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

// @ts-expect-error Complains about the Circle in stateEditor (both have circles)
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
        
        this.drawLabel(ctx, x, y, rotation, label);

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


const INPUT = new Placeable(
    new Square("#1d5723", 1), 
    "IN",
    { top: 0, left: 1, radius: .20, align: false, color: "#000" },
);

const OUTPUT = new Placeable(
    new Circle("#1d5723", .5), 
    "OUT",
    { top: 0, left: 0, radius: .20, align: false, color: "#000" },
);

const AND = new Placeable(
    new Square("#ffcc00", 3), 
    "AND",
    { top: 0, left: 0, radius: .20, align: false, color: "#000" },
    { top: 1, left: 0, radius: .20, align: false, color: "#000" },
    { top: 2, left: 0, radius: .20, align: false, color: "#000" },
    { top: 1, left: 3, radius: .20, align: false, color: "#000" },
);


function click(_: PointerEvent) {
    const hovering = editor.getHovering();

    if (editor.getMode() === Mode.DEBUG) {
        if (!(hovering instanceof Placed)) return;
        if (hovering.getLabel() !== "IN") return;

        console.log(hovering);
        return;
    }
    if (!(hovering instanceof Connection)) return;

    const [worldX, wordlY] = editor.getWorldCoordinates();
    const connector = new Connector(worldX + gridSize/2, wordlY + gridSize/2, gridSize/5, null, true);
    editor.addConnector(connector);
    editor.connect(connector);
}

function connect(startConnector: Connector, endConnector: Connector) {
    splitWire(startConnector, editor.findConnection(startConnector.x, startConnector.y, 1));
    splitWire(endConnector, editor.findConnection(endConnector.x, endConnector.y, 1));

    if (startConnector.getConnections().size === 2) mergeWire(startConnector);
    if (endConnector.getConnections().size === 2) mergeWire(endConnector);
}

function splitWire(connector: Connector, connection: Connection | undefined) {
    if (!connection) return;
    if (connection.startConnector === connector || connection.endConnector === connector) return;
    connector.setColor("#000");

    const wire = new Connection(
        connector,
        connection.endConnector,
        "#1d5723"
    );

    connection.updateConnectors(connection.startConnector, connector);
    editor.addConnection(wire);
}

function deleteConnection(connection: Connection) {
    const startConnections = connection.startConnector.getConnections().size;
    const endConnections = connection.endConnector.getConnections().size;

    if (startConnections === 2) mergeWire(connection.startConnector);    
    if (endConnections === 2) mergeWire(connection.endConnector);
    if (startConnections === 1 && connection.startConnector.isTemporary()) connection.startConnector.setColor(null);
    if (endConnections === 1 && connection.endConnector.isTemporary()) connection.endConnector.setColor(null);
    if (startConnections === 0) editor.deleteConnector(connection.startConnector); console.log("remove ", connection.startConnector);
    if (endConnections === 0) editor.deleteConnector(connection.endConnector); console.log("remove ", connection.endConnector);
}

function mergeWire(connector: Connector) {
    const [wire, temp] = connector.getConnections();
    if (wire.isHorizontal() !== temp.isHorizontal()) return;
    
    const startConnector = wire.startConnector === connector? wire.endConnector: wire.startConnector;
    const endConnector = temp.startConnector === connector? temp.endConnector: temp.startConnector;
    
    wire.updateConnectors(startConnector, endConnector);
    editor.deleteConnection(temp, true);
}


let editor: Editor;
window.onload = () => {
    editor = new Editor("editor", new Wire());

    editor.registerPlaceable(INPUT);
    editor.registerPlaceable(OUTPUT);
    editor.registerPlaceable(AND);

    editor.registerListener("click", click);
    editor.registerListener("connect", connect);
    editor.registerListener("deleteConnection", deleteConnection);

    console.log(editor);
};
