
import pandas as pd
import numpy as np

from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

# Load dataset
dfcal = pd.read_csv('healthy_diet_calorie_intake.csv')

# Encode Gender
dfcal['Gender'], unique_labels = pd.factorize(dfcal['Gender'])
dfcal['Activity_Level'], unique_labels = pd.factorize(dfcal['Activity_Level'])
dfcal['Health_Status'], unique_labels = pd.factorize(dfcal['Health_Status'])
dfcal['Diet_Type'], unique_labels = pd.factorize(dfcal['Diet_Type'])
# Define independent variables
X = dfcal.drop(
    [
        'Daily_Calorie_Requirement',
        'Daily_Calorie_Consumed',
        'Person_ID'
    ],
    axis=1
)

# Define dependent variable
y = dfcal['Daily_Calorie_Requirement']

# Split dataset
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=24
)

# Standardize features
scaler = StandardScaler()

X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Train Linear Regression model
cal_model = LinearRegression()
cal_model.fit(X_train_scaled, y_train)

# Predict
y_pred = cal_model.predict(X_test_scaled)

# Evaluate model
print("Intercept:", cal_model.intercept_)

print("Coefficients:",
      dict(zip(X.columns, cal_model.coef_)))

print("R-squared:", r2_score(y_test, y_pred))

print("Mean Squared Error:",
      mean_squared_error(y_test, y_pred))

print("Root Mean Squared Error:",
      np.sqrt(mean_squared_error(y_test, y_pred)))

import joblib

# Save the model to disk
joblib.dump(cal_model, 'dietary_cal_model.joblib')
