# Clean and reshape the vitamins-RDAS.csv dataset
import pandas as pd

# ==========================================
# 1. LOAD DATASET
# ==========================================

dfrda = pd.read_csv("vitamins-RDAS.csv")

print("Actual columns:")
print([repr(col) for col in dfrda.columns])

# Remove hidden whitespace from column names
dfrda.columns = dfrda.columns.str.strip()

print("Columns:", dfrda.columns.tolist())

# Verify expected column exists
if "Life-Stage Group" not in dfrda.columns:
    raise ValueError(
        "Life-Stage Group column not found. "
        "Check that the correct vitamins CSV is loaded."
    )
# ==========================================
# 2. RESHAPE DATA
# ==========================================

# Convert nutrient columns into individual rows
df_clean = dfrda.melt(
    id_vars=["Life-Stage Group"],
    var_name="Nutrient",
    value_name="Daily Amount"
)

# ==========================================
# 3. SPLIT AGE GROUP AND SEX
# ==========================================

def extract_sex(group):
    group_lower = group.lower().strip()

    if group_lower.endswith("female"):
        return "Female"
    elif group_lower.endswith("male"):
        return "Male"
    else:
        return "All"
    
df_clean["Sex"] = df_clean["Life-Stage Group"].apply(extract_sex)

df_clean["Age Group"] = df_clean["Life-Stage Group"].str.replace(
    r"\s*(male|female)\s*$",
    "",
    regex=True,
    case=False
).str.strip()

# ==========================================
# 4. STANDARDIZE NUTRIENT NAMES
# ==========================================

df_clean["Nutrient"] = (
    df_clean["Nutrient"]
    .str.replace(r"\s*\([^)]*\)", "", regex=True)
    .str.strip()
)

# ==========================================
# 5. KEEP REQUIRED COLUMNS
# ==========================================

df_clean = df_clean[
    ["Age Group", "Sex", "Nutrient", "Daily Amount"]
]

# ==========================================
# 6. SAVE CLEANED DATASET
# ==========================================

df_clean.to_csv("cleaned_vitamins.csv", index=False)

print(df_clean.head(15))
print("\nFinal shape:", df_clean.shape)

print("\nSaved cleaned_vitamins.csv")