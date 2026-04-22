# SuperFarmer — Real Agentic AI Platform
## Detailed Implementation Plan

---

## Goals
1. Functional AI chatbot with streaming steps + voice input/output on every page
2. Top-level memory for every AI action (cross-agent, persistent)
3. Farmer Profile as single source of truth (onboarding gate)
4. Low-literacy-first UI: large icons, voice-first, tap-to-hear
5. **Mobile-first responsive design** — fully usable on a ₹5,000 Android phone

---

## Current State
| Feature | Status |
|---|---|
| SSE streaming chat | ✅ Working |
| ReAct tool loop (Groq) | ✅ Working |
| 15 specialized agents | ✅ Exist |
| Voice input/output | ❌ Missing |
| Farmer Profile page | ❌ Missing |
| Global memory viewer | ❌ Missing |
| Dictation mode | ❌ Missing |
| Icon-first nav | ❌ Missing |

---

## Phase 1 — Farmer Profile (Source of Truth)

### Why First
Every agent reads `farmer_profile`. Without it, agents return empty data. This is the onboarding gate.

### DB Schema
```sql
ALTER TABLE farmer_profile ADD COLUMN IF NOT EXISTS
  preferred_lang VARCHAR(10) DEFAULT 'en',
  economic_class VARCHAR(20),
  photo_url VARCHAR(255),
  profile_pct INT DEFAULT 0;
```

### Files

#### [NEW] `src/app/profile/page.tsx`
Multi-step wizard with voice input on every field:
- Step 1: Name, Phone, Village, District, State
- Step 2: Land size (slider) + Soil type (icon cards: Clay/Loam/Sandy/Black/Red)
- Step 3: Irrigation (icon cards: Drip/Sprinkler/Canal/Rain-fed)
- Step 4: Primary crops (emoji grid — tap to select up to 5)
- Step 5: Language preference (flag + name)
- Progress bar across top, 64px touch targets
- 🎤 mic button on every field
- Save progress after each step

#### [NEW] `src/app/api/profile/route.ts`
```
GET  /api/profile        — fetch profile for logged-in user
POST /api/profile        — create / full update
PATCH /api/profile       — partial field update
```

#### [MODIFY] `src/app/page.tsx`
- Profile completion ring (animated SVG circle)
- "Complete your profile" banner if < 80% done
- Redirect new users → `/profile` on first login
- Mini-chat bar at bottom of dashboard

---

## Phase 2 — Global Voice Assistant

### Architecture
Uses **Web Speech API** (free, built into Chrome/Edge on Android):
- `SpeechRecognition` → voice → text
- `SpeechSynthesis` → text → speech
- Languages: `hi-IN`, `mr-IN`, `te-IN`, `kn-IN`, `ta-IN`, `en-IN`

### Files

#### [NEW] `src/components/VoiceAssistant.tsx`
Floating bottom-right button on every page:

```
States:
  IDLE       🎤  glowing green pulse
  LISTENING  🔴  pulsing red + live transcript text
  SPEAKING   🔊  wave animation while reading
  THINKING   ⟳   sending to AI
```

Behavior:
- Single tap → start listening → auto-stop on 2s silence → send to AI
- Double tap → read current page summary aloud
- Reads AI responses aloud automatically (toggle off-able)
- Context-aware: on Recommendation page says "Your top crop is…"
- Uses farmer's `preferred_lang` from profile

#### [NEW] `src/components/VoiceMicButton.tsx`
Inline reusable mic for form fields:
```tsx
<VoiceMicButton lang="hi-IN" onResult={(text) => setValue(text)} />
```

#### [NEW] `src/lib/voice.ts`
```typescript
export function speak(text: string, lang: string): void
export function startListening(cb: (text: string) => void, lang: string): SpeechRecognition
export function stopListening(sr: SpeechRecognition): void
export function isSpeechSupported(): boolean
export function stripMarkdown(text: string): string  // clean before speaking
```

#### [MODIFY] `src/app/layout.tsx`
Mount `<VoiceAssistant />` globally so it appears on every page.

### Per-Page Voice Context
| Page | Voice reads when double-tapped |
|---|---|
| Dashboard | "Your farm: X acres, crop Y, next task Z" |
| Recommendation | "Top recommendation: grow Wheat this season" |
| Disease | "Tap camera to photograph your crop leaves" |
| Plan | "Your next task: apply fertilizer on day 12" |
| Spatial | "Draw your field using polygon tool on the left" |
| Chat | Reads the last AI message again |

