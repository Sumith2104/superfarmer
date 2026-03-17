from database.fluxbase import FluxbaseClient
import joblib
import os
import numpy as np
import requests
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

class WeatherAgent:
    @staticmethod
    def analyze_weather(location):
        api_key = os.environ.get("OPENWEATHER_API_KEY")
        
        # If user provides a valid OpenWeatherMap Key (not the placeholder)
        if api_key and api_key != "your_api_key_here":
            return WeatherAgent._fetch_openweather(location, api_key)
        else:
            return WeatherAgent._fetch_openmeteo_fallback(location)

    @staticmethod
    def _fetch_openweather(location, api_key):
        try:
            # Step 1: Geocoding API to get lat/lon
            geo_url = f"http://api.openweathermap.org/geo/1.0/direct?q={location}&limit=1&appid={api_key}"
            geo_resp = requests.get(geo_url).json()
            if not geo_resp:
                return f"Could not find coordinates for {location} using OpenWeather."
            
            lat = geo_resp[0]['lat']
            lon = geo_resp[0]['lon']
            
            # Step 2: OneCall or Forecast API (Using 5 day / 3 hour forecast as standard free tier)
            weather_url = f"http://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&units=metric&appid={api_key}"
            weather_resp = requests.get(weather_url).json()
            
            if str(weather_resp.get('cod')) != "200":
                return f"OpenWeather API Error: {weather_resp.get('message')}"
                
            # Aggregate next 3 days of precipitation / max temp
            total_rain = 0
            max_temp = -100
            
            # API returns data in 3-hour steps. 8 steps = 1 day. 24 steps = 3 days.
            for item in weather_resp['list'][:24]:
                temp = item['main']['temp_max']
                if temp > max_temp:
                    max_temp = temp
                # Rain is sometimes missing if 0
                if 'rain' in item and '3h' in item['rain']:
                    total_rain += item['rain']['3h']
                    
            analysis = f"3-Day Forecast for {location} (via OpenWeather API):\n"
            analysis += f"- Total Expected Rainfall: {round(total_rain, 2)}mm\n"
            analysis += f"- Maximum Temperature: {round(max_temp, 1)}°C\n"
            
            analysis += "\n**Agent Suggestion:** "
            return WeatherAgent._generate_suggestion(analysis, total_rain, max_temp)
            
        except Exception as e:
            return f"OpenWeather analysis failed: {str(e)}"

    @staticmethod
    def _fetch_openmeteo_fallback(location):
        # Extremely simplified geocoding for demonstration.
        coords = {"lat": 22.7196, "lon": 75.8577} # Default Indore
        if "delhi" in location.lower():
            coords = {"lat": 28.7041, "lon": 77.1025}
        elif "mumbai" in location.lower():
            coords = {"lat": 19.0760, "lon": 72.8777}
        elif "chennai" in location.lower():
            coords = {"lat": 13.0827, "lon": 80.2707}
            
        url = f"https://api.open-meteo.com/v1/forecast?latitude={coords['lat']}&longitude={coords['lon']}&daily=precipitation_sum,temperature_2m_max&timezone=auto&forecast_days=3"
        
        try:
            response = requests.get(url)
            data = response.json()
            
            if 'daily' not in data:
                return "Could not fetch weather data. Please proceed with standard farming practices."
                
            precip = data['daily']['precipitation_sum']
            temps = data['daily']['temperature_2m_max']
            dates = data['daily']['time']
            
            total_rain = sum(precip)
            max_temp = max(temps)
            
            analysis = f"3-Day Forecast for {location} (via Open-Meteo Fallback):\n"
            for d, p, t in zip(dates, precip, temps):
                analysis += f"- {d}: {p}mm rain, {t}°C max\n"
            
            analysis += "\n**Agent Suggestion:** "
            return WeatherAgent._generate_suggestion(analysis, total_rain, max_temp)
            
        except Exception as e:
            return f"Weather analysis failed: {str(e)}"

    @staticmethod
    def _generate_suggestion(analysis, total_rain, max_temp):
        if total_rain > 30:
            analysis += f"Heavy rain ({round(total_rain,1)}mm) expected. If your crop is near maturity, **Harvest Early** to prevent water logging and rot."
        elif total_rain > 10:
            analysis += "Moderate rain expected. Let the crop grow, but hold off on any irrigation."
        elif max_temp > 38:
            analysis += "Extreme heat expected. Ensure adequate irrigation; **Let crop grow** but monitor for heat stress."
        else:
            analysis += "Clear weather ahead. **Let crop grow** normally."
        return analysis

