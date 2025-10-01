/* ======= DOM ELEMENTS ======= */
const notesTop = document.getElementById("notesTop");
const drawCanvas = document.getElementById("drawCanvas");
const drawToggle = document.getElementById("drawToggle");
const eraseToggle = document.getElementById("eraseToggle");
const clearDrawBtn = document.getElementById("clearDraw");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const pageNumber = document.getElementById("pageNumber");
const notesBottomContainer = document.getElementById("notesBottomContainer");
const grid = document.getElementById("grid");
const palette = document.getElementById("palette");
const toggleBtn = document.getElementById("toggleNotes");
const sidebar = document.getElementById("sidebar");

const btn1 = document.getElementById("btn1");
const btn2 = document.getElementById("btn2");
const btn3 = document.getElementById("btn3");
const btn4 = document.getElementById("btn4");
const colorButtons = [btn1, btn2, btn3, btn4];
let selectedCell = null;
let showCoords = false;

/* ======= MULTI-PAGE NOTES + DRAWING ======= */
let pages = [{ text: "", drawing: null }];
let currentPage = 0;

function savePage() {
  const ctx = drawCanvas.getContext("2d");
  pages[currentPage] = {
    text: notesTop.value,
    drawing: drawCanvas.toDataURL()
  };
}

// ======= CTRL/CMD + 1–4 COLOR SHORTCUTS =======
document.addEventListener("keydown", (e) => {
  const isModifier = e.ctrlKey || e.metaKey; // Ctrl (Win) or Cmd (Mac)

  if (isModifier && ["1","2","3","4"].includes(e.key)) {
    if (selectedCell) {
      const idx = parseInt(e.key, 10) - 1;
      const color = colorButtons[idx] ? colorButtons[idx].dataset.color : null;
      if (color) {
        const currentBg = selectedCell.style.background || "";
        selectedCell.style.background = (currentBg === color) ? "white" : color;
      }
    }
    e.preventDefault();
    return;
  }

  // optional: toggle coordinates with 'c'
  if (e.key.toLowerCase() === "c") {
    const active = document.activeElement;
    const tag = active && active.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || active.isContentEditable) return;
    showCoords = !showCoords;
    document.querySelectorAll(".coord").forEach(span => 
      span.style.display = showCoords ? "block" : "none"
    );
  }
});

function getColumnLetter(n) {
  let letters = "";
  while (n >= 0) {
    letters = String.fromCharCode((n % 26) + 65) + letters;
    n = Math.floor(n / 26) - 1;
  }
  return letters;
}

function loadPage() {
  const page = pages[currentPage] || { text: "", drawing: null };
  notesTop.value = page.text || "";

  resizeCanvas();
  const ctx = drawCanvas.getContext("2d");
  ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);

  if (page.drawing) {
    const img = new Image();
    img.src = page.drawing;
    img.onload = () => ctx.drawImage(img, 0, 0, drawCanvas.width, drawCanvas.height);
  }
  pageNumber.textContent = `Page ${currentPage + 1}`;
}

nextPageBtn.addEventListener("click", () => {
  savePage();
  currentPage++;
  if (!pages[currentPage]) pages[currentPage] = { text: "", drawing: null };
  loadPage();
});
prevPageBtn.addEventListener("click", () => {
  if (currentPage === 0) return;
  savePage();
  currentPage--;
  loadPage();
});

/* ======= DRAWING CANVAS ======= */
let drawing = false;
let erasing = false;

function resizeCanvas() {
  const rect = drawCanvas.getBoundingClientRect();
  drawCanvas.width = Math.max(1, Math.floor(rect.width));
  drawCanvas.height = Math.max(1, Math.floor(rect.height));
}
window.addEventListener("resize", () => {
  const data = drawCanvas.toDataURL();
  resizeCanvas();
  const ctx = drawCanvas.getContext("2d");
  const img = new Image();
  img.src = data;
  img.onload = () => ctx.drawImage(img, 0, 0, drawCanvas.width, drawCanvas.height);
});
resizeCanvas();

drawToggle.addEventListener("click", () => {
  const active = drawCanvas.style.pointerEvents === "auto";
  drawCanvas.style.pointerEvents = active ? "none" : "auto";
  drawToggle.classList.toggle("active", !active);
  if (!active) { erasing = false; eraseToggle.classList.remove("active"); }
});
eraseToggle.addEventListener("click", () => {
  erasing = !erasing;
  drawCanvas.style.pointerEvents = erasing ? "auto" : "none";
  eraseToggle.classList.toggle("active", erasing);
  if (erasing) drawToggle.classList.remove("active");
});
clearDrawBtn.addEventListener("click", () => {
  const ctx = drawCanvas.getContext("2d");
  ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  savePage();
});

