import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report
import joblib

df = pd.read_csv("data.csv")

le_soil = LabelEncoder()
le_crop = LabelEncoder()
le_fert = LabelEncoder()

df["Soil_enc"] = le_soil.fit_transform(df["Soil Type"])
df["Crop_enc"] = le_crop.fit_transform(df["Crop Type"])
df["Fert_enc"] = le_fert.fit_transform(df["Fertilizer Name"])

features = ["Nitrogen", "Potassium", "Phosphorous", "Temparature", "Humidity", "Moisture", "Soil_enc", "Crop_enc"]
X = df[features]
y = df["Fert_enc"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

model = RandomForestClassifier(n_estimators=200, random_state=42, n_jobs=-1)
model.fit(X_train, y_train)

print("=== Classification Report ===")
print(classification_report(y_test, model.predict(X_test), target_names=le_fert.classes_))

joblib.dump(model, "fert_model.pkl")
joblib.dump(le_soil, "fert_le_soil.pkl")
joblib.dump(le_crop, "fert_le_crop.pkl")
joblib.dump(le_fert, "fert_le_fert.pkl")

print("\n=== Interactive Test ===")
print(f"Soil types: {list(le_soil.classes_)}")
print(f"Crop types: {list(le_crop.classes_)}")
print("Enter: N K P Temp Humidity Moisture SoilType CropType")
while True:
    try:
        line = input("\n> ").strip()
        if not line:
            break
        parts = line.split()
        n, p, k = float(parts[0]), float(parts[1]), float(parts[2])
        temp, hum, moist = float(parts[3]), float(parts[4]), float(parts[5])
        soil, crop = parts[6], parts[7]
        soil_enc = le_soil.transform([soil])[0]
        crop_enc = le_crop.transform([crop])[0]
        pred = model.predict([[n, k, p, temp, hum, moist, soil_enc, crop_enc]])
        fert = le_fert.inverse_transform(pred)[0]
        print(f"Recommended fertilizer: {fert}")
    except Exception as e:
        print(f"Error: {e}")
