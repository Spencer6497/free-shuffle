import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import React, { useEffect, useState } from "react";

import "./Geocoder.scss";

export default function Geocoder({
  mapboxgl,
  onGeocoderResult,
  clearGeocoderResult,
  initialCoords,
}) {
  const [geocoder, setGeocoder] = useState(null);
  // Initialize geocoder
  useEffect(() => {
    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
      placeholder: "Starting point",
      countries: "US",
    });

    setGeocoder(geocoder);

    geocoder.addTo("#geocoder");

    geocoder.on("result", onGeocoderResult);

    geocoder.on("clear", clearGeocoderResult);
  }, []);

  // update geocoder's proximity if user allows location permissions
  useEffect(() => {
    if (geocoder && initialCoords.length > 0) {
      geocoder.setProximity({
        longitude: initialCoords[0],
        latitude: initialCoords[1],
      });
    }
  }, [initialCoords]);

  return <div id="geocoder"></div>;
}
