const gridSize = 20;

class Shape {
    protected color: string = "#123456";
    protected size: number = 0;

    constructor (color: string) {
        this.color = color;
    }

    getSize() { return 0; }

    draw (ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number, label: string) {};
    drawLabel(ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number, label: string) {
        const centerX = x + (this.getSize()) / 2;
        const centerY = y + (this.getSize()) / 2;

        ctx.save();
        ctx.translate(centerX, centerY);    
        ctx.rotate((rotation * Math.PI) / 180);
        
        ctx.fillStyle = "black";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, 0, 0);

        ctx.restore()
    }
    drawOutline(ctx: CanvasRenderingContext2D, x: number, y: number) {};
}

class Square extends Shape {
    constructor (color: string, size: number) {
        super(color);

        this.size = size * gridSize;
    }

    getSize() { return this.size; }

    override draw(ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number, label: string) {
        ctx.fillStyle = this.color;
        ctx.fillRect(x, y, this.size, this.size);

        this.drawLabel(ctx, x, y, rotation, label);
    }

    override drawOutline(ctx: CanvasRenderingContext2D, x: number, y: number) {
        ctx.fillStyle = "black";
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

    override draw(ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number, label: string) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(x + this.size, y + this.size, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        this.drawLabel(ctx, x, y, 0, label);

    }
    override drawOutline(ctx: CanvasRenderingContext2D, x: number, y: number) {
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(x + this.size, y + this.size, this.size + gridSize/4, 0, Math.PI * 2);
        ctx.stroke();
    }
}

interface PlaceableConnector {
    top: number;
    left: number;
    radius: number;
    align: boolean;
    color: string | null;
}

class Placeable {
    private editor!: Editor;
    private shape: Shape;
    private label: string;
    private connectors: PlaceableConnector[];
    
    private events: Record<string, CallableFunction> = {};

    constructor (shape: Shape, label: string, ...connectors: PlaceableConnector[]) {
        this.shape = shape
        this.label = label
        this.connectors = connectors;
    }

    _setEditor(editor: Editor) { this.editor = editor; }

    _getButton () {
        const button = document.createElement("button");
        button.addEventListener("click", () => this.editor.togglePlaceable(this));
        button.innerText = this.label;

        return button
    }

    getShape() { return this.shape; }
    getLabel() { return this.label; }
    getConnectors() { return this.connectors; }

    listen (event: string, callable: CallableFunction) {
        this.events[event] = callable;
    }

    fire (event: string, ...args: any[]) {
        this.events[event]?.(...args);
    }

    draw(ctx: CanvasRenderingContext2D, snappedX: number, snappedY: number, rotation: number) {
        this.shape.draw(ctx, snappedX, snappedY, rotation, this.label);
    }
}

class Connector {
    x: number;
    y: number;
    size: number;
    color: string | null;

    constructor (x: number, y: number, radius: number, color: string | null) {
        this.x = x;
        this.y = y;
        this.size = radius;
        this.color = color;
    }

    getColor() { return this.color; }

    draw(ctx: CanvasRenderingContext2D) {
        if (!this.color) return;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
    drawOutline(ctx: CanvasRenderingContext2D) {
        if (!this.color) return;
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size + gridSize/4, 0, Math.PI * 2);
        ctx.stroke();
    }

    overlaps(snappedX: number, snappedY: number, overlapSize: number) {
        // We add a small offset gridSize/4 to make it easier to find a connector
        return (
            snappedX + overlapSize > this.x - this.size - gridSize/4 &&
            snappedX < this.x + this.size + gridSize/4 &&
            snappedY + overlapSize > this.y - this.size - gridSize/4 &&
            snappedY < this.y + this.size + gridSize/4
        )
    }
}

class Placed {
    private shape: Shape;
    private label: string;
    private connectors: Connector[] = [];
    private x: number;
    private y: number;
    private rotation: number;
    