function getCanvasPos(e) {
  const rect = drawCanvas.getBoundingClientRect();
  return { x: Math.round(e.clientX - rect.left), y: Math.round(e.clientY - rect.top) };
}

drawCanvas.addEventListener("pointerdown", (e) => {
  drawing = true;
  const ctx = drawCanvas.getContext("2d");
  const p = getCanvasPos(e);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
});
drawCanvas.addEventListener("pointermove", (e) => {
  if (!drawing) return;
  const ctx = drawCanvas.getContext("2d");
  const p = getCanvasPos(e);
  ctx.lineTo(p.x, p.y);
  ctx.strokeStyle = erasing ? "#ffffff" : "#000000";
  ctx.lineWidth = erasing ? 20 : 2;
  ctx.lineCap = "round";
  ctx.stroke();
});
["pointerup","pointercancel","pointerleave"].forEach(ev => {
  drawCanvas.addEventListener(ev, () => {
    if (drawing) {
      drawing = false;
      savePage();
    }
  });
});

/* ======= MULTI-LAYER GRID WITH DYNAMIC SIZES ======= */
gridColors = ["#d0d0d0", "red", "blue", "green", "purple"];
grids = gridColors.map(() => ({ cells: [], rows: 9, cols: 9 }));
currentGridIndex = 0;

function saveGrid() {
  const layer = grids[currentGridIndex];
  const wrappers = Array.from(grid.children);

  layer.cells = wrappers.map((wrapper, i) => {
    if (wrapper.classList.contains("cell-empty")) {
      return { value: "", bg: "white", deleted: true };
    }
    const input = wrapper.querySelector("input.cell");
    return {
      value: input.value,
      bg: input.style.background || "white",
      deleted: false
    };
  });
}

function loadGrid() {
  grid.innerHTML = "";
  const layer = grids[currentGridIndex];
  const rows = layer.rows || 9;
  const cols = layer.cols || 9;
  const state = layer.cells || [];

  grid.style.gridTemplateColumns = `repeat(${cols}, 60px)`;
  grid.style.gridAutoRows = `60px`;

  for (let i = 0; i < rows * cols; i++) {
    const cellData = state[i] || { value: "", bg: "white", deleted: false };

    if (cellData.deleted) {
      const empty = document.createElement("div");
      empty.className = "cell-empty";
      empty.addEventListener("mousedown", () => { selectedCell = empty; });
      grid.appendChild(empty);
      continue;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "cell-wrapper";

    const input = document.createElement("input");
    input.className = "cell";
    input.setAttribute("maxlength", "2");
    input.style.borderColor = gridColors[currentGridIndex];
    input.value = cellData.value;
    input.style.background = cellData.bg;

    const rowIdx = Math.floor(i / cols);
    const colIdx = i % cols;

    const coord = document.createElement("span");
    coord.className = "coord";
    coord.textContent = getColumnLetter(rowIdx) + (colIdx + 1);
    coord.style.display = showCoords ? "block" : "none";

    input.addEventListener("focus", () => { selectedCell = input; });
    input.addEventListener("mousedown", () => { selectedCell = input; });

    input.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const cells = Array.from(grid.querySelectorAll(".cell"));
      const idx = cells.indexOf(input);
      const r = Math.floor(idx / cols), c = idx % cols;
      if (e.shiftKey) {
        for (let rr = r - 1; rr <= r + 1; rr++) {
          for (let cc = c - 1; cc <= c + 1; cc++) {
            if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
              const cell = cells[rr * cols + cc];
              if (cell) {
                cell.value = "";
                cell.style.background = "white";
              }
            }
          }
        }
      } else {
        input.value = "";
        input.style.background = "white";
      }
    });

    wrapper.appendChild(input);
    wrapper.appendChild(coord);
    grid.appendChild(wrapper);
  }
}

/* ======= DELETE / RECOVER CELLS ======= */
document.addEventListener("keydown", (e) => {
  if (e.key !== "Delete") return;
  if (!selectedCell) return;

  const layer = grids[currentGridIndex];
  const wrappers = Array.from(grid.children);
  const idx = wrappers.indexOf(selectedCell.closest(".cell-wrapper") || selectedCell);
  if (idx === -1) return;

  const cellData = layer.cells[idx] || { value: "", bg: "white", deleted: false };
  cellData.deleted = !cellData.deleted;
  layer.cells[idx] = cellData;

  loadGrid(); // re-render
  e.preventDefault();
});

