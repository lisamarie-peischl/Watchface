const Engine = Matter.Engine;
const Runner = Matter.Runner;
const World = Matter.World;
const Events = Matter.Events;
const Bodies = Matter.Bodies;


const topAttractor = {
    y: -10,
    strength: 0.0001
};

const topZone = {
        xMin: 80,
        xMax: 960 - 80,
        y: 0,
    };

const minuteZone ={
    xMin: 140,
    xMax: 960 - 140,
    y: 960 - 530,
};

const centerAttractor = {
    x: () => width / 2,
    y: () => height / 2,
    strength: 0.00008,
    active: true,
};

// the Matter engine to animate the world
let engine, runner, world, mouse;
const dim = { w: 960, h: 960 };
let off = { x: 0, y: 0 };
let blocks = [];

let secondBalls = [];
let minuteBalls = [];
let hourTriangles = [];

let lastSecond = -1;

let mergingSeconds = false;
let mergeProgress = 0;

let mergingMinutes = false;
let minuteMergeProgress = 0;

let explosionStart = 0;

let explosionPhase = "start";

// "start", "repel", "sort", "settle", "end

// collisionFilter: {group: 0x00, category: 0b0000 0000 0000 0001, mask: 0b1111 1111 1111 1111}
// collision of A and B: group > 0 && groupA == groupB          ,
// no collision of A and B: group < 0 && groupA == groupB
// groupA != groupB:
// collision of A and B ? (categoryA & maskB) !== 0 && (categoryB & maskA) !== 0

const setCollide = (cfA, cfB, on) => {
    cfA.mask = on ? cfA.mask | cfB.category : cfA.mask & (~cfB.category & 0xff);
    // console.log(cfA.mask.toString(2))
};
const doesCollide = (cfA, cfB) => {
    return (cfA.mask & cfB.category) !== 0 && (cfB.mask & cfA.category) !== 0;
};

function preload() {}

function setup() {
    // This setup code is intended as "DON'T TOUCH IT"
    // If you really need to change it, please talk with Benno first.
    console.log(windowWidth, windowHeight);
    canvasElem = document.getElementById('thecanvas');
    let canvas = createCanvas(960, 960);
    canvas.parent('thecanvas');

    engine = Engine.create();
    engine.world.gravity.y = 0.001; // no gravity
    runner = Runner.create({ isFixed: true, delta: 1000 / 60 });
    world = engine.world;

    // The Mouse is just a useful helper during the development phase
    mouse = new Mouse(engine, canvas, { stroke: 'blue', strokeWeight: 3 });
    // Matter.Mouse.setScale(mouse.mouse, {x: 0.75, y: 0.75});

    // You can also add test elements into the scene

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

    Events.on(engine, 'afterUpdate', () => {
        [...secondBalls, ...minuteBalls, ...hourTriangles].forEach(o => {
            const b = o.body;
            if (!b) return;

            if (b.position.x < 0) Matter.Body.setPosition(b, { x: width, y: b.position.y });
            if (b.position.x > width) Matter.Body.setPosition(b, { x: 0, y: b.position.y });

            if (b.position.y < 0) Matter.Body.setPosition(b, { x: b.position.x, y: height });
            if (b.position.y > height) Matter.Body.setPosition(b, { x: b.position.x, y: 0 });
        });
    });

    function initFromCurrentTime() {

        const h24 = hour(); 
        const isPM = h24 >= 12;

        hourCount = h24 % 12;
        if (hourCount === 0) hourCount = 12;

        for (let i = 0; i< hourCount; i++) {
            spawnHourTriangle(isPM);
        }

        for (let i = 0; i < minute(); i++) {
            spawnMinuteBall(true);
        }

        for (let i = 0; i < second(); i++) {
            spawnSecondBall(true);
        }
        
        lastSecond = second();
        lastMinute = minute();
        lastHour = h24;
    }

    initFromCurrentTime();
}

function spawnSecondBall() {
    const ball = new Ball(
        world,
        {
            x: random(topZone.xMin, topZone.xMax),
            y: random(60, 120),
            r: 20,
            color: '#E0C7F9'
        }, 
        {
            restitution: 0.5,
            friction: 0.05,
            frictionAir: 0.015,
            density: 0.0015,
        }
    );

    secondBalls.push(ball);
    blocks.push(ball);
    
}

function spawnMinuteBall() {
    const ball = new Ball(
        world,
        {
            x: random(150, width - 150),
            y: random(200, 350),
            r: 40,
            color: '#B191FA'
        },
        {
            restitution: 0.1,
            friction: 0.001,
            frictionAir: 0.03,
            density: 0.004,
        }
    );
    minuteBalls.push(ball);
    blocks.push(ball);
}

