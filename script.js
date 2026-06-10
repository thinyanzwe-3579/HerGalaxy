/* ==================================================================
   The Descent — premium scroll journey: galaxy → planets → the Sun
   ================================================================== */

/* ---------- Bodies, ordered from the farthest world inward ---------- */
const bodies = [
    { name: "Neptune", desig: "01 / Outer Dark", texture: "textures/neptune.jpg",
      desc: "The outermost world. A frozen blue giant, lashed by the fastest winds in the solar system.",
      data: "4.5 BILLION KM · −214°C · 16 MOONS",
      radius: 1.8, tilt: 0.49, spin: 0.0015, atmo: 0x2f6db5, atmoPow: 3.2, atmoInt: 0.9 },

    { name: "Uranus", desig: "02 / The Tilted World", texture: "textures/uranus.jpg",
      desc: "The world that lies on its side, slowly rolling through the dark.",
      data: "2.9 BILLION KM · AXIAL TILT 98°",
      radius: 1.75, tilt: 1.71, spin: 0.0015, atmo: 0x9fe7e4, atmoPow: 3.4, atmoInt: 0.8 },

    { name: "Saturn", desig: "03 / The Crown", texture: "textures/saturn.jpg", ring: "textures/saturn_ring.png",
      desc: "The crowned giant, ringed by a billion shards of ice — yet those rings are barely ten metres thick.",
      data: "1.4 BILLION KM · 146 MOONS",
      radius: 2.1, tilt: 0.47, spin: 0.0022, atmo: 0xe7d6a6, atmoPow: 4.0, atmoInt: 0.5 },

    { name: "Jupiter", desig: "04 / The King", texture: "textures/jupiter.jpg",
      desc: "The largest of all. A single storm here, the Great Red Spot, has raged for centuries.",
      data: "778 MILLION KM · 95 MOONS",
      radius: 2.5, tilt: 0.05, spin: 0.0026, atmo: 0xdcbf97, atmoPow: 4.0, atmoInt: 0.55 },

    { name: "Mars", desig: "05 / The Red Frontier", texture: "textures/mars.jpg",
      desc: "Cold, silent, and rust-red. The frontier we dream of one day calling a second home.",
      data: "228 MILLION KM · −63°C · 2 MOONS",
      radius: 1.2, tilt: 0.44, spin: 0.0021, atmo: 0xd9805a, atmoPow: 4.5, atmoInt: 0.4 },

    { name: "Earth", desig: "06 / Home", earth: true,
      day: "textures/earth_day.jpg", night: "textures/earth_night.jpg", clouds: "textures/earth_clouds.jpg",
      desc: "A pale blue dot. The only world we have ever known to hold life — and everyone who ever lived.",
      data: "149.6 MILLION KM · ONE OF A KIND",
      radius: 1.55, tilt: 0.41, spin: 0.0020, atmo: 0x6db8ff, atmoPow: 3.0, atmoInt: 1.25 },

    { name: "Venus", desig: "07 / The Veiled Twin", texture: "textures/venus.jpg",
      desc: "Earth's twin in size, hidden beneath endless clouds of acid. The hottest world of all.",
      data: "108 MILLION KM · 465°C",
      radius: 1.5, tilt: 0.05, spin: 0.0011, atmo: 0xf0d9a0, atmoPow: 3.2, atmoInt: 0.95 },

    { name: "Mercury", desig: "08 / The Swift", texture: "textures/mercury.jpg",
      desc: "The swiftest world, scorched and cratered, racing around the Sun every 88 days.",
      data: "58 MILLION KM · 88-DAY YEAR",
      radius: 1.05, tilt: 0.03, spin: 0.0015, atmo: null },

    { name: "The Sun", desig: "09 / The Heart Of It All", texture: "textures/sun.jpg", sun: true,
      desc: "The star that holds us all. Ninety-nine percent of everything we know, bound together in light.",
      data: "THE STAR · 15 MILLION °C CORE",
      radius: 3.0, tilt: 0.12, spin: 0.0008 },
];

const N = bodies.length;

/* ---------- Math helpers ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);   // smootherstep

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
// Output stays LINEAR — bloom is computed in linear/HDR space and a final
// GammaCorrection pass encodes to sRGB for the display (see setupComposer).

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 4000);
camera.position.set(0, 0, 0);
camera.lookAt(0, 0, -1);

const texLoader = new THREE.TextureLoader();
const loadTex = (url, srgb = true) => {
    const t = texLoader.load(url);
    if (srgb) t.encoding = THREE.sRGBEncoding;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
};

/* Direction the sunlight comes from (world space) */
const LIGHT_DIR = new THREE.Vector3(-2.4, 1.7, 1.5).normalize();

