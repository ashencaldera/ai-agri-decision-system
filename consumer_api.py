from flask import Flask, jsonify
from flask_cors import CORS
from kafka import KafkaConsumer
import json
import threading

# ML
from sklearn.ensemble import RandomForestClassifier
import pandas as pd

app = Flask(__name__)
CORS(app)

# -------------------------------
# 🔹 Train ML Model (offline)
# -------------------------------
print("🧠 Training ML model...")

data = pd.DataFrame({
    "temp": [20, 25, 30, 35, 40, 28, 32, 26],
    "humidity": [60, 65, 70, 75, 80, 55, 68, 72],
    "crop": ["rice", "wheat", "corn", "pigeonpeas", "millet", "rice", "corn", "wheat"]
})

X = data[["temp", "humidity"]]
y = data["crop"]

model = RandomForestClassifier()
model.fit(X, y)

print("✅ Model trained")

# -------------------------------
# 🔹 Storage (acts like DB)
# -------------------------------
latest_data = []

# -------------------------------
# 🔹 Business Logic
# -------------------------------

def business_logic(temp, humidity, prediction):
    # 🔥 Risk based on weather
    if temp > 35 or humidity > 80:
        risk = "High"
    elif temp > 30 or humidity > 70:
        risk = "Medium"
    else:
        risk = "Low"

    # 🌾 Yield & profit logic
    if 20 <= temp <= 30 and 40 <= humidity <= 70:
        profit = 2000
        yield_level = "High"
    elif temp > 35 or humidity > 80:
        profit = 900
        yield_level = "Low"
    else:
        profit = 1400
        yield_level = "Medium"

    # 📉 Demand affected by risk
    if risk == "High":
        demand = "Low"
        profit *= 0.7
    elif risk == "Medium":
        demand = "Medium"
        profit *= 0.9
    else:
        demand = "High"

    return {
        "risk": risk,
        "profit": int(profit),
        "demand": demand,
        "yield": yield_level
    }

# -------------------------------
# 🔹 Kafka Consumer Thread
# -------------------------------
def consume_kafka():
    print("📡 Connecting to Kafka...")

    consumer = KafkaConsumer(
        "agri_weather",
        bootstrap_servers="localhost:9092",
        value_deserializer=lambda x: json.loads(x.decode("utf-8")),
        auto_offset_reset="latest",
        enable_auto_commit=True
    )

    print("🚀 Kafka Consumer Started...")

    for message in consumer:
        data = message.value

        temp = data["temp"]
        humidity = data["humidity"]

        input_df = pd.DataFrame([[temp, humidity]], columns=["temp", "humidity"])

        prediction = model.predict(input_df)[0]
        confidence = int(max(model.predict_proba(input_df)[0]) * 100)

        # alerts
        alert = "Normal"
        if temp > 35:
            alert = "🔥 Extreme Heat Risk"
        elif humidity > 80:
            alert = "💧 High Humidity Risk"

        # business metrics
        business = business_logic(temp, humidity, prediction)

        enriched = {
            **data,
            "prediction": prediction,
            "confidence": confidence,
            "alert": alert,
            **business
        }

        print("🧠 Processed:", enriched)

        # keep only last 100 records
        latest_data.append(enriched)
        if len(latest_data) > 100:
            latest_data.pop(0)

# -------------------------------
# 🔹 API Routes
# -------------------------------

@app.route("/data", methods=["GET"])
def get_data():
    return jsonify(latest_data)

@app.route("/")
def home():
    return jsonify({
        "status": "API Running 🚀",
        "endpoint": "/data"
    })

# -------------------------------
# 🔹 Start Thread + Flask
# -------------------------------
if __name__ == "__main__":
    t = threading.Thread(target=consume_kafka)
    t.daemon = True
    t.start()

    app.run(debug=False)