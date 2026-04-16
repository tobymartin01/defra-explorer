import React, { useState, useMemo } from "react";
import Fuse from "fuse.js";
import { expandQuery } from "./utils/searchUtils";

import data2025 from "./data/defra_2025_clean.json";
import data2024 from "./data/defra_2024_clean.json";
import data2023 from "./data/defra_2023_clean.json";
import data2022 from "./data/defra_2022_clean.json";

const datasets = {
  2025: data2025,
  2024: data2024,
  2023: data2023,
  2022: data2022
};  


export default function DefraExplorer() {
  const [year, setYear] = useState("2025");
  const [query, setQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [ghgUnitFilter, setGhgUnitFilter] = useState("kg CO2e");
  const [quantity, setQuantity] = useState("");

  const data = datasets[year] || [];

  // ======================
  // Fuse setup
  // ======================
  const fuse = useMemo(() => {
    return new Fuse(data, {
      keys: [
        { name: "name", weight: 0.5 },
        { name: "level1", weight: 0.2 },
        { name: "level2", weight: 0.1 },
        { name: "level3", weight: 0.1 },
        { name: "level4", weight: 0.1 }
      ],
      threshold: 0.4,
      ignoreLocation: true
    });
  }, [data]);

  // ======================
  // Search Logic (simple + stable)
  // ======================
  const results = useMemo(() => {
    if (!query) return [];

    const terms = expandQuery(query);

    let all = [];

    terms.forEach(term => {
      const res = fuse.search(term).slice(0, 50);
      all.push(...res.map(r => r.item));
    });

    // Deduplicate
    const map = new Map();
    all.forEach(item => {
      map.set(item.id, item);
    });

    let final = Array.from(map.values());

    // ======================
    // Filters
    // ======================
    if (scopeFilter) {
      final = final.filter(i => i.scope === scopeFilter);
    }

    if (categoryFilter) {
      final = final.filter(i => i.level1 === categoryFilter);
    }

    if (unitFilter) {
      final = final.filter(i => i.unit === unitFilter);
    }

    if (ghgUnitFilter) {
      final = final.filter(i => i.ghg_unit === ghgUnitFilter);
    }

    return final.slice(0, 50);
  }, [
    query,
    fuse,
    data,
    scopeFilter,
    categoryFilter,
    unitFilter,
    ghgUnitFilter
  ]);

  // ======================
  // Filter options
  // ======================
  const scopes = useMemo(
    () => [...new Set(data.map(d => d.scope))].filter(Boolean).sort(),
    [data]
  );

  const categories = useMemo(
    () => [...new Set(data.map(d => d.level1))].filter(Boolean).sort(),
    [data]
  );

  const units = useMemo(
    () => [...new Set(data.map(d => d.unit))].filter(Boolean).sort(),
    [data]
  );

  const ghgUnits = useMemo(
    () => [...new Set(data.map(d => d.ghg_unit))].filter(Boolean).sort(),
    [data]
  );

  // ======================
  // UI
  // ======================
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
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search (diesel, kerosene, electricity...)"
        style={{
          width: "100%",
          padding: "10px",
          fontSize: "16px",
          marginBottom: "10px"
        }}
      />

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <select value={scopeFilter} onChange={e => setScopeFilter(e.target.value)}>
          <option value="">All Scopes</option>
          {scopes.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select value={unitFilter} onChange={e => setUnitFilter(e.target.value)}>
          <option value="">All Units</option>
          {units.map(u => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>

        <select value={ghgUnitFilter} onChange={e => setGhgUnitFilter(e.target.value)}>
          {ghgUnits.map(u => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>

        <button
          onClick={() => {
            setQuery("");
            setScopeFilter("");
            setCategoryFilter("");
            setUnitFilter("");
            setQuantity("");
            setGhgUnitFilter("kg CO2e");
          }}
        >
          Reset
        </button>
      </div>

      {/* Quantity */}
      <div style={{ marginTop: "10px" }}>
        <input
          type="number"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          placeholder="Enter quantity"
          style={{ padding: "8px", width: "250px" }}
        />
      </div>

      <p>{results.length} results</p>

      {/* Results */}
      <div>
        {results.length === 0 && query && (
          <p>No results found</p>
        )}

        {!query && (
          <p style={{ color: "#777" }}>
            Start searching for emission factors...
          </p>
        )}

        {results.map(item => {
          const emissions = quantity
            ? (quantity * item.factor).toFixed(4)
            : null;

          return (
            <div
              key={`${item.id}-${year}`}
              style={{
                border: "1px solid #ddd",
                padding: "10px",
                marginBottom: "10px",
                borderRadius: "8px"
              }}
            >
              <strong>{item.name}</strong>

              <div style={{ fontSize: "13px", color: "#555" }}>
                {[item.level1, item.level2, item.level3, item.level4]
                  .filter(Boolean)
                  .join(" → ")}
              </div>

              <div>
                <strong>{item.factor}</strong> {item.ghg_unit} / {item.unit}
              </div>

              <div style={{ fontSize: "12px", color: "#777" }}>
                {item.scope} | {year}
              </div>

              {emissions && (
                <div style={{ color: "green", fontWeight: "bold" }}>
                  Emissions: {emissions} {item.ghg_unit}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}