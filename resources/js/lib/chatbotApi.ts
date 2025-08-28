// src/api/chatbotApi.ts
// resources/js/lib/chatbotApi.ts

export const getCategories = async () => {
  const response = await fetch('https://ciudadania.elalto.gob.bo/api/categories/all', { 
    method: 'GET' 
  });
  if (!response.ok) throw new Error('Failed to fetch categories');
  return response.json();
};

export const getProceduresByCategory = async (categoryId: string) => {
  const response = await fetch(`https://ciudadania.elalto.gob.bo/api/procedures/${categoryId}/category`, { 
    method: 'GET' 
  });
  if (!response.ok) throw new Error(`Failed to fetch procedures for category ${categoryId}`);
  return response.json();
};

export const getRequirementsByProcedure = async (procedureId: string) => {
  const response = await fetch(`https://ciudadania.elalto.gob.bo/api/requirements/${procedureId}/procedure`, { 
    method: 'GET' 
  });
  if (!response.ok) throw new Error(`Failed to fetch requirements for procedure ${procedureId}`);
  return response.json();
};

// resources/js/lib/chatbotApi.ts  (o src/api/chatbotApi.ts)

// Base de la API de ML (puedes moverlo a .env: VITE_ML_API)
const ML_BASE =(import.meta as unknown as { env?: { VITE_ML_API?: string } }).env?.VITE_ML_API ?? "http://localhost:9000";

// ===== API de ML =====
export async function predictCategory(text: string) {
  const r = await fetch(`${ML_BASE}/predict_category`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!r.ok) throw new Error(`predict_category HTTP ${r.status}`);
  return r.json(); // { categoria: { id, name, confidence } }
}

export async function predictSubcategory(text: string, cat_id: number) {
  const r = await fetch(`${ML_BASE}/predict_subcategory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, cat_id }),
  });
  if (!r.ok) throw new Error(`predict_subcategory HTTP ${r.status}`);
  return r.json(); // { subcategoria: { id_model, ext_id, name|null, confidence } }
}
