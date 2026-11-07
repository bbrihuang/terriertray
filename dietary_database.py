import joblib
import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


# ==========================================
# 1. LOAD DATASET
# ==========================================

dfcal = pd.read_csv('healthy_diet_calorie_intake.csv')

print("Dataset loaded successfully!")
print("Dataset shape:", dfcal.shape)


# ==========================================
# 2. CLEAN ACTIVITY LEVEL
# ==========================================

dfcal['Activity_Level'] = (
    dfcal['Activity_Level']
    .astype('string')
    .str.strip()
    .str.lower()
)

activity_order = {
    'sedentary': 0,
    'lightly active': 1,
    'moderately active': 2,
    'very active': 3,
    'extremely active': 4
}

print("\nActivity Level Categories:")
print(dfcal['Activity_Level'].value_counts(dropna=False))

dfcal['Activity_Level'] = (
    dfcal['Activity_Level'].map(activity_order)
)

# Check unknown categories
if dfcal['Activity_Level'].isna().any():
    print("\nWARNING: Missing or unknown activity categories found.")
    print("These values will be handled by median imputation.")


# ==========================================
# 3. DEFINE FEATURES AND TARGET
# ==========================================

features = [
    'Age',
    'Gender',
    'Height_cm',
    'Weight_kg',
    'Activity_Level'
]

target = 'Daily_Calorie_Requirement'

# Check required columns
required_columns = features + [target]

missing_columns = [
    col for col in required_columns
    if col not in dfcal.columns
]

if missing_columns:
    raise ValueError(
        f"Missing columns: {missing_columns}"
    )

X = dfcal[features].copy()

y = pd.to_numeric(
    dfcal[target],
    errors='coerce'
)

# Remove missing target values
valid_rows = y.notna()

X = X.loc[valid_rows]
y = y.loc[valid_rows]


# ==========================================
# 4. DEFINE FEATURE TYPES
# ==========================================

numeric_cols = [
    'Age',
    'Height_cm',
    'Weight_kg',
    'Activity_Level'
]

categorical_cols = [
    'Gender'
]

# Convert numeric features
for col in numeric_cols:
    X[col] = pd.to_numeric(
        X[col],
        errors='coerce'
    )

# Clean categorical features
for col in categorical_cols:
    X[col] = X[col].astype('string').str.strip()
    X[col] = X[col].replace('', pd.NA)


# ==========================================
# 5. SPLIT DATASET
# ==========================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=68
)

print("\nTraining samples:", len(X_train))
print("Testing samples:", len(X_test))


# ==========================================
# 6. PREPROCESSING
# ==========================================

numeric_transformer = Pipeline(steps=[
    ('imputer', SimpleImputer(strategy='median')),
    ('scaler', StandardScaler())
])

categorical_transformer = Pipeline(steps=[
    ('imputer', SimpleImputer(strategy='most_frequent')),
    ('encoder', OneHotEncoder(
        drop='first',
        handle_unknown='ignore'
    ))
])

preprocessor = ColumnTransformer(
    transformers=[
        ('num', numeric_transformer, numeric_cols),
        ('cat', categorical_transformer, categorical_cols)
    ]
)


# ==========================================
# 7. BUILD LINEAR REGRESSION MODEL
# ==========================================

cal_pipeline = Pipeline(steps=[
    ('preprocessor', preprocessor),
    ('regressor', LinearRegression())
])


# ==========================================
# 8. TRAIN MODEL
# ==========================================

cal_pipeline.fit(X_train, y_train)

print("\nModel trained successfully!")


# ==========================================
# 9. MAKE PREDICTIONS
# ==========================================

y_pred = cal_pipeline.predict(X_test)


# ==========================================
# 10. MODEL EVALUATION
# ==========================================

r2 = r2_score(y_test, y_pred)

mae = mean_absolute_error(y_test, y_pred)

rmse = np.sqrt(
    mean_squared_error(y_test, y_pred)
)

print("\n========== MODEL EVALUATION ==========")

