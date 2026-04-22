'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────
interface PlantNode { x: number; y: number; type: string; color: string; radius: number; }
interface ZoneData  { x: number; y: number; w: number; h: number; crop: string; color: string; label: string; }
interface Insights  {
  total_plants: number; land_efficiency: number; water_saving_pct: number;
  yield_boost_pct: number; nitrogen_balance: string; best_combo: string;
  warnings: string[]; action_items: string[];
}
interface CropStat { name: string; color: string; emoji: string; water: string; nitrogen: string; profit_score: number; yield_t_per_acre: number; companion_score: number; }
interface LayoutResult {
  layout: PlantNode[]; zones: ZoneData[]; analysis: string;
  main_crop: string; companion: string; insights: Insights; crop_stats: CropStat[];
}
// Normalized polygon: each point in [0..1] x [0..1] space
type NormPoly = { x: number; y: number }[];

// ── Geometry helpers ───────────────────────────────────────
/** Ray-casting point-in-polygon (normalized coords) */
function pointInPoly(px: number, py: number, poly: NormPoly): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Convert [[lat,lng],...] to normalized [0..1] polygon */
function latLngToNorm(latlngs: [number, number][]): NormPoly {
  if (!latlngs.length) return [];
  const lats = latlngs.map((p) => p[0]), lngs = latlngs.map((p) => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const dLat = maxLat - minLat || 1, dLng = maxLng - minLng || 1;
  return latlngs.map(([lat, lng]) => ({
    x: (lng - minLng) / dLng,
    y: 1 - (lat - minLat) / dLat, // flip Y so north = top
  }));
}

// ── Constants ─────────────────────────────────────────────
const ALL_CROPS = [
  { name: 'Corn',      emoji: '🌽', color: '#eab308' },
  { name: 'Tomato',    emoji: '🍅', color: '#ef4444' },
  { name: 'Wheat',     emoji: '🌾', color: '#fcd34d' },
  { name: 'Rice',      emoji: '🌾', color: '#34d399' },
  { name: 'Sugarcane', emoji: '🎋', color: '#84cc16' },
  { name: 'Cotton',    emoji: '🪴', color: '#e5e7eb' },
  { name: 'Soybean',   emoji: '🫘', color: '#a3e635' },
  { name: 'Maize',     emoji: '🌽', color: '#facc15' },
  { name: 'Onion',     emoji: '🧅', color: '#c084fc' },
  { name: 'Garlic',    emoji: '🧄', color: '#e2e8f0' },
  { name: 'Marigold',  emoji: '🌼', color: '#f97316' },
  { name: 'Groundnut', emoji: '🥜', color: '#d97706' },
  { name: 'Mustard',   emoji: '🌿', color: '#fef08a' },
  { name: 'Chickpea',  emoji: '🫘', color: '#fde68a' },
  { name: 'Potato',    emoji: '🥔', color: '#a78bfa' },
  { name: 'Sunflower', emoji: '🌻', color: '#fbbf24' },
];
const VIEW_MODES = ['2D Field', '3D Isometric', 'Satellite', 'Analysis'] as const;
type ViewMode = typeof VIEW_MODES[number];

// ── 2D Renderer (polygon-aware) ───────────────────────────
function draw2D(canvas: HTMLCanvasElement, data: LayoutResult, poly: NormPoly | null) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0d1f0e'); bg.addColorStop(1, '#0a1a0b');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // If polygon, clip canvas to field shape
  if (poly && poly.length >= 3) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(poly[0].x * W, poly[0].y * H);
    poly.forEach((p) => ctx.lineTo(p.x * W, p.y * H));
    ctx.closePath();
    ctx.clip();

    // Field shape fill
    ctx.fillStyle = '#0d2210';
    ctx.fillRect(0, 0, W, H);

    // Field border glow
    ctx.strokeStyle = '#4ade8088';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(poly[0].x * W, poly[0].y * H);
    poly.forEach((p) => ctx.lineTo(p.x * W, p.y * H));
    ctx.closePath();
    ctx.stroke();
  }

  // Zone fills
  data.zones.forEach((z) => {
    ctx.fillStyle = z.color + '12'; ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.strokeStyle = z.color + '30'; ctx.lineWidth = 1; ctx.strokeRect(z.x + 0.5, 0.5, z.w - 1, H - 1);
    ctx.fillStyle = z.color + 'bb'; ctx.font = 'bold 11px Inter,sans-serif';
    ctx.fillText(z.label, z.x + 8, 18);
  });

  // Grid
  ctx.strokeStyle = 'rgba(74,222,128,0.05)'; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // Irrigation lines
  ctx.strokeStyle = 'rgba(56,189,248,0.18)'; ctx.setLineDash([6, 8]);
  data.zones.forEach((z) => {
    for (let y = 60; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(z.x + 10, y); ctx.lineTo(z.x + z.w - 10, y); ctx.stroke(); }
  });
  ctx.setLineDash([]);

  // Plants — skip those outside the polygon
  data.layout.forEach((p) => {
    const nx = p.x / W, ny = p.y / H;
    if (poly && poly.length >= 3 && !pointInPoly(nx, ny, poly)) return;

    ctx.beginPath(); ctx.arc(p.x + 2, p.y + 2, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fill();
    const g = ctx.createRadialGradient(p.x - p.radius * 0.3, p.y - p.radius * 0.3, 0, p.x, p.y, p.radius);
    g.addColorStop(0, p.color + 'ff'); g.addColorStop(1, p.color + '55');
    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = p.color; ctx.lineWidth = 1; ctx.stroke();
  });

  if (poly) ctx.restore(); // stop clipping

  // Legend
  const types = [...new Set(data.layout.map((p) => p.type))];
  types.forEach((t, i) => {
    const n = data.layout.find((p) => p.type === t); if (!n) return;
    ctx.fillStyle = n.color; ctx.beginPath(); ctx.arc(16, H - 20 - i * 22, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e5e7eb'; ctx.font = '11px Inter,sans-serif'; ctx.fillText(t, 28, H - 16 - i * 22);
  });

  // Field label
  if (poly) {
    ctx.fillStyle = 'rgba(74,222,128,0.8)'; ctx.font = 'bold 12px Inter,sans-serif';
    ctx.fillText('📐 Field shape from satellite', 12, H - 8 - types.length * 22);
  }
}

// ── 3D Isometric (polygon-aware, draggable, zoomable) ─────
function draw3D(
  canvas: HTMLCanvasElement,
  data: LayoutResult,
  cam: { x: number; y: number; zoom: number },
  hovered: PlantNode | null,
  poly: NormPoly | null
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0a1628'); bg.addColorStop(1, '#0d1f0e');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  const tileW = 48 * cam.zoom, tileH = 24 * cam.zoom;
  const cols = 20, rows = 20;
  const originX = W / 2 + cam.x, originY = H * 0.35 + cam.y;

  function toIso(c: number, r: number): [number, number] {
    return [originX + (c - r) * (tileW / 2), originY + (c + r) * (tileH / 2)];
  }

  // Ground tiles — dim outside polygon
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const [sx, sy] = toIso(c, r);
      if (sx < -100 || sx > W + 100 || sy < -100 || sy > H + 100) continue;
      const normX = c / cols, normY = r / rows;
      const inField = !poly || poly.length < 3 || pointInPoly(normX, normY, poly);
      const zone = data.zones.find((z) => normX * canvas.width >= z.x && normX * canvas.width < z.x + z.w);
      const zColor = zone ? zone.color : '#22c55e';
      ctx.beginPath();
      ctx.moveTo(sx, sy); ctx.lineTo(sx + tileW / 2, sy + tileH / 2);
      ctx.lineTo(sx, sy + tileH); ctx.lineTo(sx - tileW / 2, sy + tileH / 2); ctx.closePath();
      ctx.fillStyle = inField ? zColor + '22' : 'rgba(0,0,0,0.12)';
      ctx.fill();
      ctx.strokeStyle = inField ? zColor + '28' : 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 0.5; ctx.stroke();
    }
  }

  // Field boundary outline in 3D
  if (poly && poly.length >= 3) {
    ctx.strokeStyle = '#4ade80aa'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
    ctx.beginPath();
    poly.forEach((p, i) => {
      const c = Math.floor(p.x * cols), r = Math.floor(p.y * rows);
      const [sx, sy] = toIso(c, r);
      if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    });
    ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
  }

  // Sort plants for z-order
  const sorted = [...data.layout].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  sorted.forEach((p) => {
    const nx = p.x / W, ny = p.y / H;
    if (poly && poly.length >= 3 && !pointInPoly(nx, ny, poly)) return; // skip outside field

    const c = Math.floor(nx * cols), r = Math.floor(ny * rows);
    const [sx, sy] = toIso(c, r);
    if (sx < -100 || sx > W + 100 || sy < -100 || sy > H + 100) return;

    const stat = data.crop_stats?.find((s) => s.name === p.type);
    const pillarH = Math.max(18, (stat?.yield_t_per_acre || 2) * 8 * cam.zoom);
    const col = p.color;
    const isHov = hovered?.x === p.x && hovered?.y === p.y;

    ctx.beginPath();
    ctx.moveTo(sx - tileW / 2, sy + tileH / 2); ctx.lineTo(sx, sy + tileH);
    ctx.lineTo(sx, sy + tileH + pillarH); ctx.lineTo(sx - tileW / 2, sy + tileH / 2 + pillarH); ctx.closePath();
    ctx.fillStyle = col + (isHov ? 'aa' : '44'); ctx.fill();
    if (isHov) { ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke(); }

    ctx.beginPath();
    ctx.moveTo(sx, sy + tileH); ctx.lineTo(sx + tileW / 2, sy + tileH / 2);
    ctx.lineTo(sx + tileW / 2, sy + tileH / 2 + pillarH); ctx.lineTo(sx, sy + tileH + pillarH); ctx.closePath();
    ctx.fillStyle = col + (isHov ? 'cc' : '66'); ctx.fill();

    ctx.beginPath();
    ctx.moveTo(sx, sy + pillarH); ctx.lineTo(sx + tileW / 2, sy + tileH / 2 + pillarH);
    ctx.lineTo(sx, sy + tileH + pillarH); ctx.lineTo(sx - tileW / 2, sy + tileH / 2 + pillarH); ctx.closePath();
    const tg = ctx.createRadialGradient(sx, sy + pillarH + tileH / 2, 0, sx, sy + pillarH + tileH / 2, tileW / 2);
    tg.addColorStop(0, col + (isHov ? 'ff' : '99')); tg.addColorStop(1, col + '33');
    ctx.fillStyle = tg; ctx.fill();
    ctx.strokeStyle = isHov ? col : col + '44'; ctx.lineWidth = isHov ? 2 : 0.5; ctx.stroke();
  });

  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = 'bold 12px Inter,sans-serif';
  ctx.fillText('🗺️ 3D View  |  Drag · Scroll to zoom · Hover to inspect', 14, 22);
  ctx.font = '11px Inter,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillText(`Zoom: ${(cam.zoom * 100).toFixed(0)}%  Plants: ${data.layout.length}${poly ? '  |  📐 Field shape active' : ''}`, 14, 38);
}

