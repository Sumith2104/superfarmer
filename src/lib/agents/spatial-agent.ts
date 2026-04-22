// src/lib/agents/spatial-agent.ts
// SpatialPlannerAgent — generates optimized multi-crop layouts with AI analysis

import { AgentContext, AgentResult } from './types';
import { saveMemory } from './context';

export interface PlantNode {
  x: number; y: number;
  type: string; color: string; radius: number;
  row: number; col: number;
}

export interface ZoneData {
  x: number; y: number;
  w: number; h: number;
  crop: string; color: string;
  label: string;
}

export interface CropCombination {
  name: string;
  color: string;
  emoji: string;
  spacing: number;
  height_m: number;
  water: 'Low' | 'Medium' | 'High';
  nitrogen: 'Fixer' | 'Consumer' | 'Neutral';
  shade: 'Tolerant' | 'Sensitive' | 'Neutral';
  profit_score: number; // 1-10
  companion_score: number; // compatibility with other selected crops 1-10
  yield_t_per_acre: number;
}

export interface SpatialLayoutData {
  layout: PlantNode[];
  zones: ZoneData[];
  analysis: string;
  main_crop: string;
  companion: string;
  insights: {
    total_plants: number;
    land_efficiency: number;
    water_saving_pct: number;
    yield_boost_pct: number;
    nitrogen_balance: string;
    best_combo: string;
    warnings: string[];
    action_items: string[];
  };
  crop_stats: CropCombination[];
}

// ── Full crop database ─────────────────────────────────────
const CROP_DB: Record<string, CropCombination> = {
  'Corn':       { name: 'Corn',       color: '#eab308', emoji: '🌽', spacing: 60, height_m: 2.5, water: 'Medium', nitrogen: 'Consumer', shade: 'Sensitive', profit_score: 7, companion_score: 8, yield_t_per_acre: 2.8 },
  'Tomato':     { name: 'Tomato',     color: '#ef4444', emoji: '🍅', spacing: 50, height_m: 1.2, water: 'High',   nitrogen: 'Consumer', shade: 'Tolerant', profit_score: 9, companion_score: 7, yield_t_per_acre: 8.0 },
  'Wheat':      { name: 'Wheat',      color: '#fcd34d', emoji: '🌾', spacing: 20, height_m: 1.0, water: 'Low',   nitrogen: 'Consumer', shade: 'Sensitive', profit_score: 6, companion_score: 6, yield_t_per_acre: 1.6 },
  'Rice':       { name: 'Rice',       color: '#34d399', emoji: '🌾', spacing: 25, height_m: 1.2, water: 'High',  nitrogen: 'Consumer', shade: 'Tolerant', profit_score: 7, companion_score: 5, yield_t_per_acre: 2.2 },
  'Sugarcane':  { name: 'Sugarcane',  color: '#84cc16', emoji: '🎋', spacing: 90, height_m: 3.5, water: 'High',  nitrogen: 'Consumer', shade: 'Sensitive', profit_score: 8, companion_score: 5, yield_t_per_acre: 35.0 },
  'Cotton':     { name: 'Cotton',     color: '#f9fafb', emoji: '🪴', spacing: 75, height_m: 1.5, water: 'Medium',nitrogen: 'Consumer', shade: 'Sensitive', profit_score: 7, companion_score: 6, yield_t_per_acre: 0.5 },
  'Soybean':    { name: 'Soybean',    color: '#a3e635', emoji: '🫘', spacing: 30, height_m: 0.8, water: 'Low',   nitrogen: 'Fixer',    shade: 'Tolerant', profit_score: 7, companion_score: 9, yield_t_per_acre: 0.9 },
  'Maize':      { name: 'Maize',      color: '#facc15', emoji: '🌽', spacing: 65, height_m: 2.0, water: 'Medium',nitrogen: 'Consumer', shade: 'Sensitive', profit_score: 7, companion_score: 7, yield_t_per_acre: 3.2 },
  'Onion':      { name: 'Onion',      color: '#c084fc', emoji: '🧅', spacing: 15, height_m: 0.5, water: 'Medium',nitrogen: 'Neutral', shade: 'Tolerant',  profit_score: 8, companion_score: 9, yield_t_per_acre: 6.0 },
  'Garlic':     { name: 'Garlic',     color: '#e2e8f0', emoji: '🧄', spacing: 12, height_m: 0.4, water: 'Low',  nitrogen: 'Neutral',  shade: 'Tolerant',  profit_score: 9, companion_score: 9, yield_t_per_acre: 4.5 },
  'Marigold':   { name: 'Marigold',   color: '#f97316', emoji: '🌼', spacing: 20, height_m: 0.6, water: 'Low',  nitrogen: 'Neutral',  shade: 'Tolerant',  profit_score: 5, companion_score: 10,yield_t_per_acre: 1.2 },
  'Groundnut':  { name: 'Groundnut',  color: '#d97706', emoji: '🥜', spacing: 30, height_m: 0.5, water: 'Low',  nitrogen: 'Fixer',    shade: 'Tolerant',  profit_score: 8, companion_score: 9, yield_t_per_acre: 1.0 },
  'Mustard':    { name: 'Mustard',    color: '#fef08a', emoji: '🌿', spacing: 20, height_m: 1.2, water: 'Low',  nitrogen: 'Neutral',  shade: 'Sensitive', profit_score: 7, companion_score: 7, yield_t_per_acre: 0.7 },
  'Chickpea':   { name: 'Chickpea',   color: '#fde68a', emoji: '🫘', spacing: 25, height_m: 0.6, water: 'Low',  nitrogen: 'Fixer',    shade: 'Tolerant',  profit_score: 8, companion_score: 9, yield_t_per_acre: 0.8 },
  'Potato':     { name: 'Potato',     color: '#a78bfa', emoji: '🥔', spacing: 35, height_m: 0.6, water: 'Medium',nitrogen: 'Consumer', shade: 'Tolerant', profit_score: 8, companion_score: 7, yield_t_per_acre: 8.0 },
  'Sunflower':  { name: 'Sunflower',  color: '#fbbf24', emoji: '🌻', spacing: 45, height_m: 2.0, water: 'Low',  nitrogen: 'Neutral',  shade: 'Sensitive', profit_score: 7, companion_score: 7, yield_t_per_acre: 0.5 },
};

