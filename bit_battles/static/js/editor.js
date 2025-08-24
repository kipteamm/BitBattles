"use strict";
const gridSize = 20;
class Shape {
    constructor(color) {
        this.color = "#123456";
        this.size = 0;
        this.color = color;
    }
    getSize() { return 0; }
    draw(ctx, x, y, label) { }
    ;
    drawLabel(ctx, x, y, label) {
        const centerX = x + (this.size) / 2;
        const centerY = y + (this.size) / 2;
        ctx.fillStyle = "black";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.fillText(label, centerX, centerY + 5); // + 5 for better vertical alignment;
    }
}
class Square extends Shape {
    constructor(color, size) {
        super(color);
        this.size = size * gridSize;
    }
    getSize() { return this.size; }
    draw(ctx, x, y, label) {
        ctx.fillStyle = this.color;
        ctx.fillRect(x, y, this.size, this.size);
        this.drawLabel(ctx, x, y, label);
    }
}
class Circle extends Shape {
    constructor(color, radius) {
        super(color);
        this.size = radius * gridSize;
    }
    getSize() { return this.size * 2; }
    draw(ctx, x, y, label) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        // Offset sligthly because it makes it look less missaligned
        ctx.arc(x + gridSize / 2, y + gridSize / 2, this.size, 0, Math.PI * 2);
        ctx.fill();
        this.drawLabel(ctx, x - gridSize / 4, y - gridSize / 4, label);
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
    draw(ctx, snappedX, snappedY) {
        this.shape.draw(ctx, snappedX, snappedY, this.label);
    }
}
class Connector {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.size = radius;
        this.color = color;
    }
    draw(ctx) {
        if (!this.color)
            return; // Do not draw invisible connectors
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}
class Placed {
    constructor(shape, label, _connectors, x, y) {
        this.connectors = [];
        this.shape = shape;
        this.label = label;
        this.x = x;
        this.y = y;
        _connectors.forEach(connector => {
            this.connectors.push(new Connector(this.x + (connector.left * gridSize + (connector.align ? gridSize / 2 : 0)), // Offset by half a gridSize because circles appear offsetted.
            this.y + (connector.top * gridSize + gridSize / 2), connector.radius * gridSize, connector.color));
        });
    }
    setLabel(label) { this.label = label; }
    draw(ctx) {
        this.shape.draw(ctx, this.x, this.y, this.label);
        this.connectors.forEach(connector => connector.draw(ctx));
    }
    overlaps(snappedX, snappedY, overlapSize) {
        return (snappedX + overlapSize > this.x &&
            snappedX < this.x + this.shape.getSize() &&
            snappedY + overlapSize > this.y &&
            snappedY < this.y + this.shape.getSize());
    }
}
class Editor {
    constructor(canvasId) {
        // private overlayCanvas: HTMLCanvasElement;
        // private overlayCtx: CanvasRenderingContext2D;
        this.placeables = [];
        this.placing = null;
        this.placed = [];
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
        // this.overlayCanvas = document.getElementById(canvasId) as HTMLCanvasElement;
        // this.overlayCtx = this.overlayCanvas.getContext("2d")!;
        // this.overlayCtx.globalAlpha = 0.5;
        // this.overlayCanvas.width = this.canvas.width;
        // this.overlayCanvas.height = this.canvas.height; // - 40;
        this.toolbar = document.getElementById("toolbar");
        this.setupPanControls();
        this.registerListeners();
        this.draw();
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
            this.draw();
        });
        this.canvas.addEventListener("mouseup", () => this.dragging = false);
        this.canvas.addEventListener("contextmenu", (e) => e.preventDefault()); // disable context menu
    }
    registerListeners() {
        this.canvas.addEventListener("click", (e) => {
            const worldX = this.lastX - this.panX;
            const worldY = this.lastY - this.panY;
            const snappedX = Math.floor(worldX / gridSize) * gridSize;
            const snappedY = Math.floor(worldY / gridSize) * gridSize;
            if (this.placing) {
                const placed = new Placed(this.placing.getShape(), this.placing.getLabel(), this.placing.getConnectors(), snappedX, snappedY);
                this.placed.push(placed);
                this.placing.fire("place", placed);
                return;
            }
            const gate = this.findGate(snappedX, snappedY, 1);
            if (gate) {
                return;
            }
            // const connector = this.findConnector(snappedX, snappedY);
        });
        window.addEventListener("keydown", (e) => {
            switch (e.key) {
                case "Escape":
                    if (this.placing)
                        this.togglePlaceable();
                    break;
                default: break;
            }
        });
    }
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // this.ctx.drawImage(this.overlayCanvas, 0, 0);
        this.ctx.save();
        this.ctx.translate(this.panX, this.panY);
        if (this.placing)
            this.drawPlacing();
        this.placed.forEach(elm => { elm.draw(this.ctx); });
        this.ctx.restore();
    }
    drawPlacing() {
        if (!this.placing)
            return;
        const worldX = this.lastX - this.panX;
        const worldY = this.lastY - this.panY;
        const snappedX = Math.floor(worldX / gridSize) * gridSize;
        const snappedY = Math.floor(worldY / gridSize) * gridSize;
        if (this.findGate(snappedX, snappedY, this.placing.getShape().getSize()))
            return;
        this.ctx.globalAlpha = 0.5;
        this.placing.draw(this.ctx, snappedX, snappedY);
        this.ctx.globalAlpha = 1;
    }
    getContext() { return this.ctx; }
    getPlaced() { return this.placed; }
    registerPlaceable(placeable) {
        placeable._setEditor(this);
        this.placeables.push(placeable);
        this.toolbar.appendChild(placeable._getButton());
    }
    togglePlaceable(placeable = null) {
        this.placing = (this.placing === placeable) ? null : placeable;
        if (!this.placing)
            return this.draw();
    }
    findGate(snappedX, snappedY, overlapSize) {
        return this.placed.find(elm => elm.overlaps(snappedX, snappedY, overlapSize));
    }
}
