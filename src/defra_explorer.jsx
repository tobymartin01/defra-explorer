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
  const [darkMode, setDarkMode] = useState(false);

  const [footprint, setFootprint] = useState([]);
  const [page, setPage] = useState("explorer");

  const [recentlyAdded, setRecentlyAdded] = useState({});
  const [expanded, setExpanded] = useState({}); // ✅ NEW

  const data = datasets[year] || [];

  const theme = {
    background: darkMode ? "#121212" : "#ffffff",
    text: darkMode ? "#e5e5e5" : "#000000",
    card: darkMode ? "#1e1e1e" : "#ffffff",
    border: darkMode ? "#333" : "#ddd",
    subtext: darkMode ? "#aaa" : "#555"
  };

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

  const results = useMemo(() => {
    if (!query) return [];

    const terms = expandQuery(query);
    let all = [];

    terms.forEach(term => {
      const res = fuse.search(term).slice(0, 50);
      all.push(...res.map(r => r.item));
    });

    const map = new Map();
    all.forEach(item => map.set(item.id, item));

    let final = Array.from(map.values());

    if (scopeFilter) final = final.filter(i => i.scope === scopeFilter);
    if (categoryFilter) final = final.filter(i => i.level1 === categoryFilter);
    if (unitFilter) final = final.filter(i => i.unit === unitFilter);
    if (ghgUnitFilter) final = final.filter(i => i.ghg_unit === ghgUnitFilter);

    return final.slice(0, 50);
  }, [query, fuse, scopeFilter, categoryFilter, unitFilter, ghgUnitFilter]);

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
  // Add to Footprint
  // ======================
  const addToFootprint = (item, emissions) => {
    const newItem = {
      id: item.id,
      name: item.name,
      scope: item.scope,
      category: item.level1,
      level2: item.level2,
      level3: item.level3,
      level4: item.level4,
      category_path: item.category_path,
      factor: item.factor, // ✅ FIX: needed for editing
      emissions: parseFloat(emissions),
      quantity: parseFloat(quantity),
      unit: item.unit,
      ghg_unit: item.ghg_unit,
      year
    };

    setFootprint(prev => {
      const existing = prev.find(
        p => p.id === item.id && p.year === year
      );

      if (existing) {
        return prev.map(p =>
          p.id === item.id && p.year === year
            ? {
                ...p,
                quantity: p.quantity + newItem.quantity,
                emissions: p.emissions + newItem.emissions
              }
            : p
        );
      }

      return [...prev, newItem];
    });

    const key = `${item.id}-${year}`;
    setRecentlyAdded(prev => ({ ...prev, [key]: true }));

    setTimeout(() => {
      setRecentlyAdded(prev => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }, 1500);
  };

  // ======================
  // Edit / Delete
  // ======================
  const deleteItem = (index) => {
    setFootprint(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuantity = (index, newQty) => {
    setFootprint(prev =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const qty = parseFloat(newQty) || 0;

        return {
          ...item,
          quantity: qty,
          emissions: qty * item.factor // ✅ recalculates correctly
        };
      })
    );
  };

  const toggleExpand = (index) => {
    setExpanded(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // ======================
// CSV EXPORT
// ======================
const exportToCSV = () => {
  if (!footprint.length) return;

  const headers = [
    "Scope",
    "Category (Level1)",
    "Level2",
    "Level3",
    "Level4",
    "Name",
    "Quantity",
    "Unit",
    "Emission Factor",
    "Emissions",
    "GHG Unit",
    "Year"
  ];

  const rows = footprint.map(item => [
    item.scope,
    item.category,
    item.level2 || "",
    item.level3 || "",
    item.level4 || "",
    item.name,
    item.quantity,
    item.unit,
    item.factor,
    item.emissions,
    item.ghg_unit,
    item.year
  ]);

  const csvContent = [headers, ...rows]
    .map(row =>
      row
        .map(val => `"${String(val ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `footprint_${year}.csv`;
  link.click();

  URL.revokeObjectURL(url); // ✅ cleanup
};



  // ======================
  // Footprint Page
  // ======================
  const FootprintPage = () => {
    const grouped = {};

    footprint.forEach(item => {
      const key = `${item.scope}__${item.category}`;

      if (!grouped[key]) {
        grouped[key] = {
          scope: item.scope,
          category: item.category,
          total: 0
        };
      }

      grouped[key].total += item.emissions;
    });

    const groupedArray = Object.values(grouped);
    const total = footprint.reduce((sum, i) => sum + i.emissions, 0);

    return (
      <div>
        <h2>Footprint Summary</h2>
        <h3>Total: {total.toFixed(2)} kg CO2e</h3>

        <button
          onClick={exportToCSV}
          style={{
            marginBottom: "15px",
            padding: "8px 12px",
            cursor: "pointer",
            borderRadius: "6px",
            border: `1px solid ${theme.border}`,
            background: theme.card,
            color: theme.text
          }}
        >
          📤 Export CSV
        </button>

        {groupedArray.map((g, i) => (
          <div
            key={i}
            style={{
              border: `1px solid ${theme.border}`,
              padding: "10px",
              marginBottom: "10px",
              borderRadius: "8px",
              background: theme.card
            }}
          >
            <strong>{g.scope}</strong> → {g.category}
            <div>{g.total.toFixed(2)} kg CO2e</div>
          </div>
        ))}

        <h3 style={{ marginTop: "20px" }}>Entries</h3>

        {footprint.map((item, i) => (
          <div
            key={i}
            style={{
              border: `1px solid ${theme.border}`,
              padding: "10px",
              marginBottom: "10px",
              borderRadius: "8px",
              background: theme.card
            }}
          >
            <strong>{item.scope}: {item.level2}, {item.level3}</strong>

            <div>
              {item.emissions.toFixed(2)} {item.ghg_unit}
            </div>

            <div style={{ marginTop: "5px" }}>
              <button onClick={() => toggleExpand(i)}>
                {expanded[i] ? "Hide Details" : "View Details"}
              </button>

              <button
                onClick={() => deleteItem(i)}
                style={{ marginLeft: "10px" }}
              >
                Delete
              </button>
            </div>

            {expanded[i] && (
              <div style={{ marginTop: "10px", fontSize: "14px" }}>
                <div>Scope: {item.scope}</div>
                <div>Category: {item.category}</div>
                <div>Factor: {item.factor}</div>

                <div style={{ marginTop: "5px" }}>
                  Quantity:
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      updateQuantity(i, e.target.value)
                    }
                    style={{ marginLeft: "5px", width: "100px" }}
                  />
                  <span style={{ marginLeft: "5px" }}>{item.unit}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ======================
  // UI
  // ======================
  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "Arial",
        background: theme.background,
        color: theme.text,
        minHeight: "100vh",
        position: "relative"
      }}
    >
      <h2>DEFRA Factor Finder</h2>

      <div style={{ marginBottom: "15px" }}>
        <button onClick={() => setPage("explorer")}>Explorer</button>
        <button onClick={() => setPage("footprint")}>
          Footprint ({footprint.length})
        </button>
      </div>

      <div style={{ position: "absolute", top: 20, right: 20 }}>
        <button onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? "☀️ Light" : "🌙 Dark"}
        </button>
      </div>

      {page === "explorer" && (
        <>
          <div style={{ marginBottom: "15px" }}>
            <label><strong>Select Year: </strong></label>
            <select value={year} onChange={e => setYear(e.target.value)}>
              {Object.keys(datasets).map(y => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </div>

          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search..."
            style={{ width: "100%", padding: "10px" }}
          />

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "10px" }}>
            <select value={scopeFilter} onChange={e => setScopeFilter(e.target.value)}>
              <option value="">All Scopes</option>
              {scopes.map(s => <option key={s}>{s}</option>)}
            </select>

            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>

            <select value={unitFilter} onChange={e => setUnitFilter(e.target.value)}>
              <option value="">All Units</option>
              {units.map(u => <option key={u}>{u}</option>)}
            </select>

            <select value={ghgUnitFilter} onChange={e => setGhgUnitFilter(e.target.value)}>
              {ghgUnits.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>

          <input
            type="number"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            placeholder="Enter quantity"
            style={{ marginTop: "10px" }}
          />

          <p>{results.length} results</p>

          {results.map(item => {
            const emissions = quantity
              ? (quantity * item.factor).toFixed(4)
              : null;

            const key = `${item.id}-${year}`;
            const isAdded = recentlyAdded[key];

            return (
              <div
                key={key}
                style={{
                  border: `1px solid ${theme.border}`,
                  padding: "10px",
                  marginBottom: "10px",
                  borderRadius: "8px",
                  background: theme.card
                }}
              >
                <strong>{item.name}</strong>

                <div style={{ fontSize: "13px", color: theme.subtext }}>
                  {[item.level1, item.level2, item.level3, item.level4]
                    .filter(Boolean)
                    .join(" → ")}
                </div>

                <div>
                  <strong>{item.factor}</strong> {item.ghg_unit} / {item.unit}
                </div>

                <div style={{ fontSize: "12px", color: theme.subtext }}>
                  {item.scope} | {year}
                </div>

                {emissions && (
                  <>
                    <div style={{ color: "lightgreen", fontWeight: "bold" }}>
                      Emissions: {emissions} {item.ghg_unit}
                    </div>

                    <button
                      onClick={() => addToFootprint(item, emissions)}
                      disabled={isAdded}
                      style={{
                        marginTop: "6px",
                        padding: "6px 10px",
                        cursor: isAdded ? "default" : "pointer",
                        borderRadius: "6px",
                        border: `1px solid ${theme.border}`,
                        background: isAdded ? "#4caf50" : theme.card,
                        color: isAdded ? "#fff" : theme.text,
                        transition: "0.2s",
                        transform: isAdded ? "scale(1.05)" : "scale(1)"
                      }}
                    >
                      {isAdded ? "✓ Added" : "➕ Add to Footprint"}
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </>
      )}

      {page === "footprint" && <FootprintPage />}
    </div>
  );
}