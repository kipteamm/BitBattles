const gridSize = 20;

abstract class Shape {
    protected color: string = "#123456";
    protected size: number = 0;

    constructor (color: string) {
        this.color = color;
    }

    drawLabel(ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number, label: string) {
        const centerX = x + (this.getSize()) / 2;
        const centerY = y + (this.getSize()) / 2;

        ctx.save();
        ctx.translate(centerX, centerY);    
        ctx.rotate((rotation * Math.PI) / 180);
        
        ctx.fillStyle = "white";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, 0, 0);

        ctx.restore()
    }

    abstract getSize(): number;
    abstract draw(ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number, label: string): void;
    abstract drawOutline(ctx: CanvasRenderingContext2D, x: number, y: number): void;
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

    draw(ctx: CanvasRenderingContext2D, snappedX: number, snappedY: number, rotation: number) {
        this.shape.draw(ctx, snappedX, snappedY, rotation, this.label);
    }
}

class Connector {
    x: number;
    y: number;
    size: number;
    color: string | null;
    temporary: boolean;
    connections: Set<Connection> = new Set<Connection>();

    constructor (x: number, y: number, radius: number, color: string | null, temporary: boolean) {
        this.x = x;
        this.y = y;
        this.size = radius;
        this.color = color;
        this.temporary = temporary;
    }

    getColor() { return this.color; }
    setColor(color: string | null) { this.color = color; }
    isTemporary() { return this.temporary; }
    getConnections() { return this.connections; }

    addConnection(connection: Connection) {
        this.connections.add(connection);
    }
    removeConnection(connection: Connection) {
        this.connections.delete(connection);
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (!this.color) return;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
    drawOutline(ctx: CanvasRenderingContext2D) {
        ctx.strokeStyle = "black";
        ctx.lineWidth = 1;
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
    private category : string;
    private connectors: Connector[] = [];
    private x: number;
    private y: number;
    private rotation: number;
    
    constructor (shape: Shape, label: string, _connectors: PlaceableConnector[], x: number, y: number, rotation: number) {
        this.shape = shape
        this.category = label;
        this.label = label
        this.x = x;
        this.y = y;
        this.rotation = (shape instanceof Square)? rotation: 0;

        _connectors.forEach(connector => {
            let connectorX = this.x;
            let connectorY = this.y

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

            this.connectors.push(new Connector(
                connectorX,
                connectorY,
                connector.radius * gridSize,
                connector.color,
                false
            ));
        });
    }

    getConnectors() { return this.connectors; }
    getLabel() { return this.label; }
    getRotation() { return this.rotation; }
    getCategory() { return this.category; }

    setLabel(label: string) { this.label = label; }

    draw(ctx: CanvasRenderingContext2D) {
        this.shape.draw(ctx, this.x, this.y, this.rotation, this.label);
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

abstract class PlaceableConnection {
    color: string = "#000";

    getColor() { return this.color; }
    abstract valid(connection1: Connector, connection2: Connector): boolean;
    abstract drawGhost(ctx: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number, hovering: Connector | undefined): void;
    abstract draw(ctx: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number, color: string): void;
}

class Connection {
    startConnector!: Connector;
    endConnector!: Connector;
    color: string;
    horizontal: boolean = true;

    constructor (startConnector: Connector, endConnector: Connector, color: string) {
        this.color = color;
        this.updateConnectors(startConnector, endConnector);
    }

    updateConnectors(startConnector: Connector, endConnector: Connector) {
        if (startConnector === endConnector) { console.log("here"); return; }

        if (this.startConnector && this.startConnector !== startConnector) this.startConnector.removeConnection(this);
        if (this.endConnector && this.endConnector !== endConnector) this.endConnector.removeConnection(this);

        this.horizontal = startConnector.y === endConnector.y;
        if (this.horizontal) {
            this.startConnector = (startConnector.x > endConnector.x)? endConnector: startConnector;
            this.endConnector = (startConnector.x > endConnector.x)? startConnector: endConnector;
        } else {
            this.startConnector = (startConnector.y > endConnector.y)? endConnector: startConnector;
            this.endConnector = (startConnector.y > endConnector.y)? startConnector: endConnector;
        }

        this.startConnector.addConnection(this);
        this.endConnector.addConnection(this);
    }

    isHorizontal() { return this.horizontal }
    getColor() { return this.color; }
    setColor(color: string) { this.color = color; }

    draw(ctx: CanvasRenderingContext2D, connector: PlaceableConnection) {
        connector.draw(ctx, this.startConnector.x, this.startConnector.y, this.endConnector.x, this.endConnector.y, this.color);
    }

    drawOutline(ctx: CanvasRenderingContext2D, snappedX: number, snappedY: number) {
        ctx.strokeStyle = "black";
        ctx.lineWidth = 1;
        ctx.beginPath();

        if (this.horizontal) {
            // To make it match connector size; use radius gridSize/5 + gridSize/4
            ctx.arc(snappedX + gridSize/2, this.startConnector.y, gridSize/4, 0, Math.PI * 2);
        } else {
            ctx.arc(this.startConnector.x, snappedY + gridSize/2, gridSize/4, 0, Math.PI * 2);
        }

        ctx.stroke();
    }

    overlaps(snappedX: number, snappedY: number, overlapSize: number) {
        if (this.startConnector.isTemporary() && this.startConnector.x === snappedX + gridSize/2 && this.startConnector.y === snappedY + gridSize/2) return false;
        if (this.endConnector.isTemporary() && this.endConnector.x === snappedX + gridSize/2 && this.endConnector.y === snappedY + gridSize/2) return false;

        if (this.horizontal) return (
            snappedX + overlapSize > this.startConnector.x &&
            snappedX < this.endConnector.x &&
            snappedY + overlapSize > this.startConnector.y - gridSize/2 &&
            snappedY < this.endConnector.y + gridSize/2
        );

        return (
            snappedX + overlapSize > this.startConnector.x - gridSize/2 &&
            snappedX < this.endConnector.x + gridSize/2 &&
            snappedY + overlapSize > this.startConnector.y &&
            snappedY < this.endConnector.y
        );
    }
}

enum Mode {
    DEBUG = "DEBUG",
    EDIT = "EDIT"
}

class Editor {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    private placeables: Record<string, Placeable> = {};
    private toolbar: HTMLElement;
    private mode: Mode = Mode.EDIT;

    private placing: Placeable | null = null;
    private hovering: Placed | Connector | Connection | undefined;
    private rotation: number = 0;
    private moving: boolean = false;

    private connecting: Connector | undefined;
    private connection: PlaceableConnection;
    private holding: boolean = false;

    private placed: Placed[] = [];
    private connectors: Connector[] = [];
    private connections: Connection[] = []

    private events: Record<string, CallableFunction> = {};

    private dragging = false;
    private panX = 0;
    private panY = 0;
    private lastX = 0;
    private lastY = 0;
    private zoom = 1;

    constructor (canvasId: string, connection: PlaceableConnection) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas.getContext("2d")!;

        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        this.toolbar = document.getElementById("toolbar") as HTMLElement;
        this.connection = connection;

        this.setupPanControls();
        this.registerListeners();
        this.draw();
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
                const [snappedX, snappedY] = this.getWorldCoordinates()

                const connector = this.findConnector(this.lastX - this.panX, this.lastY - this.panY, 1);
                const gate = this.findGate(snappedX, snappedY, 1);
                if (gate && connector) {
                    this.hovering = (this.holding || this.connecting)? connector: gate;
                    return this.draw();
                } else {
                    // Either a gate or a connector is found. Only allow this.hovering to be a 
                    // gate when no connector is found AND we are not currently drawing a wire.
                    this.hovering = (connector || this.connecting)? connector: gate;
                }

                if (!this.hovering) this.hovering = this.findConnection(snappedX, snappedY, 1);

            }

            this.draw();
        });

        this.canvas.addEventListener("mouseup", () => this.dragging = false);
    }

