const Engine = Matter.Engine; // berechnet Physik 
const Runner = Matter.Runner; // lässt "laufen" 
const World = Matter.World; // enthält Körper 
const Events = Matter.Events; // Events 
const Bodies = Matter.Bodies; // Formen 

// the Matter engine to animate the world
let engine, runner, world, mouse;
let isDrag = false;
const dim = { w: 960, h: 960 };
let off = { x: 0, y: 0 };
let blocks = [];

let smallBalls = []; // Array für die kleinen Bälle
const smallBallR = 10; // Radius der kleinen Bälle

let tensionHullBody = null;

let testBall, canvasElem;
let centerBall;

let hourBall, minuteBall, secondBall;
const center = { x: 480, y: 480 };

const GAP = 35;          // schwarzer Abstand (px)
const CANVAS_SIZE = 960;

// Ballradien
const R_SMALL  = 10;     // lightpink
const R_SECOND = 30;
const R_MINUTE = 40;
const R_HOUR   = 54;

const CENTER = CANVAS_SIZE / 2;

// äußerster lightpink-Kreis
const PINK_RADIUS =
    CENTER
  - GAP
  - R_SMALL;

const SECOND_CIRCLE_RADIUS = PINK_RADIUS - 2.5 - R_SMALL;

// Sekunden-, Minuten-, Stunden-Orbits
const ORBIT_SECOND =
    PINK_RADIUS
  - GAP
  - R_SECOND;

const ORBIT_MINUTE =
    ORBIT_SECOND
  - R_SECOND
  - GAP
  - R_MINUTE;

const ORBIT_HOUR =
    ORBIT_MINUTE
  - R_MINUTE
  - GAP
  - R_HOUR;

// Radien der Umlaufbahnen (klar getrennt & sichtbar)

const testColor = 'red';
const collideWith = 'Hitter';

// collisionFilter: {group: 0x00, category: 0b0000 0000 0000 0001, mask: 0b1111 1111 1111 1111}
// collision of A and B: group > 0 && groupA == groupB          ,
// no collision of A and B: group < 0 && groupA == groupB
// groupA != groupB:
// collision of A and B ? (categoryA & maskB) !== 0 && (categoryB & maskA) !== 0
const cfM = { group: 0, category: 0x0002, mask: 0x0021 };
const cfX = { group: 0, category: 0x0004, mask: 0xffff };

const setCollide = (cfA, cfB, on) => {
    cfA.mask = on ? cfA.mask | cfB.category : cfA.mask & (~cfB.category & 0xff);
    // console.log(cfA.mask.toString(2))
};
const doesCollide = (cfA, cfB) => {
    return (cfA.mask & cfB.category) !== 0 && (cfB.mask & cfA.category) !== 0;
};

let secondCircleBalls = []; // sortierter Sekunden-Kreis
let showSecondCircle = true;
let showSmallBalls = false;

function preload() {}

