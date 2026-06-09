/* ============================================
   MyGalaxy — Interactivity + 3D Planets
   ============================================ */

/* ---------- 1. Animated Starfield ---------- */
const canvas = document.getElementById('starfield');
const ctx = canvas.getContext('2d');
let stars = [];
let w, h;

function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    createStars();
}

function createStars() {
    stars = [];
    const count = Math.floor((w * h) / 4000);
    for (let i = 0; i < count; i++) {
        stars.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: Math.random() * 1.4 + 0.2,
            baseAlpha: Math.random() * 0.6 + 0.2,
            twinkle: Math.random() * 0.02 + 0.005,
            phase: Math.random() * Math.PI * 2,
            drift: Math.random() * 0.05 + 0.01
        });
    }
}

function drawStars() {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
        s.phase += s.twinkle;
        const alpha = s.baseAlpha + Math.sin(s.phase) * 0.3;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, alpha)})`;
        ctx.fill();
        s.y += s.drift;
        if (s.y > h) { s.y = 0; s.x = Math.random() * w; }
    }
    requestAnimationFrame(drawStars);
}

window.addEventListener('resize', resize);
resize();
drawStars();

/* ---------- 2. Planet Data ---------- */
const planets = [
    {
        name: "Mercury", type: "Terrestrial", texture: "textures/mercury.jpg", tilt: 0.03, speed: 0.0015,
        desc: "The swiftest of all worlds, racing around the Sun in just 88 days. A scorched, cratered messenger of the heavens.",
        facts: [["Distance from Sun", "57.9M km"], ["Day length", "59 Earth days"], ["Moons", "0"]]
    },
    {
        name: "Venus", type: "Terrestrial", texture: "textures/venus.jpg", tilt: 0.05, speed: 0.0008,
        desc: "Earth's veiled twin, wrapped in golden clouds of acid. The hottest planet of all, hot enough to melt lead.",
        facts: [["Distance from Sun", "108.2M km"], ["Surface temp", "465°C"], ["Moons", "0"]]
    },
    {
        name: "Earth", type: "Our Home", texture: "textures/earth.jpg", tilt: 0.41, speed: 0.003,
        desc: "A pale blue dot. The only world we know to cradle life — oceans, forests, and everyone who has ever lived.",
        facts: [["Distance from Sun", "149.6M km"], ["Day length", "24 hours"], ["Moons", "1"]]
    },
    {
        name: "Mars", type: "Terrestrial", texture: "textures/mars.jpg", tilt: 0.44, speed: 0.0029,
        desc: "The red planet, home to the tallest volcano and deepest canyon in the solar system. A frontier waiting for us.",
        facts: [["Distance from Sun", "227.9M km"], ["Day length", "24.6 hours"], ["Moons", "2"]]
    },
    {
        name: "Jupiter", type: "Gas Giant", texture: "textures/jupiter.jpg", tilt: 0.05, speed: 0.006,
        desc: "The king of planets — so massive that all the others could fit inside it. Its Great Red Spot is a storm older than telescopes.",
        facts: [["Distance from Sun", "778.5M km"], ["Great Red Spot", "350+ yrs old"], ["Moons", "95"]]
    },
    {
        name: "Saturn", type: "Gas Giant", texture: "textures/saturn.jpg", ring: "textures/saturn_ring.png", tilt: 0.47, speed: 0.0055,
        desc: "The jewel of the solar system, crowned by rings of ice and rock spanning 280,000 km — yet barely 10 metres thick.",
        facts: [["Distance from Sun", "1.43B km"], ["Ring span", "280,000 km"], ["Moons", "146"]]
    },
    {
        name: "Uranus", type: "Ice Giant", texture: "textures/uranus.jpg", tilt: 1.71, speed: 0.004,
        desc: "The tilted world, spinning on its side as it rolls around the Sun. A serene blue-green sphere of ice and gas.",
        facts: [["Distance from Sun", "2.87B km"], ["Axial tilt", "98°"], ["Moons", "28"]]
    },
    {
        name: "Neptune", type: "Ice Giant", texture: "textures/neptune.jpg", tilt: 0.49, speed: 0.004,
        desc: "The farthest world, a deep blue giant whipped by the fastest winds in the solar system — over 2,000 km/h.",
        facts: [["Distance from Sun", "4.5B km"], ["Wind speed", "2,100 km/h"], ["Moons", "16"]]
    }
];

/* ---------- 3. Build planet cards ---------- */
const grid = document.getElementById('planetGrid');
planets.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'planet-card reveal';
    card.style.transitionDelay = `${(i % 4) * 0.08}s`;
    card.innerHTML = `
        <div class="planet-visual" data-index="${i}"></div>
        <h3>${p.name}</h3>
        <div class="planet-type">${p.type}</div>
        <p>${p.desc}</p>
        <ul class="planet-facts">
            ${p.facts.map(f => `<li>${f[0]}<span>${f[1]}</span></li>`).join('')}
        </ul>
    `;
    grid.appendChild(card);
});

/* ---------- 4. 3D Globes (Three.js) ---------- */
const globes = [];
const texLoader = new THREE.TextureLoader();

function createGlobe(container, opts) {
    const size = container.clientWidth || 170;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.z = 3.2;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    container.appendChild(renderer.domElement);

    // Planet group (handles axial tilt)
    const group = new THREE.Group();
    group.rotation.z = opts.tilt || 0;
    scene.add(group);

    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const material = new THREE.MeshStandardMaterial({
        map: texLoader.load(opts.texture),
        roughness: 1,
        metalness: 0
    });

    if (opts.emissive) {
        // The Sun glows from within
        material.emissive = new THREE.Color(0xffaa33);
        material.emissiveMap = material.map;
        material.emissiveIntensity = 1.0;
    }

    const sphere = new THREE.Mesh(geometry, material);
    group.add(sphere);

    // Saturn's rings
    if (opts.ring) {
        const ringGeo = new THREE.RingGeometry(1.35, 2.3, 96);
        // Remap UVs so the ring texture runs radially
        const pos = ringGeo.attributes.position;
        const v = new THREE.Vector3();
        const mid = (1.35 + 2.3) / 2;
        for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i);
            ringGeo.attributes.uv.setXY(i, v.length() < mid ? 0 : 1, 1);
        }
        const ringMat = new THREE.MeshBasicMaterial({
            map: texLoader.load(opts.ring),
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
    }

    // Lighting
    if (opts.emissive) {
        scene.add(new THREE.AmbientLight(0xffffff, 1.0));
    } else {
        scene.add(new THREE.AmbientLight(0xffffff, 0.25));
        const sun = new THREE.DirectionalLight(0xffffff, 1.4);
        sun.position.set(-3, 1.5, 3);
        scene.add(sun);
    }

    const globe = { scene, camera, renderer, sphere, speed: opts.speed || 0.003, visible: true, container };

    // Pause rendering when off-screen
    const io = new IntersectionObserver(([e]) => { globe.visible = e.isIntersecting; }, { threshold: 0 });
    io.observe(container);

    globes.push(globe);
}

// Build a globe for every planet card
document.querySelectorAll('.planet-visual').forEach(el => {
    const p = planets[parseInt(el.dataset.index, 10)];
    createGlobe(el, p);
});

// Build the Sun globe
const sunEl = document.getElementById('sunGlobe');
if (sunEl) {
    createGlobe(sunEl, { texture: 'textures/sun.jpg', emissive: true, speed: 0.0009, tilt: 0.12 });
}

// Single shared animation loop
function animateGlobes() {
    for (const g of globes) {
        if (!g.visible) continue;
        g.sphere.rotation.y += g.speed;
        g.renderer.render(g.scene, g.camera);
    }
    requestAnimationFrame(animateGlobes);
}
animateGlobes();

// Keep globe canvases square on resize
window.addEventListener('resize', () => {
    for (const g of globes) {
        const size = g.container.clientWidth;
        g.renderer.setSize(size, size);
    }
});

/* ---------- 5. Scroll Reveal ---------- */
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
    });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

/* ---------- 6. Navbar on scroll ---------- */
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
    if (window.scrollY > 60) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
});