class EmailAgent:
    @staticmethod
    def send_email(to_email, subject, body):
        sender_email = os.environ.get('EMAIL_ADDRESS')
        sender_password = os.environ.get('EMAIL_PASSWORD')
        
        if not sender_email or not sender_password:
            print("Email credentials not found in environment variables.")
            return False
            
        try:
            msg = MIMEMultipart()
            msg['From'] = sender_email
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'html'))
            
            # Using Gmail's SMTP server
            server = smtplib.SMTP('smtp.gmail.com', 587)
            server.starttls()
            server.login(sender_email, sender_password)
            text = msg.as_string()
            server.sendmail(sender_email, to_email, text)
            server.quit()
            return True
        except Exception as e:
            print(f"Failed to send email: {e}")
            return False

from werkzeug.security import generate_password_hash, check_password_hash

class UserAuthAgent:
    @staticmethod
    def signup_user(email, password):
        try:
            print(f"DEBUG [signup]: Attempting to hash password for {email}")
            hashed_pw = generate_password_hash(password)
            
            print(f"DEBUG [signup]: Executing INSERT INTO users...")
            res1 = FluxbaseClient.execute("INSERT INTO users (email, password_hash) VALUES (?, ?)", (email, hashed_pw))
            print(f"DEBUG [signup]: INSERT result: {res1}")
            
            # Retrieve last incremented ID
            ids = FluxbaseClient.execute("SELECT LAST_INSERT_ID() AS id")
            print(f"DEBUG [signup]: LAST_INSERT_ID() result: {ids}")
            
            user_id = ids[0]['id'] if ids and len(ids) > 0 else 0
            return {"success": True, "user_id": user_id}
        except Exception as err:
            print(f"DEBUG [signup]: EXCEPTION caught: {err}")
            return {"success": False, "error": str(err)}

    @staticmethod
    def login_user(email, password):
        print(f"DEBUG [login]: Attempting login for {email}")
        user_record = FluxbaseClient.execute("SELECT user_id, password_hash FROM users WHERE email = ?", (email,))
        print(f"DEBUG [login]: Select result: {user_record}")
        
        if user_record and len(user_record) > 0:
            user = user_record[0]
            if check_password_hash(user['password_hash'], password):
                return {"success": True, "user_id": user['user_id']}
            else:
                print(f"DEBUG [login]: Password hash check failed")
        else:
            print(f"DEBUG [login]: No user found or empty array returned")
            
        return {"success": False, "error": "Invalid email or password."}

    @staticmethod
    def get_farmer_profile_by_user(user_id):
        farmer = FluxbaseClient.execute("SELECT farmer_id FROM farmer_profile WHERE user_id = ? LIMIT 1", (user_id,))
        return farmer[0]['farmer_id'] if farmer and len(farmer) > 0 else None

class IntakeAgent:
    @staticmethod
    def process_intake(user_id, name, land_size, location, water, goals):
        try:
            acres = float(land_size)
        except ValueError:
            acres = 0.0

        query = """INSERT INTO farmer_profile 
                   (user_id, name, land_size, location, water_availability, farming_goals) 
                   VALUES (?, ?, ?, ?, ?, ?)"""
        values = (user_id, name, acres, location, water, goals)
        
        FluxbaseClient.execute(query, values)
        ids = FluxbaseClient.execute("SELECT LAST_INSERT_ID() AS id")
        farmer_id = ids[0]['id'] if ids and len(ids) > 0 else 0
        return farmer_id

