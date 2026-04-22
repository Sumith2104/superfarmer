// src/lib/agents/weather-agent.ts
// WeatherAgent — fetches 3-day forecast and provides agricultural advice using Gemini + rule fallbacks

import { getJsonModel, withTimeout } from '@/lib/gemini';
import { saveMemory } from './context';
import type { AgentContext, AgentResult } from './types';

export interface WeatherData {
  analysis: string;
  total_rain: number;
  peak_temp: number;
  forecast_summary: string;
  suggestion: string;
  source: string;
}

const SYSTEM_INSTRUCTION = `You are an expert Agricultural Weather Analyst advising Indian farmers.
Based on 3-day weather forecast data, provide concise, specific farming action advice.
Respond with valid JSON only. Keep the suggestion practical and actionable (2-3 sentences max).`;

const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  delhi: { lat: 28.7041, lon: 77.1025 },
  mumbai: { lat: 19.076, lon: 72.8777 },
  chennai: { lat: 13.0827, lon: 80.2707 },
  bangalore: { lat: 12.9716, lon: 77.5946 },
  bengaluru: { lat: 12.9716, lon: 77.5946 },
  hyderabad: { lat: 17.385, lon: 78.4867 },
  pune: { lat: 18.5204, lon: 73.8567 },
  indore: { lat: 22.7196, lon: 75.8577 },
  nagpur: { lat: 21.1458, lon: 79.0882 },
  jaipur: { lat: 26.9124, lon: 75.7873 },
  lucknow: { lat: 26.8467, lon: 80.9462 },
  patna: { lat: 25.5941, lon: 85.1376 },
  bhopal: { lat: 23.2599, lon: 77.4126 },
  ahmedabad: { lat: 23.0225, lon: 72.5714 },
  kolkata: { lat: 22.5726, lon: 88.3639 },
  chandigarh: { lat: 30.7333, lon: 76.7794 },
  amritsar: { lat: 31.634, lon: 74.8723 },
  coimbatore: { lat: 11.0168, lon: 76.9558 },
  vijaywada: { lat: 16.5062, lon: 80.648 },
  surat: { lat: 21.1702, lon: 72.8311 },
};

function ruleBasedSuggestion(totalRain: number, maxTemp: number): string {
  if (totalRain > 30) return `Heavy rain (${totalRain.toFixed(1)}mm) expected. If crop is near maturity, **Harvest Early** to prevent waterlogging and rot. Ensure drainage channels are clear.`;
  if (totalRain > 10) return 'Moderate rain expected. **Skip irrigation** for 4–5 days. Watch for fungal disease outbreak in humid conditions.';
  if (maxTemp > 40) return `Extreme heat (${maxTemp.toFixed(0)}°C) expected. Irrigate in the **early morning or evening**. Apply mulch to retain soil moisture.`;
  if (maxTemp > 35) return 'Warm, dry weather. **Irrigate every 4–5 days**. Monitor for spider mites and aphids which thrive in dry heat.';
  return 'Favorable farming weather. **Let crop grow** normally. Good time for field operations like weeding and top dressing.';
}