    private registerListeners() {
        this.canvas.addEventListener("click", (e) => {
            const [snappedX, snappedY] = this.getWorldCoordinates()
            this.events["click"]?.(e);

            if (this.mode === Mode.DEBUG) return;
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
                this.events["place"]?.(placed);

                if (!this.moving) return;
                this.moving = false;
                this.togglePlaceable(null);
            }

            if (!this.hovering) {
                if (!this.connecting) return;
                const connector = new Connector(snappedX + gridSize/2, snappedY + gridSize/2, gridSize/5, null, true);
                if (!this.connection.valid(this.connecting, connector)) return;

                this.addConnector(connector);
                this.connect(connector);

                return;
            };
            if (this.hovering instanceof Placed) {
                this.placing = this.placeables[this.hovering.getCategory()];
                this.rotation = this.hovering.getRotation();
                this.deletePlaced(this.hovering);
                this.moving = true;
                return;
            }
            if (this.hovering instanceof Connector) this.connect(this.hovering);
        });
        
        this.canvas.addEventListener("contextmenu", (e) => {
            e.preventDefault()

            if (this.mode === Mode.DEBUG) {
                if (this.hovering) console.log(this.hovering);
                return;
            }

            if (this.connecting) {
                if (this.connecting.isTemporary()) this.deleteConnector(this.connecting);
                this.connecting = undefined;
            }
            if (this.hovering instanceof Placed) this.deletePlaced(this.hovering);
            if (this.hovering instanceof Connection) this.deleteConnection(this.hovering);
            this.draw();
            
        });