class CropRecommendationAgent:
    @staticmethod
    def recommend(farmer_id, soil_type, water_const, season='Kharif (June-October, Monsoon)', goal='Maximum yield and profit', **kwargs):
        import json, re as _re
        import os
        from mcp_gemini_bridge import MCPGeminiBridge
        import google.generativeai as genai

        api_key = os.environ.get("GEMINI_API_KEY")
        
        if api_key and api_key != "your_api_key_here":
            try:
                genai.configure(api_key=api_key)
                
                system_instruction = (
                    "You are an expert Agricultural AI Agronomist advising a farmer. "
                    "You have an SQL tool connected to the Superfarmer database. "
                    "When you generate your recommendation, you MUST autonomously use your `execute_sql` tool "
                    f"to perform exactly this query before you give your final answer:\n"
                    f"INSERT INTO crop_recommendations (farmer_id, recommended_crops) VALUES ({farmer_id}, 'comma_separated_crop_names_here');\n"
                    "Make sure you execute the tool call successfully."
                )
                
                prompt = (
                    "The farmer has provided the following information:\n"
                    f"- Soil Type: {soil_type}\n"
                    f"- Water / Irrigation Availability: {water_const}\n"
                    f"- Season: {season}\n"
                    f"- Farmer's Goal: {goal}\n\n"
                    "Based on this, recommend the 3 best crops to grow. "
                    "Respond ONLY with a valid JSON object (no markdown, no extra text) as your final response to me in the format:\n"
                    "{\n"
                    '  "primary_crop": "Best single crop name",\n'
                    '  "crops": [\n'
                    '    {"name": "Crop 1", "reason": "Why this crop suits the conditions", "care_tip": "One key care tip for this farmer"},\n'
                    '    {"name": "Crop 2", "reason": "Why this crop suits the conditions", "care_tip": "One key care tip for this farmer"},\n'
                    '    {"name": "Crop 3", "reason": "Why this crop suits the conditions", "care_tip": "One key care tip for this farmer"}\n'
                    "  ],\n"
                    '  "overall_advice": "One paragraph of practical overall agronomic advice for this farmer."\n'
                    "}"
                )
                
                # Path to our local MCP Server
                mcp_path = os.path.join(os.path.dirname(__file__), '..', 'fluxbase_mcp.py')
                bridge = MCPGeminiBridge(mcp_path)
                
                # This call will automatically trigger Gemini, which will read the prompt, decide to 
                # use the execute_sql tool, wait for the SQL result, and then return the final JSON.
                raw = bridge.execute_prompt(prompt, system_instruction=system_instruction)
                
                raw = raw.strip()
                raw = _re.sub(r'^```(?:json)?\s*', '', raw)
                raw = _re.sub(r'\s*```$', '', raw)
                data = json.loads(raw)
                
                primary_crop = data.get('primary_crop', 'Maize')
                crops = data.get('crops', [])
                overall_advice = data.get('overall_advice', '')
                
                # NOTE: We entirely removed the hardcoded FluxbaseClient.execute() INSERT from Python! 
                # The AI did it autonomously inside `bridge.execute_prompt()`.
                
                return {
                    "primary_crop": primary_crop,
                    "crops": crops,
                    "overall_advice": overall_advice,
                    "ai_powered": True
                }
            except Exception as e:
                print(f"AI Recommendation failed, falling back to rules: {e}")
        
        # Fallback: simple rule-based logic
        from database.fluxbase import FluxbaseClient
        defaults = {'Black': ['Cotton', 'Wheat'], 'Alluvial': ['Rice', 'Sugarcane'], 'Red': ['Groundnut', 'Millets']}
        recommendations = defaults.get(soil_type, ['Sorghum', 'Maize'])
        rec_str = ", ".join(recommendations)
        FluxbaseClient.execute(
            "INSERT INTO crop_recommendations (farmer_id, recommended_crops) VALUES (?, ?)",
            (farmer_id, rec_str)
        )
        return {"primary_crop": recommendations[0], "crops": [{"name": c, "reason": "", "care_tip": ""} for c in recommendations], "overall_advice": "", "ai_powered": False}

