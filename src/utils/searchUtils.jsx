import { synonymMap } from "./synonyms";

// Typo correction
const typoMap = {
  desiel: "diesel",
  kerosine: "kerosene",
  electrcity: "electricity",
  petorl: "petrol"
};

export function normalise(query) {
  const q = query.toLowerCase().trim();
  return typoMap[q] || q;
}

// Synonym expansion
export function expandQuery(query) {
  const q = normalise(query);

  let expanded = [q];

  if (synonymMap[q]) {
    expanded.push(...synonymMap[q]);
  }

  for (const [key, values] of Object.entries(synonymMap)) {
    if (values.includes(q)) {
      expanded.push(key, ...values);
    }
  }

  return [...new Set(expanded)]; // ✅ array, NOT string
}