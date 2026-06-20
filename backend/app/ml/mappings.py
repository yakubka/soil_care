"""Shared constants that bind the trained models together.

The tabular RandomForest models (crop / fertilizer) were trained on `data.csv`
with these exact column names and order — they MUST be reproduced verbatim when
building the inference feature vector, otherwise predictions are silently wrong.
"""
from __future__ import annotations

# Feature order for crop_model.pkl (see 1_crop_recommender.py)
CROP_FEATURES = [
    "Nitrogen",
    "Potassium",
    "Phosphorous",
    "Temparature",  # original CSV spelling — kept on purpose for feature-name match
    "Humidity",
    "Moisture",
    "Soil_enc",
]

# Feature order for fert_model.pkl (see 2_fertilizer_recommender.py)
FERT_FEATURES = CROP_FEATURES + ["Crop_enc"]

# Parameters the corridor anomaly monitor checks (see 3_sensor_monitor.py)
CORRIDOR_PARAMS = ["Nitrogen", "Potassium", "Phosphorous", "Temparature", "Humidity", "Moisture"]

# Tabular soil types known to the RandomForest encoders (LabelEncoder, sorted):
TABULAR_SOIL_TYPES = ["Black", "Clayey", "Loamy", "Red", "Sandy"]

# The EfficientNet image classifier predicts 4 visual soil classes that do NOT
# line up 1:1 with the tabular soil types. This maps each image class onto the
# closest tabular type the recommenders understand.
#   - "Alluvial soil" is texturally closest to Loamy.
#   - "Sandy" has no visual counterpart, so it is only reachable via manual choice.
IMAGE_TO_TABULAR_SOIL = {
    "Alluvial soil": "Loamy",
    "Black Soil": "Black",
    "Clay soil": "Clayey",
    "Red soil": "Red",
}


def map_image_soil_to_tabular(image_class: str) -> str | None:
    """Map an EfficientNet soil class to a tabular soil type, or None if unknown."""
    return IMAGE_TO_TABULAR_SOIL.get(image_class)