// Nichts im setup machen !!!
function setup() {
    // This setup code is intended as "DON'T TOUCH IT"
    // If you really need to change it, please talk with Benno first.
    console.log(windowWidth, windowHeight);
    canvasElem = document.getElementById('thecanvas');
    let canvas = createCanvas(960, 960); // angepasst 
    canvas.parent('thecanvas');

    engine = Engine.create();
    runner = Runner.create({ isFixed: true, delta: 1000 / 60 });
    world = engine.world;

    // The Mouse is just a useful helper during the development phase
    mouse = new Mouse(engine, canvas, { stroke: 'blue', strokeWeight: 3 });
    // Matter.Mouse.setScale(mouse.mouse, {x: 0.75, y: 0.75});

    // You can also add test elements into the scene
    mouse.on('startdrag', (evt) => {
        isDrag = true;
    });
    mouse.on('mouseup', (evt) => {
        if (!isDrag) {
            showSecondCircle = !showSecondCircle;
            showSmallBalls = !showSecondCircle;

            // Kreis ausblenden → alle äußeren Kreis-Bälle entfernen
            if (!showSecondCircle) {
                secondCircleBalls.forEach(b =>
                    Matter.Composite.remove(world, b.body)
                );
                secondCircleBalls = [];
                draw.initializedCircle = false;
                // lightpink Bälle neu initialisieren
                smallBalls.forEach(b => Matter.Composite.remove(world, b.body));
                smallBalls = [];
                draw.initializedBalls = false;
            }

            // Kreis einblenden → neu aufbauen entsprechend aktueller Sekunde
            if (showSecondCircle) {
                const now = new Date();
                const sec = now.getSeconds() === 0 ? 60 : now.getSeconds();
                for (let s = 1; s <= sec; s++) {
                    updateSecondCircle(s);
                }
                draw.initializedCircle = true;
                draw.lastCircleSecond = now.getSeconds();
                // lightpink Bälle vollständig entfernen
                smallBalls.forEach(b => Matter.Composite.remove(world, b.body));
                smallBalls = [];
                draw.initializedBalls = true;
            }
        }
        isDrag = false;
    });

    // Register when a "Hitter" object collides with something and
    // then trigger the 'collideWith' function on the hit object
    Events.on(engine, 'collisionStart', function (event) {
        var pairs = event.pairs;
        pairs.forEach((pair, i) => {
            if (pair.bodyA.label == 'Hitter') {
                pair.bodyA.plugin.block.collideWith(pair.bodyB.plugin.block);
            }
            if (pair.bodyB.label == 'Hitter') {
                pair.bodyB.plugin.block.collideWith(pair.bodyA.plugin.block);
            }
        });
    });

    Events.on(engine, 'collisionActive', function (event) {
        var pairs = event.pairs;
        pairs.forEach((pair, i) => {
            if (pair.bodyA.label == 'Hitter' && pair.bodyB.label == 'Active') {
                pair.bodyA.plugin.block.collideWith(pair.bodyB.plugin.block);
            }
            if (pair.bodyB.label == 'Hitter' && pair.bodyA.label == 'Active') {
                pair.bodyB.plugin.block.collideWith(pair.bodyA.plugin.block);
            }
        });
    });

    createScene();
    // Start the Matter runner: physics will be simulated
    Runner.run(runner, engine);
}

function createScene() {
    new BlocksFromSVG(
        world,
        'clockSquare.svg',
        blocks, // <= nur zum Testen, damit der Rahmen sichtbar wird
        // [], // <= in neuem Array speichern, damit der Rahmen unsichtbar ist
        { isStatic: true, restitution: 0.0, friction: 0.0, frictionAir: 0.0 },
        {
            save: false,
            sample: 40,
            offset: { x: -100, y: -100 },
            done: (added, time, fromCache) => {
                console.log('FRAME', added, time, fromCache);
                added.frameB.attributes.trigger = (ball, block) => {
                    // if (ball.attributes.color == testColor) {
                    //   Matter.Composite.remove(engine.world, ball.body)
                    //   blocks = blocks.filter(block => block != ball)
                    // }
                };
            }
        }
    );

    // Mittelball 
    centerBall = new Ball(
        world,
        { x: 480, y: 480, r: 20, color: '#ff99ff' },
        {
            restitution: 0.8,
            friction: 0.0,
            frictionAir: 0.0,
            isStatic: true,
            collisionFilter: {
                category: 0x0100, // eigene Kategorie für den Mittelball
                mask: 0x0008      // reagiert auf kleine Bälle
            }
        }
    );
    blocks.push(centerBall);

// Stunden-Ball
hourBall = new Ball(
    world,
    { x: center.x + ORBIT_HOUR, y: center.y, r: R_HOUR, color: '#ff00ff' },
    { restitution: 0, friction: 0, frictionAir: 0.02, isSensor: true }
);
blocks.push(hourBall);

// Minuten-Ball
minuteBall = new Ball(
    world,
    { x: center.x + ORBIT_MINUTE, y: center.y, r: R_MINUTE, color: '#ff00ff' },
    { restitution: 0, friction: 0, frictionAir: 0.02, isSensor: true }
);
blocks.push(minuteBall);

// Sekunden-Ball
secondBall = new Ball(
    world,
    { x: center.x + ORBIT_SECOND, y: center.y, r: R_SECOND, color: '#ff00ff' },
    { restitution: 0, friction: 0, frictionAir: 0.02, isSensor: true }
);

// Uhrbälle Kollision einstellen, reagieren nur auf pinke Bälle
hourBall.body.collisionFilter.category = 0x0002;
hourBall.body.collisionFilter.mask = 0x0008;

minuteBall.body.collisionFilter.category = 0x0002;
minuteBall.body.collisionFilter.mask = 0x0008;

secondBall.body.collisionFilter.category = 0x0002;
secondBall.body.collisionFilter.mask = 0x0008;

blocks.push(secondBall);
}

