
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

# Define independent variables
X = dfcal.drop(
    [
        'Daily_Calorie_Requirement',
        'Daily_Calorie_Consumed',
        'Diet_Type',
        'Health_Status',
        'Person_ID',
        'Activity_Level'
    ],
    axis=1
)

# Define dependent variable
y = dfcal['Daily_Calorie_Requirement']

# Split dataset
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Standardize features
scaler = StandardScaler()

X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Train Linear Regression model
model = LinearRegression()
model.fit(X_train_scaled, y_train)

# Predict
y_pred = model.predict(X_test_scaled)

# Evaluate model
print("Intercept:", model.intercept_)

print("Coefficients:",
      dict(zip(X.columns, model.coef_)))

print("R-squared:", r2_score(y_test, y_pred))

print("Mean Squared Error:",
      mean_squared_error(y_test, y_pred))

print("Root Mean Squared Error:",
      np.sqrt(mean_squared_error(y_test, y_pred)))
