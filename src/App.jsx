import { useEffect, useState } from "react"
import { MapContainer, TileLayer, ZoomControl, Polyline, CircleMarker, Marker, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import "./App.css"
import L from "leaflet"

const waypoints = [
  [39.75123, -105.222302],
  [39.753914, -105.226298],
  [39.750895, -105.223291],
  [39.748435, -105.222988],
  [39.744379, -105.224428],
  [39.741498, -105.223882],
  [39.740863, -105.222378],
  [39.75123, -105.222302], // Volvemos al inicio
]

// Definir un icono personalizado para el cart.svg
const cartIcon = new L.Icon({
  iconUrl: "/cart.svg",
  iconSize: [30, 30], // Tamaño del icono
  iconAnchor: [15, 15], // Centro del icono
  className: "cart-icon", // Clase CSS para aplicar filtro
})

export default function App() {
  const [route, setRoute] = useState([]);
  const [times, setTimes] = useState([]);

  useEffect(() => {
    fetch("/route.json")
      .then((res) => res.json())
      .then((data) => setRoute(data.route));

    // Generar tiempos aleatorios para cada waypoint
    setTimes(waypoints.map(() => Math.floor(Math.random() * 10) + 1));
  }, []);

  return (
    <>
      <MapContainer
        center={[39.747389, -105.224338]}
        zoom={14}
        zoomControl={false}
        className="map"
        minZoom={13}
        maxZoom={18}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <ZoomControl position="bottomright" />

        {route.length > 0 && (
          <Polyline 
            positions={route} 
            color="#C0C0C0" 
            weight={5} 
            interactive={false}
          />
        )}

        {waypoints.map((point, index) => (
          <CircleMarker
            key={index}
            center={point}
            radius={7}
            fillColor="#C0C0C0"
            // casi transparente
            color= "#f8f9fa08"
            weight={15}
            fillOpacity={1}
          >
            <Popup>Silver - {times[index]} mins</Popup>
          </CircleMarker>
        ))}

        <Marker position={[39.748611, -105.219873]} icon={cartIcon} />
      </MapContainer>
    </>
  )
}