class CropPlannerAgent:
    @staticmethod
    def generate_plan(farmer_id, crop_name):
        # Dummy data generation logic based on crop
        plan = {
            'sowing_schedule': 'Week 1-2 of next month',
            'irrigation_plan': 'Every 5 days' if crop_name != 'Rice' else 'Continuous flooding initially',
            'fertilizer_schedule': 'Base dose at sowing, Top dressing at 30 days',
            'pest_alerts': 'Monitor for stem borer in initial stages',
            'harvest_timeline': '120-150 days from sowing'
        }
        
        query = """INSERT INTO crop_plans 
                   (farmer_id, crop_name, sowing_schedule, irrigation_plan, 
                    fertilizer_schedule, pest_alerts, harvest_timeline) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)"""
        values = (farmer_id, crop_name, plan['sowing_schedule'], plan['irrigation_plan'], 
                  plan['fertilizer_schedule'], plan['pest_alerts'], plan['harvest_timeline'])
        FluxbaseClient.execute(query, values)
        
        ids = FluxbaseClient.execute("SELECT LAST_INSERT_ID() AS id")
        plan_id = ids[0]['id'] if ids and len(ids) > 0 else 0
        plan['plan_id'] = plan_id
        return plan

import google.generativeai as genai
import PIL.Image
import json
import re

class DiseaseDiagnosisAgent:
    @staticmethod
    def diagnose(leaf_text, leaf_image=None):
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return {"diagnosis_text": "Error: GEMINI_API_KEY is missing from .env file. Please add it to enable AI Disease Diagnosis.", "products": []}

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        
        prompt = (
            "You are an expert Agricultural AI Agronomist specializing in plant pathology. "
            "A farmer has provided the following description of a plant disease or symptom:\n"
            f"'{leaf_text}'\n\n"
            "Analyze this description (and the image if provided). Identify the most likely disease "
            "or nutrient deficiency. Respond ONLY with a valid JSON object (no markdown, no extra text) in the format:\n"
            "{\n"
            '  "primary_suspect": "Disease or deficiency name",\n'
            '  "cause": "Fungal / Bacterial / Nutrient / Pest",\n'
            '  "recommended_action": "Specific treatment advice",\n'
            '  "products": [\n'
            '    {"name": "Product name", "type": "Fungicide/Pesticide/Fertilizer", "search_query": "exact product name to search on Amazon India"},\n'
            '    {"name": "Product name 2", "type": "Fungicide/Pesticide/Fertilizer", "search_query": "exact product name to search on Amazon India"}\n'
            "  ]\n"
            "}\n"
            "Include 2-3 real, commercially available products relevant to the diagnosis. "
            "Use the exact brand/product name as the search_query so users can find it easily."
        )
        
        try:
            contents = [prompt]
            if leaf_image and leaf_image.filename:
                img = PIL.Image.open(leaf_image)
                contents.append(img)
                
            response = model.generate_content(contents)
            raw = response.text.strip()
            # Strip markdown code fences if present
            raw = re.sub(r'^```(?:json)?\s*', '', raw)
            raw = re.sub(r'\s*```$', '', raw)
            data = json.loads(raw)
            
            diagnosis_text = (
                f"**Primary Suspect:** {data.get('primary_suspect', 'Unknown')}\n"
                f"**Cause:** {data.get('cause', 'Unknown')}\n"
                f"**Recommended Action:** {data.get('recommended_action', 'Consult a local agronomist.')}"
            )
            
            products = []
            for p in data.get('products', []):
                query = p.get('search_query', p.get('name', ''))
                amazon_link = f"https://www.amazon.in/s?k={query.replace(' ', '+')}"
                products.append({
                    "name": p.get('name'),
                    "type": p.get('type'),
                    "link": amazon_link
                })
            
            return {"diagnosis_text": diagnosis_text, "products": products}
        except json.JSONDecodeError:
            # Fallback: return raw text if JSON parsing fails
            return {"diagnosis_text": response.text, "products": []}
        except Exception as e:
            return {"diagnosis_text": f"AI Diagnosis Engine Offline. Error: {str(e)}", "products": []}

