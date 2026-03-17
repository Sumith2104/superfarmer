import sys
import os

# Add current path to sys path to resolve imports
sys.path.append(os.path.dirname(__file__))

from agents.agents import CropRecommendationAgent
from dotenv import load_dotenv

load_dotenv()

def main():
    print("Starting Autonomous MCP Test...")
    farmer_id = 5 # Using Sumith's farmer ID
    
    # Run the AI generator
    result = CropRecommendationAgent.recommend(
        farmer_id=farmer_id,
        soil_type="Black",
        water_const="High",
        season="Kharif (June-October, Monsoon)",
        goal="Maximum yield and profit"
    )
    
    print("\n--- Final Recommendation Result ---")
    print(result)

if __name__ == "__main__":
    main()