function addSmallBall() {
    let x, y;
    let tries = 0;
    let valid = false;

    // Zufällige Platzierung nur innerhalb des Sekunden-Kreis-Radius
    while (!valid && tries < 100) {
        const r = random(0, SECOND_CIRCLE_RADIUS);
        const angle = random(0, TWO_PI);
        x = center.x + r * cos(angle);
        y = center.y + r * sin(angle);

        const inClockBall =
            dist(x, y, hourBall.body.position.x, hourBall.body.position.y) < hourBall.body.circleRadius ||
            dist(x, y, minuteBall.body.position.x, minuteBall.body.position.y) < minuteBall.body.circleRadius ||
            dist(x, y, secondBall.body.position.x, secondBall.body.position.y) < secondBall.body.circleRadius;

        valid = !inClockBall;
        tries++;
    }

    if (!valid) return;

    const ball = new Ball(
        world,
        { x, y, r: smallBallR, color: '#FF99FF' },
        { restitution: 0.9, frictionAir: 0.05 }
    );

    // Kollisionsfilter anpassen: reagiert auf die Hülle, secondBall und den Mittelball
    ball.body.collisionFilter = {
        group: 0,
        category: 0x0008,                 // kleine Bälle
        mask: 0x0010 | 0x0008 | 0x0100   // Hülle + secondBall + Mittelball
    };

    const speed = 1;
    Matter.Body.setVelocity(ball.body, {
        x: random(-speed, speed),
        y: random(-speed, speed)
    });

    Events.on(engine, 'beforeUpdate', () => {
        const pos = ball.body.position;
        let vx = ball.body.velocity.x + random(-0.03, 0.03);
        let vy = ball.body.velocity.y + random(-0.03, 0.03);

        // Gravitation neutralisieren
        vy -= engine.world.gravity.y * ball.body.mass;

        // Randbegrenzung
        if (pos.x < smallBallR) vx = abs(vx);
        if (pos.x > dim.w - smallBallR) vx = -abs(vx);
        if (pos.y < smallBallR) vy = abs(vy);
        if (pos.y > dim.h - smallBallR) vy = -abs(vy);

        Matter.Body.setVelocity(ball.body, { x: vx, y: vy });

        // Sanftes Schieben statt Stoßen bei Kollision mit secondBall
        const dx = pos.x - secondBall.body.position.x;
        const dy = pos.y - secondBall.body.position.y;
        const dist = Math.sqrt(dx*dx + dy*dy) || 0.001;
        const minDist = secondBall.body.circleRadius + smallBallR;
        if (dist < minDist) {
            const overlap = minDist - dist;
            const pushStrength = 0.01; // sanftes Schieben statt Stoßen
            Matter.Body.applyForce(ball.body, pos, {
                x: (dx / dist) * overlap * pushStrength,
                y: (dy / dist) * overlap * pushStrength
            });
        }

        // Sanfte, schwirrende Rückführung innerhalb des Sekundenkreises
        const dxC = pos.x - center.x;
        const dyC = pos.y - center.y;
        const distanceFromCenter = Math.sqrt(dxC*dxC + dyC*dyC);
        if (distanceFromCenter > SECOND_CIRCLE_RADIUS - smallBallR) {
            const overlap = distanceFromCenter - (SECOND_CIRCLE_RADIUS - smallBallR);
            const pushStrength = 0.002;

            const angleOffset = random(-0.3, 0.3);
            const angle = Math.atan2(dyC, dxC) + angleOffset;

            Matter.Body.applyForce(ball.body, pos, {
                x: -Math.cos(angle) * overlap * pushStrength,
                y: -Math.sin(angle) * overlap * pushStrength
            });
        }
    });

    smallBalls.push(ball);
}

