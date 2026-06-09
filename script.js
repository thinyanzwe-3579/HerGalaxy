/* ==================================================================
   The Descent — a scroll-driven journey from Neptune inward to the Sun
   ================================================================== */

/* ---------- Bodies, ordered from the farthest world inward ---------- */
const bodies = [
    { name: "Neptune", desig: "01 / Outer Dark", texture: "textures/neptune.jpg",
      desc: "The outermost world. A frozen blue giant, lashed by the fastest winds in the solar system.",
      data: "4.5 BILLION KM · −214°C · 16 MOONS",
      radius: 1.8, tilt: 0.49, spin: 0.0016 },

    { name: "Uranus", desig: "02 / The Tilted World", texture: "textures/uranus.jpg",
      desc: "The world that lies on its side, slowly rolling through the dark.",
      data: "2.9 BILLION KM · AXIAL TILT 98°",
      radius: 1.75, tilt: 1.71, spin: 0.0016 },

    { name: "Saturn", desig: "03 / The Crown", texture: "textures/saturn.jpg", ring: "textures/saturn_ring.png",
      desc: "The crowned giant, ringed by a billion shards of ice — yet those rings are barely ten metres thick.",
      data: "1.4 BILLION KM · 146 MOONS",
      radius: 2.1, tilt: 0.47, spin: 0.0024 },

    { name: "Jupiter", desig: "04 / The King", texture: "textures/jupiter.jpg",
      desc: "The largest of all. A single storm here, the Great Red Spot, has raged for centuries.",
      data: "778 MILLION KM · 95 MOONS",
      radius: 2.5, tilt: 0.05, spin: 0.0028 },

    { name: "Mars", desig: "05 / The Red Frontier", texture: "textures/mars.jpg",
      desc: "Cold, silent, and rust-red. The frontier we dream of one day calling a second home.",
      data: "228 MILLION KM · −63°C · 2 MOONS",
      radius: 1.15, tilt: 0.44, spin: 0.0022 },

    { name: "Earth", desig: "06 / Home", texture: "textures/earth.jpg",
      desc: "A pale blue dot. The only world we have ever known to hold life — and everyone who ever lived.",
      data: "149.6 MILLION KM · ONE OF A KIND",
      radius: 1.5, tilt: 0.41, spin: 0.0022 },

    { name: "Venus", desig: "07 / The Veiled Twin", texture: "textures/venus.jpg",
      desc: "Earth's twin in size, hidden beneath endless clouds of acid. The hottest world of all.",
      data: "108 MILLION KM · 465°C",
      radius: 1.45, tilt: 0.05, spin: 0.0012 },

    { name: "Mercury", desig: "08 / The Swift", texture: "textures/mercury.jpg",
      desc: "The swiftest world, scorched and cratered, racing around the Sun every 88 days.",
      data: "58 MILLION KM · 88-DAY YEAR",
      radius: 1.05, tilt: 0.03, spin: 0.0016 },

    { name: "The Sun", desig: "09 / The Heart Of It All", texture: "textures/sun.jpg", emissive: true,
      desc: "The star that holds us all. Ninety-nine percent of everything we know, bound together in light.",
      data: "THE STAR · 15 MILLION °C CORE",
      radius: 3.0, tilt: 0.12, spin: 0.0009 },
];

const N = bodies.length;

/* ---------- Math helpers ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);              // smoothstep
const easeIn = (t) => t * t * t;                         // accelerate

/* ---------- Build the HTML info panels ---------- */
const infoLayer = document.getElementById('info-layer');
bodies.forEach((b, i) => {
    const panel = document.createElement('div');
    panel.className = 'planet-info';
    panel.dataset.i = i;
    panel.innerHTML = `
        <div class="pi-desig">${b.desig}</div>
        <h2 class="pi-name">${b.name.toUpperCase()}</h2>
        <p class="pi-desc">${b.desc}</p>
        <div class="pi-data">${b.data}</div>
    `;
    infoLayer.appendChild(panel);
});
const panels = [...document.querySelectorAll('.planet-info')];

/* ---------- Three.js setup ---------- */
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 0, 0);
camera.lookAt(0, 0, -1);

const texLoader = new THREE.TextureLoader();

/* ---------- Deep-space background (Milky Way) ---------- */
const skyTex = texLoader.load('textures/milkyway.jpg');
skyTex.encoding = THREE.sRGBEncoding;
const sky = new THREE.Mesh(
    new THREE.SphereGeometry(600, 60, 60),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide })
);
scene.add(sky);

/* ---------- Lighting ---------- */
const ambient = new THREE.AmbientLight(0xffffff, 0.22);
scene.add(ambient);
const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
sunLight.position.set(-2.5, 1.4, 2.5);
scene.add(sunLight);