---

## Phase 3 — AI Chat Upgrades

### 3.1 Step Cards
When AI responds with numbered/bulleted steps, auto-generate tap-able cards:
```
AI: "1. Water crops 2. Apply fertilizer 3. Check pH"
→ [📋 Show as Steps]
→ Cards with checkboxes + 🔊 button each
→ Steps saved to task list in DB
```

#### [MODIFY] `src/app/agent-chat/page.tsx`
- `parseSteps(text)` — detect numbered/bullet lists
- Render `<StepCard>` components when steps detected
- `[📋 Generate Steps]` button on every AI response
- `[🔊 Read aloud]` button on every AI response
- Auto-read toggle in header

### 3.2 Dictation Mode
For farmers who cannot type:
- Large "🎤 I can't type" button in chat
- Opens full-screen mic UI with 96px text live transcript
- Auto-sends after 2s silence
- Reads response aloud automatically

### 3.3 Write-For-Me
- `[✍️ Write for me]` button → AI drafts a question based on current page context
- Example: on Recommendation page → "What crop should I plant given my soil and current weather?"

---

## Phase 4 — Top-Level AI Memory

### DB Schema
```sql
CREATE TABLE IF NOT EXISTS agent_memory (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  farmer_id    INT NOT NULL,
  agent        VARCHAR(50) NOT NULL,
  action_type  VARCHAR(50),
  input_text   TEXT,
  output_text  TEXT,
  tools_used   TEXT,            -- JSON array
  metadata     JSON,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_farmer_id (farmer_id),
  INDEX idx_agent (agent),
  INDEX idx_created (created_at)
);
```

### Files

#### [NEW] `src/lib/agents/memory.ts`
```typescript
export async function logAgentAction(p: {
  farmerId: number;
  agent: string;
  actionType: string;
  input: string;
  output: string;
  toolsUsed?: string[];
  metadata?: object;
}): Promise<void>

export async function getMemory(farmerId: number, limit?: number): Promise<MemoryEntry[]>
export async function getMemoryByAgent(farmerId: number, agent: string): Promise<MemoryEntry[]>
export async function deleteMemory(id: number, farmerId: number): Promise<void>
```

#### [MODIFY] All agent files
Add `logAgentAction()` at end of each agent run:
- `recommendation-agent.ts` — log crop recommendations given
- `disease-agent.ts` — log diagnosis + confidence
- `plan-agent.ts` — log plan creation/updates
- `weather-agent.ts` — log weather summary fetched
- `spatial-agent.ts` — log layout generated
- `chat-agent.ts` — already logs, upgrade to new table

#### [NEW] `src/app/memory/page.tsx`
Timeline UI:
```
📅 Today
  🌾 Recommendation Agent  2:34 PM
     Recommended: Wheat + Soybean intercrop
     Tools used: get_farmer_profile, get_weather

  🔬 Disease Agent  11:20 AM
     Diagnosed: Early Blight (85% confidence)
     [🔊 Hear] [🗑️ Delete]

📅 Yesterday
  📋 Plan Agent  6:00 PM
     Created 4-month Kharif season plan
```

#### [NEW] `src/app/api/memory/route.ts`
```
GET    /api/memory           — paginated memory list
GET    /api/memory?agent=X   — filter by agent
DELETE /api/memory/:id       — delete entry
```

#### [MODIFY] `src/app/agent-chat/page.tsx`
- Collapsible memory sidebar (last 5 actions)
- Auto-inject memory summary into each chat context turn

---

## Phase 5 — Agent Hub & UI Overhaul

### 5.1 Agent Hub Page

#### [NEW] `src/app/agents/page.tsx`
```
┌──────────┬──────────┬──────────┐
│ 🌾 Crop  │ 🔬Disease│ 🗺️ Field │
│  AI      │  Agent   │  Twin    │
│  [Run]   │  [Run]   │  [Open]  │
├──────────┼──────────┼──────────┤
│ 📋 Plan  │ 🌤️Weather│ 🧪Nutri  │
│  Agent   │  Agent   │  Agent   │
│  [Run]   │  [Run]   │  [Run]   │
└──────────┴──────────┴──────────┘

⚡ Pipelines:
[🌾 Full Farm Analysis] [🔬 Health Check] [📅 Season Prep]

📡 Live Activity Feed:
• 2s ago — Weather Agent fetched 28°C Pune
• 5m ago — Crop AI suggested Wheat for 3.5 acres
```

### 5.2 Navigation (Low-Literacy)

