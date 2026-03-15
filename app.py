from flask import Flask, render_template, request, session, redirect, url_for, jsonify
from config import Config
from agents.agents import OrchestratorAgent
from dotenv import load_dotenv
import os
import threading

load_dotenv() # Load environment variables from .env file

from functools import wraps

app = Flask(__name__)
app.config.from_object(Config)
app.secret_key = os.environ.get('SECRET_KEY', 'superfarmer-super-secret')

orchestrator = OrchestratorAgent()

def send_async_email(email_data):
    orchestrator.route_request('send_email', email_data)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def home():
    return render_template('home.html', logged_in='user_id' in session)

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        data = {
            'email': request.form['email'],
            'password': request.form['password']
        }
        res = orchestrator.route_request('signup', data)
        if res.get('success'):
            session['user_id'] = res['user_id']
            
            # Send welcome email asynchronously
            welcome_html = f"""
            <html>
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; padding: 20px; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #2e7d32; margin: 0;">🌱 Welcome to SuperFarmer!</h1>
                    </div>
                    <p style="font-size: 16px; line-height: 1.6;">Hello,</p>
                    <p style="font-size: 16px; line-height: 1.6;">Thank you for joining <strong>SuperFarmer</strong>. We are thrilled to have you on board. Our platform is designed to provide you with the best AI-driven insights to optimize your farming practices and maximize your yield.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="#" style="background-color: #2e7d32; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Explore Your Dashboard</a>
                    </div>
                    <p style="font-size: 16px; line-height: 1.6;">If you have any questions, feel free to reach out to our support team.</p>
                    <hr style="border: 0; height: 1px; background-color: #e0e0e0; margin: 30px 0;">
                    <p style="font-size: 12px; color: #777; text-align: center;">© 2026 SuperFarmer. All rights reserved.</p>
                </div>
            </body>
            </html>
            """
            threading.Thread(target=send_async_email, args=({
                'to_email': data['email'],
                'subject': 'Welcome to SuperFarmer!',
                'body': welcome_html
            },)).start()
            
            return redirect(url_for('intake'))
        else:
            return render_template('signup.html', error=res.get('error'))
    return render_template('signup.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = {
            'email': request.form['email'],
            'password': request.form['password']
        }
        res = orchestrator.route_request('login', data)
        if res.get('success'):
            session['user_id'] = res['user_id']
            
            # Send login alert email asynchronously
            login_html = f"""
            <html>
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; padding: 20px; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #1976d2; margin: 0;">🛡️ New Login Alert</h1>
                    </div>
                    <p style="font-size: 16px; line-height: 1.6;">Hello,</p>
                    <p style="font-size: 16px; line-height: 1.6;">We noticed a new login to your <strong>SuperFarmer</strong> account. If this was you, you can safely ignore this email.</p>
                    <div style="background-color: #fff3cd; color: #856404; border: 1px solid #ffeeba; border-radius: 5px; padding: 15px; margin: 25px 0;">
                        <p style="margin: 0; font-size: 14px;"><strong>Note:</strong> If you did not authorize this login, please change your password immediately and contact support.</p>
                    </div>
                    <hr style="border: 0; height: 1px; background-color: #e0e0e0; margin: 30px 0;">
                    <p style="font-size: 12px; color: #777; text-align: center;">© 2026 SuperFarmer. Account Security Team.</p>
                </div>
            </body>
            </html>
            """
            threading.Thread(target=send_async_email, args=({
                'to_email': data['email'],
                'subject': 'New Login Alert - SuperFarmer',
                'body': login_html
            },)).start()
            
            # Try to grab existing farmer profile
            from agents.agents import UserAuthAgent
            farmer_id = UserAuthAgent.get_farmer_profile_by_user(res['user_id'])
            if farmer_id:
                session['farmer_id'] = farmer_id
                return redirect(url_for('recommendation'))
            else:
                return redirect(url_for('intake'))
        else:
            return render_template('login.html', error=res.get('error'))
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('home'))

