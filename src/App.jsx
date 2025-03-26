import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, ZoomControl, Polyline, CircleMarker, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";
import L from "leaflet";

const DEFAULT_CENTER = [39.747389, -105.224338];

// Configuración de rutas
const ROUTE_CONFIG = {
  silver: {
    waypoints: [
      [39.75123, -105.222302],
      [39.753914, -105.226298],
      [39.750895, -105.223291],
      [39.748435, -105.222988],
      [39.744379, -105.224428],
      [39.741498, -105.223882],
      [39.740863, -105.222378],
      [39.75123, -105.222302],
    ],
    color: "#C0C0C0",
    name: "Silver"
  },
  gold: {
    waypoints: [
      [39.750935, -105.223237],
      [39.753907, -105.226313],
      [39.756039, -105.222487],
      [39.757543, -105.223379],
      [39.756377, -105.225459],
      [39.756196, -105.230609],
      [39.755357, -105.232509],
      [39.754936, -105.234001],
      [39.763007, -105.225173],
      [39.766196, -105.228185],
      [39.766094, -105.233333],
      [39.765772, -105.231512],
      [39.754295, -105.221145],
      [39.750935, -105.223237],
    ],
    color: "#FFD700",
    name: "Gold"
  }
};

// Iconos
const createIcon = (url, size, anchor) => new L.Icon({
  iconUrl: url,
  iconSize: size,
  iconAnchor: anchor,
});

const cartIcon = createIcon("/cart.svg", [30, 30], [15, 15]);
const stopIcon = createIcon("/bus.svg", [25, 25], [12, 25]);
const driverIcon = createIcon("/driver.svg", [40, 40], [20, 20]);

export default function App() {
  const [route, setRoute] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState("silver");
  const [times, setTimes] = useState([]);
  const [position, setPosition] = useState(DEFAULT_CENTER);
  const [mode, setMode] = useState("user");
  const socketRef = useRef(null);

  // Obtener configuración de ruta actual
  const currentRoute = ROUTE_CONFIG[selectedRoute];

  // WebSocket connection
  useEffect(() => {
    // Conexión WebSocket a la API de ORECART
    const socketUrl = "wss://tracker-backendgun.onrender.com/ws/location/";
    const ws = new WebSocket(socketUrl);
    
    ws.onopen = () => {
      console.log("WebSocket conectado");
      ws.send(JSON.stringify({ user_id: "unknown" })); // Iniciar la conexión WebSocket
      if (mode === "driver") startLocationSharing();
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (mode === "user") {
        setPosition([data.latitude, data.longitude]);
      }
    };

    ws.onerror = (error) => console.error("Error WebSocket:", error);
    ws.onclose = () => console.log("WebSocket desconectado");

    socketRef.current = ws;

    return () => ws.close();
  }, [mode]);

  // Función para enviar ubicación del conductor
  const updateLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      setPosition([latitude, longitude]);
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          user_id: "unknown", // id de usuario
          latitude,
          longitude,
          mode: "driver"
        }));
      }
    });
  };

  // Obtener los últimos datos de la ubicación al cargar la app.
  useEffect(() => {
    fetch("https://tracker-backendgun.onrender.com/api/location/")
      .then((res) => res.json())
      .then((data) => {
        setPosition([data.latitude, data.longitude]);
      })
      .catch((error) => console.error("Error al obtener ubicación inicial:", error));
  }, []);

  // Obtener datos de la ruta
  useEffect(() => {
    fetch(`/${selectedRoute}-route.json`)
      .then((res) => res.json())
      .then((data) => {
        setRoute(data.route || currentRoute.waypoints);
        setTimes((data.route || currentRoute.waypoints).map(() => Math.floor(Math.random() * 10) + 1));
      })
      .catch((error) => {
        console.error("Error cargando la ruta:", error);
        setRoute(currentRoute.waypoints);
        setTimes(currentRoute.waypoints.map(() => Math.floor(Math.random() * 10) + 1));
      });
  }, [selectedRoute]);

  return (
    <div className="app-container">
      <div className="top-bar">
        <span className="title">ORECART</span>
        <div className="controls">
          <select 
            value={selectedRoute}
            onChange={(e) => setSelectedRoute(e.target.value)}
            className="route-select"
          >
            {Object.keys(ROUTE_CONFIG).map(route => (
              <option key={route} value={route}>
                {ROUTE_CONFIG[route].name} Route
              </option>
            ))}
          </select>

          <button
            className={`mode-toggle ${mode === 'driver' ? 'driver' : ''}`}
            onClick={() => {
              if (mode === "driver") {
                setMode("user");
              } else {
                const password = prompt("Password:");
                if (password === "1234") setMode("driver");
              }
            }}
          >
            {mode === "driver" ? "DRIVER MODE" : "USER MODE"}
          </button>

          {mode === "driver" && (
            <button 
              className="update-button"
              onClick={updateLocation}
            >
              Update Location
            </button>
          )}
        </div>
      </div>

      <MapContainer center={DEFAULT_CENTER} zoom={14} className="map">
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {route.length > 0 && (
          <Polyline
            key={selectedRoute} // Forzamos re-render al cambiar la ruta
            positions={route}
            color={currentRoute.color} // Aplicamos el color correcto
            weight={5}
            interactive={false}
          />
        )}

        {currentRoute.waypoints.map((point, index) => (
          <div key={index}>
            <CircleMarker
              center={point}
              radius={7}
              fillColor={currentRoute.color}
              color="#f8f9fa08"
              weight={15}
              fillOpacity={1}
            />
            <Marker position={point} icon={stopIcon}>
              <Popup>{currentRoute.name} - {times[index]} mins</Popup>
            </Marker>
          </div>
        ))}

        <Marker position={position} icon={mode === "driver" ? driverIcon : cartIcon}>
          <Popup>{mode === "driver" ? "Driver Position" : "Cart Location"}</Popup>
        </Marker>

        <ZoomControl position="bottomright" />
      </MapContainer>
    </div>
  );
}
