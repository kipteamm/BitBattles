const gridSize = 20;

class Shape {
    protected color: string = "#123456";
    protected size: number = 0;

    constructor (color: string) {
        this.color = color;
    }

    draw (ctx: CanvasRenderingContext2D, x: number, y: number, label: string) {};
    drawLabel(ctx: CanvasRenderingContext2D, x: number, y: number, label: string) {
        const centerX = x + (this.size * gridSize) / 2;
        const centerY = y + (this.size * gridSize) / 2;

        ctx.fillStyle = "black";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.fillText(label, centerX, centerY + 5); // + 5 for better vertical alignment;
    }
}

class Square extends Shape {
    constructor (color: string, size: number) {
        super(color);

        this.size = size;
    }

    override draw(ctx: CanvasRenderingContext2D, x: number, y: number, label: string) {
        ctx.fillStyle = this.color;
        ctx.fillRect(x, y, this.size * gridSize, this.size * gridSize);
        this.drawLabel(ctx, x, y, label);
    }
}

class Circle extends Shape {
    constructor (color: string, radius: number) {
        super(color);

        this.size = radius;
    }

    override draw(ctx: CanvasRenderingContext2D, x: number, y: number, label: string) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        // Offset sligthly because it makes it look less missaligned
        ctx.arc(x + gridSize / 2, y + gridSize / 2, this.size * gridSize, 0, Math.PI * 2);
        ctx.fill();
        this.drawLabel(ctx, x - gridSize / 4, y - gridSize / 4, label);
    }
}


class Placeable {
    private editor!: Editor;
    private shape: Shape;
    private label: string;
    
    private events: Record<string, CallableFunction> = {};
    // private events: { [key: string]: CallableFunction } = {};

    constructor (shape: Shape, label: string) {
        this.shape = shape
        this.label = label
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

    listen (event: string, callable: CallableFunction) {
        this.events[event] = callable;
    }

    fire (event: string, ...args: any[]) {
        this.events[event]?.(...args);
    }

    draw(ctx: CanvasRenderingContext2D, snappedX: number, snappedY: number) {
        this.shape.draw(ctx, snappedX, snappedY, this.label);
    }
}

class Placed {
    private shape: Shape;
    private label: string;
    private x: number;
    private y: number;

    constructor (shape: Shape, label: string, x: number, y: number) {
        this.shape = shape
        this.label = label
        this.x = x;
        this.y = y;
    }

    setLabel(label: string) { this.label = label; }

    draw(ctx: CanvasRenderingContext2D) {
        this.shape.draw(ctx, this.x, this.y, this.label);
    }
}

class Editor {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    // private overlayCanvas: HTMLCanvasElement;
    // private overlayCtx: CanvasRenderingContext2D;

    private placeables: Array<Placeable> = [];
    private toolbar: HTMLElement;
    private placing: Placeable | null = null;

    private placed: Array<Placed> = [];

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

        // this.overlayCanvas = document.getElementById(canvasId) as HTMLCanvasElement;
        // this.overlayCtx = this.overlayCanvas.getContext("2d")!;
        // this.overlayCtx.globalAlpha = 0.5;

        // this.overlayCanvas.width = this.canvas.width;
        // this.overlayCanvas.height = this.canvas.height; // - 40;

        this.toolbar = document.getElementById("toolbar") as HTMLElement;

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
            this.lastX = e.clientX;
            this.lastY = e.clientY;

            if (this.placing) return this.draw();
            if (!this.dragging) return;

            const dx = e.clientX - this.lastX;
            const dy = e.clientY - this.lastY;
            this.panX += dx;
            this.panY += dy;
            
            this.canvas.style.backgroundPosition = `${(gridSize * this.zoom) / 2 + this.panX}px ${(gridSize * this.zoom) / 2 + this.panY}px`;
            this.draw();
        });

        this.canvas.addEventListener("mouseup", () => this.dragging = false);
        this.canvas.addEventListener("contextmenu", (e) => e.preventDefault()); // disable context menu
    }

    private registerListeners() {
        this.canvas.addEventListener("click", (e) => {
            if (!this.placing) return;

            const snappedX = Math.floor(this.lastX / gridSize) * gridSize;
            const snappedY = Math.floor(this.lastY / gridSize) * gridSize;

            const placed = new Placed(
                this.placing.getShape(),
                this.placing.getLabel(),
                snappedX,
                snappedY
            )
            
            this.placed.push(placed);
            this.placing.fire("place", placed);
        });
    }

    private draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // this.ctx.drawImage(this.overlayCanvas, 0, 0);

        if (this.placing) this.drawPlacing();
        this.placed.forEach(elm => { elm.draw(this.ctx); });

        this.ctx.save();
        this.ctx.translate(this.panX, this.panY);
    }

    private drawPlacing() {
        if (!this.placing) return;

        const snappedX = Math.floor(this.lastX / gridSize) * gridSize;
        const snappedY = Math.floor(this.lastY / gridSize) * gridSize;

        this.ctx.globalAlpha = 0.5;
        this.placing.draw(this.ctx, snappedX, snappedY);
        this.ctx.globalAlpha = 1;
    }

    getContext() { return this.ctx; }
    getPlaced() { return this.placed; }

    registerPlaceable(placeable: Placeable) { 
        placeable._setEditor(this);

        this.placeables.push(placeable);
        this.toolbar.appendChild(placeable._getButton());
    }

    togglePlaceable(placeable: Placeable | null) {
        this.placing = (this.placing === placeable)? null: placeable;
        this.draw();
    }
}