// ── Compatible pairs (true = good companions) ─────────────
const COMPANION_MATRIX: Record<string, string[]> = {
  'Corn':      ['Soybean', 'Groundnut', 'Marigold', 'Pumpkin'],
  'Tomato':    ['Marigold', 'Onion', 'Garlic', 'Basil', 'Carrot'],
  'Wheat':     ['Chickpea', 'Mustard', 'Clover', 'Soybean'],
  'Rice':      ['Azolla', 'Groundnut', 'Sunflower'],
  'Cotton':    ['Marigold', 'Soybean', 'Groundnut', 'Onion'],
  'Sugarcane': ['Soybean', 'Groundnut', 'Garlic', 'Onion'],
  'Potato':    ['Marigold', 'Garlic', 'Corn'],
  'Onion':     ['Tomato', 'Corn', 'Marigold', 'Garlic'],
  'Maize':     ['Soybean', 'Groundnut', 'Marigold'],
};

// ── Generate hexagonal layout for a crop across a zone ────
function hexLayout(
  crop: CropCombination, zone: { x: number; y: number; w: number; h: number }, offset: number = 0
): PlantNode[] {
  const nodes: PlantNode[] = [];
  const sp = crop.spacing;
  let row = 0;
  for (let y = zone.y + sp * 0.5; y < zone.y + zone.h - sp * 0.4; y += Math.floor(sp * 0.866)) {
    const xShift = (row % 2) * (sp / 2) + offset;
    let col = 0;
    for (let x = zone.x + xShift + sp * 0.5; x < zone.x + zone.w - sp * 0.4; x += sp) {
      nodes.push({ x, y, type: crop.name, color: crop.color, radius: Math.max(4, sp * 0.32), row, col });
      col++;
    }
    row++;
  }
  return nodes;
}