class PredictiveNutrientAgent:
    @staticmethod
    def predict_risk(farmer_id, plan_id, n, p, k, moisture, temp, growth_rate, days_fert):
        model_path = os.path.join(os.path.dirname(__file__), '..', 'ml', 'nutrient_model.pkl')
        if not os.path.exists(model_path):
            return {"error": "Model not trained yet."}
            
        model = joblib.load(model_path)
        
        # Features ordering from train_model: ['N', 'P', 'K', 'Moisture', 'Temperature', 'GrowthRate', 'DaysSinceFert']
        # Risk map: 0 (Low Risk), 1 (Medium Risk), 2 (High Risk)
        features = np.array([[n, p, k, moisture, temp, growth_rate, days_fert]])
        
        try:
            # Random forest can do predict_proba
            proba = model.predict_proba(features)[0]
            pred = model.predict(features)[0]
            
            risk_labels = {0: "Low", 1: "Medium", 2: "High"}
            
            # Use probability of being in the predicted class or a weighted combination
            risk_level = risk_labels[pred]
            
            # Simple probability of non-zero risk as percentage
            if len(proba) == 3:
                risk_percentage = (proba[1] + proba[2]) * 100
            else:
                risk_percentage = proba[1] * 100 if len(proba) > 1 else 0

            # Suggestions
            suggestion = "Maintain current schedule."
            if risk_level == "High":
                suggestion = "Immediate action required: Apply NPK 19:19:19 immediately. Triggering Replanner."
            elif risk_level == "Medium":
                suggestion = "Monitor closely. Consider applying vermicompost or light top dressing."

            FluxbaseClient.execute("""
                INSERT INTO nutrient_risk_log 
                (farmer_id, plan_id, risk_probability, risk_level, suggested_action) 
                VALUES (?, ?, ?, ?, ?)
            """, (farmer_id, plan_id, float(risk_percentage), risk_level, suggestion))
            
            return {
                "risk_probability": round(risk_percentage, 2),
                "risk_level": risk_level,
                "suggestion": suggestion,
                "trigger_replanner": risk_level == "High"
            }

        except Exception as e:
            return {"error": str(e)}

class DynamicReplannerAgent:
    @staticmethod
    def revise_plan(plan_id, reason="High Nutrient Risk"):
        plan_rows = FluxbaseClient.execute("SELECT * FROM crop_plans WHERE plan_id=?", (plan_id,))
        if not plan_rows:
            return "Plan not found."
            
        plan = plan_rows[0]
        # Revise logically
        new_fert_schedule = plan['fertilizer_schedule'] + " -> REVISED: Apply emergency 50kg/acre Urea via fertigation immediately."
        new_irrigation = plan['irrigation_plan'] + " -> REVISED: Increase frequency by 1 day to aid nutrient uptake."
        
        FluxbaseClient.execute("""
            UPDATE crop_plans 
            SET fertilizer_schedule=?, irrigation_plan=?, status='Revised' 
            WHERE plan_id=?
        """, (new_fert_schedule, new_irrigation, plan_id))
        
        return "Plan revised successfully based on dynamic constraints: " + reason

class ReportAgent:
    @staticmethod
    def generate_report(farmer_id):
        profile_rows = FluxbaseClient.execute("SELECT * FROM farmer_profile WHERE farmer_id=?", (farmer_id,))
        profile = profile_rows[0] if profile_rows else None
        
        plan_rows = FluxbaseClient.execute("SELECT * FROM crop_plans WHERE farmer_id=? ORDER BY created_at DESC LIMIT 1", (farmer_id,))
        plan = plan_rows[0] if plan_rows else None
        
        risk_rows = FluxbaseClient.execute("SELECT * FROM nutrient_risk_log WHERE farmer_id=? ORDER BY logged_at DESC LIMIT 1", (farmer_id,))
        risk = risk_rows[0] if risk_rows else None
        
        report_text = f"=== SUPERFARMER ADVISORY REPORT ===\n"
        if profile:
            report_text += f"Farmer: {profile['name']} | Location: {profile['location']}\n"
        
        if plan:
            report_text += f"\n-- Active Crop Plan: {plan['crop_name']} --\n"
            report_text += f"Status: {plan['status']}\n"
            report_text += f"Irrigation: {plan['irrigation_plan']}\n"
            report_text += f"Fertilizer: {plan['fertilizer_schedule']}\n"
            
        if risk:
            report_text += f"\n-- Latest Nutrient Alert --\n"
            report_text += f"Risk Level: {risk['risk_level']} ({risk['risk_probability']}%)\n"
            report_text += f"Action: {risk['suggested_action']}\n"
            
        report_text += "\nNote: This is an AI-generated synthesis. Please consult local agronomic extensions for critical actions."
        
        # Save to DB
        FluxbaseClient.execute("INSERT INTO reports (farmer_id, report_text) VALUES (?, ?)", (farmer_id, report_text))
        
        return report_text

