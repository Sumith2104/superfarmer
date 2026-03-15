from database.fluxbase import FluxbaseClient

def init_db():
    queries = [
    '''
    CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(120) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ''',
    '''
    CREATE TABLE IF NOT EXISTS farmer_profile (
        farmer_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        name VARCHAR(100),
        land_size FLOAT,
        location VARCHAR(100),
        water_availability VARCHAR(50),
        farming_goals TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
    );
    ''',
    '''
    CREATE TABLE IF NOT EXISTS soil_records (
        record_id INT AUTO_INCREMENT PRIMARY KEY,
        farmer_id INT,
        soil_type VARCHAR(50),
        nitrogen FLOAT,
        phosphorus FLOAT,
        potassium FLOAT,
        soil_moisture FLOAT,
        temperature FLOAT,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (farmer_id) REFERENCES farmer_profile(farmer_id)
    );
    ''',
    '''
    CREATE TABLE IF NOT EXISTS crop_recommendations (
        recommendation_id INT AUTO_INCREMENT PRIMARY KEY,
        farmer_id INT,
        recommended_crops VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (farmer_id) REFERENCES farmer_profile(farmer_id)
    );
    ''',
    '''
    CREATE TABLE IF NOT EXISTS crop_plans (
        plan_id INT AUTO_INCREMENT PRIMARY KEY,
        farmer_id INT,
        crop_name VARCHAR(100),
        sowing_schedule TEXT,
        irrigation_plan TEXT,
        fertilizer_schedule TEXT,
        pest_alerts TEXT,
        harvest_timeline TEXT,
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (farmer_id) REFERENCES farmer_profile(farmer_id)
    );
    ''',
    '''
    CREATE TABLE IF NOT EXISTS nutrient_risk_log (
        log_id INT AUTO_INCREMENT PRIMARY KEY,
        farmer_id INT,
        plan_id INT,
        risk_probability FLOAT,
        risk_level VARCHAR(20),
        suggested_action TEXT,
        logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (farmer_id) REFERENCES farmer_profile(farmer_id),
        FOREIGN KEY (plan_id) REFERENCES crop_plans(plan_id)
    );
    ''',
    '''
    CREATE TABLE IF NOT EXISTS reports (
        report_id INT AUTO_INCREMENT PRIMARY KEY,
        farmer_id INT,
        report_text TEXT,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (farmer_id) REFERENCES farmer_profile(farmer_id)
    );
    ''',
    '''
    CREATE TABLE IF NOT EXISTS session_logs (
        session_id INT AUTO_INCREMENT PRIMARY KEY,
        farmer_id INT,
        interaction_log TEXT,
        session_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (farmer_id) REFERENCES farmer_profile(farmer_id)
    );
    '''
    ]

    for q in queries:
        FluxbaseClient.execute(q)
        
    print("Database initialized successfully via Fluxbase.")

if __name__ == '__main__':
    init_db()
