from kafka import KafkaProducer
import requests
import json
import time
import random

API_KEY = "dd8b44a9e57634eadf03d1e228d54c20"

producer = KafkaProducer(
    bootstrap_servers='localhost:9092',
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

cities = [
    "Colombo", "Kandy", "Galle", "Jaffna", "Negombo",
    "Anuradhapura", "Trincomalee", "Batticaloa",
    "Kurunegala", "Matara", "Badulla", "Ratnapura",
    "Polonnaruwa", "Hambantota", "Nuwara Eliya",
    "Kalutara", "Vavuniya", "Mannar", "Puttalam",
    "Kilinochchi"
]

print("🌍 Real Weather Streaming Started...")



last_values = {}

while True:
    for city in cities:
        try:
            url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}&units=metric"
            res = requests.get(url).json()

            real_temp = res["main"]["temp"]
            real_humidity = res["main"]["humidity"]

            # initialize if first time
            if city not in last_values:
                last_values[city] = {
                    "temp": real_temp,
                    "humidity": real_humidity
                }

            # 🔥 smooth transition
            last_values[city]["temp"] += (real_temp - last_values[city]["temp"]) * 0.2
            last_values[city]["humidity"] += (real_humidity - last_values[city]["humidity"]) * 0.2

            data = {
                "city": city,
                "temp": round(last_values[city]["temp"], 2),
                "humidity": int(last_values[city]["humidity"]),
                "condition": res["weather"][0]["main"]
            }

            print("📤 Sending:", data)
            producer.send("agri_weather", value=data)

        except Exception as e:
            print("Error:", e)

        time.sleep(1)  # smoother flow

    time.sleep(10)