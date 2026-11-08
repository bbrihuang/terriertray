# This is how I got the regression model working for the exercise dataset. I used a linear regression model with a pipeline that includes preprocessing steps for both numerical and categorical features.
import joblib
import pandas as pd
import numpy as np
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

from pathlib import Path

# Load the dataset

csv_path = Path(__file__).parent / "gym_members_exercise_tracking.csv" # Kaggle dataset: https://www.kaggle.com/datasets/valakhorasani/gym-members-exercise-dataset
dfex = pd.read_csv(csv_path)
print(dfex.columns.tolist())

# What we are using as features and target variable
features = ['Age', 'Gender', 'Weight (kg)', 'Height (m)', 'Session_Duration (hours)', 'Workout_Type']

X = dfex[features]
y = dfex['Calories_Burned']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=68)

# Separate numerical and categorical features
numerical_features = [
    'Age',
    'Weight (kg)',
    'Height (m)',
    'Session_Duration (hours)',
]

categorical_features = [
    'Gender',

]

# Preprocessing for numerical data
numerical_transformer = Pipeline(steps=[
    ('imputer', SimpleImputer(strategy='mean')),
    ('scaler', StandardScaler())
])

# Preprocessing for categorical data
categorical_transformer = Pipeline(steps=[
    ('imputer', SimpleImputer(strategy='most_frequent')),
    ('onehot', OneHotEncoder(handle_unknown='ignore'))
])

# Combine preprocessing
preprocessor = ColumnTransformer(transformers=[
    ('num', numerical_transformer, numerical_features),
    ('cat', categorical_transformer, categorical_features)
])

# Create regression pipeline
exercise_model = Pipeline(steps=[
    ('preprocessor', preprocessor),
    ('regressor', LinearRegression())
])

# Train model
exercise_model.fit(X_train, y_train)

# Make predictions
y_pred = exercise_model.predict(X_test)

# Evaluate model
print("MAE:", mean_absolute_error(y_test, y_pred))
print("MSE:", mean_squared_error(y_test, y_pred))
print("RMSE:", np.sqrt(mean_squared_error(y_test, y_pred)))
print("R2:", r2_score(y_test, y_pred))

# Get the trained regression model
regressor = exercise_model.named_steps['regressor']

# Get feature names after preprocessing
feature_names = (
    exercise_model
    .named_steps['preprocessor']
    .get_feature_names_out()
)

# Get coefficients and intercept
coefficients = regressor.coef_
intercept = regressor.intercept_

# Print regression equation
equation = f"Calories_Burned = {intercept:.4f}"

for feature, coefficient in zip(feature_names, coefficients):
    sign = "+" if coefficient >= 0 else "-"
    equation += f" {sign} {abs(coefficient):.4f} * {feature}"

print("\nRegression Equation:")
print(equation)

model_path = Path(__file__).parent / "exercise_calories_model.joblib"

joblib.dump(exercise_model, model_path)

print(f"Model saved successfully to: {model_path}")