#### [MODIFY] `src/components/Navigation.tsx`
Replace text nav with icon-first bar:
```
🏠     🌾     🔬     🗺️    📋     🤖     🧠
Home  Crops  Disease Field  Plan   Chat  Memory
```
- 64px tap targets
- Colored active glow
- Voice reads name on tap
- Bottom nav on mobile, left sidebar on desktop

### 5.3 Dashboard Redesign

#### [MODIFY] `src/app/page.tsx`
```
┌─────────────────────────────────┐
│ 🌤️ 28°C Pune — Good for crops  │
├──────────┬──────────┬───────────┤
│ 🌾 3.5ac │ 💧 Drip  │ 📅 Day 45│
│ Wheat    │ Normal   │ of Season │
├──────────┴──────────┴───────────┤
│ ⚡ Today's AI Tasks             │
│ ☐ Apply NPK fertilizer         │
│ ☐ Check soil moisture           │
│ ☐ Spray neem oil Row 3         │
├─────────────────────────────────┤
│ 🤖 [🎤 Ask AI] [📷 Disease?]   │
└─────────────────────────────────┘
```

---

## Phase 6 — Pipelines

#### [NEW] `src/lib/agents/pipelines.ts`
```typescript
export const PIPELINES = {
  full_analysis: {
    name: '🌾 Full Farm Analysis',
    agents: ['weather', 'recommendation', 'nutrient', 'report'],
  },
  health_check: {
    name: '🔬 Crop Health Check',
    agents: ['disease', 'nutrient', 'replanner'],
  },
  season_prep: {
    name: '📅 Season Preparation',
    agents: ['weather', 'recommendation', 'plan'],
  },
}
```

#### [NEW] `src/app/api/pipeline/route.ts`
SSE endpoint — streams each agent's progress:
```
data: {"agent":"weather","status":"running","message":"Fetching forecast..."}
data: {"agent":"weather","status":"done","result":"28°C, good conditions"}
data: {"agent":"recommendation","status":"running",...}
data: {"type":"complete","summary":"..."}
```

---

## Build Order

```
Week 1:  Phase 1 (Farmer Profile)
Week 1:  Phase 2 (Voice Assistant — core component)
Week 2:  Phase 3 (Chat upgrades + dictation)
Week 2:  Phase 4 (Memory system)
Week 3:  Phase 5 (Agent Hub + UI overhaul)
Week 3:  Phase 6 (Pipelines)
```

---

## Key Technical Notes

### Voice (Web Speech API)
- Works offline on Android Chrome — no API cost
- Use `lang` codes: `hi-IN`, `mr-IN`, `te-IN`, `kn-IN`, `ta-IN`
- `SpeechSynthesis.speak()` for output
- `SpeechRecognition.start()` for input
- Strip markdown before speaking (bold, bullets, etc.)

### SSE Streaming (already implemented)
- Chat SSE is working — extend same pattern to pipelines
- Pipeline SSE: each agent emits `agent_start`, `agent_done`, `pipeline_complete`

### Memory Storage
- Write: fire-and-forget (`void logAgentAction(...)`) — never block agent
- Read: cached 15s via existing `dbCache` in `fluxbase.ts`
- Limit: keep last 100 entries per farmer (prune on insert)

### Accessibility / Low-Literacy
- All icons + color coding, no text-only actions
- Touch targets minimum 64×64px on mobile
- Voice confirmation on every save action ("Saved!")
- Error messages spoken aloud, not just shown as text

---

## Phase 7 — Mobile-First Responsive UI

### 7.1 Core Principles
- **Mobile-first CSS**: write for 375px screen, scale up to desktop
- **Bottom navigation** on mobile (thumb-reachable), left sidebar on desktop (≥768px)
- **No horizontal scroll** on any screen width
- **Safe area insets** for notched phones (iPhone, Android)
- **Large touch targets**: minimum 48×48px (Material Design), prefer 64px for key actions
- All cards stacked vertically on mobile, grid on tablet/desktop

### 7.2 Global CSS Changes