print(f"R-squared (R2): {r2:.4f}")
print(f"MAE: {mae:.2f} calories")
print(f"RMSE: {rmse:.2f} calories")

print("======================================")


# ==========================================
# 11. EXTRACT ORIGINAL-SCALE COEFFICIENTS
# ==========================================

preprocessor = cal_pipeline.named_steps['preprocessor']

regressor = cal_pipeline.named_steps['regressor']

# Get numerical scaler
scaler = (
    preprocessor
    .named_transformers_['num']
    .named_steps['scaler']
)

# Extract numerical coefficients
numeric_coefficients = (
    regressor.coef_[:len(numeric_cols)]
    / scaler.scale_
)

# Extract categorical coefficients
categorical_coefficients = (
    regressor.coef_[len(numeric_cols):]
)

# Calculate original-scale intercept
original_intercept = (
    regressor.intercept_
    - np.sum(
        regressor.coef_[:len(numeric_cols)]
        * scaler.mean_
        / scaler.scale_
    )
)

# Adjust intercept for categorical encoding
encoder = (
    preprocessor
    .named_transformers_['cat']
    .named_steps['encoder']
)

encoded_features = encoder.get_feature_names_out(
    categorical_cols
)

# Display numerical coefficients
print("\n========== ORIGINAL-SCALE COEFFICIENTS ==========")

print(f"Intercept: {original_intercept:.4f}")

for feature, coefficient in zip(
    numeric_cols,
    numeric_coefficients
):
    print(f"{feature}: {coefficient:.4f}")

# Display categorical coefficients
for feature, coefficient in zip(
    encoded_features,
    categorical_coefficients
):
    print(f"{feature}: {coefficient:.4f}")

print("==================================================")


# ==========================================
# 12. DISPLAY REGRESSION EQUATION
# ==========================================

print("\n========== REGRESSION EQUATION ==========")

equation = (
    f"Daily Calorie Requirement = "
    f"{original_intercept:.4f}"
)

for feature, coefficient in zip(
    numeric_cols,
    numeric_coefficients
):
    sign = "+" if coefficient >= 0 else "-"
    equation += (
        f" {sign} {abs(coefficient):.4f} * {feature}"
    )

for feature, coefficient in zip(
    encoded_features,
    categorical_coefficients
):
    sign = "+" if coefficient >= 0 else "-"
    equation += (
        f" {sign} {abs(coefficient):.4f} * {feature}"
    )

print(equation)

print("==========================================")


# ==========================================
# 13. SAVE COMPLETE MODEL
# ==========================================

joblib.dump(
    cal_pipeline,
    'dietary_cal_model.joblib'
)

print("\nModel saved successfully!")
print("File: dietary_cal_model.joblib")


# ==========================================
# 14. SAMPLE PREDICTION
# ==========================================

sample_person = pd.DataFrame({
    'Age': [25],
    'Gender': ['Male'],
    'Height_cm': [175],
    'Weight_kg': [70],
    'Activity_Level': [2]
})

sample_prediction = cal_pipeline.predict(
    sample_person
)

print("\n========== SAMPLE PREDICTION ==========")

print(
    f"Estimated Daily Calories: "
    f"{sample_prediction[0]:.2f} kcal/day"
)

print("======================================")
joblib.dump(
    cal_pipeline,
    'dietary_cal_model.joblib'
)

print("\nModel saved successfully!")
print("File: dietary_cal_model.joblib")


# ==========================================
# 12. SAMPLE PREDICTION
# ==========================================

sample_person = pd.DataFrame({
    'Age': [25],
    'Gender': ['Male'],
    'Height_cm': [175],
    'Weight_kg': [70],
    'Activity_Level': [2]
})

sample_prediction = cal_pipeline.predict(sample_person)

print("\n========== SAMPLE PREDICTION ==========")

print(
    f"Estimated Daily Calories: "
    f"{sample_prediction[0]:.2f} kcal/day"
)

print("======================================")