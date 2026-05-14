'use client';
import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

interface PlantNode { x: number; y: number; type: string; color: string; radius: number; }
interface ZoneData  { x: number; y: number; w: number; h: number; crop: string; color: string; label: string; }
interface CropStat  { name: string; color: string; emoji: string; water: string; nitrogen: string; profit_score: number; yield_t_per_acre: number; companion_score: number; }
interface LayoutResult {
  layout: PlantNode[]; zones: ZoneData[]; analysis: string;
  main_crop: string; companion: string;
  insights: { total_plants: number; land_efficiency: number; water_saving_pct: number; yield_boost_pct: number; nitrogen_balance: string; best_combo: string; warnings: string[]; action_items: string[] };
  crop_stats: CropStat[];
}
interface FarmViewer3DProps { result: LayoutResult; }

// ── Crop geometry ──────────────────────────────────────────
function makeCropMesh(type: string, cropH: number, color: THREE.Color): THREE.Group {
  const g = new THREE.Group();
  const t = type.toLowerCase();

  if (t.includes('corn') || t.includes('maize') || t.includes('sugarcane')) {
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, cropH, 6),
      new THREE.MeshStandardMaterial({ color: new THREE.Color('#a3e635'), roughness: 0.7 }));
    stalk.position.y = cropH / 2; g.add(stalk);
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6),
      new THREE.MeshStandardMaterial({ color, roughness: 0.5 }));
    top.position.y = cropH; g.add(top);
    for (let i = 0; i < 3; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.18, 4, 3),
        new THREE.MeshStandardMaterial({ color: new THREE.Color('#4ade80'), roughness: 0.8 }));
      leaf.scale.set(1, 0.2, 0.5);
      leaf.position.set(Math.cos(i * 2.1) * 0.3, cropH * 0.6, Math.sin(i * 2.1) * 0.3); g.add(leaf);
    }
  } else if (t.includes('mango') || t.includes('coconut') || t.includes('banana') || t.includes('tree')) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, cropH, 6),
      new THREE.MeshStandardMaterial({ color: new THREE.Color('#92400e'), roughness: 0.9 }));
    trunk.position.y = cropH / 2; g.add(trunk);
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8),
      new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
    canopy.position.y = cropH + 0.35; g.add(canopy);
  } else if (t.includes('wheat') || t.includes('rice') || t.includes('paddy') || t.includes('millet') || t.includes('barley')) {
    for (let i = 0; i < 5; i++) {
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, cropH, 5),
        new THREE.MeshStandardMaterial({ color: new THREE.Color('#d97706'), roughness: 0.9 }));
      stalk.position.set(Math.cos(i * 1.26) * 0.12, cropH / 2, Math.sin(i * 1.26) * 0.12); g.add(stalk);
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.22, 5),
        new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
      head.position.set(stalk.position.x, cropH + 0.1, stalk.position.z); g.add(head);
    }
  } else if (t.includes('tomato') || t.includes('onion') || t.includes('potato') || t.includes('garlic') || t.includes('chick')) {
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6),
      new THREE.MeshStandardMaterial({ color: new THREE.Color('#16a34a'), roughness: 0.8 }));
    bush.scale.set(1, 0.65, 1); bush.position.y = 0.22; g.add(bush);
    for (let i = 0; i < 4; i++) {
      const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.1, 7, 6),
        new THREE.MeshStandardMaterial({ color, roughness: 0.4 }));
      fruit.position.set(Math.cos(i * 1.57) * 0.26, 0.36, Math.sin(i * 1.57) * 0.26); g.add(fruit);
    }
  } else if (t.includes('cotton')) {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, cropH, 5),
      new THREE.MeshStandardMaterial({ color: new THREE.Color('#78716c'), roughness: 0.9 }));
    stem.position.y = cropH / 2; g.add(stem);
    for (let i = 0; i < 5; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6),
        new THREE.MeshStandardMaterial({ color: new THREE.Color('#f1f5f9'), roughness: 0.3 }));
      const ang = (i / 5) * Math.PI * 2;
      puff.position.set(Math.cos(ang) * 0.3, cropH * 0.75 + (i % 2) * 0.14, Math.sin(ang) * 0.3); g.add(puff);
    }
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, cropH, 0.35),
      new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
    body.position.y = cropH / 2; g.add(body);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6),
      new THREE.MeshStandardMaterial({ color, roughness: 0.5 }));
    cap.position.y = cropH; g.add(cap);
  }
  return g;
}

