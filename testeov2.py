import requests

def get_categories(base_url):
    """
    Fetches all categories from the API.
    """
    url = f"{base_url}/api/categories/all"
    try:
        # !!! WARNING: verify=False disables SSL certificate verification !!!
        # Do not use in production without understanding the security implications.
        response = requests.get(url, verify=False)
        response.raise_for_status()  # Raise an exception for HTTP errors
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
        # Apply verify=False here as well if needed
        response = requests.get(url, verify=False)
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
        # Apply verify=False here as well if needed
        response = requests.get(url, verify=False)
        response.raise_for_status()
        return response.json().get("1") # Assuming '1' is the key for requirements
    except requests.exceptions.RequestException as e:
        print(f"Error fetching requirements for procedure {procedure_id}: {e}")
        return None

def main():
    base_url = "https://ciudadania.elalto.gob.bo/"  # Updated base URL from your error message

    # 1. Get all categories
    categories = get_categories(base_url)
    if not categories:
        return

    print("--- Categories ---")
    for i, category in enumerate(categories):
        print(f"{i+1}. ID: {category['id']}, Nombre: {category['nombre_categoria']}")

    selected_category_id = None
    while selected_category_id is None:
        try:
            choice = input("\nEnter the number of the category you want to select: ")
            index = int(choice) - 1
            if 0 <= index < len(categories):
                selected_category_id = categories[index]['id']
                print(f"Selected category: {categories[index]['nombre_categoria']}")
            else:
                print("Invalid category number. Please try again.")
        except ValueError:
            print("Invalid input. Please enter a number.")

    print(f"\n--- Procedures for Selected Category ID {selected_category_id} ---")

    # 2. Get procedures for the selected category
    procedures = get_procedures_by_category(base_url, selected_category_id)
    if not procedures:
        return

    for i, procedure in enumerate(procedures):
        print(f"{i+1}. ID: {procedure['id']}, Nombre: {procedure['nombre_tramite']}")
        print(f"    Description: {procedure['descripcion_tramite']}")

    selected_procedure_id = None
    while selected_procedure_id is None:
        try:
            choice = input("\nEnter the number of the procedure you want to select: ")
            index = int(choice) - 1
            if 0 <= index < len(procedures):
                selected_procedure_id = procedures[index]['id']
                print(f"Selected procedure: {procedures[index]['nombre_tramite']}")
            else:
                print("Invalid procedure number. Please try again.")
        except ValueError:
            print("Invalid input. Please enter a number.")

    print(f"\n--- Requirements for Selected Procedure ID {selected_procedure_id} ---")

    # 3. Get requirements for the selected procedure
    requirements = get_requirements_by_procedure(base_url, selected_procedure_id)
    if not requirements:
        return

    for requirement in requirements:
        print(f"ID: {requirement['id']}, Nombre: {requirement['nombre_requisito']}")

if __name__ == "__main__":
    main()