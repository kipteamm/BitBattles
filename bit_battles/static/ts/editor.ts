const gridSize = 20;

class Shape {
    protected color: string = "#123456";

    constructor (color: string) {
        this.color = color;
    }

    draw (ctx: CanvasRenderingContext2D, x: number, y: number, label: string) {};
}

class Square extends Shape {
    private size: number = 0;

    constructor (color: string, size: number) {
        super(color);

        this.size = size;
    }

    override draw(ctx: CanvasRenderingContext2D, x: number, y: number, label: string) {
        ctx.fillStyle = this.color;
        ctx.fillRect(x, y, this.size * gridSize, this.size * gridSize);
    }
}

class Circle extends Shape {
    private radius: number = 0;

    constructor (color: string, radius: number) {
        super(color);

        this.radius = radius;
    }

    override draw(ctx: CanvasRenderingContext2D, x: number, y: number, label: string) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(x + gridSize / 2, y + gridSize / 2, this.radius * gridSize, 0, Math.PI * 2);
        ctx.fill();
    }
}


class Placeable {
    private editor!: Editor;
    private shape: Shape
    private label: string

    constructor (shape: Shape, label: string) {
        this.shape = shape
        this.label = label
    }

    setEditor(editor: Editor) { this.editor = editor; }

    getButton () {
        const button = document.createElement("button");
        button.addEventListener("click", () => this.editor.togglePlaceable(this));
        button.innerText = this.label;

        return button
    }

    draw(ctx: CanvasRenderingContext2D, snappedX: number, snappedY: number) {
        this.shape.draw(ctx, snappedX, snappedY, this.label);
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
            this.draw();

            this.canvas.style.backgroundPosition = `${(gridSize * this.zoom) / 2 + this.panX}px ${(gridSize * this.zoom) / 2 + this.panY}px`;
        });

        this.canvas.addEventListener("mouseup", () => this.dragging = false);
        this.canvas.addEventListener("contextmenu", (e) => e.preventDefault()); // disable context menu
    }

    private draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // this.ctx.drawImage(this.overlayCanvas, 0, 0);

        if (this.placing) this.drawPlacing();

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

    registerPlaceable(placeable: Placeable) { 
        placeable.setEditor(this);

        this.placeables.push(placeable);
        this.toolbar.appendChild(placeable.getButton());
    }

    togglePlaceable(placeable: Placeable | null) {
        this.placing = (this.placing === placeable)? null: placeable;
        if (!this.placing) return;
    }
}