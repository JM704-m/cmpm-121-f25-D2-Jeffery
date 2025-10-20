import "./style.css";

const title = document.createElement("h1");
title.textContent = "Let's Paint";
document.body.append(title);

const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
document.body.append(canvas);

const ctx = canvas.getContext("2d")!;
ctx.lineCap = "round";
ctx.lineJoin = "round";
ctx.strokeStyle = "#000";
ctx.lineWidth = 2;

const cursor = { active: false, x: 0, y: 0 };

type Point = { x: number; y: number };

interface DisplayCommand {
  display(ctx: CanvasRenderingContext2D): void;
}

class MarkerLine implements DisplayCommand {
  private pts: Point[] = [];
  private width: number;
  constructor(p0: Point, width: number) {
    this.pts.push(p0);
    this.width = width;
  }
  drag(p: Point): void {
    this.pts.push(p);
  }
  display(ctx: CanvasRenderingContext2D): void {
    if (this.pts.length === 0) return;
    ctx.save();
    ctx.lineWidth = this.width;
    ctx.beginPath();
    const first = this.pts[0]!;
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < this.pts.length; i++) {
      const pt = this.pts[i]!;
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
    ctx.restore();
  }
}

interface ToolPreview {
  draw(ctx: CanvasRenderingContext2D): void;
}

class MarkerPreview implements ToolPreview {
  private p: Point;
  private width: number;
  constructor(p: Point, width: number) {
    this.p = p;
    this.width = width;
  }
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.p.x, this.p.y, this.width / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

class Sticker implements DisplayCommand {
  private p: Point;
  private emoji: string;
  private size: number;
  constructor(p: Point, emoji: string, size: number) {
    this.p = p;
    this.emoji = emoji;
    this.size = size;
  }
  drag(p: Point): void {
    this.p = p;
  }
  display(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${this.size}px serif`;
    ctx.fillText(this.emoji, this.p.x, this.p.y);
    ctx.restore();
  }
}

class StickerPreview implements ToolPreview {
  private p: Point;
  private emoji: string;
  private size: number;
  constructor(p: Point, emoji: string, size: number) {
    this.p = p;
    this.emoji = emoji;
    this.size = size;
  }
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${this.size}px serif`;
    ctx.fillText(this.emoji, this.p.x, this.p.y);
    ctx.restore();
  }
}

const displayList: DisplayCommand[] = [];
let currentStroke: MarkerLine | Sticker | null = null;
let currentWidth = 2;
let currentPreview: ToolPreview | null = null;
let currentTool: "line" | "sticker" = "line";
let selectedSticker: string | null = null;
const stickerSize = 24;

function toCanvasXY(ev: MouseEvent): Point {
  const rect = canvas.getBoundingClientRect();
  return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
}

function redrawAll() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const cmd of displayList) {
    cmd.display(ctx);
  }
  if (!cursor.active && currentPreview) {
    currentPreview.draw(ctx);
  }
}

function fireDrawingChanged() {
  canvas.dispatchEvent(new Event("drawing-changed"));
}

function fireToolMoved() {
  canvas.dispatchEvent(new Event("tool-moved"));
}

canvas.addEventListener("drawing-changed", redrawAll);
canvas.addEventListener("tool-moved", redrawAll);

canvas.addEventListener("mousedown", (e) => {
  cursor.active = true;
  const p = toCanvasXY(e);
  redoStack.length = 0;
  currentPreview = null;
  if (currentTool === "line") {
    currentStroke = new MarkerLine({ x: p.x, y: p.y }, currentWidth);
  } else {
    const emoji = selectedSticker ?? "⭐";
    currentStroke = new Sticker({ x: p.x, y: p.y }, emoji, stickerSize);
  }
  displayList.push(currentStroke);
  fireDrawingChanged();
});

