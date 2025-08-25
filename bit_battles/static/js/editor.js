"use strict";
const gridSize = 20;
class Shape {
    constructor(color) {
        this.color = "#123456";
        this.size = 0;
        this.color = color;
    }
    drawLabel(ctx, x, y, rotation, label) {
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
        ctx.restore();
    }
}
class Placeable {
    constructor(shape, label, ...connectors) {
        this.events = {};
        this.shape = shape;
        this.label = label;
        this.connectors = connectors;
    }
    _setEditor(editor) { this.editor = editor; }
    _getButton() {
        const button = document.createElement("button");
        button.addEventListener("click", () => this.editor.togglePlaceable(this));
        button.innerText = this.label;
        return button;
    }
    getShape() { return this.shape; }
    getLabel() { return this.label; }
    getConnectors() { return this.connectors; }
    listen(event, callable) {
        this.events[event] = callable;
    }
    fire(event, ...args) {
        var _a, _b;
        (_b = (_a = this.events)[event]) === null || _b === void 0 ? void 0 : _b.call(_a, ...args);
    }
    draw(ctx, snappedX, snappedY, rotation) {
        this.shape.draw(ctx, snappedX, snappedY, rotation, this.label);
    }
}
class Connector {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.size = radius;
        this.color = color;
    }
    getColor() { return this.color; }
    draw(ctx) {
        if (!this.color)
            return;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
    drawOutline(ctx) {
        ctx.strokeStyle = "black";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size + gridSize / 4, 0, Math.PI * 2);
        ctx.stroke();
    }
    overlaps(snappedX, snappedY, overlapSize) {
        // We add a small offset gridSize/4 to make it easier to find a connector
        return (snappedX + overlapSize > this.x - this.size - gridSize / 4 &&
            snappedX < this.x + this.size + gridSize / 4 &&
            snappedY + overlapSize > this.y - this.size - gridSize / 4 &&
            snappedY < this.y + this.size + gridSize / 4);
    }
}
class Placed {
    constructor(shape, label, _connectors, x, y, rotation) {
        this.connectors = [];
        this.shape = shape;
        this.category = label;
        this.label = label;
        this.x = x;
        this.y = y;
        this.rotation = (shape instanceof Square) ? rotation : 0;
        _connectors.forEach(connector => {
            let connectorX = this.x;
            let connectorY = this.y;
            if (this.shape instanceof Circle) {
                connectorX += this.shape.getSize() / 2;
                connectorY += this.shape.getSize() / 2;
            }
            else {
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
            this.connectors.push(new Connector(connectorX, connectorY, connector.radius * gridSize, connector.color));
        });
    }
    getConnectors() { return this.connectors; }
    getLabel() { return this.label; }
    getRotation() { return this.rotation; }
    getCategory() { return this.category; }
    setLabel(label) { this.label = label; }
    draw(ctx) {
        this.shape.draw(ctx, this.x, this.y, this.rotation, this.label);
        this.connectors.forEach(connector => connector.draw(ctx));
    }
    drawOutline(ctx) {
        this.shape.drawOutline(ctx, this.x, this.y);
    }
    overlaps(snappedX, snappedY, overlapSize) {
        return (snappedX + overlapSize > this.x &&
            snappedX < this.x + this.shape.getSize() &&
            snappedY + overlapSize > this.y &&
            snappedY < this.y + this.shape.getSize());
    }
}
class PlaceableConnection {
    constructor() {
        this.color = "#000";
    }
    getColor() { return this.color; }
}
class Connection {
    constructor(startX, startY, endX, endY, color) {
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.color = color;
    }
    setColor(color) { this.color = color; }
    draw(ctx, connector) {
        connector.draw(ctx, this.startX, this.startY, this.endX, this.endY, this.color);
    }
}
class Editor {
    constructor(canvasId, connection) {
        this.placeables = {};
        this.placing = null;
        this.rotation = 0;
        this.moving = false;
        this.holding = false;
        this.placed = [];
        this.connectors = [];
        this.connections = [];
        this.dragging = false;
        this.panX = 0;
        this.panY = 0;
        this.lastX = 0;
        this.lastY = 0;
        this.zoom = 1;
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext("2d");
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.toolbar = document.getElementById("toolbar");
        this.connection = connection;
        this.setupPanControls();
        this.registerListeners();
        this.draw();
    }
    _getWorldCoordinates() {
        const worldX = this.lastX - this.panX;
        const worldY = this.lastY - this.panY;
        const snappedX = Math.floor(worldX / gridSize) * gridSize;
        const snappedY = Math.floor(worldY / gridSize) * gridSize;
        return [snappedX, snappedY];
    }
    setupPanControls() {
        this.canvas.addEventListener("mousedown", (e) => {
            if (e.button !== 2)
                return;
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
                const [snappedX, snappedY] = this._getWorldCoordinates();
                const connector = this.findConnector(this.lastX - this.panX, this.lastY - this.panY, 1);
                const gate = this.findGate(snappedX, snappedY, 1);
                if (gate && connector) {
                    this.hovering = (this.holding || this.connecting) ? connector : gate;
                    return this.draw();
                }
                else {
                    // Either a gate or a connector is found. Only allow this.hovering to be a 
                    // gate when no connector is found AND we are not currently drawing a wire.
                    this.hovering = (connector || this.connecting) ? connector : gate;
                }
            }
            this.draw();
        });
        this.canvas.addEventListener("mouseup", () => this.dragging = false);
    }
    registerListeners() {
        this.canvas.addEventListener("click", (e) => {
            const [snappedX, snappedY] = this._getWorldCoordinates();
            if (this.placing) {
                const gate = this.findGate(snappedX, snappedY, this.placing.getShape().getSize());
                if (gate)
                    return;
                if (this.hovering)
                    return;
                const placed = new Placed(this.placing.getShape(), this.placing.getLabel(), this.placing.getConnectors(), snappedX, snappedY, this.rotation);
                this.placed.push(placed);
                this.connectors.push(...placed.getConnectors());
                this.placing.fire("place", placed);
                if (!this.moving)
                    return;
                this.moving = false;
                this.togglePlaceable(null);
            }
            if (!this.hovering)
                return;
            if (this.hovering instanceof Placed) {
                this.placing = this.placeables[this.hovering.getCategory()];
                this.rotation = this.hovering.getRotation();
                this.deletePlaced(this.hovering);
                this.moving = true;
                return;
            }
            this.connect(this.hovering);
        });
        this.canvas.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            if (this.connecting)
                this.connecting = undefined;
            if (!(this.hovering instanceof Placed))
                return;
            this.deletePlaced(this.hovering);
            this.draw();
        });
        window.addEventListener("keydown", (e) => {
            switch (e.key) {
                case "Escape":
                    if (this.placing)
                        this.togglePlaceable();
                    if (this.connecting)
                        this.connecting = undefined;
                    break;
                case "Delete":
                    if (this.hovering && this.hovering instanceof Placed)
                        this.deletePlaced(this.hovering);
                    break;
                case "z":
                    this.rotation = this.rotation === 360 ? 90 : this.rotation + 90;
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
        });
    }
    connect(connector) {
        if (this.connecting) {
            this.connections.push(new Connection(this.connecting.x, this.connecting.y, connector.x, connector.y, this.connection.getColor()));
            this.connecting = undefined;
            return;
        }
        this.connecting = connector;
    }
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.translate(this.panX, this.panY);
        this.placed.forEach(elm => { elm.draw(this.ctx); });
        this.connections.forEach(elm => { elm.draw(this.ctx, this.connection); });
        if (this.connecting) {
            const [snappedX, snappedY] = this._getWorldCoordinates();
            this.connection.drawGhost(this.ctx, this.connecting.x, this.connecting.y, snappedX, snappedY, (this.hovering instanceof Connector) ? this.hovering : undefined);
        }
        else if (this.placing)
            this.drawPlacing();
        if (this.hovering && !this.placing)
            this.hovering.drawOutline(this.ctx);
        this.ctx.restore();
    }
    drawPlacing() {
        if (!this.placing)
            return;
        if (this.hovering)
            return;
        const [snappedX, snappedY] = this._getWorldCoordinates();
        if (this.findGate(snappedX, snappedY, this.placing.getShape().getSize()))
            return;
        this.ctx.globalAlpha = 0.5;
        this.placing.draw(this.ctx, snappedX, snappedY, this.rotation);
        this.ctx.globalAlpha = 1;
    }
    getContext() { return this.ctx; }
    getPlaced() { return this.placed; }
    registerPlaceable(placeable) {
        placeable._setEditor(this);
        this.placeables[placeable.getLabel()] = placeable;
        this.toolbar.appendChild(placeable._getButton());
    }
    togglePlaceable(placeable = null) {
        this.placing = (this.placing === placeable) ? null : placeable;
        this.rotation = 0;
        if (!this.placing)
            return this.draw();
    }
    findConnector(snappedX, snappedY, overlapSize) {
        return this.connectors.find(elm => elm.overlaps(snappedX, snappedY, overlapSize));
    }
    findGate(snappedX, snappedY, overlapSize) {
        return this.placed.find(elm => elm.overlaps(snappedX, snappedY, overlapSize));
    }
    deletePlaced(placed) {
        this.connectors.splice(this.connectors.indexOf(placed.getConnectors()[0]), placed.getConnectors().length);
        this.placed.splice(this.placed.indexOf(placed), 1);
        if (placed === this.hovering)
            this.hovering = undefined;
    }
}