@app.route('/intake', methods=['GET', 'POST'])
@login_required
def intake():
    if request.method == 'POST':
        data = {
            'user_id': session['user_id'],
            'name': request.form['name'],
            'land_size': request.form['land_size'],
            'location': request.form['location'],
            'water': request.form['water'],
            'goals': request.form['goals']
        }
        farmer_id = orchestrator.route_request('intake', data)
        session['farmer_id'] = farmer_id
        return redirect(url_for('recommendation'))
    return render_template('intake.html')

@app.route('/recommendation', methods=['GET', 'POST'])
@login_required
def recommendation():
    if not session.get('farmer_id'):
        return redirect(url_for('intake'))
        
    if request.method == 'POST':
        data = {
            'farmer_id': session['farmer_id'],
            'soil_type': request.form['soil_type'],
            'n': float(request.form['n']),
            'p': float(request.form['p']),
            'k': float(request.form['k']),
            'temp': float(request.form['temp']),
            'rain': float(request.form['rain']),
            'water_const': request.form['water_const']
        }
        rec = orchestrator.route_request('recommendation', data)
        session['last_rec'] = rec
        session['soil_data'] = data
        return render_template('recommendation.html', recommendations=rec)
        
    return render_template('recommendation.html', recommendations=session.get('last_rec'))

@app.route('/plan', methods=['GET', 'POST'])
@login_required
def plan():
    if not session.get('farmer_id'):
        return redirect(url_for('intake'))
        
    if request.method == 'POST':
        data = {
            'farmer_id': session['farmer_id'],
            'crop_name': request.form['crop_name']
        }
        plan_data = orchestrator.route_request('plan', data)
        session['plan_id'] = plan_data['plan_id']
        return render_template('plan.html', plan=plan_data)
        
    return render_template('plan.html')

@app.route('/nutrient_risk', methods=['GET', 'POST'])
@login_required
def nutrient_risk():
    if not session.get('farmer_id') or not session.get('plan_id'):
        return redirect(url_for('home'))
        
    if request.method == 'POST':
        # Simulated sensor/log data
        data = {
            'farmer_id': session['farmer_id'],
            'plan_id': session['plan_id'],
            'n': float(request.form['n']),
            'p': float(request.form['p']),
            'k': float(request.form['k']),
            'moisture': float(request.form['moisture']),
            'temp': float(request.form['temp']),
            'growth_rate': float(request.form['growth_rate']),
            'days_fert': int(request.form['days_fert'])
        }
        risk_result = orchestrator.route_request('predict_risk', data)
        return render_template('nutrient_risk.html', risk=risk_result)
        
    return render_template('nutrient_risk.html')

@app.route('/disease', methods=['GET', 'POST'])
@login_required
def disease():
    if request.method == 'POST':
        data = {
            'leaf_text': request.form.get('leaf_text', ''),
            'leaf_image': request.files.get('leaf_image')
        }
        diagnosis = orchestrator.route_request('diagnose', data)
        return render_template('disease.html', diagnosis=diagnosis)
        
    return render_template('disease.html')

@app.route('/weather', methods=['GET', 'POST'])
@login_required
def weather():
    if not session.get('farmer_id'):
        return redirect(url_for('home'))
        
    if request.method == 'POST':
        data = {
            'location': request.form['location']
        }
        weather_analysis = orchestrator.route_request('weather', data)
        return render_template('weather.html', analysis=weather_analysis)
        
    return render_template('weather.html')

@app.route('/spatial-planner', methods=['GET', 'POST'])
@login_required
def spatial_planner():
    if not session.get('farmer_id'):
        return redirect(url_for('home'))
        
    if request.method == 'POST':
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid data format"}), 400
            
        layout_data = orchestrator.route_request('spatial_plan', data)
        return jsonify(layout_data)
        
    return render_template('spatial_planner.html')

@app.route('/report')
@login_required
def report():
    if not session.get('farmer_id'):
        return redirect(url_for('home'))
        
    report_text = orchestrator.route_request('report', {'farmer_id': session['farmer_id']})
    return render_template('report.html', report=report_text)

if __name__ == '__main__':
    app.run(debug=True)
