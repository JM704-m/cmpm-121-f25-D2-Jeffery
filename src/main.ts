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
  constructor(p0: Point) {
    this.pts.push(p0);
  }
  drag(p: Point): void {
    this.pts.push(p);
  }
  display(ctx: CanvasRenderingContext2D): void {
    if (this.pts.length === 0) return;
    ctx.beginPath();
    const first = this.pts[0]!;
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < this.pts.length; i++) {
      const pt = this.pts[i]!;
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
  }
}

const displayList: DisplayCommand[] = [];

let currentStroke: MarkerLine | null = null;

function toCanvasXY(ev: MouseEvent): Point {
  const rect = canvas.getBoundingClientRect();
  return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
}

function redrawAll() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const cmd of displayList) {
    (cmd as DisplayCommand).display(ctx);
  }
}

function fireDrawingChanged() {
  canvas.dispatchEvent(new Event("drawing-changed"));
}

canvas.addEventListener("drawing-changed", redrawAll);

canvas.addEventListener("mousedown", (e) => {
  cursor.active = true;
  const p = toCanvasXY(e);
  redoStack.length = 0;
  currentStroke = new MarkerLine({ x: p.x, y: p.y });
  displayList.push(currentStroke);
  fireDrawingChanged();
});

canvas.addEventListener("mousemove", (e) => {
  if (!cursor.active || !currentStroke) {
    return;
  }
  const p = toCanvasXY(e);
  cursor.x = p.x;
  cursor.y = p.y;
  currentStroke.drag({ x: cursor.x, y: cursor.y });
  fireDrawingChanged();
});

canvas.addEventListener("mouseup", () => {
  cursor.active = false;
  currentStroke = null;
});

canvas.addEventListener("mouseleave", () => {
  cursor.active = false;
  currentStroke = null;
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
  if (redoStack.length === 0) {
    return;
  }
  const restored = redoStack.pop()!;
  displayList.push(restored);
  fireDrawingChanged();
}

undoButton.addEventListener("click", undo);
redoButton.addEventListener("click", redo);
fireDrawingChanged();