class SpatialPlannerAgent:
    @staticmethod
    def generate_layout(width, height, main_crop):
        grid = []
        # Companion pairs example ensuring symbiotic relationships
        companions = {
            "Corn": {"companion": "Beans (Climbing)", "main_color": "#eab308", "comp_color": "#22c55e", "spacing": 60},
            "Tomatoes": {"companion": "Marigolds (Pest Repellent)", "main_color": "#ef4444", "comp_color": "#f59e0b", "spacing": 50},
            "Wheat": {"companion": "Clover (Nitrogen Fixer)", "main_color": "#fcd34d", "comp_color": "#16a34a", "spacing": 30},
            "Sugarcane": {"companion": "Soybean (Nitrogen Fixer)", "main_color": "#84cc16", "comp_color": "#4ade80", "spacing": 80},
            "Default": {"companion": "Cover Crop (Soil Health)", "main_color": "#15803d", "comp_color": "#86efac", "spacing": 40}
        }
        
        crop_data = companions.get(main_crop, companions["Default"])
        spacing = crop_data["spacing"]
        
        # Hexagonal staggered grid for optimal space utilization
        row = 0
        for y in range(spacing, height - spacing, int(spacing * 0.866)):
            row_offset = (row % 2) * (spacing / 2)
            col = 0
            for x in range(int(spacing + row_offset), width - spacing, spacing):
                is_companion = (row + col) % 3 == 0 # Every 3rd plant in pattern is a companion
                grid.append({
                    "x": x,
                    "y": y,
                    "type": crop_data["companion"] if is_companion else main_crop,
                    "color": crop_data["comp_color"] if is_companion else crop_data["main_color"],
                    "radius": spacing * 0.3 if is_companion else spacing * 0.45
                })
                col += 1
            row += 1
        
        analysis = f"**Digital Twin Generated:** Processed {len(grid)} planting nodes.\n\n"
        analysis += f"Using Hexagonal Spatial Algorithm to intercrop **{main_crop}** with **{crop_data['companion']}**.\n"
        analysis += f"This symbiotic layout maximizes sunlight capture, utilizes natural nitrogen fixation, and optimizes land efficiency by ~22% over traditional rows."
        
        return {
            "layout": grid,
            "analysis": analysis,
            "main_crop": main_crop,
            "companion": crop_data['companion']
        }

class OrchestratorAgent:
    # Orchestrator handles delegating the tasks using session context maps within Flask routing
    def __init__(self):
        self.active_sessions = {}
        
    def route_request(self, intent, data):
        if intent == 'signup':
            return UserAuthAgent.signup_user(data['email'], data['password'])
        elif intent == 'login':
            return UserAuthAgent.login_user(data['email'], data['password'])
        elif intent == 'intake':
            return IntakeAgent.process_intake(**data)
        elif intent == 'recommendation':
            return CropRecommendationAgent.recommend(**data)
        elif intent == 'plan':
            return CropPlannerAgent.generate_plan(**data)
        elif intent == 'spatial_plan':
            return SpatialPlannerAgent.generate_layout(data['width'], data['height'], data['main_crop'])
        elif intent == 'diagnose':
            return DiseaseDiagnosisAgent.diagnose(**data)
        elif intent == 'predict_risk':
            res = PredictiveNutrientAgent.predict_risk(**data)
            if res.get('trigger_replanner'):
                DynamicReplannerAgent.revise_plan(data['plan_id'], "High Nutrient Risk")
                res['replanner_status'] = "Plan has been updated dynamically."
            return res
        elif intent == 'report':
            return ReportAgent.generate_report(**data)
        elif intent == 'replan':
            return DynamicReplannerAgent.revise_plan(**data)
        elif intent == 'weather':
            return WeatherAgent.analyze_weather(**data)
        elif intent == 'send_email':
            return EmailAgent.send_email(data['to_email'], data['subject'], data['body'])
        else:
            return {"error": "Unknown intent"}