        window.addEventListener("keydown", (e) => {
            switch (e.key) {
                case "Escape":
                    if (this.placing) this.togglePlaceable();
                    if (this.connecting) this.connecting = undefined;
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
                case "Shift":
                    this.holding = true;
                    return;
                default: return;
            }

            window.addEventListener("keyup", (e) => {
                switch (e.key) {
                    case "Shift":
                        this.holding = false;
                        return;
                    default: return;
                }
            });

            this.draw();
        })
    }

    private draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(this.panX, this.panY);

        const [snappedX, snappedY] = this.getWorldCoordinates();
        if (this.connecting) this.connection.drawGhost(this.ctx, this.connecting.x, this.connecting.y, snappedX, snappedY, (this.hovering instanceof Connector)? this.hovering: undefined);
        else if (this.placing) this.drawPlacing(snappedX, snappedY);

        this.connections.forEach(elm => { elm.draw(this.ctx, this.connection )});
        this.placed.forEach(elm => { elm.draw(this.ctx); });
        this.connectors.forEach(elm => { elm.draw(this.ctx); });

        if (this.hovering && !this.placing) this.hovering.drawOutline(this.ctx, snappedX, snappedY);

        this.canvas.title = `Gates: ${this.placed.length}, Connectors: ${this.connectors.length}, Connections: ${this.connections.length}`;

        this.ctx.restore();
    }

    private drawPlacing(snappedX: number, snappedY: number) {
        if (!this.placing) return;
        if (this.hovering) return;

        if (this.findGate(snappedX, snappedY, this.placing.getShape().getSize())) return;

        this.ctx.globalAlpha = 0.5;
        this.placing.draw(this.ctx, snappedX, snappedY, this.rotation);
        this.ctx.globalAlpha = 1;
    }

    getContext() { return this.ctx; }
    getPlaced() { return this.placed; }
    getConnectors() { return this.connectors; }
    getConnections() { return this.connections; }
    getHovering() { return this.hovering; }
    getConnecting() { return this.connecting; }
    getMode() { return this.mode; }

    setMode(mode: Mode) {
        this.mode = mode;

        if (this.mode === Mode.DEBUG) this.canvas.style.cursor = "pointer";
        if (this.mode === Mode.EDIT) this.canvas.style.cursor = "default";
        this.togglePlaceable(null);
    }

    getWorldCoordinates() {
        const worldX = this.lastX - this.panX;
        const worldY = this.lastY - this.panY;

        const snappedX = Math.floor(worldX / gridSize) * gridSize;
        const snappedY = Math.floor(worldY / gridSize) * gridSize;

        return [snappedX, snappedY];
    }

    registerPlaceable(placeable: Placeable) { 
        placeable._setEditor(this);

        this.placeables[placeable.getLabel()] = placeable;
        this.toolbar.appendChild(placeable._getButton());
    }

    registerListener(event: string, callable: CallableFunction) {
        this.events[event] = callable;
    }

    addConnector(connector: Connector) {
        this.connectors.push(connector);
    }

    addConnection(connection: Connection) {
        this.connections.push(connection);
    }

    togglePlaceable(placeable: Placeable | null = null) {
        if (this.mode === Mode.DEBUG) return;

        this.placing = (this.placing === placeable)? null: placeable;
        this.rotation = 0;
        this.connecting = undefined;

        if (!this.placing) return this.draw();
    }

    connect(connector: Connector) {
        if (this.connecting) {
            if (!this.connection.valid(this.connecting, connector)) return;
            const connection = new Connection(
                this.connecting,
                connector,
                this.connection.getColor()
            );

            this.events["connect"]?.(this.connecting, connector);
            this.connections.push(connection);
            this.connecting = undefined;
            return;
        }

        this.connecting = connector;
    }

    findConnector(snappedX: number, snappedY: number, overlapSize: number) {
        return this.connectors.find(elm => elm.overlaps(snappedX, snappedY, overlapSize));
    }

    findGate(snappedX: number, snappedY: number, overlapSize: number) {
        return this.placed.find(elm => elm.overlaps(snappedX, snappedY, overlapSize));
    } 

    findConnection(snappedX: number, snappedY: number, overlapSize: number) {
        return this.connections.find(elm => elm.overlaps(snappedX, snappedY, overlapSize));
    }

    deletePlaced(placed: Placed) {
        if (placed === this.hovering) this.hovering = undefined;
        
        this.connectors.splice(this.connectors.indexOf(placed.getConnectors()[0]), placed.getConnectors().length)
        this.placed.splice(this.placed.indexOf(placed), 1);
    }

    deleteConnector(connector: Connector) {
        if (!connector.isTemporary()) return;
        if (connector === this.hovering) this.hovering = undefined;
        if (connector === this.connecting) this.connecting = undefined;

        this.connectors.splice(this.connectors.indexOf(connector), 1);
    }
    
    deleteConnection(connection: Connection, silent: boolean = false) {
        if (connection === this.hovering) this.hovering = undefined;

        connection.startConnector.removeConnection(connection);        
        connection.endConnector.removeConnection(connection);
        this.connections.splice(this.connections.indexOf(connection), 1);

        // if (silent) return;
        this.events["deleteConnection"]?.(connection);
    }
}