/* ---------- Build each body's mesh (created once, shown one at a time) ---------- */
const meshes = bodies.map((b) => {
    const group = new THREE.Group();
    group.rotation.z = b.tilt;

    const mat = new THREE.MeshStandardMaterial({
        map: texLoader.load(b.texture),
        roughness: 1,
        metalness: 0,
        transparent: true,
        opacity: 1
    });
    mat.map.encoding = THREE.sRGBEncoding;

    if (b.emissive) {
        mat.emissive = new THREE.Color(0xff9933);
        mat.emissiveMap = mat.map;
        mat.emissiveIntensity = 1.0;
    }

    const sphere = new THREE.Mesh(new THREE.SphereGeometry(b.radius, 96, 96), mat);
    group.add(sphere);

    let ringMat = null;
    if (b.ring) {
        const inner = b.radius * 1.35, outer = b.radius * 2.25;
        const ringGeo = new THREE.RingGeometry(inner, outer, 128);
        const pos = ringGeo.attributes.position;
        const v = new THREE.Vector3();
        const mid = (inner + outer) / 2;
        for (let k = 0; k < pos.count; k++) {
            v.fromBufferAttribute(pos, k);
            ringGeo.attributes.uv.setXY(k, v.length() < mid ? 0 : 1, 1);
        }
        const ringTex = texLoader.load(b.ring);
        ringTex.encoding = THREE.sRGBEncoding;
        ringMat = new THREE.MeshBasicMaterial({
            map: ringTex, side: THREE.DoubleSide, transparent: true, opacity: 0.92
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2.1;
        group.add(ring);
    }

    group.visible = false;
    scene.add(group);
    return { group, sphere, ringMat };
});

/* ---------- Scroll state ---------- */
const INTRO = 0.55;                  // units of "pure space" before Neptune begins
const TIMELINE_MAX = N - 0.5;        // last body ends at its hero (does not fly past)
let targetT = 0;
let renderT = 0;

function getScrollProgress() {
    const max = document.body.scrollHeight - window.innerHeight;
    return max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
}

function onScroll() {
    const G = getScrollProgress();
    const raw = G * (TIMELINE_MAX + INTRO) - INTRO;
    targetT = clamp(raw, 0, TIMELINE_MAX);

    // Intro overlay fades out as soon as we begin moving
    const intro = document.getElementById('intro');
    intro.style.opacity = clamp(1 - G * 14, 0, 1);

    // HUD progress
    document.getElementById('hud-fill').style.width = (G * 100).toFixed(1) + '%';
    document.getElementById('hud').classList.toggle('visible', G > 0.01 && G < 0.995);
}
window.addEventListener('scroll', onScroll, { passive: true });

/* ---------- Position a body along its local progress p ∈ [0,1] ---------- */
const Z_FAR = -620, Z_HERO = -3.4, Z_PAST = 7;
const TOP_TARGET = 0.45;             // where the top of the planet sits at the hero moment

function placeBody(idx, p) {
    const { group } = meshes[idx];
    const R = bodies[idx].radius;
    const yHero = TOP_TARGET - R;     // push centre down so only the upper portion shows

    let z, y;
    if (p <= 0.5) {
        const a = smooth(p / 0.5);    // approach
        z = lerp(Z_FAR, Z_HERO, a);
        y = lerp(0, yHero, a);
    } else {
        const a = easeIn((p - 0.5) / 0.5); // fly past, downward and behind
        z = lerp(Z_HERO, Z_PAST, a);
        y = lerp(yHero, yHero - 11, a);
    }
    group.position.set(0, y, z);
}

/* ---------- Update which panel is visible ---------- */
function updatePanels(active, p) {
    panels.forEach((panel, i) => {
        const on = (i === active) && p > 0.3 && p < 0.82;
        panel.classList.toggle('active', on);
    });
    document.getElementById('hud-name').textContent = bodies[active].name.toUpperCase();
}

/* ---------- Main render loop ---------- */
function render() {
    // Smooth the scroll value for a cinematic, weighty feel
    renderT += (targetT - renderT) * 0.085;

    const active = clamp(Math.floor(renderT + 1e-4), 0, N - 1);
    const p = clamp(renderT - active, 0, 1);

    // Show only the active body; hide the rest
    meshes.forEach((m, i) => { m.group.visible = (i === active); });
    placeBody(active, p);
    meshes[active].sphere.rotation.y += bodies[active].spin;

    // Fade the body in from nothing as it begins its approach, so the
    // opening frame (and each hand-off) is clean, empty space.
    const fade = smooth(clamp(p / 0.14, 0, 1));
    meshes[active].sphere.material.opacity = fade;
    if (meshes[active].ringMat) meshes[active].ringMat.opacity = 0.92 * fade;

    // Slow drift of the starfield + faint parallax with the journey
    sky.rotation.y += 0.0002;
    sky.rotation.x = renderT * 0.01;

    updatePanels(active, p);

    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

/* ---------- Resize ---------- */
function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);

/* ---------- Boot ---------- */
resize();
onScroll();
render();