// ── Satellite Map with Draw + Save ────────────────────────
function SatelliteMap({
  result, onBoundarySaved, savedBoundary,
}: {
  result: LayoutResult | null;
  onBoundarySaved: (latlngs: [number, number][], acres: number) => void;
  savedBoundary: { latlngs: [number, number][]; area_acres: number } | null;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInst = useRef<unknown>(null);
  const [drawnAcres, setDrawnAcres] = useState<number | null>(savedBoundary?.area_acres ?? null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [pendingLatlngs, setPendingLatlngs] = useState<[number, number][] | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInst.current) return;
    const loadCSS = (href: string) => {
      if (!document.querySelector(`link[href="${href}"]`)) {
        const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href;
        document.head.appendChild(l);
      }
    };
    loadCSS('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
    loadCSS('https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css');

    function initMap() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (window as any).L;
      if (!L || !mapRef.current) return;

      const center: [number, number] = savedBoundary?.latlngs?.length
        ? [savedBoundary.latlngs[0][0], savedBoundary.latlngs[0][1]]
        : [20.5937, 78.9629];
      const zoom = savedBoundary ? 14 : 5;

      const map = L.map(mapRef.current).setView(center, zoom);
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri', maxZoom: 20,
      }).addTo(map);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
        opacity: 0.8, maxZoom: 20,
      }).addTo(map);

      const drawnItems = new L.FeatureGroup().addTo(map);

      // Restore saved boundary
      if (savedBoundary?.latlngs?.length) {
        const savedPoly = L.polygon(savedBoundary.latlngs, {
          color: '#4ade80', fillColor: '#4ade80', fillOpacity: 0.15, weight: 2.5, dashArray: '6,4',
        });
        drawnItems.addLayer(savedPoly);
        map.fitBounds(savedPoly.getBounds(), { padding: [20, 20] });
      }

      const drawControl = new L.Control.Draw({
        edit: { featureGroup: drawnItems, edit: true, remove: true },
        draw: {
          polygon: { allowIntersection: false, showArea: true, shapeOptions: { color: '#4ade80', fillColor: '#4ade80', fillOpacity: 0.2, weight: 2 } },
          rectangle: { shapeOptions: { color: '#38bdf8', fillColor: '#38bdf8', fillOpacity: 0.2, weight: 2 } },
          circle: false, circlemarker: false, polyline: false, marker: false,
        },
      });
      map.addControl(drawControl);

      map.on(L.Draw.Event.CREATED, (e: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ev = e as any;
        drawnItems.clearLayers();
        drawnItems.addLayer(ev.layer);
        const rawLatlngs: [number, number][] = (ev.layer.getLatLngs?.()[0] || []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (pt: any) => [pt.lat, pt.lng] as [number, number]
        );
        const areaSqM: number = L.GeometryUtil?.geodesicArea?.(ev.layer.getLatLngs?.()[0] || []) ?? 0;
        const acres = parseFloat((areaSqM / 4046.856).toFixed(2));
        setDrawnAcres(acres);
        setPendingLatlngs(rawLatlngs);
        setSaveMsg('');
      });

      // Crop markers
      if (result) {
        result.crop_stats.forEach((crop, i) => {
          const lat = center[0] + (i - result.crop_stats.length / 2) * 0.018;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (L as any).circleMarker([lat, center[1]], {
            radius: 14, color: crop.color, fillColor: crop.color, fillOpacity: 0.75, weight: 2,
          }).bindPopup(`<b>${crop.emoji} ${crop.name}</b><br>Yield: ${crop.yield_t_per_acre}t/acre<br>Water: ${crop.water}`).addTo(map);
        });
      }

      mapInst.current = map;
    }

    function loadScripts() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).L?.Draw) { initMap(); return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).L) {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js';
        s.onload = initMap; document.head.appendChild(s); return;
      }
      const s1 = document.createElement('script');
      s1.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s1.onload = () => {
        const s2 = document.createElement('script');
        s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js';
        s2.onload = initMap; document.head.appendChild(s2);
      };
      document.head.appendChild(s1);
    }
    loadScripts();

    return () => {
      if (mapInst.current) { (mapInst.current as { remove: () => void }).remove(); mapInst.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveField() {
    if (!pendingLatlngs || drawnAcres === null) return;
    setSaving(true);
    try {
      const center = pendingLatlngs.reduce(
        (acc, [lat, lng]) => ({ lat: acc.lat + lat, lng: acc.lng + lng }),
        { lat: 0, lng: 0 }
      );
      center.lat /= pendingLatlngs.length;
      center.lng /= pendingLatlngs.length;
      const res = await fetch('/api/field-boundary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latlngs: pendingLatlngs, area_acres: drawnAcres, center }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const storageLabel = data.storage === 'fluxbase-s3' ? '(saved as GeoJSON file)' : '(saved to database)';
        setSaveMsg(`✅ Field saved! ${storageLabel} — 2D & 3D views will now use your field shape.`);
        onBoundarySaved(pendingLatlngs, drawnAcres);
        setPendingLatlngs(null);
      } else {
        setSaveMsg(`❌ ${data.error || 'Failed to save.'}`);
      }
    } catch { setSaveMsg('❌ Connection error.'); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ position: 'relative' }}>
      <div ref={mapRef} style={{ width: '100%', height: 460, borderRadius: 12 }} />
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '0.4rem', maxWidth: 240 }}>
        <div style={{ background: 'rgba(10,22,40,0.92)', backdropFilter: 'blur(8px)', borderRadius: 10, padding: '0.5rem 0.75rem', fontSize: '0.72rem', color: '#86efac', border: '1px solid rgba(74,222,128,0.25)' }}>
          🛰️ Satellite — Draw your field
        </div>
        <div style={{ background: 'rgba(10,22,40,0.92)', backdropFilter: 'blur(8px)', borderRadius: 10, padding: '0.5rem 0.75rem', fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)', lineHeight: 1.65 }}>
          📐 Use the polygon or rectangle tool (left toolbar) to trace your field boundary.
        </div>
        {drawnAcres !== null && (
          <div style={{ background: 'rgba(74,222,128,0.15)', borderRadius: 10, padding: '0.65rem 0.75rem', fontSize: '0.82rem', color: '#4ade80', border: '1px solid rgba(74,222,128,0.35)', fontWeight: 700 }}>
            📏 {drawnAcres} acres<br />
            <span style={{ fontSize: '0.68rem', fontWeight: 400, color: 'rgba(255,255,255,0.45)' }}>{(drawnAcres * 4046.9).toFixed(0)} m²</span>
          </div>
        )}
        {pendingLatlngs && (
          <button onClick={saveField} disabled={saving} style={{ padding: '0.55rem 0.9rem', borderRadius: 10, background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? '⏳ Saving...' : '💾 Save Field to Profile'}
          </button>
        )}
        {savedBoundary && !pendingLatlngs && (
          <div style={{ background: 'rgba(14,165,233,0.15)', borderRadius: 10, padding: '0.55rem 0.75rem', fontSize: '0.75rem', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.3)' }}>
            ✅ Saved field loaded<br />{savedBoundary.area_acres} acres — used in 2D & 3D
          </div>
        )}
        {saveMsg && (
          <div style={{ background: 'rgba(10,22,40,0.92)', borderRadius: 10, padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: saveMsg.startsWith('✅') ? '#4ade80' : '#f87171', border: '1px solid rgba(255,255,255,0.1)', lineHeight: 1.55 }}>
            {saveMsg}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
export default function SpatialPlannerPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mainCrop, setMainCrop] = useState('Corn');
  const [companions, setCompanions] = useState<string[]>(['Soybean', 'Marigold']);
  const [landSize, setLandSize] = useState(2);
  const [viewMode, setViewMode] = useState<ViewMode>('2D Field');
  const [result, setResult] = useState<LayoutResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Saved field polygon (from DB)
  const [savedBoundary, setSavedBoundary] = useState<{ latlngs: [number, number][]; area_acres: number } | null>(null);
  const [normPoly, setNormPoly] = useState<NormPoly | null>(null);

  // 3D camera
  const camRef = useRef({ x: 0, y: 0, zoom: 1 });
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, camX: 0, camY: 0 });
  const hoveredRef = useRef<PlantNode | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: PlantNode } | null>(null);

  // Load saved boundary on mount
  useEffect(() => {
    fetch('/api/field-boundary').then((r) => r.json()).then((data) => {
      if (data.boundary?.latlngs) {
        setSavedBoundary({ latlngs: data.boundary.latlngs, area_acres: data.boundary.area_acres });
        setNormPoly(latLngToNorm(data.boundary.latlngs));
        setLandSize(data.boundary.area_acres);
      }
    }).catch(() => {});
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !result) return;
    if (viewMode === '2D Field') draw2D(canvas, result, normPoly);
    else if (viewMode === '3D Isometric') draw3D(canvas, result, camRef.current, hoveredRef.current, normPoly);
  }, [viewMode, result, normPoly]);

  useEffect(() => { redraw(); }, [redraw]);

  // 3D: mouse handlers
  function getCanvasPos(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (canvasRef.current!.width / rect.width), y: (e.clientY - rect.top) * (canvasRef.current!.height / rect.height) };
  }
  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (viewMode !== '3D Isometric') return;
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, camX: camRef.current.x, camY: camRef.current.y };
    if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
  }
  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (viewMode !== '3D Isometric') return;
    if (dragRef.current.dragging) {
      camRef.current.x = dragRef.current.camX + (e.clientX - dragRef.current.startX) * 1.5;
      camRef.current.y = dragRef.current.camY + (e.clientY - dragRef.current.startY) * 1.5;
      redraw(); return;
    }
    if (!result) return;
    const { x, y } = getCanvasPos(e);
    const cam = camRef.current;
    const tileW = 48 * cam.zoom, tileH = 24 * cam.zoom;
    const cols = 20, rows = 20;
    const W = canvasRef.current!.width, H = canvasRef.current!.height;
    const originX = W / 2 + cam.x, originY = H * 0.35 + cam.y;
    let closest: PlantNode | null = null, closestDist = 32;
    result.layout.forEach((p) => {
      const c = Math.floor((p.x / W) * cols), r = Math.floor((p.y / H) * rows);
      const sx = originX + (c - r) * (tileW / 2), sy = originY + (c + r) * (tileH / 2);
      const stat = result.crop_stats.find((s) => s.name === p.type);
      const topY = sy + Math.max(18, (stat?.yield_t_per_acre || 2) * 8 * cam.zoom);
      const dist = Math.hypot(x - sx, y - topY);
      if (dist < closestDist) { closestDist = dist; closest = p; }
    });
    hoveredRef.current = closest;
    setTooltip(closest ? { x: e.clientX, y: e.clientY, node: closest } : null);
    redraw();
  }
  function onMouseUp() { dragRef.current.dragging = false; if (canvasRef.current) canvasRef.current.style.cursor = 'grab'; }
  function onWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    if (viewMode !== '3D Isometric') return;
    e.preventDefault();
    camRef.current.zoom = Math.max(0.3, Math.min(4, camRef.current.zoom - e.deltaY * 0.001));
    redraw();
  }

  async function generate() {
    setLoading(true); setError('');
    try {
      const canvas = canvasRef.current;
      const res = await fetch('/api/spatial-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ width: canvas?.width || 1000, height: canvas?.height || 440, main_crop: mainCrop, companion_crops: companions, land_size: landSize }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed'); return; }
      camRef.current = { x: 0, y: 0, zoom: 1 };
      setResult(data);
    } catch { setError('Connection error.'); }
    finally { setLoading(false); }
  }

  function toggleCompanion(name: string) {
    if (name === mainCrop) return;
    setCompanions((prev) => prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name].slice(0, 4));
  }

  function handleBoundarySaved(latlngs: [number, number][], acres: number) {
    setSavedBoundary({ latlngs, area_acres: acres });
    setNormPoly(latLngToNorm(latlngs));
    setLandSize(acres);
  }

  const score = result?.insights.land_efficiency ?? 0;

  return (
    <div className="page-container" style={{ maxWidth: 1100 }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 style={{ margin: 0 }}>🛰️ Spatial Twin</h1>
          <span style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.65rem', borderRadius: 999, letterSpacing: '0.08em' }}>DIGITAL TWIN</span>
          {normPoly && <span style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', fontSize: '0.68rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 999, border: '1px solid rgba(74,222,128,0.3)' }}>📐 Field Shape Active</span>}
        </div>
        <p>Draw your real field on satellite → save → 2D & 3D views render your exact field shape.</p>
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1.25rem', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', letterSpacing: '0.06em' }}>PRIMARY CROP</label>
            <select className="form-control" value={mainCrop} onChange={(e) => setMainCrop(e.target.value)}>
              {ALL_CROPS.map((c) => <option key={c.name} value={c.name}>{c.emoji} {c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', letterSpacing: '0.06em' }}>
              LAND SIZE (acres) {savedBoundary && <span style={{ color: '#4ade80', fontWeight: 400 }}>— from saved field</span>}
            </label>
            <input className="form-control" type="number" min={0.5} max={100} step={0.5} value={landSize} onChange={(e) => setLandSize(+e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={generate} disabled={loading} style={{ height: 42, whiteSpace: 'nowrap', background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', boxShadow: '0 4px 15px rgba(99,102,241,0.4)' }}>
            {loading ? <><span className="spinner" /> Simulating...</> : '🛰️ Generate Twin'}
          </button>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', letterSpacing: '0.06em' }}>COMPANION CROPS (up to 4)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {ALL_CROPS.filter((c) => c.name !== mainCrop).map((c) => {
              const sel = companions.includes(c.name);
              return (
                <button key={c.name} onClick={() => toggleCompanion(c.name)} style={{ padding: '0.3rem 0.65rem', borderRadius: 999, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${sel ? c.color : 'rgba(255,255,255,0.12)'}`, background: sel ? c.color + '22' : 'transparent', color: sel ? c.color : 'var(--text-muted)', transition: 'all 0.15s' }}>
                  {c.emoji} {c.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* View tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {VIEW_MODES.map((mode) => (
          <button key={mode} onClick={() => setViewMode(mode)} style={{ padding: '0.45rem 1.1rem', borderRadius: 999, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${viewMode === mode ? '#0ea5e9' : 'var(--glass-border)'}`, background: viewMode === mode ? 'rgba(14,165,233,0.15)' : 'transparent', color: viewMode === mode ? '#38bdf8' : 'var(--text-muted)', transition: 'all 0.15s' }}>
            {mode === '2D Field' ? '📐' : mode === '3D Isometric' ? '🗺️' : mode === 'Satellite' ? '🛰️' : '📊'} {mode}
          </button>
        ))}
        {viewMode === '3D Isometric' && (
          <span style={{ fontSize: '0.71rem', color: 'var(--text-muted)', paddingLeft: '0.5rem' }}>
            🖱️ Drag · Scroll to zoom · Hover to inspect
          </span>
        )}
        {viewMode === 'Satellite' && !savedBoundary && (
          <span style={{ fontSize: '0.71rem', color: '#fbbf24', paddingLeft: '0.5rem' }}>
            ⚠️ No saved field yet — draw and save your field boundary
          </span>
        )}
      </div>

      {/* Canvas — 2D & 3D */}
      {(viewMode === '2D Field' || viewMode === '3D Isometric') && (
        <div className="card fade-in" style={{ padding: '0.75rem', marginBottom: '1rem', position: 'relative' }}>
          <canvas
            ref={canvasRef} width={1000} height={440}
            style={{ width: '100%', borderRadius: 10, display: 'block', background: viewMode === '3D Isometric' ? '#0a1628' : '#0a1a0b', cursor: viewMode === '3D Isometric' ? 'grab' : 'default' }}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove}
            onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onWheel={onWheel}
          />
          {!result && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', pointerEvents: 'none' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🛰️</div>
              <p style={{ fontSize: '0.88rem' }}>Select crops and click Generate Twin</p>
              {normPoly && <p style={{ fontSize: '0.78rem', color: '#4ade80', marginTop: '0.25rem' }}>📐 Your saved field boundary will be applied</p>}
            </div>
          )}
          {/* 3D controls */}
          {viewMode === '3D Isometric' && result && (
            <div style={{ position: 'absolute', bottom: 20, right: 20, display: 'flex', gap: '0.4rem' }}>
              {[{ l: '🔍+', fn: () => { camRef.current.zoom = Math.min(4, camRef.current.zoom + 0.25); redraw(); } },
                { l: '🔍−', fn: () => { camRef.current.zoom = Math.max(0.3, camRef.current.zoom - 0.25); redraw(); } },
                { l: '⟳', fn: () => { camRef.current = { x: 0, y: 0, zoom: 1 }; redraw(); } }].map((b) => (
                <button key={b.l} onClick={b.fn} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(14,165,233,0.2)', border: '1px solid rgba(14,165,233,0.4)', color: '#38bdf8', cursor: 'pointer', fontSize: '0.78rem' }}>{b.l}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hover tooltip */}
      {tooltip && viewMode === '3D Isometric' && (
        <div style={{ position: 'fixed', left: tooltip.x + 14, top: tooltip.y - 10, zIndex: 9999, background: 'rgba(10,22,40,0.96)', border: `1px solid ${tooltip.node.color}55`, borderRadius: 10, padding: '0.6rem 0.85rem', fontSize: '0.78rem', pointerEvents: 'none', backdropFilter: 'blur(8px)', color: '#e5e7eb', minWidth: 145, boxShadow: `0 4px 20px ${tooltip.node.color}30` }}>
          {(() => {
            const s = result?.crop_stats.find((c) => c.name === tooltip.node.type);
            return (<>
              <div style={{ fontWeight: 700, color: tooltip.node.color, marginBottom: '0.3rem' }}>{s?.emoji} {tooltip.node.type}</div>
              {[['Yield', `${s?.yield_t_per_acre}t/acre`], ['Water', s?.water], ['Nitrogen', s?.nitrogen], ['Profit', '⭐'.repeat(Math.min(s?.profit_score || 0, 5))]].map(([k, v]) => (
                <div key={k} style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.7rem' }}>{k}: <b style={{ color: '#e5e7eb' }}>{v}</b></div>
              ))}
            </>);
          })()}
        </div>
      )}

      {/* Satellite */}
      {viewMode === 'Satellite' && (
        <div className="card fade-in" style={{ padding: '0.75rem', marginBottom: '1rem', borderRadius: 14, overflow: 'hidden' }}>
          <SatelliteMap result={result} onBoundarySaved={handleBoundarySaved} savedBoundary={savedBoundary} />
        </div>
      )}

      {/* Analysis */}
      {viewMode === 'Analysis' && (
        result ? (
          <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="card">
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '1rem', color: '#38bdf8' }}>📊 Efficiency Metrics</h3>
              {[{ label: 'Land Efficiency', value: result.insights.land_efficiency, color: '#4ade80' },
                { label: 'Yield Boost', value: result.insights.yield_boost_pct, color: '#a78bfa' },
                { label: 'Water Saving', value: result.insights.water_saving_pct, color: '#38bdf8' }].map((m) => (
                <div key={m.label} style={{ marginBottom: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{m.label}</span>
                    <span style={{ fontWeight: 700, color: m.color }}>{m.value}%</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 999 }}>
                    <div style={{ height: '100%', width: `${m.value}%`, background: m.color, borderRadius: 999 }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: '0.75rem', padding: '0.65rem', background: 'rgba(74,222,128,0.07)', borderRadius: 10, border: '1px solid rgba(74,222,128,0.15)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                🌿 {result.insights.nitrogen_balance}
              </div>
            </div>
            <div className="card">
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '1rem', color: '#38bdf8' }}>🌾 Crop Stats</h3>
              {result.crop_stats.map((c) => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.55rem 0.7rem', marginBottom: '0.4rem', background: `${c.color}08`, borderRadius: 10, border: `1px solid ${c.color}25` }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, flex: 1 }}>{c.emoji} {c.name}</span>
                  <span style={{ fontSize: '0.7rem', color: '#38bdf8' }}>{c.yield_t_per_acre}t/ac</span>
                  <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', borderRadius: 999, background: 'rgba(255,255,255,0.05)', color: c.water === 'Low' ? '#4ade80' : c.water === 'High' ? '#f87171' : '#fbbf24' }}>💧{c.water}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', color: '#4ade80' }}>✅ Action Items</h3>
              <ol style={{ paddingLeft: '1.1rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {result.insights.action_items.map((a, i) => <li key={i} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>{a}</li>)}
              </ol>
            </div>
            <div className="card">
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', color: '#fbbf24' }}>⚠️ Warnings</h3>
              {result.insights.warnings.length === 0
                ? <p style={{ fontSize: '0.82rem', color: '#4ade80' }}>✅ Optimal crop combination!</p>
                : <ul style={{ paddingLeft: '1.1rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>{result.insights.warnings.map((w, i) => <li key={i} style={{ fontSize: '0.8rem', color: '#fcd34d', lineHeight: 1.55 }}>{w}</li>)}</ul>}
              <div style={{ marginTop: '0.65rem', padding: '0.5rem 0.65rem', background: 'rgba(99,102,241,0.07)', borderRadius: 10, border: '1px solid rgba(99,102,241,0.2)', fontSize: '0.76rem', color: '#c4b5fd' }}>
                💡 Best companions for {result.main_crop}: {result.insights.best_combo}
              </div>
            </div>
          </div>
        ) : (
          <div className="card fade-in" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📊</div>
            <p>Generate a spatial twin first to see the analysis.</p>
          </div>
        )
      )}

      {/* Summary bar */}
      {result && viewMode !== 'Analysis' && (
        <div className="card fade-in" style={{ marginTop: '0.75rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', padding: '1rem 1.25rem' }}>
          {[{ label: 'Plants', value: result.insights.total_plants, icon: '🌱' },
            { label: 'Efficiency', value: `${score}%`, icon: '📈' },
            { label: 'Yield Boost', value: `+${result.insights.yield_boost_pct}%`, icon: '🚀' },
            { label: 'Water Save', value: `${result.insights.water_saving_pct}%`, icon: '💧' }].map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem' }}>{s.icon}</div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#4ade80' }}>{s.value}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', flex: 1, borderLeft: '1px solid var(--glass-border)', paddingLeft: '1.25rem', lineHeight: 1.6 }}>
            {result.analysis.replace(/\*\*(.*?)\*\*/g, '$1')}
          </p>
        </div>
      )}
    </div>
  );
}
