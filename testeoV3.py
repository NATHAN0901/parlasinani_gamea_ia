import requests

def get_categories(base_url):
    """
    Fetches all categories from the API.
    """
    url = f"{base_url}/api/categories/all"
    try:
        response = requests.get(url,verify=False)
        response.raise_for_status()  
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching categories: {e}")
        return None

def get_procedures_by_category(base_url, category_id):
    """
    Fetches procedures for a given category ID.
    """
    url = f"{base_url}/api/procedures/{category_id}/category"
    try:
        response = requests.get(url,verify=False)
        response.raise_for_status()
        return response.json().get("procedures")
    except requests.exceptions.RequestException as e:
        print(f"Error fetching procedures for category {category_id}: {e}")
        return None

def get_requirements_by_procedure(base_url, procedure_id):
    """
    Fetches requirements for a given procedure ID.
    """
    url = f"{base_url}/api/requirements/{procedure_id}/procedure"
    try:
        response = requests.get(url,verify=False)
        response.raise_for_status()
        return response.json().get("1") 
    except requests.exceptions.RequestException as e:
        print(f"Error fetching requirements for procedure {procedure_id}: {e}")
        return None

def main():
    base_url = "https://ciudadania.elalto.gob.bo"  
    categories = get_categories(base_url)
    if not categories:
        return

    print("--- Categories ---")
    con_Categoria =0
    for category in categories:
        print(f"ID: {category['id']}, Nombre categoria: {category['nombre_categoria']}")
        con_Categoria=con_Categoria+1
        selected_category_id=category['id']
        print(f"\n--- Procedures for Category ID {selected_category_id} (VEHÍCULOS) ---")
        procedures = get_procedures_by_category(base_url, selected_category_id)
        conSubcategorias=0
        for procedure in procedures:
            print(f"ID: {procedure['id']}, Nombre: {procedure['nombre_tramite']}")
            print(f"  Description: {procedure['descripcion_tramite']}")
            conSubcategorias=conSubcategorias+1
            selected_procedure_id=procedure['id']
            cantidadRequiistoSubcategorias=0
            print(f"\n--- Requirements for Procedure ID {selected_procedure_id} (SU ___ SUBCATEGORIA) ---")
            requirements = get_requirements_by_procedure(base_url, selected_procedure_id)
            for requirement in requirements:
                print(f"ID: {requirement['id']}, Nombre: {requirement['nombre_requisito']}")
                cantidadRequiistoSubcategorias=cantidadRequiistoSubcategorias+1
            print("cantidad de REquisitos de cada Subcategoria es la siguiente",cantidadRequiistoSubcategorias)
            break
        print("lA CANTIDAD DE CADA SUB CATEGORIAS DE CADA CATEGORIA DES LA SIGUIENTE ",conSubcategorias)        
    print("EL NUMERO DE CATEGORIA DE ES : " ,con_Categoria)
     
if __name__ == "__main__":
        main()
                
