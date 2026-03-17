from fpdf import FPDF
import os

class AgentPDF(FPDF):
    def header(self):
        # Logo/Title
        self.set_font('Arial', 'B', 20)
        self.set_text_color(22, 163, 74) # Green color
        self.cell(0, 15, 'Superfarmer: AI Agent Architecture & Documentation', 0, 1, 'C')
        self.set_draw_color(22, 163, 74)
        self.line(10, 25, 200, 25)
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.set_text_color(128)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

    def agent_title(self, title):
        self.set_font('Arial', 'B', 14)
        self.set_text_color(30, 41, 59) # Slate 800
        self.cell(0, 10, title, 0, 1, 'L')
        self.ln(2)

    def agent_body(self, text):
        self.set_font('Arial', '', 11)
        self.set_text_color(71, 85, 105) # Slate 500
        self.multi_cell(0, 6, text)
        self.ln(8)

def create_pdf():
    pdf = AgentPDF()
    pdf.add_page()
    
    # Intro
    pdf.set_font('Arial', '', 12)
    pdf.set_text_color(50, 50, 50)
    intro_text = (
        "Superfarmer uses a Multi-Agent System (MAS) architecture where specific, specialized "
        "AI agents handle different domains of the farming lifecycle. This document outlines "
        "the purpose, inputs, and behavior of each agent in the system."
    )
    pdf.multi_cell(0, 7, intro_text)
    pdf.ln(10)

    agents = [
        {
            "name": "1. OrchestratorAgent",
            "desc": "The central dispatcher of the system. It receives all intents from the Flask routing layer (e.g., 'signup', 'diagnose', 'recommendation') and delegates the data to the appropriate specialized agent. It manages the flow of data between the web interface and the backend AI."
        },
        {
            "name": "2. UserAuthAgent",
            "desc": "Handles secure user authentication. It hashes passwords using Werkzeug security, stores credentials in the Fluxbase SQL database, and verifies them upon login. It also maps authenticated users to their specific farmer profiles."
        },
        {
            "name": "3. IntakeAgent",
            "desc": "Processes the initial farm onboarding. It takes user details like farm land size, location, water availability, and farming goals, and saves this baseline data into the farmer_profile table to be used by other predictive agents."
        },
        {
            "name": "4. CropRecommendationAgent",
            "desc": "An AI Agronomist powered by Google Gemini 2.5 Flash. It takes the farmer's soil type, water availability, season, and overall goals, and generates the top 3 optimal crops to plant. It provides specific reasons, care tips, and an overall agronomic advice paragraph formatting the response as strict JSON. Contains a rule-based fallback if the AI is unreachable."
        },
        {
            "name": "5. DiseaseDiagnosisAgent",
            "desc": "A multimodal plant pathology agent. It uses Gemini Vision to analyze user-uploaded photos of diseased leaves alongside text descriptions. It identifies the primary disease/deficiency, cause, and recommended actions, and dynamically suggests real commercially available fungicides/pesticides with direct Amazon India search links."
        },
        {
            "name": "6. PredictiveNutrientAgent",
            "desc": "A machine learning agent using a pre-trained scikit-learn Random Forest model. It analyzes N/P/K levels, moisture, temperature, and crop growth rate to predict the risk percentage of nutrient deficiency. If the risk is 'High', it can autonomously trigger the DynamicReplannerAgent."
        },
        {
            "name": "7. DynamicReplannerAgent",
            "desc": "Works in tandem with the predictive models. When a high risk (e.g., nutrient deficiency or severe weather) is detected, this agent alters the existing crop plan in the database. For example, it will inject emergency fertilizer schedules or increase irrigation frequency to save the crop."
        },
        {
            "name": "8. CropPlannerAgent",
            "desc": "Generates the baseline lifecycle plan for a selected crop. It provides a default sowing schedule, irrigation plan, fertilizer schedule, pest alerts, and an estimated harvest timeline."
        },
        {
            "name": "9. SpatialPlannerAgent",
            "desc": "Generates a 'Digital Twin' layout for the farm using a Hexagonal Spatial Algorithm. It calculates how to intercrop the main crop with a symbiotic companion crop (e.g., Corn with climbing beans, or Tomatoes with pest-repellent Marigolds) to maximize land efficiency and natural nitrogen fixation."
        },
        {
            "name": "10. WeatherAgent",
            "desc": "Fetches a 3-day meteorological forecast using the OpenWeather API (with an Open-Meteo fallback). It aggregates maximum temperatures and total rainfall, and runs logic to provide actionable farming advice (e.g., 'Harvest Early' if heavy rain is imminent, or 'Monitor heat stress')."
        },
        {
            "name": "11. ReportAgent",
            "desc": "A synthesis agent that aggregates data from the Farmer Profile, the Active Crop Plan, and the latest Nutrient Risk Logs. It compiles this into a cohesive, readable Advisory Report for the farmer."
        },
        {
            "name": "12. EmailAgent",
            "desc": "Handles outbound notifications. It uses Python's smtplib to securely send HTML-formatted emails (e.g., alerts, reports, or password resets) to the user's registered email address."
        }
    ]

    for agent in agents:
        pdf.agent_title(agent['name'])
        pdf.agent_body(agent['desc'])

    output_path = os.path.join(os.getcwd(), 'Superfarmer_Agent_Documentation.pdf')
    pdf.output(output_path)
    print(f"PDF generated successfully at: {output_path}")

if __name__ == "__main__":
    create_pdf()