/* ---------- Deep-space background (8K Milky Way) ---------- */
const skyTex = loadTex('textures/milkyway.jpg');
const sky = new THREE.Mesh(
    new THREE.SphereGeometry(900, 64, 64),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide })
);
scene.add(sky);

/* A faint field of foreground stars for depth + parallax on the intro dive */
(function addStarfield() {
    const count = 1800;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const r = 200 + Math.random() * 500;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        pos[i * 3]     = r * Math.sin(ph) * Math.cos(th);
        pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
        pos[i * 3 + 2] = r * Math.cos(ph);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
        color: 0xffffff, size: 1.5, sizeAttenuation: true,
        transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending
    });
    scene.add(new THREE.Points(geo, mat));
})();

/* ---------- Lighting ---------- */
scene.add(new THREE.AmbientLight(0xffffff, 0.14));
const sunLight = new THREE.DirectionalLight(0xfff4e6, 2.0);
sunLight.position.copy(LIGHT_DIR);
scene.add(sunLight);

/* ---------- Shaders ---------- */
// Atmospheric rim glow: brightest at the limb, concentrated on the lit side.
function atmosphereMaterial(colorHex, power, intensity, lit = true) {
    return new THREE.ShaderMaterial({
        uniforms: {
            uColor: { value: new THREE.Color(colorHex).convertSRGBToLinear() },
            uPower: { value: power },
            uIntensity: { value: intensity },
            uLightDir: { value: LIGHT_DIR.clone() },
            uLit: { value: lit ? 1.0 : 0.0 },
            uOpacity: { value: 1.0 }
        },
        vertexShader: `
            varying vec3 vN; varying vec3 vWP;
            void main() {
                vN = normalize(mat3(modelMatrix) * normal);
                vWP = (modelMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`,
        fragmentShader: `
            uniform vec3 uColor; uniform float uPower; uniform float uIntensity;
            uniform vec3 uLightDir; uniform float uLit; uniform float uOpacity;
            varying vec3 vN; varying vec3 vWP;
            void main() {
                vec3 V = normalize(cameraPosition - vWP);
                float rim = pow(1.0 - max(dot(V, vN), 0.0), uPower);
                float litf = max(dot(vN, uLightDir), 0.0);
                float g = rim * uIntensity * mix(1.0, 0.18 + 0.82 * litf, uLit);
                gl_FragColor = vec4(uColor, g * uOpacity);
            }`,
        transparent: true, blending: THREE.AdditiveBlending,
        side: THREE.FrontSide, depthWrite: false
    });
}

// Earth surface: day texture on the lit side, glowing city lights on the dark side.
function earthMaterial(dayTex, nightTex) {
    return new THREE.ShaderMaterial({
        uniforms: {
            uDay: { value: dayTex }, uNight: { value: nightTex },
            uLightDir: { value: LIGHT_DIR.clone() }, uOpacity: { value: 1.0 }
        },
        vertexShader: `
            varying vec2 vUv; varying vec3 vN;
            void main() {
                vUv = uv;
                vN = normalize(mat3(modelMatrix) * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`,
        fragmentShader: `
            uniform sampler2D uDay; uniform sampler2D uNight;
            uniform vec3 uLightDir; uniform float uOpacity;
            varying vec2 vUv; varying vec3 vN;
            vec3 toLin(vec3 c){ return pow(c, vec3(2.2)); }
            void main() {
                float lambert = dot(normalize(vN), uLightDir);
                float t = smoothstep(-0.12, 0.32, lambert);
                vec3 day = toLin(texture2D(uDay, vUv).rgb) * clamp(lambert, 0.05, 1.0);
                vec3 night = toLin(texture2D(uNight, vUv).rgb) * 1.8;   // city lights bloom on the dark side
                vec3 col = mix(night, day, t);
                gl_FragColor = vec4(col, uOpacity);   // linear out
            }`,
        transparent: true
    });
}

// The Sun: emits its texture in HDR (values > 1) so bloom blazes around it.
function sunMaterial(tex) {
    return new THREE.ShaderMaterial({
        uniforms: { uMap: { value: tex }, uBoost: { value: 3.2 }, uOpacity: { value: 1.0 } },
        vertexShader: `
            varying vec2 vUv;
            void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
            uniform sampler2D uMap; uniform float uBoost; uniform float uOpacity;
            varying vec2 vUv;
            vec3 toLin(vec3 c){ return pow(c, vec3(2.2)); }
            void main() { gl_FragColor = vec4(toLin(texture2D(uMap, vUv).rgb) * uBoost, uOpacity); }`,
        transparent: true
    });
}

