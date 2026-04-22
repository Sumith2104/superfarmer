// src/lib/agents/types.ts
// Shared types for the Agentic AI system

export interface FarmerProfile {
  farmer_id: number;
  user_id: number;
  name: string;
  land_size: number;
  location: string;
  water_availability: string;
  farming_goals: string;
}

export interface AgentContext {
  userId?: number;
  farmerId?: number;
  planId?: number;
  farmerProfile?: FarmerProfile;
  conversationHistory: AgentMemory[];
}

/**
 * Represents a structured memory object stored in the session_logs JSON
 */
export interface AgentMemory {
  agent: string;
  summary: string;
  timestamp: string;
}

export interface AgentResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  trace: string[]; // Step-by-step reasoning for transparency
  triggered?: string; // NEW: Name of the agent that was triggered autonomously
}

// New Dashboard Types
export interface DashboardData {
  greeting: string;
  weather_summary: string;
  nutrient_status: {
    level: 'Low' | 'Medium' | 'High' | 'Safe' | 'Warning' | 'Emergency';
    message: string;
  };
  active_plan?: {
    crop: string;
    next_task: string;
    progress: number;
  };
  ai_pulse: string; // Brief internal trace summary for the "command center" feel
}
