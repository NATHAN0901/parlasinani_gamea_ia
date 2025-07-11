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
