import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os

def generate_synthetic_data(num_samples=1000):
    np.random.seed(42)
    # Features: Nitrogen(N), Phosphorus(P), Potassium(K), moisture(%), temp(C), growth_rate(cm/day), days_since_fertilizer 
    n_levels = np.random.uniform(10, 150, num_samples)
    p_levels = np.random.uniform(5, 80, num_samples)
    k_levels = np.random.uniform(20, 200, num_samples)
    moisture = np.random.uniform(10, 80, num_samples)
    temperature = np.random.uniform(15, 40, num_samples)
    growth_rate = np.random.uniform(0.1, 5.0, num_samples)
    days_since_fert = np.random.randint(0, 90, num_samples)
    
    # Target: 0 (Low Risk), 1 (Medium Risk), 2 (High Risk)
    risk_labels = []
    for i in range(num_samples):
        # simple heuristic for synthetic labels
        risk = 0
        if n_levels[i] < 40 or p_levels[i] < 20 or k_levels[i] < 60:
            risk += 1
        if moisture[i] < 30 or moisture[i] > 70:
            risk += 1
        if days_since_fert[i] > 30:
            risk += 1
        
        if risk == 0:
            risk_labels.append(0) # Low
        elif risk == 1 or risk == 2:
            risk_labels.append(1) # Medium
        else:
            risk_labels.append(2) # High
            
    df = pd.DataFrame({
        'N': n_levels,
        'P': p_levels,
        'K': k_levels,
        'Moisture': moisture,
        'Temperature': temperature,
        'GrowthRate': growth_rate,
        'DaysSinceFert': days_since_fert,
        'Risk': risk_labels
    })
    return df

def train_model():
    print("Generating synthetic data...")
    df = generate_synthetic_data(2000)
    
    X = df.drop('Risk', axis=1)
    y = df['Risk']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training Random Forest...")
    rf = RandomForestClassifier(n_estimators=100, random_state=42)
    rf.fit(X_train, y_train)
    
    y_pred = rf.predict(X_test)
    print(f"Accuracy: {accuracy_score(y_test, y_pred)}")
    print(classification_report(y_test, y_pred))
    
    # Save model
    model_path = os.path.join(os.path.dirname(__file__), 'nutrient_model.pkl')
    joblib.dump(rf, model_path)
    print(f"Model saved to {model_path}")

if __name__ == "__main__":
    train_model()