/* ---------- Body builders (lazy: built on first need) ---------- */
const built = new Array(N).fill(null);

function buildBody(i) {
    if (built[i]) return built[i];
    const b = bodies[i];
    const group = new THREE.Group();
    group.rotation.z = b.tilt;

    const shaderMats = [];      // materials whose fade is via uOpacity uniform
    const stdMats = [];         // materials whose fade is via .opacity
    let surface, clouds = null;

    if (b.earth) {
        const mat = earthMaterial(loadTex(b.day), loadTex(b.night));
        shaderMats.push(mat);
        surface = new THREE.Mesh(new THREE.SphereGeometry(b.radius, 128, 128), mat);
        group.add(surface);

        // Clouds
        const cloudMat = new THREE.MeshStandardMaterial({
            alphaMap: loadTex(b.clouds, false), transparent: true, opacity: 1,
            color: 0xffffff, depthWrite: false, roughness: 1, metalness: 0
        });
        stdMats.push(cloudMat);
        clouds = new THREE.Mesh(new THREE.SphereGeometry(b.radius * 1.012, 96, 96), cloudMat);
        group.add(clouds);
    } else if (b.sun) {
        const mat = sunMaterial(loadTex(b.texture));
        shaderMats.push(mat);
        surface = new THREE.Mesh(new THREE.SphereGeometry(b.radius, 128, 128), mat);
        group.add(surface);

        // Warm corona — a couple of bright additive shells; bloom turns these
        // into the Sun's blazing, smooth halo.
        [[1.04, 2.2], [1.16, 1.1]].forEach(([scale, inten]) => {
            const cm = atmosphereMaterial(0xffaa3d, 2.2, inten, false);
            shaderMats.push(cm);
            group.add(new THREE.Mesh(new THREE.SphereGeometry(b.radius * scale, 64, 64), cm));
        });
    } else {
        const mat = new THREE.MeshStandardMaterial({
            map: loadTex(b.texture), roughness: 1, metalness: 0, transparent: true
        });
        stdMats.push(mat);
        surface = new THREE.Mesh(new THREE.SphereGeometry(b.radius, 128, 128), mat);
        group.add(surface);

        if (b.ring) {
            const inner = b.radius * 1.35, outer = b.radius * 2.3;
            const ringGeo = new THREE.RingGeometry(inner, outer, 160);
            const p = ringGeo.attributes.position, v = new THREE.Vector3(), mid = (inner + outer) / 2;
            for (let k = 0; k < p.count; k++) {
                v.fromBufferAttribute(p, k);
                ringGeo.attributes.uv.setXY(k, v.length() < mid ? 0 : 1, 1);
            }
            const ringMat = new THREE.MeshBasicMaterial({
                map: loadTex(b.ring), side: THREE.DoubleSide, transparent: true, opacity: 1
            });
            stdMats.push(ringMat);
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2.15;
            group.add(ring);
        }
    }

    // Atmosphere rim glow (skipped for airless Mercury and the Sun).
    // One crisp, bright fresnel rim; the bloom pass spreads it into a soft halo.
    if (b.atmo) {
        const a = atmosphereMaterial(b.atmo, b.atmoPow, b.atmoInt);
        shaderMats.push(a);
        group.add(new THREE.Mesh(new THREE.SphereGeometry(b.radius * 1.025, 96, 96), a));
    }

    group.visible = false;
    scene.add(group);

    built[i] = {
        group, surface, clouds, shaderMats, stdMats, spin: b.spin,
        setOpacity(o) {
            shaderMats.forEach(m => m.uniforms.uOpacity.value = o);
            stdMats.forEach(m => { m.opacity = o; });
        }
    };
    return built[i];
}

/* ---------- Scroll → timeline ---------- */
const INTRO = 1.2;                       // galaxy-zoom units before Neptune
const TIMELINE_MAX = INTRO + (N - 0.5);  // last body settles at its hero
let targetT = 0, renderT = 0, G = 0;

document.getElementById('scroll-space').style.height = Math.round(TIMELINE_MAX * 150) + 'vh';

function onScroll() {
    const max = document.body.scrollHeight - window.innerHeight;
    G = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
    targetT = G * TIMELINE_MAX;
}
window.addEventListener('scroll', onScroll, { passive: true });

/* ---------- Placement (gentle harmonic approach, soft fly-past) ---------- */
const Z_FAR = -340, Z_HERO = -3.4, Z_PAST = 7, TOP_TARGET = 0.5;

