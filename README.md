
# 🌍 DEFRA Emissions Factor Explorer

A fast, searchable React tool for exploring UK DEFRA greenhouse gas (GHG) conversion factors across multiple years.

Built for carbon accounting, sustainability analysis, and quick emissions calculations.

---

## 🚀 Features

### 🔍 Fuzzy Search

- Powered by Fuse.js
- Search by:
  - fuel (e.g. diesel, petrol)
  - activity (e.g. flights, electricity)
  - categories

---

### 🧠 Smart Filtering

Filter results by:

- 📅 Year (2024, 2025, etc.)
- 🏢 Scope (Scope 1, 2, 3)
- 📂 Category (Level 1)
- 📏 Unit (e.g. kWh, litres, km)
- 🌱 GHG Unit (defaults to **kg CO2e**)

---

### 🧮 Emissions Calculator

- Enter a quantity (e.g. 100 kWh)
- Instantly calculates emissions:
  - Emissions = Quantity × Emission Factor

---


### 📋 Copy to Clipboard

Quickly copy formatted factors:

0.233 kg CO2e/kWh (Electricity, 2025)

---

### ⚡ Performance Optimised

- Results limited to 50 rows
- Precomputed search blobs
- Fast filtering per selected year

---

## 🗂️ Data Structure

Each dataset is cleaned into a standard JSON format:

```json
{
  "id": "1",
  "name": "Electricity: UK",
  "display_name": "Electricity: UK (kWh)",
  "scope": "Scope 2",
  "level1": "Energy",
  "level2": "Electricity",
  "unit": "kWh",
  "ghg_unit": "kg CO2e",
  "factor": 0.233,
  "year": 2025
}

---
```