canvas.addEventListener("mousemove", (e) => {
  const p = toCanvasXY(e);
  cursor.x = p.x;
  cursor.y = p.y;
  if (cursor.active && currentStroke) {
    currentStroke.drag({ x: cursor.x, y: cursor.y });
    fireDrawingChanged();
  } else {
    if (currentTool === "line") {
      currentPreview = new MarkerPreview(
        { x: cursor.x, y: cursor.y },
        currentWidth,
      );
    } else {
      const emoji = selectedSticker ?? "⭐";
      currentPreview = new StickerPreview(
        { x: cursor.x, y: cursor.y },
        emoji,
        stickerSize,
      );
    }
    fireToolMoved();
  }
});

canvas.addEventListener("mouseup", () => {
  cursor.active = false;
  currentStroke = null;
  fireToolMoved();
});

canvas.addEventListener("mouseleave", () => {
  cursor.active = false;
  currentStroke = null;
  currentPreview = null;
  fireToolMoved();
});

const clearButton = document.createElement("button");
clearButton.innerHTML = "clear";
document.body.append(clearButton);

clearButton.addEventListener("click", () => {
  displayList.length = 0;
  redoStack.length = 0;
  fireDrawingChanged();
});

const undoButton = document.createElement("button");
undoButton.innerHTML = "undo";
document.body.append(undoButton);

const redoButton = document.createElement("button");
redoButton.innerHTML = "redo";
document.body.append(redoButton);

const redoStack: DisplayCommand[] = [];

function undo() {
  if (displayList.length === 0) return;
  const popped = displayList.pop()!;
  redoStack.push(popped);
  fireDrawingChanged();
}

function redo() {
  if (redoStack.length === 0) return;
  const restored = redoStack.pop()!;
  displayList.push(restored);
  fireDrawingChanged();
}

undoButton.addEventListener("click", undo);
redoButton.addEventListener("click", redo);

const thinButton = document.createElement("button");
thinButton.innerHTML = "thin";
document.body.append(thinButton);

const thickButton = document.createElement("button");
thickButton.innerHTML = "thick";
document.body.append(thickButton);

thinButton.addEventListener("click", () => {
  currentWidth = 2;
  currentTool = "line";
  if (!cursor.active) {
    currentPreview = new MarkerPreview(
      { x: cursor.x, y: cursor.y },
      currentWidth,
    );
    fireToolMoved();
  }
});

thickButton.addEventListener("click", () => {
  currentWidth = 8;
  currentTool = "line";
  if (!cursor.active) {
    currentPreview = new MarkerPreview(
      { x: cursor.x, y: cursor.y },
      currentWidth,
    );
    fireToolMoved();
  }
});

const stickerA = document.createElement("button");
stickerA.innerHTML = "⭐";
document.body.append(stickerA);

const stickerB = document.createElement("button");
stickerB.innerHTML = "🤪";
document.body.append(stickerB);

const stickerC = document.createElement("button");
stickerC.innerHTML = "😍";
document.body.append(stickerC);

stickerA.addEventListener("click", () => {
  currentTool = "sticker";
  selectedSticker = "⭐";
  if (!cursor.active) {
    currentPreview = new StickerPreview(
      { x: cursor.x, y: cursor.y },
      selectedSticker,
      stickerSize,
    );
    fireToolMoved();
  }
});

stickerB.addEventListener("click", () => {
  currentTool = "sticker";
  selectedSticker = "🤪";
  if (!cursor.active) {
    currentPreview = new StickerPreview(
      { x: cursor.x, y: cursor.y },
      selectedSticker,
      stickerSize,
    );
    fireToolMoved();
  }
});

stickerC.addEventListener("click", () => {
  currentTool = "sticker";
  selectedSticker = "😍";
  if (!cursor.active) {
    currentPreview = new StickerPreview(
      { x: cursor.x, y: cursor.y },
      selectedSticker,
      stickerSize,
    );
    fireToolMoved();
  }
});

fireDrawingChanged();
