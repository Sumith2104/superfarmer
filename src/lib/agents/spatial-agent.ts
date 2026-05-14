import { AgentContext, AgentResult } from './types';
import { dbExecute } from '@/lib/fluxbase';
import { logAgentAction } from './memory';

export interface PlantNode {
  x: number; y: number; type: string; color: string; radius: number;
  row: number; col: number; border?: boolean; zone?: number;
}
export interface ZoneData {
  x: number; y: number; w: number; h: number;
  crop: string; color: string; label: string;
}
export interface CropStat {
  name: string; color: string; emoji: string; spacing: number; height_m: number;
  water: string; nitrogen: string; shade: string;
  profit_score: number; companion_score: number; yield_t_per_acre: number;
}
export interface ZoneYield { crop: string; acres: number; yield_t: number; }
export interface SpatialLayoutData {
  layout: PlantNode[]; zones: ZoneData[];
  analysis: string; main_crop: string; companion: string;
  insights: {
    total_plants: number; interior_plants: number; border_plants: number;
    land_efficiency: number; water_saving_pct: number; yield_boost_pct: number;
    layout_score: number; nitrogen_balance: string; best_combo: string;
    sunlight_note: string; zone_yields: ZoneYield[]; total_yield: number;
    warnings: string[]; action_items: string[];
  };
  crop_stats: CropStat[];
  // Memory fields
  memory_log: string[]; override_crop: string | null; override_reason: string | null;
  prev_crop: string | null; soil_impact: string; layout_mode: string;
}

const CROP_DB: Record<string, CropStat> = {
  'Corn':      { name:'Corn',      color:'#eab308', emoji:'🌽', spacing:60,  height_m:2.5, water:'Medium', nitrogen:'Consumer', shade:'Sensitive', profit_score:7, companion_score:8,  yield_t_per_acre:2.8  },
  'Tomato':    { name:'Tomato',    color:'#ef4444', emoji:'🍅', spacing:50,  height_m:1.2, water:'High',   nitrogen:'Consumer', shade:'Tolerant',  profit_score:9, companion_score:7,  yield_t_per_acre:8.0  },
  'Wheat':     { name:'Wheat',     color:'#fcd34d', emoji:'🌾', spacing:20,  height_m:1.0, water:'Low',    nitrogen:'Consumer', shade:'Sensitive', profit_score:6, companion_score:6,  yield_t_per_acre:1.6  },
  'Rice':      { name:'Rice',      color:'#34d399', emoji:'🌾', spacing:25,  height_m:1.2, water:'High',   nitrogen:'Consumer', shade:'Tolerant',  profit_score:7, companion_score:5,  yield_t_per_acre:2.2  },
  'Sugarcane': { name:'Sugarcane', color:'#84cc16', emoji:'🎋', spacing:90,  height_m:3.5, water:'High',   nitrogen:'Consumer', shade:'Sensitive', profit_score:8, companion_score:5,  yield_t_per_acre:35.0 },
  'Cotton':    { name:'Cotton',    color:'#f9fafb', emoji:'🪴', spacing:75,  height_m:1.5, water:'Medium', nitrogen:'Consumer', shade:'Sensitive', profit_score:7, companion_score:6,  yield_t_per_acre:0.5  },
  'Soybean':   { name:'Soybean',   color:'#a3e635', emoji:'🫘', spacing:30,  height_m:0.8, water:'Low',    nitrogen:'Fixer',    shade:'Tolerant',  profit_score:7, companion_score:9,  yield_t_per_acre:0.9  },
  'Maize':     { name:'Maize',     color:'#facc15', emoji:'🌽', spacing:65,  height_m:2.0, water:'Medium', nitrogen:'Consumer', shade:'Sensitive', profit_score:7, companion_score:7,  yield_t_per_acre:3.2  },
  'Onion':     { name:'Onion',     color:'#c084fc', emoji:'🧅', spacing:15,  height_m:0.5, water:'Medium', nitrogen:'Neutral',  shade:'Tolerant',  profit_score:8, companion_score:9,  yield_t_per_acre:6.0  },
  'Garlic':    { name:'Garlic',    color:'#e2e8f0', emoji:'🧄', spacing:12,  height_m:0.4, water:'Low',    nitrogen:'Neutral',  shade:'Tolerant',  profit_score:9, companion_score:9,  yield_t_per_acre:4.5  },
  'Marigold':  { name:'Marigold',  color:'#f97316', emoji:'🌼', spacing:20,  height_m:0.6, water:'Low',    nitrogen:'Neutral',  shade:'Tolerant',  profit_score:5, companion_score:10, yield_t_per_acre:1.2  },
  'Groundnut': { name:'Groundnut', color:'#d97706', emoji:'🥜', spacing:30,  height_m:0.5, water:'Low',    nitrogen:'Fixer',    shade:'Tolerant',  profit_score:8, companion_score:9,  yield_t_per_acre:1.0  },
  'Mustard':   { name:'Mustard',   color:'#fef08a', emoji:'🌿', spacing:20,  height_m:1.2, water:'Low',    nitrogen:'Neutral',  shade:'Sensitive', profit_score:7, companion_score:7,  yield_t_per_acre:0.7  },
  'Chickpea':  { name:'Chickpea',  color:'#fde68a', emoji:'🫘', spacing:25,  height_m:0.6, water:'Low',    nitrogen:'Fixer',    shade:'Tolerant',  profit_score:8, companion_score:9,  yield_t_per_acre:0.8  },
  'Potato':    { name:'Potato',    color:'#a78bfa', emoji:'🥔', spacing:35,  height_m:0.6, water:'Medium', nitrogen:'Consumer', shade:'Tolerant',  profit_score:8, companion_score:7,  yield_t_per_acre:8.0  },
  'Sunflower': { name:'Sunflower', color:'#fbbf24', emoji:'🌻', spacing:45,  height_m:2.0, water:'Low',    nitrogen:'Neutral',  shade:'Sensitive', profit_score:7, companion_score:7,  yield_t_per_acre:0.5  },
};

