import { useEffect, useState } from "react";
import { MapContainer, TileLayer, ZoomControl, Polyline, CircleMarker, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";
import L from "leaflet";

const waypoints = [
  [39.75123, -105.222302],
  [39.753914, -105.226298],
  [39.750895, -105.223291],
  [39.748435, -105.222988],
  [39.744379, -105.224428],
  [39.741498, -105.223882],
  [39.740863, -105.222378],
  [39.75123, -105.222302], // Volvemos al inicio
];

// Icono personalizado para el cart.svg
const cartIcon = new L.Icon({
  iconUrl: "/cart.svg",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  className: "cart-icon",
});

// Icono para las paradas
const stopIcon = new L.Icon({
  iconUrl: "/bus.svg", // Usa una imagen de parada
  iconSize: [25, 25],
  iconAnchor: [12, 25],
  popupAnchor: [0, -25],
});

export default function App() {
  const [route, setRoute] = useState([]);
  const [times, setTimes] = useState([]);
  const [cartPosition, setCartPosition] = useState([0, 0]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetch("/route.json")
      .then((res) => res.json())
      .then((data) => setRoute(data.route));

    setTimes(waypoints.map(() => Math.floor(Math.random() * 10) + 1));
  }, []);

  useEffect(() => {
    // Función para obtener la localización del dispositivo
    const getLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCartPosition([latitude, longitude]);
        },
        (error) => {
          console.error("Error obteniendo la localización:", error);
        }
      );
    };

    // Actualizamos la posición cada 15 segundos
    const interval = setInterval(() => {
      getLocation();
    }, 1000); // 15000 ms = 15 segundos

    // Ejecutar una vez al inicio para obtener la localización inmediatamente
    getLocation();

    return () => clearInterval(interval);
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
          <Polyline positions={route} color="#C0C0C0" weight={5} interactive={false} />
        )}

        {waypoints.map((point, index) => (
          <div key={index}>
            <CircleMarker
              center={point}
              radius={7}
              fillColor="#C0C0C0"
              color="#f8f9fa08"
              weight={15}
              fillOpacity={1}
            />
            <Marker position={point} icon={stopIcon}>
              <Popup>Silver - {times[index]} mins</Popup>
            </Marker>
          </div>
        ))}

        <Marker position={cartPosition} icon={cartIcon} />
      </MapContainer>
    </>
  );
}