function placeBody(b, group, p) {
    const yHero = TOP_TARGET - b.radius;
    let z, y;
    if (p <= 0.5) {
        const a = smoother(p / 0.5);
        z = 1 / lerp(1 / Z_FAR, 1 / Z_HERO, a);   // constant angular growth = gentle
        y = lerp(0, yHero, a);
    } else {
        const q = smoother((p - 0.5) / 0.5);
        z = lerp(Z_HERO, Z_PAST, q);
        y = lerp(yHero, yHero - 12, q);
    }
    group.position.set(0, y, z);
}

/* ---------- Panels + HUD ---------- */
function updateUI(inIntro, active, p) {
    panels.forEach((panel, i) =>
        panel.classList.toggle('active', !inIntro && i === active && p > 0.32 && p < 0.8));

    const introEl = document.getElementById('intro');
    const introFade = inIntro ? clamp(1 - smoother(clamp(renderT / INTRO, 0, 1)) * 1.3, 0, 1) : 0;
    introEl.style.opacity = introFade;

    const hud = document.getElementById('hud');
    hud.classList.toggle('visible', !inIntro && G < 0.992);
    document.getElementById('hud-name').textContent = bodies[active].name.toUpperCase();
    document.getElementById('hud-fill').style.width = (G * 100).toFixed(1) + '%';
}

/* ---------- Post-processing: selective bloom ---------- */
let composer = null, bloomPass = null, useComposer = false;

function setupComposer() {
    const ready = ['EffectComposer', 'RenderPass', 'ShaderPass', 'UnrealBloomPass', 'GammaCorrectionShader']
        .every(c => typeof THREE[c] !== 'undefined');
    if (!ready) {
        console.warn('Post-processing modules missing — falling back to direct render.');
        renderer.outputEncoding = THREE.sRGBEncoding;   // keep colours correct without the gamma pass
        return;
    }
    const w = window.innerWidth, h = window.innerHeight;
    const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType });   // HDR for real bloom
    composer = new THREE.EffectComposer(renderer, rt);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    composer.setSize(w, h);
    composer.addPass(new THREE.RenderPass(scene, camera));
    // (resolution, strength, radius, threshold) — threshold makes only bright
    // pixels bloom, so brighter worlds (and the Sun) glow far more, smoothly.
    bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(w, h), 0.85, 0.6, 0.65);
    composer.addPass(bloomPass);
    composer.addPass(new THREE.ShaderPass(THREE.GammaCorrectionShader));   // linear → sRGB for the screen
    useComposer = true;
}

/* ---------- Render loop ---------- */
let lastFov = 45;
function render() {
    renderT += (targetT - renderT) * 0.08;

    const inIntro = renderT < INTRO;
    let active = 0, p = 0;
    if (!inIntro) {
        const bt = renderT - INTRO;
        active = clamp(Math.floor(bt), 0, N - 1);
        p = clamp(bt - active, 0, 1);
    }

    // Camera: dive into the galaxy during the intro, then settle for the descent
    if (inIntro) {
        const e = smoother(clamp(renderT / INTRO, 0, 1));
        const fov = lerp(70, 45, e);
        if (fov !== lastFov) { camera.fov = fov; camera.updateProjectionMatrix(); lastFov = fov; }
        camera.position.z = lerp(14, 0, e);
    } else {
        if (lastFov !== 45) { camera.fov = 45; camera.updateProjectionMatrix(); lastFov = 45; }
        camera.position.z = 0;
    }

    // Show only the active body (hidden entirely during the intro)
    for (let i = 0; i < N; i++) if (built[i]) built[i].group.visible = false;

    if (!inIntro) {
        const obj = buildBody(active);
        if (active + 1 < N) buildBody(active + 1);          // preload the next world
        obj.group.visible = true;
        placeBody(bodies[active], obj.group, p);
        obj.surface.rotation.y += obj.spin;
        if (obj.clouds) obj.clouds.rotation.y += obj.spin * 1.3;
        obj.setOpacity(smoother(clamp(p / 0.22, 0, 1)));    // gentle fade-in from the void
    }

    // Living sky
    sky.rotation.y += 0.00018;

    updateUI(inIntro, active, p);
    if (useComposer) composer.render(); else renderer.render(scene, camera);
    requestAnimationFrame(render);
}

/* ---------- Resize ---------- */
function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (composer) { composer.setSize(w, h); bloomPass.setSize(w, h); }
}
window.addEventListener('resize', resize);

/* ---------- Boot ---------- */
setupComposer();
resize();
buildBody(0);   // Neptune ready before the intro ends
onScroll();
render();
