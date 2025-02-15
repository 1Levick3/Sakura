import React, { useState, useRef, useEffect } from "react";
import { GoogleMap, LoadScript, Autocomplete, DirectionsRenderer, Marker } from "@react-google-maps/api";
import "./SakuraTheme.css";

const libraries = ["places"];
const mapContainerStyle = { width: "100%", height: "100%", borderRadius: "15px", boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)" };

function MapComponent() {
  const [map, setMap] = useState(null);
  const [directions, setDirections] = useState(null);
  const [steps, setSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [searchLocation, setSearchLocation] = useState(null);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [showDirectionsInput, setShowDirectionsInput] = useState(false);
  const searchRef = useRef(null);
  const originRef = useRef(null);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const location = { lat: latitude, lng: longitude };
        setCurrentLocation(location);
        setOrigin(`${latitude},${longitude}`);
        updateCurrentStep(location);
      },
      () => {
        console.warn("Location access denied.");
        setCurrentLocation(null);
      },
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [steps]);

  const updateCurrentStep = (location) => {
    if (!steps.length) return;

    let closestIndex = null;
    let minDistance = Infinity;
    const threshold = 50; 

    steps.forEach((step, index) => {
      const stepLatLng = step.location;
      const distance = getDistanceFromLatLonInMeters(location.lat, location.lng, stepLatLng.lat, stepLatLng.lng);

      if (distance < minDistance && distance < threshold) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    setCurrentStepIndex(closestIndex);
  };

  const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleSearch = () => {
    if (!searchRef.current || !searchRef.current.getPlace()) return alert("Please enter a location to search.");
    const place = searchRef.current.getPlace();
    const location = place.geometry?.location?.toJSON();
    setSearchLocation(location);
    setDestination(place.formatted_address);
    setShowDirectionsInput(false);
    setDirections(null);
    setSteps([]);
  };

  const openDirections = () => {
    if (!searchLocation) return alert("Please search for a location first.");
    setShowDirectionsInput(true);
  };

  const getDirections = () => {
    if (!origin || !destination) return alert("Please enter both origin and destination.");
    if (!window.google || !window.google.maps) return alert("Google Maps API not loaded yet!");

    const service = new window.google.maps.DirectionsService();
    service.route(
      { origin, destination, travelMode: "DRIVING" },
      (result, status) => {
        if (status === "OK") {
          setDirections(result);

          const stepsArray = result.routes[0].legs[0].steps.map((step, index) => ({
            id: index,
            instruction: stripHtml(step.instructions),
            distance: step.distance.text,
            duration: step.duration.text,
            location: step.start_location.toJSON()
          }));

          setSteps(stepsArray);
        } else {
          alert("Error fetching directions");
        }
      }
    );
  };

  const stripHtml = (html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  };

  return (
    <LoadScript googleMapsApiKey="AIzaSyAwBikLCjx5McINt2z5Ik-RsH3RILY0ke8" libraries={libraries} preventGoogleFonts>
      <div className="sakura-container">
        <div className="sakura-map">
          <GoogleMap mapContainerStyle={mapContainerStyle} center={searchLocation || currentLocation || { lat: 20, lng: 78 }} zoom={14} onLoad={(map) => setMap(map)}>
            {currentLocation && <Marker position={currentLocation} label="📍" />}
            {searchLocation && <Marker position={searchLocation} label="🔍" />}
            {directions && <DirectionsRenderer directions={directions} />}
          </GoogleMap>
        </div>

        <div className="sakura-controls">
          <Autocomplete onLoad={(auto) => (searchRef.current = auto)} onPlaceChanged={handleSearch}>
            <input type="text" placeholder="Search for a location" className="sakura-input" />
          </Autocomplete>
          <button onClick={handleSearch} className="sakura-button">Search</button>

          {searchLocation && (
            <button onClick={openDirections} className="sakura-button sakura-direction-btn">🚗 Get Directions</button>
          )}

          {showDirectionsInput && (
            <>
              <Autocomplete onLoad={(auto) => (originRef.current = auto)} onPlaceChanged={() => setOrigin(originRef.current.getPlace()?.formatted_address || origin)}>
                <input type="text" placeholder="Enter Origin (Live Location by Default)" className="sakura-input" />
              </Autocomplete>

              <input type="text" value={destination} readOnly placeholder="Destination (Auto-filled)" className="sakura-input" />

              <button onClick={getDirections} className="sakura-button">Get Directions</button>
            </>
          )}
        </div>

        {steps.length > 0 && (
          <div className="sakura-steps">
            <h3>Directions</h3>
            <ol>
              {steps.map((step, index) => (
                <li 
                  key={step.id} 
                  className={`sakura-step ${index === currentStepIndex ? "current-step" : ""}`}
                >
                  <strong>{step.instruction}</strong> <br />
                  <span>Distance: {step.distance}, Duration: {step.duration}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </LoadScript>
  );
}

export default MapComponent;
