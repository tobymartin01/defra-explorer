import React, { useState, useMemo, useEffect } from "react";
import Fuse from "fuse.js";

// Import datasets
import data2025 from "./data/defra_2025_clean.json";
import data2024 from "./data/defra_2024_clean.json";

const datasets = {
  2025: data2025,
  2024: data2024,
};

export default function DefraExplorer() {
  const [year, setYear] = useState("2025");
  const [query, setQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [ghgUnitFilter, setGhgUnitFilter] = useState("kg CO2e"); // ✅ default
  const [quantity, setQuantity] = useState("");

  const data = datasets[year] || [];

  // Fuse setup
  const fuse = useMemo(() => {
    return new Fuse(data, {
      keys: [
        { name: "name", weight: 0.6 },
        { name: "level1", weight: 0.2 },
        { name: "level2", weight: 0.1 },
        { name: "level3", weight: 0.1 }
      ],
      threshold: 0.3
    });
  }, [data]);

  // Search + filters
  const results = useMemo(() => {
    let filtered = query
      ? fuse.search(query).map(r => r.item)
      : data;

    if (scopeFilter) {
      filtered = filtered.filter(item => item.scope === scopeFilter);
    }

    if (categoryFilter) {
      filtered = filtered.filter(item => item.level1 === categoryFilter);
    }

    if (unitFilter) {
      filtered = filtered.filter(item => item.unit === unitFilter);
    }

    if (ghgUnitFilter) {
      filtered = filtered.filter(item => item.ghg_unit === ghgUnitFilter);
    }

    return filtered.slice(0, 50);
  }, [query, scopeFilter, categoryFilter, unitFilter, ghgUnitFilter, fuse, data]);

  // Filter values
  const scopes = [...new Set(data.map(d => d.scope))].filter(Boolean).sort();
  const categories = [...new Set(data.map(d => d.level1))].filter(Boolean).sort();
  const units = [...new Set(data.map(d => d.unit))].filter(Boolean).sort();
  const ghgUnits = [...new Set(data.map(d => d.ghg_unit))].filter(Boolean).sort();

  // Smart validation on year change
  useEffect(() => {
    if (scopeFilter && !scopes.includes(scopeFilter)) setScopeFilter("");
    if (categoryFilter && !categories.includes(categoryFilter)) setCategoryFilter("");
    if (unitFilter && !units.includes(unitFilter)) setUnitFilter("");

    // Reset GHG unit ONLY if not available
    if (ghgUnitFilter && !ghgUnits.includes(ghgUnitFilter)) {
      setGhgUnitFilter("kg CO2e"); // fallback
    }
  }, [year, scopes, categories, units, ghgUnits]);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h2>DEFRA Factor Finder</h2>

      {/* Year */}
      <div style={{ marginBottom: "15px" }}>
        <label><strong>Select Year: </strong></label>
        <select value={year} onChange={e => setYear(e.target.value)}>
          {Object.keys(datasets).sort((a, b) => b - a).map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search (e.g. diesel, electricity, flight...)"
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{
          width: "100%",
          padding: "10px",
          fontSize: "16px",
          marginBottom: "10px"
        }}
      />

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
        <select value={scopeFilter} onChange={e => setScopeFilter(e.target.value)}>
          <option value="">All Scopes</option>
          {scopes.map(scope => (
            <option key={scope} value={scope}>{scope}</option>
          ))}
        </select>

        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <select value={unitFilter} onChange={e => setUnitFilter(e.target.value)}>
          <option value="">All Units</option>
          {units.map(unit => (
            <option key={unit} value={unit}>{unit}</option>
          ))}
        </select>

        {/* ✅ NEW GHG UNIT FILTER */}
        <select value={ghgUnitFilter} onChange={e => setGhgUnitFilter(e.target.value)}>
          {ghgUnits.map(unit => (
            <option key={unit} value={unit}>{unit}</option>
          ))}
        </select>

        <button onClick={() => {
          setQuery("");
          setScopeFilter("");
          setCategoryFilter("");
          setUnitFilter("");
          setQuantity("");
          setGhgUnitFilter("kg CO2e"); // reset to default
        }}>
          Reset Filters
        </button>
      </div>

      {/* Quantity */}
      <div style={{ marginBottom: "15px" }}>
        <input
          type="number"
          placeholder="Enter quantity (e.g. litres, kWh, km...)"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          style={{ padding: "8px", width: "250px" }}
        />
      </div>

      <p>{results.length} results</p>

      {/* Results */}
      <div>
        {results.length === 0 && <p>No results found</p>}

        {results.map(item => {
          const emissions = quantity
            ? (quantity * item.factor).toFixed(4)
            : null;

          return (
            <div
              key={`${item.id}-${item.name}-${year}`}
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "10px",
                marginBottom: "10px"
              }}
            >
              <strong>{item.name}</strong>

              <div style={{ fontSize: "14px", color: "#555" }}>
                {item.level1} → {item.level2}
              </div>

              <div style={{ marginTop: "5px" }}>
                <strong>{item.factor}</strong> {item.ghg_unit} / {item.unit}
              </div>

              <div style={{ fontSize: "12px", color: "#777" }}>
                {item.scope} | {year}
              </div>

              {emissions && (
                <div style={{ marginTop: "8px", fontWeight: "bold", color: "green" }}>
                  Emissions: {emissions} {item.ghg_unit}
                </div>
              )}

              <button
                onClick={() =>
                  navigator.clipboard.writeText(
                    `${item.factor} ${item.ghg_unit}/${item.unit} (${item.name}, ${year})`
                  )
                }
                style={{ marginTop: "5px" }}
              >
                Copy
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}