    constructor (shape: Shape, label: string, _connectors: PlaceableConnector[], x: number, y: number, rotation: number) {
        this.shape = shape
        this.label = label
        this.x = x;
        this.y = y;
        this.rotation = (shape instanceof Square)? rotation: 0;

        _connectors.forEach(connector => {
            let connectorX = this.x;
            let connectorY = this.y

            if (this.shape instanceof Circle) {
                connectorX += this.shape.getSize() / 2;
                connectorY += this.shape.getSize() / 2;
            } else {
                // An offset (gridSize / 2) is applied because circles appear offsetted.
                switch (rotation) {
                    case 90:
                        connectorX += connector.top * gridSize + (gridSize / 2);
                        connectorY += connector.left * gridSize;
                        break;
                    case 180:
                        connectorX += (connector.left * gridSize + this.shape.getSize()) % (this.shape.getSize() * 2);
                        connectorY += connector.top * gridSize + (gridSize / 2);
                        break;
                    case 270:
                        connectorX += (connector.top * gridSize) + (gridSize / 2);
                        connectorY += (connector.left * gridSize + this.shape.getSize()) % (this.shape.getSize() * 2);
                        break;
                    default:
                    case 0:
                        connectorX += connector.left * gridSize;
                        connectorY += connector.top * gridSize + (gridSize / 2);
                        break;
                }
            }

            this.connectors.push(new Connector(
                connectorX,
                connectorY,
                connector.radius * gridSize,
                connector.color
            ));
        });
    }

    getConnectors() { return this.connectors; }
    getLabel() { return this.label; }

    setLabel(label: string) { this.label = label; }

    draw(ctx: CanvasRenderingContext2D) {
        this.shape.draw(ctx, this.x, this.y, this.rotation, this.label);
        this.connectors.forEach(connector => connector.draw(ctx));
    }

    drawOutline(ctx: CanvasRenderingContext2D) {
        this.shape.drawOutline(ctx, this.x, this.y);
    }

    overlaps(snappedX: number, snappedY: number, overlapSize: number) {
        return (
            snappedX + overlapSize > this.x &&
            snappedX < this.x + this.shape.getSize() &&
            snappedY + overlapSize > this.y &&
            snappedY < this.y + this.shape.getSize() 
        )
    }
}

class Editor {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    private placeables: Record<string, Placeable> = {};
    private toolbar: HTMLElement;

    private placing: Placeable | null = null;
    private hovering: Placed | Connector | undefined = undefined;
    private rotation: number = 0;
    private moving: boolean = false;

    private placed: Placed[] = [];
    private connectors: Connector[] = [];

    private dragging = false;
    private panX = 0;
    private panY = 0;
    private lastX = 0;
    private lastY = 0;
    private zoom = 1;

    constructor (canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas.getContext("2d")!;

        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        this.toolbar = document.getElementById("toolbar") as HTMLElement;

        this.setupPanControls();
        this.registerListeners();
        this.draw();
    }

    private _getWorldCoordinates() {
        const worldX = this.lastX - this.panX;
        const worldY = this.lastY - this.panY;

        const snappedX = Math.floor(worldX / gridSize) * gridSize;
        const snappedY = Math.floor(worldY / gridSize) * gridSize;

        return [snappedX, snappedY];
    }

    private setupPanControls() {
        this.canvas.addEventListener("mousedown", (e) => {
            if (e.button !== 2) return;
            this.dragging = true;
            this.lastX = e.clientX;
            this.lastY = e.clientY;
        });

        this.canvas.addEventListener("mousemove", (e) => {
            if (this.dragging) {
                const dx = e.clientX - this.lastX;
                const dy = e.clientY - this.lastY;
                this.panX += dx;
                this.panY += dy;

                this.canvas.style.backgroundPosition = `${(gridSize * this.zoom) / 2 + this.panX}px ${(gridSize * this.zoom) / 2 + this.panY}px`;
            }

            this.lastX = e.clientX;
            this.lastY = e.clientY;

            if (!this.dragging) {
                const [snappedX, snappedY] = this._getWorldCoordinates()

                this.hovering = this.findConnector(this.lastX - this.panX, this.lastY - this.panY, 1);
                if (this.hovering && this.hovering.getColor()) return this.draw();

                this.hovering = this.findGate(snappedX, snappedY, 1);
            }

            this.draw();
        });

        this.canvas.addEventListener("mouseup", () => this.dragging = false);
    }

