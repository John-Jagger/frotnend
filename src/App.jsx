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
  },
  other: {
    waypoints: [
      [39.745, -105.215],
      [39.746, -105.220],
      [39.747, -105.225],
      [39.748, -105.230],
      [39.745, -105.215],
    ],
    color: "#FF6347",
    name: "Other"
  }
};

// Configuración de conductores
const DRIVERS_CONFIG = {
  silver: [
    { id: 1, name: "Silver Driver 1", position: DEFAULT_CENTER },
    { id: 2, name: "Silver Driver 2", position: DEFAULT_CENTER }
  ],
  gold: [
    { id: 3, name: "Gold Driver 1", position: DEFAULT_CENTER },
    { id: 4, name: "Gold Driver 2", position: DEFAULT_CENTER }
  ],
  other: [
    { id: 5, name: "Other Driver 1", position: DEFAULT_CENTER },
    { id: 6, name: "Other Driver 2", position: DEFAULT_CENTER }
  ]
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
  const [mode, setMode] = useState("user");
  const [driverId, setDriverId] = useState(null);
  const [drivers, setDrivers] = useState(DRIVERS_CONFIG);
  const socketRef = useRef(null);

  // Obtener configuración de ruta actual
  const currentRoute = ROUTE_CONFIG[selectedRoute];

  // WebSocket connection
  useEffect(() => {
    const socketUrl = mode === 'driver' 
      ? `wss://tracker-backendgun.onrender.com/ws/location/driver/${selectedRoute}/${driverId}/`
      : `wss://tracker-backendgun.onrender.com/ws/location/user/${selectedRoute}/`;
    
    const ws = new WebSocket(socketUrl);
    
    ws.onopen = () => {
      console.log("WebSocket conectado");
      if (mode === "driver") startLocationSharing();
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (mode === "user") {
        // Actualizar posición del conductor correspondiente
        setDrivers(prev => ({
          ...prev,
          [data.route_id]: prev[data.route_id].map(driver => 
            driver.id === parseInt(data.driver_id) 
              ? {...driver, position: [data.latitude, data.longitude]} 
              : driver
          )
        }));
      }
    };

    ws.onerror = (error) => console.error("Error WebSocket:", error);
    ws.onclose = () => console.log("WebSocket desconectado");

    socketRef.current = ws;

    return () => ws.close();
  }, [mode, selectedRoute, driverId]);

  // Función para enviar ubicación del conductor
  const updateLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      // Actualizar posición local del conductor
      setDrivers(prev => ({
        ...prev,
        [selectedRoute]: prev[selectedRoute].map(driver => 
          driver.id === driverId 
            ? {...driver, position: [latitude, longitude]} 
            : driver
        )
      }));
      
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          latitude,
          longitude,
          driver_id: driverId,
          route_id: selectedRoute
        }));
      }
    });
  };

  // Obtener los últimos datos de ubicación al cargar la app
  useEffect(() => {
    fetch(`https://tracker-backendgun.onrender.com/api/location/${selectedRoute}/`)
      .then((res) => res.json())
      .then((data) => {
        // Actualizar posiciones de los conductores según la respuesta
        const updatedDrivers = {...drivers};
        data.forEach(location => {
          const route = location.route_id;
          const driverId = location.driver_id;
          updatedDrivers[route] = updatedDrivers[route].map(driver => 
            driver.id === driverId 
              ? {...driver, position: [location.latitude, location.longitude]} 
              : driver
          );
        });
        setDrivers(updatedDrivers);
      })
      .catch((error) => console.error("Error al obtener ubicación inicial:", error));
  }, [selectedRoute]);

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

  // Función para iniciar el modo conductor
  const startDriverMode = () => {
    const password = prompt("Password:");
    if (password === "1234") {
      const driverNum = prompt("Número de conductor (1-6):");
      const num = parseInt(driverNum);
      if (num >= 1 && num <= 6) {
        setDriverId(num);
        setMode("driver");
        
        // Determinar la ruta basada en el ID del conductor
        let route;
        if (num <= 2) route = "silver";
        else if (num <= 4) route = "gold";
        else route = "other";
        
        setSelectedRoute(route);
      } else {
        alert("Número de conductor inválido");
      }
    } else {
      alert("Contraseña incorrecta");
    }
  };

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
                setDriverId(null);
              } else {
                startDriverMode();
              }
            }}
          >
            {mode === "driver" ? `DRIVER MODE (${driverId})` : "USER MODE"}
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
            key={selectedRoute}
            positions={route}
            color={currentRoute.color}
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

        {/* Mostrar todos los conductores de la ruta seleccionada */}
        {drivers[selectedRoute].map(driver => (
          <Marker 
            key={driver.id} 
            position={driver.position} 
            icon={mode === "driver" && driverId === driver.id ? driverIcon : cartIcon}
          >
            <Popup>
              {mode === "driver" && driverId === driver.id 
                ? `Your Position (Driver ${driver.id})` 
                : `${driver.name} (${currentRoute.name})`}
            </Popup>
          </Marker>
        ))}

        <ZoomControl position="bottomright" />
      </MapContainer>
    </div>
  );
}