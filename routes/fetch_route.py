import requests
import json

# Coordenadas de los puntos de la ruta
waypoints = [
    [39.75123, -105.222302],
    [39.753914, -105.226298],
    [39.750895, -105.223291],
    [39.748435, -105.222988],
    [39.744379, -105.224428],
    [39.741498, -105.223882],
    [39.740863, -105.222378],
    [39.75123, -105.222302],  # Cierra la ruta
]

# Convertimos las coordenadas al formato esperado por OSRM (lon, lat)
waypoints_str = ";".join([f"{lon},{lat}" for lat, lon in waypoints])

# URL de la API de OSRM
url = f"https://router.project-osrm.org/route/v1/driving/{waypoints_str}?overview=full&geometries=geojson"

# Realizamos la petición
response = requests.get(url)
data = response.json()

# Extraemos la geometría de la ruta si existe
if "routes" in data and len(data["routes"]) > 0:
    route_geometry = data["routes"][0]["geometry"]["coordinates"]
    # Guardamos la ruta en un archivo JSON (lat, lon)
    route_data = {"route": [[lat, lon] for lon, lat in route_geometry]}

    with open("public/route.json", "w") as f:
        json.dump(route_data, f, indent=4)

    print("Ruta guardada en 'public/route.json'")
else:
    print("No se pudo obtener la ruta.")