    private registerListeners() {
        this.canvas.addEventListener("click", (e) => {
            const [snappedX, snappedY] = this._getWorldCoordinates()

            if (this.placing) {
                const gate = this.findGate(snappedX, snappedY, this.placing.getShape().getSize());

                if (gate) return;
                if (this.hovering) return;

                const placed = new Placed(
                    this.placing.getShape(),
                    this.placing.getLabel(),
                    this.placing.getConnectors(),
                    snappedX,
                    snappedY,
                    this.rotation
                )
    
                this.placed.push(placed);
                this.connectors.push(...placed.getConnectors());
                this.placing.fire("place", placed);

                if (!this.moving) return;
                this.moving = false;
                this.togglePlaceable(null);
            }

            if (!(this.hovering instanceof Placed)) return;
            this.placing = this.placeables[this.hovering.getLabel()];
            this.deletePlaced(this.hovering);
            this.moving = true;
        });

        this.canvas.addEventListener("contextmenu", (e) => {
            e.preventDefault()

            if (!(this.hovering instanceof Placed)) return;
            this.deletePlaced(this.hovering);
        });

        window.addEventListener("keydown", (e) => {
            switch (e.key) {
                case "Escape":
                    if (this.placing) this.togglePlaceable();
                    break;
                case "Delete":
                    if (this.hovering && this.hovering instanceof Placed) this.deletePlaced(this.hovering);
                    break;
                case "z":
                    this.rotation = this.rotation === 360? 90: this.rotation + 90;
                    break;
                case "ArrowUp":
                    this.rotation = 90;
                    break;
                case "ArrowLeft":
                    this.rotation = 0;
                    break;
                case "ArrowDown":
                    this.rotation = 270;
                    break;
                case "ArrowRight":
                    this.rotation = 180;
                    break;
                default: return;
            }

            this.draw();
        })
    }

    private draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(this.panX, this.panY);

        this.placed.forEach(elm => { elm.draw(this.ctx); });
        if (this.placing) this.drawPlacing();
        if (this.hovering && !this.placing) this.hovering.drawOutline(this.ctx);

        this.ctx.restore();
    }

    private drawPlacing() {
        if (!this.placing) return;
        if (this.hovering) return;

        let [snappedX, snappedY] = this._getWorldCoordinates()
        if (this.findGate(snappedX, snappedY, this.placing.getShape().getSize())) return;

        this.ctx.globalAlpha = 0.5;
        this.placing.draw(this.ctx, snappedX, snappedY, this.rotation);
        this.ctx.globalAlpha = 1;
    }

    getContext() { return this.ctx; }
    getPlaced() { return this.placed; }

    registerPlaceable(placeable: Placeable) { 
        placeable._setEditor(this);

        this.placeables[placeable.getLabel()] = placeable;
        this.toolbar.appendChild(placeable._getButton());
    }

    togglePlaceable(placeable: Placeable | null = null) {
        this.placing = (this.placing === placeable)? null: placeable;
        this.rotation = 0;

        if (!this.placing) return this.draw();
    }

    findConnector(snappedX: number, snappedY: number, overlapSize: number) {
        return this.connectors.find(elm => elm.overlaps(snappedX, snappedY, overlapSize));
    }

    findGate(snappedX: number, snappedY: number, overlapSize: number) {
        return this.placed.find(elm => elm.overlaps(snappedX, snappedY, overlapSize));
    } 

    deletePlaced(placed: Placed) {
        this.connectors.splice(this.connectors.indexOf(placed.getConnectors()[0]), placed.getConnectors().length)
        this.placed.splice(this.placed.indexOf(placed), 1);

        if (placed === this.hovering) this.hovering = undefined;
    }
}