function spawnHourTriangle(isPM) {
    let body;

    if(isPM) {
        body = Matter.Bodies.rectangle(
            random(width * 0.3, width * 0.7),
            random(100,600),
            120,
            120,
            {
                chamfer: { radius: 32 },
                restitution: 0.35,
                friction: 0.02,
                frictionAir: 0.006,
                density: 0.012,
            }
        );
    } else {
        body = Matter.Bodies.circle(
            random(width * 0.3, width * 0.7),
            random(100,600),
            60,
            {
                restitution: 0.35,  
                friction: 0.0001, 
                frictionAir: 0.01,
                density: 0.012,
            }
        )
    }

    Matter.World.add(world, body);

    const hourShape = {
        body,
        isPM,
        draw() {
            push();
            translate(body.position.x, body.position.y);
            rotate(body.angle);
            noStroke();
            fill('#7C4AEF');
            if (isPM) {
                rectMode(CENTER);
                rect(0, 0, 120, 120, 32);
            } else {
                ellipse(0,0, 120);
            }

            pop();
        }
    };
    hourTriangles.push(hourShape);
    blocks.push(hourShape);
    return hourShape;
}


function createScene() {
    new BlocksFromSVG(
        world,
        '../libraries/clockSquare.svg', // SVG liegt jetzt im libraries-Ordner
        [],

        { isStatic: true, restitution: 0.0, friction: 0.0, frictionAir: 0.0 },
        {
            save: false,
            sample: 40,
            offset: { x: -100, y: -100 },
            // offset: { x: 0, y: 0 }, // Rechteck ganz sehen 
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

    const ceiling = new Block(
        world,
        {
            x: width / 2,
            y: 0,
            w: width,
            h: 0,
            color: 'pink'
        },
        { isStatic: true }
    );

    blocks.push(ceiling);

    const ground = new Block(
        world,
        {
        x: width / 2,
        y: height,
        w: width,
        h: 0,
        color: 'transparent'
        },
        {
            isStatic: true
        }
    );
    blocks.push(ground);
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

function mergeSecondsToMinute() {

    if (secondBalls.length === 0) return;

    mergingSeconds = true;
    mergeProgress = 0;

    // Sekunden aus der Physik entkoppeln
    secondBalls.forEach(b => {
        Matter.Body.setVelocity(b.body, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(b.body, 0);
        Matter.Body.setStatic(b.body, true);
    })

}

function draw() {

    background('#000000ff');

    if (explosionPhase === "start") {
        applyCenterAttraction(secondBalls);
        applyCenterAttraction(minuteBalls);
        applyCenterAttraction(hourTriangles);
    }   

    if(explosionPhase === "repel") {
        
        const t = millis() - explosionStart;

        if(t < 700) {
            explode(secondBalls, 0.12);
            explode(minuteBalls, 0.45);
            explode(hourTriangles, 0.6);
        }

        engine.world.gravity.y = 0.0;

        if(t > 900) {
            explosionPhase = "sort";
            console.log("SORT");
        }
    }
    
    if(explosionPhase === "sort") {

        applyTopAttraction(secondBalls);
        applyMinuteAttraction(minuteBalls);
        
        engine.world.gravity.y = 0.12;

        hourTriangles.forEach(o => {
            Matter.Body.applyForce(o.body, o.body.position, {
                x: 0,
                y: 0.004 * o.body.mass
            });
        });

        explosionPhase = "settle";
    }

    if(explosionPhase === "settle") {
        secondBalls.forEach(o => o.body.frictionAir = 0.02);
        minuteBalls.forEach(o => o.body.frictionAir = 0.03);
        hourTriangles.forEach(o => o.body.frictionAir = 0.01);

        explosionPhase = "end";
    }
    if (explosionPhase === "end") {
        // alles ruhig - keine weiteren Klicks
        applyTopAttraction(secondBalls);
        applyMinuteAttraction(minuteBalls);
        applyGround(hourTriangles);

    }

    let s = second();
    let m = minute();
    let h = hour();

    if (s !== lastSecond) {
        spawnSecondBall();
        lastSecond = s;
    }

    if (secondBalls.length >= 60 && !mergingSeconds) {
        mergeSecondsToMinute();
    }
    if (!mergingSeconds && s !== lastSecond) {
        spawnSecondBall();
        lastSecond = s;
    }

    if (
        !mergingSeconds &&
        !mergingMinutes &&
        minuteBalls.length >= 60
    ) {
        mergeMinutesToHour();
    }

    if(!mergingMinutes) {
        applyMinuteAttraction(minuteBalls);
    }

    blocks.forEach((block) => block.draw());
    mouse.draw();

    if (mergingSeconds) {
        mergeProgress += 0.05;

        secondBalls.forEach(b => {
            const pos = b.body.position;
            Matter.Body.setPosition(b.body, {
                x: lerp(pos.x, width / 2, mergeProgress),
                y: lerp(pos.y, minuteZone.y, mergeProgress)
            });
        });

        if (mergeProgress >= 1 && mergingSeconds) {
            finishSecondMerge();
        }
    }

    if (mergingMinutes) {

        minuteMergeProgress += 0.04;

        minuteBalls.forEach(b => {
            const pos = b.body.position;
            Matter.Body.setPosition(b.body, {
                x: lerp(pos.x, width / 2, minuteMergeProgress),
                y: lerp(pos.y, height / 2, minuteMergeProgress)
            });
        });
    }
        if (minuteMergeProgress >= 1 && mergingMinutes) {
            finishMinuteMerge();
        }
    
        let h24 = hour();
        if (h24 !== lastHour) {
            handleHourTransition(lastHour, h24);
            lastHour = h24;
        }
}

function applyTopAttraction(list) {
    list.forEach(obj => {
        const body = obj.body;
        if (!body) return;
        if (body.position.y < topZone.y) return;
        
        // vertikale Anziehung
        const dy = topZone.y - body.position.y;
        const forceY = dy * topAttractor.strength;

        // leichte horizontale Unordnung
        const forceX = random(-0.00005, 0.00005);

        Matter.Body.applyForce(body, body.position, {
            x: forceX,
            y: forceY
        });
    });
}

function finishSecondMerge() {
    secondBalls.forEach(b => {
        Matter.Composite.remove(world, b.body);
        blocks = blocks.filter(x => x !== b);
    });

    secondBalls = [];
    mergingSeconds = false;

    spawnMinuteBall();
}

function mergeMinutesToHour() {

    if (minuteBalls.length === 0) return;

    mergingMinutes = true;
    minuteMergeProgress = 0;

    // Minuten einfrieren
    minuteBalls.forEach(b => {
        Matter.Body.setVelocity(b.body, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(b.body, 0);
        Matter.Body.setStatic(b.body, true);
    });
}

function finishMinuteMerge() {
    minuteBalls.forEach(b => {
        Matter.Composite.remove(world, b.body);
        blocks = blocks.filter(x => x !== b);
    });

    minuteBalls = [];
    mergingMinutes = false;

    const h24 = hour();
    spawnHourTriangle(h24 >= 12);
}

function applyCenterAttraction(list) {
    if (!centerAttractor.active) return;

    list.forEach(obj => {
        const body = obj.body;
        if (!body) return;

        const dx = centerAttractor.x() - body.position.x;
        const dy = centerAttractor.y() - body.position.y;

        Matter.Body.applyForce(body, body.position, {
            x: dx * centerAttractor.strength,
            y: dy * centerAttractor.strength
        });
    });
}

function applyMinuteAttraction(list) {
    list.forEach(obj => {
        const body = obj.body;
        if (!body) return;

        const dy = minuteZone.y - body.position.y;
        const forceY = dy * 0.00009;

        const forceX = random(-0.00003, 0.00003);

        Matter.Body.applyForce(body, body.position, {
            x: forceX,
            y: forceY
        });
    });
}

function applyGround(list) {
    list.forEach(obj => {
        const body = obj.body;
        if (!body) return;

        Matter.Body.applyForce(body, body.position, {
            x: 0,
            y: 0.0008 * body.mass
        });
    });
}

function mousePressed() {
    if(explosionPhase !== "start") return;
    triggerShakeExplosion();
}

function touchStarted() {
    mousePressed();   // benutze einfach deine bestehende Logik
    return false;     // verhindert Scrollen/Drag vom Browser
}

function explode(list, power) {
    list.forEach(obj => {
        const body = obj.body;
        if (!body) return;

        const dx = body.position.x - width / 2;
        const dy = body.position.y - height / 2;

        const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
        const nx = dx / dist;
        const ny = dy / dist;

        Matter.Body.applyForce(body, body.position, {
            x: nx * power * power,
            y: ny * power * power
        });
    });
}

function triggerShakeExplosion() {

    console.log("EXPLODE!");

    explosionStart = millis();
    explosionPhase = "repel";

    // Luftwiderstand temporär verringern
    [...secondBalls, ...minuteBalls, ...hourTriangles].forEach(obj => {
        const b = obj.body;
        if (!b) return;

        b.frictionAir = 0;
        b.friction = 0;
        b.restitution = 0.6;
    });
}

function handleHourTransition(prev, now) {

    // 11 -> 12 oder 23 -> 0 -> Formwechsel
    if( 
        (prev === 11 && now === 12) ||
        (prev === 23 && now === 0)  
    ) {
        rebuildAllHours(now >= 12);
        return;
    }

    // 12 -> 13 oder 0 -> 1 -> alles löschen
    if(
        (prev === 12 && now === 13) ||
        (prev === 0 && now === 1)
    ) {
        clearAllHours();
        return;
    }
}

function rebuildAllHours(isPM) {
    hourTriangles.forEach(h => {
        const b = h.body;

        const pos = { ...b.position };
        const vel = { ...b.velocity };
        const angle = b.angle;
        const angularVel = b.angularVelocity;

        Matter.Composite.remove(world, b);
        blocks = blocks.filter(x => x !== h);

        const newHour = spawnHourTriangle(isPM, pos.x, pos.y);

        Matter.Body.setVelocity(newHour.body, vel);
        Matter.Body.setAngle(newHour.body, angle);
        Matter.Body.setAngularVelocity(newHour.body, angularVel);
    });
}

function clearAllHours() {
    hourTriangles.forEach(h => {
        Matter.Composite.remove(world, h.body);
        blocks = blocks.filter(x => x !== h);
    });
    hourTriangles = [];
}