const COMPANION_MATRIX: Record<string, string[]> = {
  'Corn':      ['Soybean','Groundnut','Marigold'],
  'Tomato':    ['Marigold','Onion','Garlic'],
  'Wheat':     ['Chickpea','Mustard','Soybean'],
  'Rice':      ['Groundnut','Sunflower'],
  'Cotton':    ['Marigold','Soybean','Groundnut','Onion'],
  'Sugarcane': ['Soybean','Groundnut','Garlic','Onion'],
  'Potato':    ['Marigold','Garlic','Corn'],
  'Onion':     ['Tomato','Corn','Marigold','Garlic'],
  'Maize':     ['Soybean','Groundnut','Marigold'],
  'Garlic':    ['Marigold','Onion','Tomato'],
  'Mustard':   ['Chickpea','Soybean','Wheat'],
  'Chickpea':  ['Mustard','Soybean','Wheat'],
  'Sunflower': ['Maize','Groundnut','Soybean'],
  'Groundnut': ['Corn','Maize','Soybean','Sunflower'],
  'Soybean':   ['Corn','Maize','Groundnut','Sunflower'],
};

const N_FIXERS = new Set(['Chickpea','Soybean','Groundnut']);
const HIGH_WATER = new Set(['Rice','Sugarcane','Tomato']);
const DRY_FALLBACKS = ['Wheat','Chickpea','Groundnut','Mustard','Soybean'];

function hexLayout(crop: CropStat, zone: { x:number;y:number;w:number;h:number }, zoneIdx=0): PlantNode[] {
  const nodes: PlantNode[] = [];
  const sp = crop.spacing;
  let row = 0;
  for (let y = zone.y + sp*0.5; y < zone.y+zone.h-sp*0.4; y += Math.floor(sp*0.866)) {
    const xShift = (row%2)*(sp/2);
    let col = 0;
    for (let x = zone.x+xShift+sp*0.5; x < zone.x+zone.w-sp*0.4; x += sp) {
      nodes.push({ x: Math.round(x,), y: Math.round(y), type: crop.name, color: crop.color, radius: Math.max(4, sp*0.32), row, col, zone: zoneIdx });
      col++;
    }
    row++;
  }
  return nodes;
}

