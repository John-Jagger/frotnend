import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, ZoomControl, Polyline, CircleMarker, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";
import L from "leaflet";

const DEFAULT_CENTER = [39.747389, -105.224338];
const waypoints = [
  [39.75123, -105.222302],
  [39.753914, -105.226298],
  [39.750895, -105.223291],
  [39.748435, -105.222988],
  [39.744379, -105.224428],
  [39.741498, -105.223882],
  [39.740863, -105.222378],
  [39.75123, -105.222302],
];

const cartIcon = new L.Icon({
  iconUrl: "/cart.svg",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const stopIcon = new L.Icon({
  iconUrl: "/bus.svg",
  iconSize: [25, 25],
  iconAnchor: [12, 25],
  popupAnchor: [0, -25],
});

const driverIcon = new L.Icon({
  iconUrl: "/driver.svg",
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

export default function App() {
  const [route, setRoute] = useState([]);
  const [times, setTimes] = useState([]);
  const [position, setPosition] = useState(DEFAULT_CENTER);
  const [mode, setMode] = useState("user");
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);

  const startLocationSharing = () => {
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setPosition([latitude, longitude]);
  
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            const data = JSON.stringify({
              latitude,
              longitude,
              mode: "driver"
            });
  
            console.log("📡 Sending Location Data:", data); // ✅ Log data before sending
            socketRef.current.send(data);
          } else {
            console.warn("⚠️ WebSocket not open, cannot send data");
          }
        },
        (error) => console.error("❌ Error in geolocation:", error),
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000
        }
      );
    } else {
      console.error("❌ Geolocation is not supported by this browser.");
    }
  };

  // WebSocket connection
  // useEffect(() => {
  //   // ✅ Fetch the last known driver location from the API when the app loads
  //   fetch("https://tracker-backendgun.onrender.com/api/location/")
  //     .then((res) => res.json())
  //     .then((data) => {
  //       if (data.latitude && data.longitude) {
  //         console.log("📍 Fetched Last Known Location:", data);
  //         setPosition([data.latitude, data.longitude]);  // ✅ Set initial position
  //       }
  //     })
  //     .catch(console.error);
  
  //   // ✅ Connect to WebSocket for real-time updates
  //   const ws = new WebSocket("wss://tracker-backendgun.onrender.com/ws/location/");
    
  //   ws.onopen = () => {
  //     console.log("✅ WebSocket Connected");
  //     if (mode === "driver") startLocationSharing();
  //   };
  
  //   ws.onmessage = (event) => {
  //     const data = JSON.parse(event.data);
  //     console.log("📡 WebSocket Update:", data);
  //     setPosition([data.latitude, data.longitude]);  // ✅ Update position in real-time
  //   };
  
  //   ws.onerror = (error) => console.error("❌ WebSocket Error:", error);
  //   ws.onclose = () => console.log("🔌 WebSocket Disconnected");
  
  //   socketRef.current = ws;
  
  //   return () => ws.close();
  // }, [mode]);

  // WebSocket connection
useEffect(() => {
  let isDriverActive = false; // Track if the driver is currently online

  // ✅ Fetch the last known driver location from the API when the app loads
  fetch("https://tracker-backendgun.onrender.com/api/location/")
    .then((res) => res.json())
    .then((data) => {
      if (data.latitude && data.longitude) {
        console.log("📍 Fetched Last Known Location:", data);
        setPosition([data.latitude, data.longitude]);  // ✅ Set initial position
      }
    })
    .catch(console.error);

  // ✅ Connect to WebSocket for real-time updates
  const ws = new WebSocket("wss://tracker-backendgun.onrender.com/ws/location/");

  ws.onopen = () => {
    console.log("✅ WebSocket Connected");
    if (mode === "driver") {
      startLocationSharing();
      isDriverActive = true;
    }
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log("📡 WebSocket Update:", data);

    if (data.latitude && data.longitude) {
      setPosition([data.latitude, data.longitude]);  // ✅ Update position in real-time
      isDriverActive = true; // Mark that a driver is active
    }
  };

  ws.onerror = (error) => console.error("❌ WebSocket Error:", error);

  ws.onclose = () => {
    console.log("🔌 WebSocket Disconnected");

    // ✅ If no active driver, keep the last known position instead of resetting
    if (!isDriverActive) {
      console.log("🛑 No driver detected, keeping last known position.");
    }
  };

  socketRef.current = ws;

  return () => ws.close();
}, [mode]);
  

  // Geolocation logic
  useEffect(() => {
    const options = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 5000
    };

    if (mode === "driver") {
      // Actualización en tiempo real para driver
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setPosition([latitude, longitude]);
          
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
              latitude,
              longitude,
              mode: "driver"
            }));
          }
        },
        (error) => console.error("Error geolocation:", error),
        options
      );
    } else {
      // Actualización cada 15 segundos para usuario
      const getLocation = () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            setPosition([latitude, longitude]);
          },
          (error) => console.error("Error obteniendo ubicación:", error),
          options
        );
      };

      getLocation();
      intervalRef.current = setInterval(getLocation, 15000);
    }

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [mode]);


  return (
    <div className="app-container">
      <div className="top-bar">
        <span className="title">ORECART</span>
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
      </div>

      <MapContainer center={DEFAULT_CENTER} zoom={14} className="map">
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {route.length > 0 && (
          <Polyline
            positions={route}
            color="#C0C0C0"
            weight={5}
            interactive={false}
          />
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

        <Marker position={position} icon={mode === "driver" ? driverIcon : cartIcon}>
          <Popup>{mode === "driver" ? "Position" : "Cart Location"}</Popup>
        </Marker>
        
        <ZoomControl position="bottomright" />
      </MapContainer>
    </div>
  );
}