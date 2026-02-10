/************************************************
 * CLOCKWORK – AM/PM + PURPLE DATE
 * p5.js ONLY
 * Resolution: 960 × 960
 ************************************************/

const SIZE = 960;
let font;
let ready = false;

let particles = [];
let targets = [];

let mode = "TIME";            // TIME | DATE
let state = "FORMED";         // FORMED | SCATTERED | ASSEMBLING
let lastKey = "";

// ===============================
// TIMING
// ===============================
let scatterStartTime = 0;
const SCATTER_DURATION = 1500; // 1,5 Sekunden Zerfall

// ===============================
// PARAMETER
// ===============================
const PARTICLE_SIZE = 5;
const SCATTER_SPEED = 4;
const ASSEMBLE_SPEED = 0.1;
const MARGIN = 26;
const MAIN_SIZE = 370;
const MONTH_PADDING = 20;

// 🎨 FARBEN
const COLOR_AM = [220, 28, 28];       // #D00000
const COLOR_PM = [72, 150, 220];    // #3F88C5
const COLOR_DATE = [180, 60, 230];  // 🟣 DEINE NEUE DATUM-FARBE

// ===============================
// SETUP
// ===============================
function setup() {
  const c = createCanvas(SIZE, SIZE);
  c.parent("thecanvas");
  textAlign(CENTER, CENTER);

  loadFont(
    "https://cdnjs.cloudflare.com/ajax/libs/topcoat/0.8.0/font/SourceSansPro-BoldIt.otf",
    f => {
      font = f;
      textFont(font);
      buildInitialText();
      ready = true;
    }
  );
}

// ===============================
// DRAW
// ===============================
function draw() {
  background(0);

  if (!ready) {
    fill(255);
    text("loading…", width / 2, height / 2);
    return;
  }

  // TIME update
  if (state === "FORMED" && mode === "TIME") {
    const key = getStateKey();
    if (key !== lastKey) {
      lastKey = key;
      hardUpdateText();
    }
  }

  // Auto assemble nach 1,5 Sekunden
  if (
    state === "SCATTERED" &&
    millis() - scatterStartTime >= SCATTER_DURATION
  ) {
    triggerAutoAssemble();
  }

  // 🎨 WÄHLE FARBE JE NACH MODUS
  let col;
  if (mode === "TIME") {
    col = hour() < 12 ? COLOR_AM : COLOR_PM;
  } else {
    col = COLOR_DATE; // 🟣 DATUM
  }

  // Partikel bewegen & zeichnen
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    if (state === "SCATTERED") {
      p.x += p.vx;
      p.y += p.vy;
    }

    if (state === "ASSEMBLING") {
      p.x = lerp(p.x, targets[i].x, ASSEMBLE_SPEED);
      p.y = lerp(p.y, targets[i].y, ASSEMBLE_SPEED);
    }

    p.x = constrain(p.x, MARGIN, width - MARGIN);
    p.y = constrain(p.y, MARGIN, height - MARGIN);

    noStroke();
    fill(col[0], col[1], col[2]);
    circle(p.x, p.y, PARTICLE_SIZE);
  }

  // Assemble Ende
  if (state === "ASSEMBLING") {
    let done = true;
    for (let i = 0; i < particles.length; i++) {
      if (
        dist(
          particles[i].x,
          particles[i].y,
          targets[i].x,
          targets[i].y
        ) > 1
      ) {
        done = false;
        break;
      }
    }
    if (done) state = "FORMED";
  }
}

// ===============================
// TEXT → POINTS
// ===============================
function getTextPoints() {
  textSize(MAIN_SIZE);

  // TIME (RIGHT)
  if (mode === "TIME") {
    const h = nf(hour(), 2);
    const m = `:${nf(minute(), 2)}`;

    const hourCX = width * 0.75;
    const hourCY = height * 0.25;
    const minCX  = width * 0.75;
    const minCY  = height * 0.75;

    const hb = font.textBounds(h, 0, 0, MAIN_SIZE);
    const mb = font.textBounds(m, 0, 0, MAIN_SIZE);
    const digitShift = hb.w / 4;

    return font.textToPoints(
      h,
      hourCX - hb.w / 2,
      hourCY + hb.h / 2,
      MAIN_SIZE,
      { sampleFactor: 0.16 }
    ).concat(
      font.textToPoints(
        m,
        minCX - mb.w / 2 - digitShift,
        minCY + mb.h / 2,
        MAIN_SIZE,
        { sampleFactor: 0.16 }
      )
    );
  }

  // DATE (LEFT)
  const dayStr = nf(day(), 2);
  const monthStr = getMonthShort();

  const leftMinX = MARGIN;
  const monthBounds = font.textBounds(monthStr, 0, 0, MAIN_SIZE);
  const monthCX = max(
    width * 0.25,
    leftMinX + MONTH_PADDING + monthBounds.w / 2
  );

  return font.textToPoints(
    dayStr,
    width * 0.25 - font.textBounds(dayStr,0,0,MAIN_SIZE).w / 2,
    height * 0.25 + MAIN_SIZE / 2,
    MAIN_SIZE,
    { sampleFactor: 0.18 }
  ).concat(
    font.textToPoints(
      monthStr,
      monthCX - monthBounds.w / 2,
      height * 0.75 + monthBounds.h / 2,
      MAIN_SIZE,
      { sampleFactor: 0.18 }
    )
  );
}

// ===============================
// BUILD / UPDATE
// ===============================
function buildInitialText() {
  particles = [];
  targets = [];
  lastKey = getStateKey();

  const pts = getTextPoints();
  for (let pt of pts) {
    particles.push({ x: pt.x, y: pt.y, vx: 0, vy: 0 });
    targets.push({ x: pt.x, y: pt.y });
  }
}

function hardUpdateText() {
  const pts = getTextPoints();
  if (pts.length !== particles.length) {
    buildInitialText();
    return;
  }
  for (let i = 0; i < pts.length; i++) {
    particles[i].x = pts[i].x;
    particles[i].y = pts[i].y;
    targets[i].x = pts[i].x;
    targets[i].y = pts[i].y;
  }
}

// ===============================
// AUTO ASSEMBLE
// ===============================
function triggerAutoAssemble() {
  mode = mode === "TIME" ? "DATE" : "TIME";
  lastKey = getStateKey();

  const pts = getTextPoints();
  particles = [];
  targets = [];

  for (let pt of pts) {
    particles.push({
      x: random(MARGIN, width - MARGIN),
      y: random(MARGIN, height - MARGIN),
      vx: random(-SCATTER_SPEED, SCATTER_SPEED),
      vy: random(-SCATTER_SPEED, SCATTER_SPEED)
    });
    targets.push({ x: pt.x, y: pt.y });
  }

  state = "ASSEMBLING";
}

// ===============================
// INPUT (ROBUST)
// ===============================
function mousePressed() {
  if (!ready) return;
  if (state !== "FORMED") return;

  state = "SCATTERED";
  scatterStartTime = millis();

  for (let p of particles) {
    p.vx = random(-SCATTER_SPEED, SCATTER_SPEED);
    p.vy = random(-SCATTER_SPEED, SCATTER_SPEED);
  }
}

function touchStarted() {
  mousePressed();
  return false;
}

// ===============================
// HELPERS
// ===============================
function getStateKey() {
  return mode === "TIME"
    ? `T-${hour()}-${minute()}`
    : `D-${day()}-${month()}`;
}

function getMonthShort() {
  return ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"][month()-1];
}

function nf(n, d) {
  return n.toString().padStart(d, "0");
}
