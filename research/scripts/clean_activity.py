# Clean and reshape the exercise_dataset.csv dataset
import pandas as pd

# ==========================================
# 1. LOAD BASE DATASET
# ==========================================

df = pd.read_csv("exercise_dataset.csv")

# Clean column names
df.columns = df.columns.str.strip()

# ==========================================
# 2. KEEP REQUIRED COLUMNS
# ==========================================

df_clean = df[
    [
        "Activity, Exercise or Sport (1 hour)",
        "130 lb",
        "155 lb",
        "180 lb",
        "205 lb",
        "Calories per kg"
    ]
].copy()

# ==========================================
# 3. RENAME COLUMNS
# ==========================================

df_clean.columns = [
    "Activity",
    "Calories_130lb",
    "Calories_155lb",
    "Calories_180lb",
    "Calories_205lb",
    "Calories_per_kg"
]

# ==========================================
# 4. REMOVE MISSING ACTIVITIES
# ==========================================

df_clean = df_clean.dropna(subset=["Activity"])

# ==========================================
# 5. SAVE CLEANED DATASET
# ==========================================

df_clean.to_csv("cleaned_activity.csv", index=False)

print(df_clean.head())
print("\nFinal shape:", df_clean.shape)

print("\nSaved cleaned_activity.csv")