export async function runWeatherAgent(
  ctx: AgentContext,
  location: string
): Promise<AgentResult<WeatherData>> {
  const trace: string[] = [];
  const { farmerId } = ctx;
  const owmKey = process.env.OPENWEATHER_API_KEY;

  trace.push(`Step 1: Fetching weather data for ${location}...`);

  try {
    let rawData: { forecast: string; rain: number; temp: number; source: string };
    
    // Attempt OpenWeatherMap
    if (owmKey && owmKey !== 'your_openweather_key') {
      try {
        const geoRes = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${owmKey}`);
        const geo = await geoRes.json();
        if (geo.length) {
          const { lat, lon } = geo[0];
          const wxRes = await fetch(`http://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&cnt=24&appid=${owmKey}`);
          const wx = await wxRes.json();
          if (wx.cod === '200' || wx.cod === 200) {
            let totalRain = 0, maxTemp = -100, forecastStr = '';
            const dayMap: Record<string, { maxT: number; rain: number }> = {};
            for (const item of wx.list) {
              const date = item.dt_txt.split(' ')[0];
              if (!dayMap[date]) dayMap[date] = { maxT: item.main.temp_max, rain: 0 };
              if (item.main.temp_max > dayMap[date].maxT) dayMap[date].maxT = item.main.temp_max;
              if (item.rain?.['3h']) dayMap[date].rain += item.rain['3h'];
            }
            const days = Object.entries(dayMap).slice(0, 3);
            for (const [date, d] of days) {
              forecastStr += `${date}: ${d.rain.toFixed(1)}mm rain, ${d.maxT.toFixed(1)}°C max\n`;
              totalRain += d.rain;
              if (d.maxT > maxTemp) maxTemp = d.maxT;
            }
            rawData = { forecast: forecastStr, rain: totalRain, temp: maxTemp, source: 'OpenWeatherMap' };
            trace.push('Step 1 ✓: Weather data fetched from OpenWeatherMap.');
          } else throw new Error('OWM Bad Code');
        } else throw new Error('Geo not found');
      } catch (err) {
        trace.push(`Step 1 !: OpenWeatherMap failed, switching to Open-Meteo...`);
      }
    }

    // Fallback to Open-Meteo
    if (!rawData!) {
      const lc = location.toLowerCase();
      const cityKey = Object.keys(CITY_COORDS).find(k => lc.includes(k));
      const coords = cityKey ? CITY_COORDS[cityKey] : { lat: 22.7196, lon: 75.8577 };
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=precipitation_sum,temperature_2m_max&timezone=auto&forecast_days=3`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.daily) throw new Error('No data from Open-Meteo');
      const precip: number[] = data.daily.precipitation_sum;
      const temps: number[] = data.daily.temperature_2m_max;
      const dates: string[] = data.daily.time;
      let forecastStr = '';
      dates.forEach((d, i) => { forecastStr += `${d}: ${(precip[i] || 0).toFixed(1)}mm rain, ${temps[i].toFixed(1)}°C max\n`; });
      rawData = {
        forecast: forecastStr,
        rain: precip.reduce((a, b) => a + b, 0),
        temp: Math.max(...temps),
        source: 'Open-Meteo'
      };
      trace.push('Step 1 ✓: Weather data fetched from Open-Meteo.');
    }

    trace.push('Step 2: Generating agricultural suggestion via AI...');
    let suggestion = '';
    try {
      const model = getJsonModel(SYSTEM_INSTRUCTION, { temperature: 0.3, maxTokens: 200 });
      const result = await withTimeout(
        model.generateContent(`3-day weather for ${location}:\n${rawData.forecast}\n\nReturn JSON: {"suggestion": "2-3 sentence farming advice"}`),
        8000
      );
      const parsed = JSON.parse(result.response.text());
      suggestion = parsed.suggestion || '';
      trace.push('Step 2 ✓: AI suggestion generated.');
    } catch {
      suggestion = ruleBasedSuggestion(rawData.rain, rawData.temp);
      trace.push('Step 2 !: AI help failed, used rule-based suggestion.');
    }

    const analysis = `**3-Day Forecast for ${location}** (${rawData.source})\n${rawData.forecast}\nTotal Rain: **${rawData.rain.toFixed(1)}mm** | Peak Temp: **${rawData.temp.toFixed(1)}°C**\n\n**🌾 Agent Suggestion:** ${suggestion}`;

    if (farmerId) {
      void saveMemory(farmerId, 'weather', `Weather check for ${location}: ${rawData.temp.toFixed(1)}°C max, ${rawData.rain.toFixed(1)}mm rain. Advice: ${suggestion.slice(0, 100)}...`);
    }

    return {
      success: true,
      data: {
        analysis,
        total_rain: rawData.rain,
        peak_temp: rawData.temp,
        forecast_summary: rawData.forecast,
        suggestion,
        source: rawData.source
      },
      trace
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Weather agent failed';
    trace.push(`Step 1 ✗: ${msg}`);
    return { success: false, error: msg, trace };
  }
}