/* ======= GRID SIZE POPUP BUTTON ======= */
const gridSizeBtn = document.createElement("button");
gridSizeBtn.id = "gridSizeBtn";
gridSizeBtn.title = "Set Grid Size";
gridSizeBtn.style.cssText = `
  position: fixed; left: 8px; bottom: 44px;
  width: 24px; height: 24px;
  font-size: 14px; padding: 0;
  border-radius: 4px; border: none;
  background: #444; color: #fff; cursor: pointer;
`;
gridSizeBtn.textContent = "⚙";
document.body.appendChild(gridSizeBtn);

gridSizeBtn.addEventListener("click", () => {
  const layer = grids[currentGridIndex];
  const newRows = parseInt(prompt("Enter number of rows (1–100):", layer.rows), 10);
  const newCols = parseInt(prompt("Enter number of columns (1–100):", layer.cols), 10);

  if (
    isNaN(newRows) || isNaN(newCols) ||
    newRows < 1 || newCols < 1 || newRows > 100 || newCols > 100
  ) {
    alert("Rows and columns must be numbers between 1 and 100.");
    return;
  }

  const oldCells = layer.cells;
  layer.cells = Array(newRows * newCols).fill(null);
  for (let r = 0; r < Math.min(newRows, layer.rows); r++) {
    for (let c = 0; c < Math.min(newCols, layer.cols); c++) {
      const oldIdx = r * layer.cols + c;
      const newIdx = r * newCols + c;
      layer.cells[newIdx] = oldCells[oldIdx] || { value: "", bg: "white", deleted: false };
    }
  }

  layer.rows = newRows;
  layer.cols = newCols;

  loadGrid();
});

/* ======= GRID LAYER SWITCHING ======= */
document.addEventListener("keyup", (e) => {
  if (e.key !== "=" && e.key !== "-") return;

  const active = document.activeElement;
  if (active && (active.classList.contains("cell") || active === notesTop || active.classList.contains("notes-bottom-sector"))) return;

  saveGrid();
  if (e.key === "=") currentGridIndex = (currentGridIndex + 1) % grids.length;
  else currentGridIndex = (currentGridIndex - 1 + grids.length) % grids.length;
  loadGrid();
});

/* ======= COLOR BUTTONS & PALETTE ======= */
colorButtons.forEach(btn => {
  const computed = getComputedStyle(btn).backgroundColor;
  btn.dataset.color = computed;
  btn.addEventListener("click", () => {
    if (selectedCell && selectedCell.classList.contains("cell")) {
      selectedCell.style.background = btn.dataset.color;
    }
  });
  btn.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    showPalette(btn, e);
  });
});

const PALETTE_COLORS = ["#ffdddd","#fde0e0","#ffd6d6","#ffdede","#dde7ff","#ddefff","#dfefff","#ddffdd","#dfffe0","#fffacd","#ffe4b3","#f0ddff","#ffd6eb","#333333","#ffffff"];

function showPalette(button, e) {
  palette.innerHTML = "";
  PALETTE_COLORS.forEach(c => {
    const d = document.createElement("div");
    d.style.background = c;
    d.title = c;
    d.addEventListener("click", () => {
      button.style.background = c;
      button.dataset.color = c;
      palette.style.display = "none";
    });
    palette.appendChild(d);
  });
  palette.style.display = "flex";
  const x = Math.min(window.innerWidth - 120, Math.max(8, e.clientX));
  const y = Math.min(window.innerHeight - 120, Math.max(8, e.clientY));
  palette.style.left = x + "px";
  palette.style.top = y + "px";
}

document.addEventListener("click", (ev) => {
  if (!palette.contains(ev.target) && !colorButtons.includes(ev.target)) {
    palette.style.display = "none";
  }
});

/* ======= BOTTOM SECTORS ======= */
function addSector() {
  const ta = document.createElement("textarea");
  ta.className = "notes-bottom-sector";
  ta.placeholder = "Sector notes...";
  notesBottomContainer.appendChild(ta);
}
function removeSector() {
  if (notesBottomContainer.lastChild) notesBottomContainer.removeChild(notesBottomContainer.lastChild);
}
document.getElementById("addSector").addEventListener("click", addSector);
document.getElementById("removeSector").addEventListener("click", removeSector);
if (!notesBottomContainer.children.length) addSector();

/* ======= SIDEBAR TOGGLE ======= */
toggleBtn.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  toggleBtn.textContent = sidebar.classList.contains("collapsed") ? "⏵" : "⏴";
});

/* ======= AUTOSAVE TOP NOTES ======= */
notesTop.addEventListener("input", savePage);

/* ======= INIT ======= */
loadPage();
loadGrid();