async function fetchFarmerMemory(farmerId: number) {
  const mem = { prevCrop: null as string|null, nitrogenLevel:'Medium', waterFarm:'Medium', landSize:1.0 };
  try {
    const profile = await dbExecute('SELECT water_availability, land_size FROM farmer_profile WHERE farmer_id=? LIMIT 1', [farmerId]);
    if (profile[0]) {
      mem.waterFarm = String(profile[0].water_availability || 'Medium').trim();
      mem.landSize = parseFloat(String(profile[0].land_size || '1')) || 1;
    }
    const plans = await dbExecute('SELECT crop_name FROM crop_plans WHERE farmer_id=? ORDER BY created_at DESC LIMIT 1', [farmerId]);
    if (plans[0]) mem.prevCrop = String(plans[0].crop_name || '').trim();
    const recs = await dbExecute('SELECT recommended_crops FROM crop_recommendations WHERE farmer_id=? ORDER BY created_at DESC LIMIT 1', [farmerId]);
    if (recs[0]) {
      const r = String(recs[0].recommended_crops || '').toLowerCase();
      if (['chickpea','soybean','groundnut','lentil'].some(n=>r.includes(n))) mem.nitrogenLevel='Low';
      else if (['sugarcane','rice','cotton'].some(n=>r.includes(n))) mem.nitrogenLevel='High';
    }
  } catch { /* graceful skip */ }
  return mem;
}

function runDecisionRules(cropKey: string, mem: Awaited<ReturnType<typeof fetchFarmerMemory>>) {
  let finalCrop = cropKey;
  let companionOverride: string|null = null;
  const memLog: string[] = [];
  const warnings: string[] = [];
  let soilImpact = 'neutral';
  let overrideCrop: string|null = null;
  let overrideReason: string|null = null;

  memLog.push(`✅ Step 1: Previous season crop: '${mem.prevCrop || 'None (first season)'}'.`);
  memLog.push(`✅ Step 2: Soil nitrogen inferred as '${mem.nitrogenLevel}' from crop history.`);
  memLog.push(`✅ Step 3: Farm water: '${mem.waterFarm}'. Crop '${cropKey}' needs '${CROP_DB[cropKey]?.water || 'Medium'}'.`);

  // Rotation rule
  if (mem.prevCrop && mem.prevCrop.toLowerCase() === cropKey.toLowerCase()) {
    warnings.push(`⚠️ Crop Rotation: '${mem.prevCrop}' was grown last season. Repeating depletes soil.`);
    const fixers = (COMPANION_MATRIX[cropKey]||[]).filter(c=>N_FIXERS.has(c));
    companionOverride = fixers.length ? fixers.sort((a,b)=>(CROP_DB[b]?.companion_score||0)-(CROP_DB[a]?.companion_score||0))[0] : 'Chickpea';
    memLog.push(`⚠️ Step 4 (Rotation): Companion forced to '${companionOverride}' (N-fixer) to restore soil.`);
  }

  // Nitrogen rule
  if (mem.nitrogenLevel === 'Low' && !N_FIXERS.has(companionOverride||'')) {
    const fixers = (COMPANION_MATRIX[finalCrop]||[]).filter(c=>N_FIXERS.has(c));
    companionOverride = fixers.length ? fixers[0] : 'Chickpea';
    memLog.push(`✅ Step 5 (Nitrogen): Soil N is Low → companion '${companionOverride}' to fix nitrogen.`);
    soilImpact = 'improves';
  }

  // Water mismatch rule
  if (mem.waterFarm === 'Low' && HIGH_WATER.has(cropKey)) {
    const alt = DRY_FALLBACKS.find(c=>c in CROP_DB && c !== cropKey) || 'Wheat';
    overrideReason = `Farm water is Low but '${cropKey}' needs High water. Switched to '${alt}'.`;
    warnings.push(`⚠️ Water Mismatch: ${overrideReason}`);
    memLog.push(`⚠️ Step 6 (Water): ${overrideReason}`);
    finalCrop = alt; overrideCrop = alt; companionOverride = null;
  }

  // Soil impact
  if (soilImpact === 'neutral') {
    const fd = CROP_DB[finalCrop]; const cd = CROP_DB[companionOverride||''];
    if (fd?.nitrogen==='Fixer' || cd?.nitrogen==='Fixer' || N_FIXERS.has(companionOverride||'')) soilImpact='improves';
    else if (fd?.nitrogen==='Consumer') soilImpact='degrades';
  }

  memLog.push(`✅ Step 7 (Output): Crop='${finalCrop}', Companion='${companionOverride||'auto'}', Soil='${soilImpact}'.`);
  return { finalCrop, companionOverride, memLog, warnings, soilImpact, overrideCrop, overrideReason };
}