#### [MODIFY] `src/app/globals.css`
```css
/* ── Viewport ───────────────────────────── */
html { 
  scroll-behavior: smooth;
  -webkit-text-size-adjust: 100%;
}

/* ── Page container ─────────────────────── */
.page-container {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 1rem;          /* mobile */
}
@media (min-width: 768px) {
  .page-container { padding: 1.5rem 2rem; }
}

/* ── Cards stack on mobile ──────────────── */
.card-grid {
  display: grid;
  grid-template-columns: 1fr;          /* mobile: single column */
  gap: 0.75rem;
}
@media (min-width: 640px) {
  .card-grid { grid-template-columns: 1fr 1fr; }
}
@media (min-width: 1024px) {
  .card-grid { grid-template-columns: 1fr 1fr 1fr; }
}

/* ── Bottom nav safe area ───────────────── */
.bottom-nav {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 100;
}

/* ── Chat page full height on mobile ────── */
.chat-container {
  height: calc(100dvh - 60px - env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
}

/* ── Touch target helper ────────────────── */
.touch-target {
  min-height: 48px;
  min-width: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Floating voice button ──────────────── */
.voice-fab {
  position: fixed;
  bottom: calc(70px + env(safe-area-inset-bottom));
  right: 16px;
  width: 56px; height: 56px;
  border-radius: 50%;
  z-index: 200;
}
```

### 7.3 Navigation — Bottom Bar on Mobile

#### [NEW] `src/components/BottomNav.tsx`
Shown only on screens < 768px:
```
┌──────┬──────┬──────┬──────┬──────┐
│  🏠  │  🌾  │  🤖  │  🔬  │  👤  │
│ Home │Crops │  AI  │Disease│Profile│
└──────┴──────┴──────┴──────┴──────┘
```
- Fixed at bottom, above safe area
- Active tab: green glow + scale-up icon
- Each tab: 48px height, full-width tap zone
- Haptic feedback on tap (vibration API)

#### [MODIFY] `src/app/layout.tsx`
```tsx
// Show BottomNav on mobile, SideNav on desktop
<div className="hidden md:block"><SideNav /></div>
<div className="block md:hidden"><BottomNav /></div>
<main className="pb-16 md:pb-0 md:ml-64">{children}</main>
```

### 7.4 Per-Page Mobile Fixes

#### Dashboard (`/`)
- Stats: 3-column mini-cards → stack to 2 on xs, 3 on sm+
- AI chat bar pinned above bottom nav
- Weather banner: single row on mobile

#### Chat (`/agent-chat`)
- Full `100dvh` height (dynamic viewport for mobile browsers)
- Quick prompts: 2-column grid on mobile (not 3)
- Input bar: always visible above keyboard (use `env(keyboard-inset-height)`)
- Messages: max-width 88% (not 75%) on mobile

#### Spatial Planner (`/spatial-planner`)
- Map: `height: 300px` on mobile, `460px` on desktop
- View tabs: horizontal scroll if overflow
- Controls card: accordion-style collapse on mobile

#### Profile Wizard (`/profile`)
- Full-screen steps (one step = one screen)
- Crop grid: 3 columns on mobile, 5 on desktop
- Back/Next buttons: full width, 56px height

#### File Manager (`/files`)
- Grid view → list view on mobile (easier to tap)
- Upload button: floating action button (FAB) bottom-right

### 7.5 Viewport & PWA Meta

#### [MODIFY] `src/app/layout.tsx`
```tsx
export const metadata = {
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
  themeColor: '#0d1f0e',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent' },
};
```

#### [NEW] `public/manifest.json`
```json
{
  "name": "SuperFarmer AI",
  "short_name": "SuperFarmer",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0d1117",
  "theme_color": "#16a34a",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 7.6 Mobile Typography
```css
/* Scale text down slightly on small screens */
body { font-size: 14px; }
@media (min-width: 640px) { body { font-size: 16px; } }

h1 { font-size: clamp(1.4rem, 5vw, 2rem); }
h2 { font-size: clamp(1.1rem, 4vw, 1.5rem); }
.card { border-radius: 12px; } /* smaller radius on mobile */
```

### 7.7 Testing Breakpoints
| Breakpoint | Target Device |
|---|---|
| 375px | iPhone SE, budget Android |
| 390px | iPhone 14 |
| 412px | Pixel 7, Samsung A-series |
| 768px | iPad, tablet |
| 1024px | Laptop |
| 1280px | Desktop |

Test at 375px first — if it works there, it works everywhere.

---

## Updated Build Order

```
Week 1:  Phase 1 (Farmer Profile) + Phase 7 mobile CSS foundation
Week 1:  Phase 2 (Voice Assistant)
Week 2:  Phase 3 (Chat upgrades) + mobile chat layout
Week 2:  Phase 4 (Memory system)
Week 3:  Phase 5 (Agent Hub + UI overhaul) + BottomNav
Week 3:  Phase 6 (Pipelines) + PWA manifest
```
