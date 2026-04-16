import pandas as pd
import re

# -------------------------------
# 📥 Load CSV
# -------------------------------
file_path = "defra_2022.csv"

df = pd.read_csv(file_path, encoding="latin1")

# Clean column names (VERY IMPORTANT)
df.columns = df.columns.str.strip()

# -------------------------------
# 🧠 Detect year automatically
# -------------------------------
year_match = re.search(r"(20\d{2})", file_path)
year = int(year_match.group(1)) if year_match else None

# -------------------------------
# 🔍 Detect factor column dynamically
# -------------------------------
factor_col = [col for col in df.columns if "Conversion Factor" in col]

if not factor_col:
    raise Exception("❌ No conversion factor column found")

factor_col = factor_col[0]

# -------------------------------
# 🔁 Rename columns
# -------------------------------
df = df.rename(columns={
    "ID": "id",
    "Scope": "scope",
    "Level 1": "level1",
    "Level 2": "level2",
    "Level 3": "level3",
    "Level 4": "level4",
    "Column Text": "name",
    "UOM": "unit",
    "GHG/Unit": "ghg_unit",
    factor_col: "factor"
})

# -------------------------------
# 🧹 Clean text fields properly
# -------------------------------
text_cols = ["name", "level1", "level2", "level3", "level4", "scope", "unit", "ghg_unit"]

for col in text_cols:
    if col in df.columns:
        df[col] = df[col].astype("string").str.strip()

# -------------------------------
# 🧩 Fix hierarchy gaps
# -------------------------------
for col, parent in [("level2", "level1"), ("level3", "level2"), ("level4", "level3")]:
    if col in df.columns and parent in df.columns:
        df[col] = df[col].replace("", pd.NA)
        df[col] = df[col].fillna(df[parent])

# -------------------------------
# 📅 Add year
# -------------------------------
df["year"] = year

# -------------------------------
# 🧠 Category path
# -------------------------------
df["category_path"] = (
    df["level1"].fillna("") + " > " +
    df["level2"].fillna("") + " > " +
    df["level3"].fillna("") + " > " +
    df["level4"].fillna("")
)

# -------------------------------
# 🏷️ Display name (cleaner)
# -------------------------------
df["display_name"] = df.apply(
    lambda x: f"{x['name']} ({x['unit']})" if pd.notna(x["unit"]) else x["name"],
    axis=1
)

# -------------------------------
# 🔍 Search blob (cleaned)
# -------------------------------
def clean_text(text):
    text = str(text).lower()
    text = re.sub(r"[^\w\s]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()

df["search_blob"] = (
    df["name"].fillna("") + " " +
    df["level1"].fillna("") + " " +
    df["level2"].fillna("") + " " +
    df["level3"].fillna("") + " " +
    df["level4"].fillna("")
).apply(clean_text)

# -------------------------------
# 🔢 Ensure factor is numeric
# -------------------------------
df["factor"] = pd.to_numeric(df["factor"], errors="coerce")

# Drop invalid factors
df = df[df["factor"] > 0]

# -------------------------------
# 🆔 Add unique ID (important for frontend)
# -------------------------------
df["uid"] = df["year"].astype(str) + "_" + df["id"].astype(str)

# -------------------------------
# 📦 Final columns
# -------------------------------
df = df[[
    "uid",
    "id",
    "name",
    "display_name",
    "scope",
    "level1",
    "level2",
    "level3",
    "level4",
    "category_path",
    "unit",
    "ghg_unit",
    "factor",
    "year",
    "search_blob"
]]

# -------------------------------
# 💾 Export
# -------------------------------
output_file = f"defra_{year}_clean.json"
df.to_json(output_file, orient="records", indent=2)

print(f"✅ Cleaned DEFRA data exported to {output_file}")