function updateSecondCircle(sec) {
    // Reset bei Sekunde 1
    if (sec === 1) {
        secondCircleBalls.forEach(b => Matter.Composite.remove(world, b.body));
        secondCircleBalls = [];
    }

    // Nur Sekunde 1–60 aufbauen
    if (sec < 1 || sec > 60) return;

    // Winkel im Uhrzeigersinn, oben = 60
    const angle = (sec / 60) * TWO_PI - HALF_PI;

    // Position auf perfekter Umlaufbahn
    const x = center.x + cos(angle) * SECOND_CIRCLE_RADIUS;
    const y = center.y + sin(angle) * SECOND_CIRCLE_RADIUS;

    const ball = new Ball(
        world,
        { x, y, r: R_SMALL, color: '#ff99ff' },
        {
            isStatic: true,
            restitution: 0,
            friction: 0,
            frictionAir: 0
        }
    );

    // Keine Kollisionen – nur visuell
    ball.body.collisionFilter = {
        group: 0,
        category: 0x0040,
        mask: 0x0000
    };

    secondCircleBalls.push(ball);
}

function scrollEndless(point) {
    // wohin muss verschoben werden damit point wenn möglich in der Mitte bleibt
    off = { x: Math.min(Math.max(0, point.x - window.innerWidth / 2), dim.w - window.innerWidth), y: Math.min(Math.max(0, point.y - window.innerHeight / 2), dim.h - window.innerHeight) };
    // plaziert den Canvas im aktuellen Viewport
    canvasElem.style.left = Math.round(off.x) + 'px';
    canvasElem.style.top = Math.round(off.y) + 'px';
    // korrigiert die Koordinaten
    translate(-off.x, -off.y);
    // verschiebt den ganzen Viewport
    window.scrollTo(off.x, off.y);
    mouse.setOffset(off);
}

function drawTensionHull() {
    let points = [];
    window.currentHull = null;

    points.push(
        ...circleSupportPoints(hourBall.body.position, hourBall.body.circleRadius),
        ...circleSupportPoints(minuteBall.body.position, minuteBall.body.circleRadius),
        ...circleSupportPoints(secondBall.body.position, secondBall.body.circleRadius),
        ...circleSupportPoints(centerBall.body.position, centerBall.body.circleRadius) // Mittelball hinzufügen
    );

    const hull = convexHull(points);
    window.currentHull = hull;

    if (hull.length >= 3) {
        // alten Body entfernen
        if (tensionHullBody) Matter.Composite.remove(world, tensionHullBody);

        const center = Matter.Vertices.centre(hull);

        tensionHullBody = Matter.Bodies.fromVertices(
            center.x,
            center.y,
            [hull],
            {
                isStatic: true,
                restitution: 0,    // kein hartes Abprallen, nur Umlenken
                friction: 0,
                frictionAir: 0,
                collisionFilter: {
                    category: 0x0010,  // Magentafläche
                    mask: 0x0008       // kleine Bälle
                }
            },
            true
        );

        Matter.Composite.add(world, tensionHullBody);
    }

    // Visualisierung
    noStroke();
    fill(255, 0, 255, 100);
    beginShape();
    hull.forEach(p => vertex(p.x, p.y));
    endShape(CLOSE);
}

