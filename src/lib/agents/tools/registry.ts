// src/lib/agents/tools/registry.ts
// Defines all tools available to the Groq Orchestrator in JSON Schema format.
// Groq reads these definitions to decide which tool to call autonomously.

export const FARM_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_farmer_profile',
      description: "Get the current farmer's complete profile: name, location, land size, water availability, and farming goals. Call this first in most conversations to personalize the response.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_crop_plan',
      description: "Get the farmer's current active crop plan including crop name, sowing schedule, irrigation plan, fertilizer schedule, pest alerts, and harvest timeline.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_crop_recommendations',
      description: 'Get AI-powered crop recommendations based on soil type, water availability, season, and farming goal. Call this when the farmer asks what to plant.',
      parameters: {
        type: 'object',
        properties: {
          soil_type: {
            type: 'string',
            description: 'Soil type: Black, Red, Alluvial, Laterite, Sandy, or Clay. Infer from farmer profile if not stated.',
          },
          water_level: {
            type: 'string',
            description: 'Irrigation availability: Low, Medium, or High.',
          },
          season: {
            type: 'string',
            description: 'Current planting season: Kharif, Rabi, or Zaid.',
          },
          goal: {
            type: 'string',
            description: "Farmer's primary goal, e.g. Maximum yield and profit, Drought resistance, Soil health improvement.",
          },
        },
        required: ['soil_type', 'season'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'diagnose_crop_disease',
      description: 'Diagnose a crop disease or pest problem from a text description of visible symptoms. Returns the disease name, confidence, treatment steps, and prevention tips. Call this whenever the farmer describes plant symptoms.',
      parameters: {
        type: 'object',
        properties: {
          symptoms: {
            type: 'string',
            description: 'Detailed description of visible symptoms on the plant (e.g. yellow leaves, brown spots, wilting, etc.)',
          },
          crop_type: {
            type: 'string',
            description: 'The type of crop affected (e.g. Tomato, Wheat, Rice). Use "Unknown" if not specified.',
          },
        },
        required: ['symptoms'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_agent_memory',
      description: "Retrieve the last 5 AI interactions this farmer has had. Use this to understand their recent history, past diagnoses, and what they've been asking about.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_crop_report',
      description: "Generate a comprehensive automated farm advisory report that aggregates all of the farmer's data: crop plan, recommendations, nutrient history, and recent activity. Use when the farmer asks for a full farm report or summary.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_mandi_prices',
      description: "Get today's market (mandi) prices for a specific crop in Indian Rupees per quintal. Use when a farmer asks about crop prices, market rates, or selling value.",
      parameters: {
        type: 'object',
        properties: {
          crop_name: {
            type: 'string',
            description: 'Name of the crop to look up price for (e.g. Wheat, Rice, Tomato, Onion, Cotton).',
          },
        },
        required: ['crop_name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'save_reminder',
      description: "Save a farming reminder or task note for the farmer. Use when the farmer says 'remind me to...' or 'note that...' or 'I need to remember to...'",
      parameters: {
        type: 'object',
        properties: {
          reminder: {
            type: 'string',
            description: 'The reminder text to save (e.g. "Irrigate tomato field on Thursday at 6am")',
          },
        },
        required: ['reminder'],
      },
    },
  },
];

// Tool name type for exhaustive type-checking in executor
export type FarmToolName =
  | 'get_farmer_profile'
  | 'get_crop_plan'
  | 'get_crop_recommendations'
  | 'diagnose_crop_disease'
  | 'get_agent_memory'
  | 'generate_crop_report'
  | 'get_mandi_prices'
  | 'save_reminder';
