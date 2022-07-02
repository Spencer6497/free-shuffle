import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import { toHaveAccessibleDescription } from "@testing-library/jest-dom/dist/matchers";
import React, { useEffect, useState } from "react";

import "./Geocoder.scss";

const urlBase = "https://api.mapbox.com/geocoding/v5/";

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
      fetchAddress(initialCoords);
    }
  }, [initialCoords]);

  const fetchAddress = async (coords) => {
    const query = await fetch(
      `${urlBase}mapbox.places/${coords[0]},${coords[1]}.json?access_token=${mapboxgl.accessToken}`,
      { method: "GET" }
    );
    const data = await query.json();
    const geocoderInput = document.getElementsByClassName(
      "mapboxgl-ctrl-geocoder--input"
    )[0];
    geocoder.query(data.features[0].place_name);
  };

  return <div id="geocoder"></div>;
}
