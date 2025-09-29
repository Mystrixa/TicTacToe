/* ======= DOM ======= */
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

/* ======= PAGES (only top notes + drawing are paged) ======= */
let pages = [{ text: "", drawing: null }];
let currentPage = 0;
function savePage() {
  const ctx = drawCanvas.getContext("2d");
  pages[currentPage] = {
    text: notesTop.value,
    drawing: drawCanvas.toDataURL()
  };
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
    img.onload = () => {
      ctx.drawImage(img, 0, 0, drawCanvas.width, drawCanvas.height);
    };
  }
  pageNumber.textContent = `Page ${currentPage + 1}`;
}
function nextPage() {
  savePage();
  currentPage++;
  if (!pages[currentPage]) pages[currentPage] = { text: "", drawing: null };
  loadPage();
}
function prevPage() {
  if (currentPage === 0) return;
  savePage();
  currentPage--;
  loadPage();
}
nextPageBtn.addEventListener("click", nextPage);
prevPageBtn.addEventListener("click", prevPage);

/* ======= CANVAS / DRAWING ======= */
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

/* ======= MULTI-GRID ======= */
const gridColors = ["#d0d0d0", "red", "blue", "green", "purple"];
let grids = Array(gridColors.length).fill(null).map(() => []);
let currentGridIndex = 0;

function saveGrid() {
  const cells = Array.from(grid.querySelectorAll(".cell"));
  grids[currentGridIndex] = cells.map(cell => ({
    value: cell.value,
    bg: cell.style.background
  }));
}
function loadGrid() {
  grid.innerHTML = "";
  const state = grids[currentGridIndex];
  const rows = 9, cols = 9;
  for (let i = 0; i < rows * cols; i++) {
    const wrapper = document.createElement("div");
    wrapper.className = "cell-wrapper";

    const input = document.createElement("input");
    input.className = "cell";
    input.setAttribute("maxlength", "2");
    input.style.borderColor = gridColors[currentGridIndex]; // border color for this grid

    const row = Math.floor(i / cols), col = i % cols;
    const coord = document.createElement("span");
    coord.className = "coord";
    coord.textContent = String.fromCharCode(65 + row) + (col + 1);
    coord.style.display = showCoords ? "block" : "none";

    if (state && state[i]) {
      input.value = state[i].value;
      input.style.background = state[i].bg;
    }

    input.addEventListener("focus", () => { selectedCell = input; });
    input.addEventListener("mousedown", () => { selectedCell = input; });
    input.addEventListener("input", () => {
      const val = input.value.trim();
      if (/^`[1-4]$/.test(val)) {
        const index = parseInt(val[1]) - 1;
        if (colorButtons[index]) {
          input.style.background = colorButtons[index].dataset.color;
          input.value = "";
        }
      }
    });

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
              cell.value = "";
              cell.style.background = "white";
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

// Keybinds for cycling grids
document.addEventListener("keydown", e => {
  if (e.key === "=") {
    saveGrid();
    currentGridIndex = (currentGridIndex + 1) % gridColors.length;
    loadGrid();
  } else if (e.key === "-") {
    saveGrid();
    currentGridIndex = (currentGridIndex - 1 + gridColors.length) % gridColors.length;
    loadGrid();
  }
});

/* ======= COLOR BUTTONS ======= */
colorButtons.forEach(btn => {
  const computed = getComputedStyle(btn).backgroundColor;
  btn.dataset.color = computed;
  btn.addEventListener("click", () => {
    if (selectedCell) selectedCell.style.background = btn.dataset.color;
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
  palette.style.left = e.clientX + "px";
  palette.style.top = e.clientY + "px";
}
document.addEventListener("click", (ev) => {
  if (!palette.contains(ev.target) && !colorButtons.includes(ev.target)) {
    palette.style.display = "none";
  }
});

/* ======= Bottom sectors ======= */
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

/* ======= Toggle coords ======= */
let showCoords = false;
document.addEventListener("keydown", e => {
  const tag = document.activeElement.tagName;
  if (tag === "TEXTAREA" || tag === "INPUT" || document.activeElement.isContentEditable) return;
  if (e.key.toLowerCase() === "c") {
    showCoords = !showCoords;
    document.querySelectorAll(".coord").forEach(span => span.style.display = showCoords ? "block" : "none");
  }
});

/* ======= Sidebar toggle ======= */
toggleBtn.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  toggleBtn.textContent = sidebar.classList.contains("collapsed") ? "⏵" : "⏴";
});

/* ======= keep notes saved when typing ======= */
notesTop.addEventListener("input", savePage);

/* ======= INIT ======= */
loadPage();
loadGrid();
