from flask import Flask, send_from_directory, request, jsonify
import os
import json

app = Flask(__name__)

# Ruta para servir el archivo index.html
@app.route('/')
def serve_index():
    return send_from_directory(os.getcwd(), 'index.html')

# Ruta para servir el archivo backend.js
@app.route('/backend.js')
def serve_backend():
    return send_from_directory(os.getcwd(), 'backend.js')

# Ruta para servir archivos dentro del directorio boards
@app.route('/boards/<path:filename>')
def serve_boards_files(filename):
    return send_from_directory(os.path.join(os.getcwd(), 'boards'), filename)

@app.route('/boards', methods=['POST'])
def list_boards():
    data = request.get_json()
    path = data.get('path', 'boards')  # Si no se especifica el path, usar 'boards' por defecto
    
    # Asegurarse de que la ruta es segura y se construye correctamente
    target_path = os.path.join(os.getcwd(), 'boards', *path.split('/'))  # Unir correctamente la ruta
    target_path = os.path.normpath(target_path)  # Normalizar la ruta para evitar path traversal

    print("🧭 Listando:", target_path)

    # Verificar que la ruta esté dentro de 'boards'
    if not target_path.startswith(os.path.join(os.getcwd(), 'boards')):
        return jsonify({"error": "Acceso denegado"}), 403  # Si está fuera de 'boards', acceso denegado

    # Comprobar si la ruta existe
    if not os.path.exists(target_path):
        return jsonify({"error": "Ruta no existe"}), 404

    try:
        # Listar los ítems en el directorio
        items = os.listdir(target_path)
        result = []
        
        for item in items:
            item_path = os.path.join(target_path, item)
            # Verificar si el ítem es un archivo o carpeta
            if os.path.isdir(item_path):
                result.append({"name": item, "type": "directory"})
            elif os.path.isfile(item_path):
                result.append({"name": item, "type": "file"})
        
        return jsonify({"items": result})  # Devolver los ítems con su tipo (archivo o carpeta)
    
    except Exception as e:
        print("❌ Error al listar:", e)
        return jsonify({"error": str(e)}), 500

@app.route('/readfile', methods=['POST'])
def read_file():
    data = request.get_json()
    path = data.get('path', '')

    # Asegurarse de que la ruta sea segura
    target_path = os.path.join(os.getcwd(), 'boards', *path.split('/'))
    target_path = os.path.normpath(target_path)

    # Verificar que la ruta esté dentro de 'boards'
    if not target_path.startswith(os.path.join(os.getcwd(), 'boards')):
        return jsonify({"error": "Acceso denegado"}), 403

    # Verificar que el archivo exista
    if not os.path.isfile(target_path):
        return jsonify({"error": "El archivo no existe"}), 404

    try:
        # Leer el contenido del archivo
        with open(target_path, 'r', encoding='utf-8') as file:
            file_content = file.read()
        parsed_content = json.loads(file_content)  # Aquí parseamos el contenido

        # Devolver como JSON al cliente
        return jsonify(parsed_content)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route('/savefile', methods=['POST'])
def save_file():
    data = request.get_json()

    # Validación básica
    path = data.get('path')
    content = data.get('content')

    if not path or content is None:
        return jsonify({"error": "Faltan parámetros (path o content)"}), 400

    # Base segura
    base_directory = os.path.join(os.getcwd(), 'boards')
    normalized_path = os.path.normpath(path)
    safe_path = os.path.join(base_directory, normalized_path)

    # Prevención de path traversal
    if not safe_path.startswith(base_directory):
        return jsonify({"error": "Ruta fuera del directorio permitido"}), 400

    try:
        os.makedirs(os.path.dirname(safe_path), exist_ok=True)

        # Evitar sobreescritura si ya existe
        if os.path.exists(safe_path):
            return jsonify({"error": "El archivo ya existe"}), 400

        # Guardar el archivo como JSON
        with open(safe_path, 'w', encoding='utf-8') as f:
            json.dump(content, f, indent=4, ensure_ascii=False)

        print(f"✅ Guardado en: {safe_path}")
        return jsonify({"message": "Archivo guardado correctamente"}), 200

    except Exception as e:
        print("❌ Error al guardar el archivo:", e)
        return jsonify({"error": str(e)}), 500

# Correr el servidor
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=3000)