export async function runSpatialAgent(
  ctx: AgentContext,
  input: { width:number; height:number; main_crop:string; companion_crops?:string[]; land_size?:number; layout_mode?:string }
): Promise<AgentResult<SpatialLayoutData>> {
  const { farmerId } = ctx;
  const W = input.width || 1000, H = input.height || 440;
  const landSize = input.land_size || 1;

  // Normalize crop key
  const aliases: Record<string,string> = { tomatoes:'Tomato',tomato:'Tomato',corn:'Corn',maize:'Maize',wheat:'Wheat',rice:'Rice',sugarcane:'Sugarcane',cotton:'Cotton',soybean:'Soybean',soybeans:'Soybean',onion:'Onion',onions:'Onion',garlic:'Garlic',potato:'Potato',potatoes:'Potato',sunflower:'Sunflower',mustard:'Mustard',chickpea:'Chickpea',groundnut:'Groundnut',peanut:'Groundnut',marigold:'Marigold' };
  const rawCrop = (input.main_crop||'').trim();
  const requestedKey = aliases[rawCrop.toLowerCase()] || (rawCrop in CROP_DB ? rawCrop : 'Corn');

  // Memory + decision
  const mem = farmerId ? await fetchFarmerMemory(farmerId) : { prevCrop:null, nitrogenLevel:'Medium', waterFarm:'Medium', landSize:1 };
  const decision = runDecisionRules(requestedKey, mem);
  const mainKey = decision.finalCrop;
  const mainData = CROP_DB[mainKey];

  // Companion selection
  const companions = (COMPANION_MATRIX[mainKey]||[]).filter(c=>c in CROP_DB);
  let companionKey = decision.companionOverride || (companions.length ? companions.sort((a,b)=>(CROP_DB[b].companion_score||0)-(CROP_DB[a].companion_score||0))[0] : 'Marigold');
  if (!(companionKey in CROP_DB)) companionKey = 'Marigold';
  const companionData = CROP_DB[companionKey];

  // Layout mode
  const mode = (input.layout_mode || 'Strip').toLowerCase();
  let zones: ZoneData[] = [];
  let cropOrder = [mainData, companionData];

  // Sunlight orientation: taller crop → first zone (north/west)
  const sunlightSwapped = companionData.height_m > mainData.height_m;
  if (sunlightSwapped) cropOrder = [companionData, mainData];
  const sunlightNote = sunlightSwapped
    ? `${companionData.name} (${companionData.height_m}m) placed North/West — prevents shading ${mainData.name}.`
    : `${mainData.name} placed in primary zone. Monitor shading if companion is taller.`;

  if (mode === 'row') {
    const totalW = (1/mainData.spacing)+(1/companionData.spacing);
    const hMain = Math.floor(H*(1/mainData.spacing)/totalW);
    zones = [
      { x:0,y:0,    w:W,h:hMain,   crop:cropOrder[0].name, color:cropOrder[0].color, label:`Zone 1 – ${cropOrder[0].name} (Row)` },
      { x:0,y:hMain,w:W,h:H-hMain, crop:cropOrder[1].name, color:cropOrder[1].color, label:`Zone 2 – ${cropOrder[1].name} (Row)` },
    ];
  } else if (mode === 'grid') {
    zones = [
      { x:0,y:0,w:W,h:H, crop:mainData.name,      color:mainData.color,      label:`Zone 1 – ${mainData.name} (Grid)` },
      { x:0,y:0,w:W,h:H, crop:companionData.name,  color:companionData.color, label:`Zone 2 – ${companionData.name} (Grid)` },
    ];
  } else {
    // Strip (default/auto)
    const totalW = (1/cropOrder[0].spacing)+(1/cropOrder[1].spacing);
    const wMain = Math.floor(W*(1/cropOrder[0].spacing)/totalW);
    zones = [
      { x:0,    y:0,w:wMain,  h:H, crop:cropOrder[0].name, color:cropOrder[0].color, label:`Zone 1 – ${cropOrder[0].name} (Strip)` },
      { x:wMain,y:0,w:W-wMain,h:H, crop:cropOrder[1].name, color:cropOrder[1].color, label:`Zone 2 – ${cropOrder[1].name} (Strip)` },
    ];
  }

  // Generate interior nodes
  let interiorNodes: PlantNode[] = [];
  if (mode === 'grid') {
    let row = 0;
    for (let y = mainData.spacing*0.5; y < H-mainData.spacing*0.4; y += Math.floor(mainData.spacing*0.866)) {
      const curCrop = row%2===0 ? mainData : companionData;
      const sp = curCrop.spacing;
      let col=0;
      for (let x = (row%2)*(sp/2)+sp*0.5; x < W-sp*0.4; x+=sp) {
        interiorNodes.push({ x:Math.round(x), y:Math.round(y), type:curCrop.name, color:curCrop.color, radius:Math.max(4,sp*0.32), row, col, zone: row%2===0?1:2 });
        col++;
      }
      row++;
    }
  } else {
    cropOrder.forEach((crop, i) => interiorNodes.push(...hexLayout(crop, zones[i], i+1)));
  }

  // Marigold border ring
  const borderNodes: PlantNode[] = [];
  if (mainKey !== 'Marigold' && companionKey !== 'Marigold') {
    const bd = CROP_DB['Marigold'], bsp = bd.spacing, M = 8;
    for (let x=bsp*0.5; x<W; x+=bsp) {
      borderNodes.push({ x:Math.round(x),y:M,       type:'Marigold',color:bd.color,radius:Math.max(4,bsp*0.3),row:-1,col:-1,border:true,zone:0 });
      borderNodes.push({ x:Math.round(x),y:H-M,     type:'Marigold',color:bd.color,radius:Math.max(4,bsp*0.3),row:-1,col:-1,border:true,zone:0 });
    }
    for (let y=bsp; y<H-M; y+=bsp) {
      borderNodes.push({ x:M,    y:Math.round(y), type:'Marigold',color:bd.color,radius:Math.max(4,bsp*0.3),row:-1,col:-1,border:true,zone:0 });
      borderNodes.push({ x:W-M, y:Math.round(y), type:'Marigold',color:bd.color,radius:Math.max(4,bsp*0.3),row:-1,col:-1,border:true,zone:0 });
    }
  }

  const fullLayout = [...borderNodes, ...interiorNodes];

  // Insights
  const allCrops = [mainData, companionData];
  const fixerCount = allCrops.filter(c=>c.nitrogen==='Fixer').length;
  const nitrogenBalance = fixerCount>0 ? `${fixerCount} nitrogen-fixing crop(s) present — fertilizer not needed` : 'No N-fixer — add a legume or apply 40kg/acre urea';
  const avgW: Record<string,number> = { Low:1,Medium:2,High:3 };
  const waterEfficiency = Math.max(0, Math.round((1 - allCrops.reduce((s,c)=>s+avgW[c.water],0)/(allCrops.length*3))*30));
  const compScore = companionData.companion_score;
  const landEff = Math.min(95, 70 + compScore*2 + (fixerCount>0?8:0) + (borderNodes.length>0?5:0));
  const yieldBoost = Math.min(40, compScore*3 + (fixerCount>0?8:0));

  // Zone yields
  const zoneYields: ZoneYield[] = cropOrder.map((crop,i)=>{
    const acres = mode==='grid' ? landSize*0.5 : mode==='row'
      ? (zones[i].h/H)*landSize : (zones[i].w/W)*landSize;
    return { crop:crop.name, acres:Math.round(acres*100)/100, yield_t:Math.round(crop.yield_t_per_acre*acres*100)/100 };
  });
  if (borderNodes.length) {
    const borderYield = Math.round(CROP_DB['Marigold'].yield_t_per_acre*0.05*100)/100;
    zoneYields.push({ crop:'Marigold (border)', acres:0.05, yield_t:borderYield });
  }
  const totalYield = Math.round(zoneYields.reduce((s,z)=>s+z.yield_t,0)*100)/100;

  const warnings = [...decision.warnings];
  if (allCrops.some(c=>c.water==='High') && allCrops.some(c=>c.water==='Low'))
    warnings.push('⚠️ Mixed water needs — use zone-specific drip irrigation.');
  if (mainData.shade==='Sensitive' && companionData.height_m>mainData.height_m)
    warnings.push(`⚠️ ${mainData.name} is shade-sensitive — keep ${companionData.name} on north side.`);

  // Layout quality score
  const scoreCompanion = Math.min(50, compScore*5);
  const scoreNitrogen  = fixerCount>0 ? 20 : 0;
  const scoreWater     = warnings.some(w=>w.includes('water'))? 5 : 15;
  const scoreBorder    = borderNodes.length>0 ? 15 : 0;
  const layoutScore    = Math.min(100, scoreCompanion+scoreNitrogen+scoreWater+scoreBorder);

  const analysis = `**Spatial Twin Generated** — ${interiorNodes.length} interior plants + ${borderNodes.length} border Marigolds across a **${mode.charAt(0).toUpperCase()+mode.slice(1)} layout**.\n\n**Primary:** ${mainData.name} (${mainData.spacing}cm spacing, ${mainData.height_m}m) paired with **${companionData.name}** (${companionData.spacing}cm).\n\n**Sunlight:** ${sunlightNote}\n\nLand efficiency **${landEff}%** · Yield boost **${yieldBoost}%** · Layout score **${layoutScore}/100** · Est. yield **${totalYield}t**.`;

  // Persist to DB
  if (farmerId) {
    void dbExecute(
      'CREATE TABLE IF NOT EXISTS spatial_twin_log (log_id INT AUTO_INCREMENT PRIMARY KEY, farmer_id INT, main_crop VARCHAR(64), companion_crop VARCHAR(64), layout_mode VARCHAR(32), land_size_acres FLOAT, total_yield_t FLOAT, layout_score INT, soil_impact VARCHAR(16), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
      []
    ).catch(()=>{});
    void dbExecute(
      'INSERT INTO spatial_twin_log (farmer_id,main_crop,companion_crop,layout_mode,land_size_acres,total_yield_t,layout_score,soil_impact) VALUES (?,?,?,?,?,?,?,?)',
      [farmerId, mainData.name, companionData.name, mode, landSize, totalYield, layoutScore, decision.soilImpact]
    ).catch(()=>{});
    
    void logAgentAction({
      farmerId,
      agent: 'spatial',
      actionType: 'spatial_twin',
      input: `Crop: ${mainData.name} | Companion: ${companionData.name} | Mode: ${mode} | Land: ${landSize}ac`,
      output: `Score: ${layoutScore}. Yield: ${totalYield}t. ${interiorNodes.length} plants + ${borderNodes.length} borders.`,
      toolsUsed: ['hex-layout-engine', 'rules-engine'],
      metadata: { layout_mode: mode, layout_score: layoutScore, total_yield: totalYield, land_efficiency: landEff, yield_boost: yieldBoost },
    });
  }

  return {
    success: true,
    data: {
      layout: fullLayout, zones,
      analysis, main_crop: mainData.name, companion: companionData.name,
      insights: {
        total_plants: fullLayout.length, interior_plants: interiorNodes.length, border_plants: borderNodes.length,
        land_efficiency: landEff, water_saving_pct: waterEfficiency, yield_boost_pct: yieldBoost,
        layout_score: layoutScore, nitrogen_balance: nitrogenBalance,
        best_combo: (COMPANION_MATRIX[mainKey]||[]).slice(0,3).join(', ') || 'Marigold, Legumes',
        sunlight_note: sunlightNote, zone_yields: zoneYields, total_yield: totalYield,
        warnings, action_items: [
          `🌱 Plant ${mainData.name} with ${mainData.spacing}cm spacing in Zone 1`,
          `🌿 Intercrop ${companionData.name} in Zone 2 (${companionData.spacing}cm)`,
          borderNodes.length ? '🌼 Marigold border active — natural pest repellent' : 'Consider adding Marigold border',
          `💧 Irrigation: ${mainData.water} for ${mainData.name}, ${companionData.water} for ${companionData.name}`,
          `🔬 ${nitrogenBalance}`,
          `📦 Est. yield: ${totalYield}t from ${landSize} acre(s)`,
        ],
      },
      crop_stats: allCrops,
      memory_log: decision.memLog,
      override_crop: decision.overrideCrop,
      override_reason: decision.overrideReason,
      prev_crop: mem.prevCrop,
      soil_impact: decision.soilImpact,
      layout_mode: mode,
    },
    trace: decision.memLog,
  };
}

export { CROP_DB };
