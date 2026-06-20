import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report
import joblib

df = pd.read_csv("data.csv")

le_soil = LabelEncoder()
le_crop = LabelEncoder()

df["Soil_enc"] = le_soil.fit_transform(df["Soil Type"])
df["Crop_enc"] = le_crop.fit_transform(df["Crop Type"])

features = ["Nitrogen", "Potassium", "Phosphorous", "Temparature", "Humidity", "Moisture", "Soil_enc"]
X = df[features]
y = df["Crop_enc"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

model = RandomForestClassifier(n_estimators=200, random_state=42, n_jobs=-1)
model.fit(X_train, y_train)

print("=== Classification Report ===")
print(classification_report(y_test, model.predict(X_test), target_names=le_crop.classes_))

joblib.dump(model, "crop_model.pkl")
joblib.dump(le_soil, "crop_le_soil.pkl")
joblib.dump(le_crop, "crop_le_crop.pkl")

print("\n=== Interactive Test ===")
print(f"Soil types: {list(le_soil.classes_)}")
print("Enter: Nitrogen Potassium Phosphorous Temperature Humidity Moisture SoilType")
while True:
    try:
        line = input("\n> ").strip()
        if not line:
            break
        parts = line.split()
        n, p, k = float(parts[0]), float(parts[1]), float(parts[2])
        temp, hum, moist = float(parts[3]), float(parts[4]), float(parts[5])
        soil = parts[6]
        soil_enc = le_soil.transform([soil])[0]
        pred = model.predict([[n, k, p, temp, hum, moist, soil_enc]])
        crop = le_crop.inverse_transform(pred)[0]
        print(f"Recommended crop: {crop}")
    except Exception as e:
        print(f"Error: {e}")