function draw() {
    // clear and background
    background(0);

    const now = new Date();
    const currentSecond = now.getSeconds();

    // Sekunden-Kreis sofort für alle verstrichenen Sekunden aufbauen
    if (showSecondCircle && !draw.initializedCircle) {
        const sec = currentSecond === 0 ? 60 : currentSecond;
        for (let s = 1; s <= sec; s++) {
            updateSecondCircle(s);
        }
        draw.initializedCircle = true;
        draw.lastCircleSecond = currentSecond;
    }

    // kleine Bälle sofort für alle verstrichenen Sekunden aufbauen
    if (showSmallBalls && !draw.initializedBalls) {
        const sec = currentSecond === 0 ? 60 : currentSecond;
        for (let i = 0; i < sec; i++) {
            addSmallBall();
        }
        draw.initializedBalls = true;
    }

    // kleine Sekunden-Bälle NUR auf schwarzem Hintergrund
    if (showSmallBalls) {
        smallBalls.forEach(ball => ball.draw());
    }

    // Sekunden-Kreis aufbauen
    if (
        showSecondCircle &&
        currentSecond !== (draw.lastCircleSecond ?? -1)
    ) {
        const secForCircle = currentSecond === 0 ? 60 : currentSecond;
        updateSecondCircle(secForCircle);
        draw.lastCircleSecond = currentSecond;
    }

    // Sekunden-Kreis zeichnen
    if (showSecondCircle) {
        secondCircleBalls.forEach(ball => ball.draw());
    }

    // Sekundenball: Farbwechsel nur bei neuem Minutenbeginn (für 1 Sekunde)
    if (now.getSeconds() === 0) {
        secondBall.attributes.color = '#ff99ff';
    } else {
        secondBall.attributes.color = '#ff00ff';
    }

    // Sekunde 0 → alle Bälle löschen
    if (currentSecond === 0 && (draw.lastSecond ?? -1) !== 0) {
        smallBalls.forEach(b => Matter.Composite.remove(world, b.body));
        smallBalls = [];
    }

    // Neue Kugel hinzufügen, wenn Sekunde != 0
    if (currentSecond !== 0 && currentSecond !== (draw.lastSecond ?? -1)) {
        addSmallBall();
    }

    // letzte Sekunde merken
    draw.lastSecond = currentSecond;

    const sec = now.getSeconds() + now.getMilliseconds() / 1000;
    const min = now.getMinutes() + sec / 60;
    const hr  = (now.getHours() % 12) + min / 60;

    // Winkel (−90°, damit Start oben ist)
    const aSec = sec * TWO_PI / 60 - HALF_PI;
    const aMin = min * TWO_PI / 60 - HALF_PI;
    const aHr  = hr  * TWO_PI / 12 - HALF_PI;

    // Positionen setzen (echte Matter Bodies!)
    Matter.Body.setPosition(secondBall.body, {
        x: center.x + cos(aSec) * ORBIT_SECOND,
        y: center.y + sin(aSec) * ORBIT_SECOND
    });

    Matter.Body.setPosition(minuteBall.body, {
        x: center.x + cos(aMin) * ORBIT_MINUTE,
        y: center.y + sin(aMin) * ORBIT_MINUTE
    });

    Matter.Body.setPosition(hourBall.body, {
        x: center.x + cos(aHr) * ORBIT_HOUR,
        y: center.y + sin(aHr) * ORBIT_HOUR
    });

    drawTensionHull();

    blocks.forEach(block => block.draw());
    mouse.draw();
}

// KONVEX HULL
function convexHull(points) {
    if (points.length <= 3) return points;

    points = points.slice().sort((a, b) =>
        a.x === b.x ? a.y - b.y : a.x - b.x
    );

    const cross = (o, a, b) =>
        (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

    const lower = [];
    for (let p of points) {
        while (lower.length >= 2 &&
               cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
            lower.pop();
        }
        lower.push(p);
    }

    const upper = [];
    for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i];
        while (upper.length >= 2 &&
               cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
            upper.pop();
        }
        upper.push(p);
    }

    upper.pop();
    lower.pop();
    return lower.concat(upper);
}

function circleSupportPoints(pos, r, count = 12) {
    const pts = [];
    for (let i = 0; i < count; i++) {
        const a = TWO_PI * i / count;
        pts.push({
            x: pos.x + cos(a) * r,
            y: pos.y + sin(a) * r
        });
    }
    return pts;
}

function pointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;

        const intersect =
            ((yi > point.y) !== (yj > point.y)) &&
            (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}