export async function runSpatialAgent(
  ctx: AgentContext,
  input: { width: number; height: number; main_crop: string; companion_crops?: string[]; land_size?: number; view_mode?: string }
): Promise<AgentResult<SpatialLayoutData>> {
  const trace: string[] = [];
  const { farmerId } = ctx;

  const mainData = CROP_DB[input.main_crop] || CROP_DB['Corn'];
  const companions = (input.companion_crops || [])
    .filter((c) => c !== input.main_crop)
    .map((c) => CROP_DB[c])
    .filter(Boolean) as CropCombination[];

  const allCrops = [mainData, ...companions];
  const numCrops = allCrops.length;
  trace.push(`Generating layout for ${numCrops} crops: ${allCrops.map((c) => c.name).join(', ')}`);

  // ── Build zones — divide the canvas horizontally by crop ratio ──
  const totalWeight = allCrops.reduce((s, c) => s + (1 / c.spacing), 0);
  const zones: ZoneData[] = [];
  let xCursor = 0;
  allCrops.forEach((crop, i) => {
    const weight = (1 / crop.spacing) / totalWeight;
    const zoneW = Math.floor(input.width * weight);
    zones.push({
      x: xCursor, y: 0,
      w: zoneW, h: input.height,
      crop: crop.name, color: crop.color,
      label: `Zone ${i + 1}: ${crop.name}`,
    });
    xCursor += zoneW;
  });
  // Extend last zone to fill
  if (zones.length > 0) zones[zones.length - 1].w = input.width - zones[zones.length - 1].x;

  // ── Generate plant nodes for each zone ──────────────────
  const allNodes: PlantNode[] = [];
  allCrops.forEach((crop, i) => {
    const zone = zones[i];
    if (zone) allNodes.push(...hexLayout(crop, zone));
  });

  trace.push(`Generated ${allNodes.length} plant nodes across ${zones.length} zones.`);

  // ── Compute insights ─────────────────────────────────────
  const fixerCount = allCrops.filter((c) => c.nitrogen === 'Fixer').length;
  const nitrogenBalance = fixerCount > 0 ? `${fixerCount} nitrogen-fixing crop(s) reduce fertilizer needs` : 'Add a legume (Soybean/Chickpea) to fix nitrogen';
  const avgWater: Record<string, number> = { Low: 1, Medium: 2, High: 3 };
  const waterEfficiency = allCrops.length > 1
    ? Math.round((1 - (allCrops.reduce((s, c) => s + avgWater[c.water], 0) / (allCrops.length * 3))) * 30)
    : 0;

  const companionScore = companions.reduce((best, c) => {
    const isGood = COMPANION_MATRIX[input.main_crop]?.includes(c.name);
    return best + (isGood ? 1 : 0);
  }, 0);
  const totalYield = allCrops.reduce((s, c, i) => {
    const zone = zones[i];
    if (!zone || !input.land_size) return s;
    const zoneAcres = (zone.w / input.width) * input.land_size;
    return s + c.yield_t_per_acre * zoneAcres;
  }, 0);

  const warnings: string[] = [];
  const bestCompanions = COMPANION_MATRIX[input.main_crop] || [];
  companions.forEach((c) => {
    if (!bestCompanions.includes(c.name)) {
      warnings.push(`${c.name} is not a natural companion for ${input.main_crop}. Yield may be suboptimal.`);
    }
  });
  if (allCrops.some((c) => c.water === 'High') && allCrops.some((c) => c.water === 'Low')) {
    warnings.push('Mixed water needs — use drip irrigation to provide targeted watering per zone.');
  }

  const insights = {
    total_plants: allNodes.length,
    land_efficiency: Math.min(95, 70 + companionScore * 5 + (numCrops > 1 ? 10 : 0)),
    water_saving_pct: waterEfficiency,
    yield_boost_pct: Math.min(40, companionScore * 6 + (fixerCount > 0 ? 8 : 0)),
    nitrogen_balance: nitrogenBalance,
    best_combo: bestCompanions.slice(0, 3).join(', ') || 'Marigold, Legumes',
    warnings,
    action_items: [
      `Plant ${mainData.name} in the largest zone with ${mainData.spacing}cm spacing`,
      companions.length > 0 ? `Companion zones provide micro-climate benefits` : 'Add a companion crop to boost land efficiency',
      fixerCount > 0 ? 'No synthetic nitrogen needed — legumes fix atmospheric N₂' : 'Apply 40kg nitrogen fertilizer per acre',
      `Estimated total yield: ${totalYield.toFixed(1)} tonnes from ${input.land_size || 1} acre(s)`,
    ],
  };

  const analysis = `**Digital Twin Generated** — ${allNodes.length} planting nodes across ${numCrops} crop zone(s).\n\nThis layout uses **${input.main_crop}** as the primary crop${companions.length > 0 ? `, intercropped with **${companions.map((c) => c.name).join(', ')}**` : ''}. Land efficiency is **${insights.land_efficiency}%** with an estimated **${insights.yield_boost_pct}% yield boost** over monoculture.`;

  if (farmerId) {
    void saveMemory(farmerId, 'spatial-twin', `Generated ${numCrops}-crop spatial twin: ${allCrops.map((c) => c.name).join(' + ')}. ${allNodes.length} nodes, ${insights.land_efficiency}% efficiency.`);
  }

  return {
    success: true,
    data: {
      layout: allNodes,
      zones,
      analysis,
      main_crop: mainData.name,
      companion: companions.map((c) => c.name).join(', ') || 'None',
      insights,
      crop_stats: allCrops,
    },
    trace,
  };
}

export { CROP_DB };