export default function FarmViewer3D({ result }: FarmViewer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef  = useRef<THREE.WebGLRenderer | null>(null);
  const animRef      = useRef<number>(0);
  const plantGroupRef = useRef<THREE.Group | null>(null);
  const controlsRef  = useRef<{ reset: () => void } | null>(null);

  const buildScene = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── Responsive size ──
    const W = container.clientWidth  || 960;
    const H = container.clientHeight || 500;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    // Make canvas fill container
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width   = '100%';
    renderer.domElement.style.height  = '100%';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Scene ──
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#060c18');
    scene.fog = new THREE.FogExp2('#0a1628', 0.011);

    // ── Camera ──
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 300);

    // ── Lights ──
    scene.add(new THREE.AmbientLight('#c8d4e8', 0.5));
    const sun = new THREE.DirectionalLight('#fff8e7', 2.2);
    sun.position.set(25, 40, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { near: 0.5, far: 120, left: -40, right: 40, top: 40, bottom: -40 });
    scene.add(sun);
    scene.add(new THREE.DirectionalLight('#4fa8d5', 0.45).position.set(-15, 10, -10) && new THREE.DirectionalLight('#4fa8d5', 0.45));
    scene.add(new THREE.HemisphereLight('#87ceeb', '#3d6b2f', 0.4));

    // ── Grid / ground ──
    const GRID = 24;
    const maxX = result.layout.reduce((m, p) => Math.max(m, p.x), 1);
    const maxY = result.layout.reduce((m, p) => Math.max(m, p.y), 1);
    const tileW = result.zones.length > 0 ? GRID / result.zones.length : GRID;

    result.zones.forEach((zone, zi) => {
      const col = new THREE.Color(zone.color);
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(tileW, 0.15, GRID),
        new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(0.32), roughness: 0.9 })
      );
      tile.receiveShadow = true;
      tile.position.set(zi * tileW + tileW / 2, -0.075, GRID / 2);
      scene.add(tile);

      // Label texture
      const lc = document.createElement('canvas');
      lc.width = 256; lc.height = 64;
      const lx = lc.getContext('2d')!;
      lx.fillStyle = zone.color;
      lx.font = 'bold 28px sans-serif';
      lx.textAlign = 'center';
      lx.fillText(zone.label, 128, 44);
      const lm = new THREE.Mesh(
        new THREE.PlaneGeometry(tileW * 0.85, tileW * 0.22),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(lc), transparent: true, depthWrite: false })
      );
      lm.rotation.x = -Math.PI / 2;
      lm.position.set(zi * tileW + tileW / 2, 0.09, 2.5);
      scene.add(lm);
    });

    // Border
    const border = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(GRID + 0.3, 0.2, GRID + 0.3)),
      new THREE.LineBasicMaterial({ color: '#4ade80' })
    );
    border.position.set(GRID / 2, 0, GRID / 2);
    scene.add(border);

    // Irrigation channels
    for (let row = 3; row < GRID; row += 4) {
      const ch = new THREE.Mesh(
        new THREE.BoxGeometry(GRID, 0.04, 0.12),
        new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0ea5e9', emissiveIntensity: 0.7, transparent: true, opacity: 0.7 })
      );
      ch.position.set(GRID / 2, 0.05, row);
      scene.add(ch);
    }

    // World-space axis arrows
    scene.add(new THREE.AxesHelper(4));

    // ── Plants ──
    const plantGroup = new THREE.Group();
    plantGroupRef.current = plantGroup;
    scene.add(plantGroup);

    const step = Math.max(1, Math.floor(result.layout.length / 600));
    for (let i = 0; i < result.layout.length; i += step) {
      const p = result.layout[i];
      const stat = result.crop_stats?.find(s => s.name === p.type);
      const cropH = Math.max(0.45, (stat?.yield_t_per_acre || 2) * 0.48);
      const mesh = makeCropMesh(p.type, cropH, new THREE.Color(p.color));
      mesh.position.set((p.x / maxX) * GRID, 0, (p.y / maxY) * GRID);
      const sc = 0.85 + Math.random() * 0.3;
      mesh.scale.setScalar(sc);
      mesh.castShadow = true;
      mesh.userData.waveOffset = Math.random() * Math.PI * 2;
      plantGroup.add(mesh);
    }

    // ── Orbit controls (manual, pixel-ratio-aware) ──
    let isOrbit = false, isPan = false;
    let prevX = 0, prevY = 0;
    let theta = -Math.PI / 6, phi = Math.PI / 3.5, radius = 52;
    const target = new THREE.Vector3(GRID / 2, 0, GRID / 2);

    function applyCamera() {
      camera.position.set(
        target.x + radius * Math.sin(phi) * Math.sin(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * Math.sin(phi) * Math.cos(theta)
      );
      camera.lookAt(target);
    }
    applyCamera();

    function onDown(e: MouseEvent) {
      e.preventDefault();
      if (e.button === 0) isOrbit = true;
      if (e.button === 2) isPan = true;
      prevX = e.clientX; prevY = e.clientY;
    }
    function onMove(e: MouseEvent) {
      if (!isOrbit && !isPan) return;
      const dx = e.clientX - prevX, dy = e.clientY - prevY;
      prevX = e.clientX; prevY = e.clientY;
      if (isOrbit) {
        theta -= dx * 0.007;
        phi = Math.max(0.12, Math.min(Math.PI / 2.05, phi + dy * 0.007));
        applyCamera();
      }
      if (isPan) {
        const spd = radius * 0.001;
        const right = new THREE.Vector3().crossVectors(
          camera.position.clone().sub(target), new THREE.Vector3(0,1,0)
        ).normalize();
        target.addScaledVector(right, -dx * spd);
        target.addScaledVector(new THREE.Vector3(0, 1, 0), dy * spd);
        applyCamera();
      }
    }
    function onUp() { isOrbit = false; isPan = false; }
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      radius = Math.max(6, Math.min(120, radius + e.deltaY * 0.045));
      applyCamera();
    }
    function onCtx(e: Event) { e.preventDefault(); }

    // Attach to the canvas element, not the container div
    const canvas = renderer.domElement;
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('contextmenu', onCtx);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    controlsRef.current = {
      reset() {
        theta = -Math.PI / 6; phi = Math.PI / 3.5; radius = 52;
        target.set(GRID / 2, 0, GRID / 2);
        applyCamera();
      }
    };

    // ── Gizmo (secondary scene, viewport scissor) ──
    const gScene = new THREE.Scene();
    const gCam = new THREE.PerspectiveCamera(50, 1, 0.1, 10);
    gCam.position.set(0, 0, 3);
    gScene.add(new THREE.AxesHelper(1.3));
    gScene.add(new THREE.AmbientLight('#ffffff', 1));

    const clock = new THREE.Clock();

    // ── Animation loop ──
    function animate() {
      animRef.current = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Sway
      plantGroup.children.forEach(child => {
        const off = (child.userData.waveOffset as number) || 0;
        child.rotation.z = Math.sin(t * 1.1 + off) * 0.022;
        child.rotation.x = Math.sin(t * 0.85 + off + 1) * 0.015;
      });

      // Mirror gizmo camera to main camera quaternion
      gCam.quaternion.copy(camera.quaternion);

      // Main
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, W, H);
      renderer.render(scene, camera);

      // Gizmo overlay
      const gs = 96;
      renderer.setScissor(10, 10, gs, gs);
      renderer.setViewport(10, 10, gs, gs);
      renderer.setScissorTest(true);
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(gScene, gCam);
      renderer.autoClear = true;
      renderer.setScissorTest(false);
    }
    animate();

    // Cleanup returned by useEffect
    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('contextmenu', onCtx);
      canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      renderer.dispose();
      if (container.contains(canvas)) container.removeChild(canvas);
    };
  }, [result]);

  useEffect(() => {
    const cleanup = buildScene();
    return cleanup;
  }, [buildScene]);

  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#060c18' }}>
      {/* Three.js mounts its canvas here — height driven by CSS */}
      <div
        ref={containerRef}
        style={{ width: '100%', height: 520, display: 'block' }}
      />

      {/* Controls hint */}
      <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(6,12,24,0.88)', backdropFilter: 'blur(8px)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: 10, padding: '0.65rem 1rem', fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.9, pointerEvents: 'none' }}>
        <div style={{ color: '#38bdf8', fontWeight: 700, marginBottom: '0.25rem' }}>🎮 Controls</div>
        <div>🖱️ Left drag — Orbit (X / Y)</div>
        <div>🖱️ Right drag — Pan</div>
        <div>⚙️ Scroll — Zoom in / out</div>
      </div>

      {/* Reset button */}
      <button
        onClick={() => controlsRef.current?.reset()}
        style={{ position: 'absolute', bottom: 14, right: 14, background: 'rgba(14,165,233,0.2)', border: '1px solid rgba(14,165,233,0.5)', color: '#38bdf8', borderRadius: 8, padding: '0.42rem 0.85rem', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(6px)' }}
      >
        ⟳ Reset View
      </button>

      {/* Axis legend */}
      <div style={{ position: 'absolute', bottom: 14, left: 108, background: 'rgba(6,12,24,0.75)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '0.35rem 0.65rem', fontSize: '0.67rem', fontWeight: 700, lineHeight: 1.7, pointerEvents: 'none' }}>
        <div style={{ color: '#ef4444' }}>■ X axis</div>
        <div style={{ color: '#4ade80' }}>■ Y axis (up)</div>
        <div style={{ color: '#3b82f6' }}>■ Z axis</div>
      </div>
    </div>
  );
}
