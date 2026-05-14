import sys
import joblib
import numpy as np
import os

def main():
    try:
        # Load the model from the python backend directory
        model_path = os.path.join(os.path.dirname(__file__), '..', 'superfarmer', 'superfarmer', 'crop_model.pkl')
        model = joblib.load(model_path)
        
        # Parse inputs
        n = float(sys.argv[1])
        p = float(sys.argv[2])
        k = float(sys.argv[3])
        temp = float(sys.argv[4])
        humidity = float(sys.argv[5])
        ph = float(sys.argv[6])
        rainfall = float(sys.argv[7])
        
        # Predict top 5 crops
        features = np.array([[n, p, k, temp, humidity, ph, rainfall]])
        probs = model.predict_proba(features)[0]
        top_5_indices = np.argsort(probs)[-5:][::-1]
        classes = model.classes_
        top_5_crops = [classes[i] for i in top_5_indices]
        
        # Suppress warnings from output by printing only the result
        print(",".join(top_5_crops))
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
