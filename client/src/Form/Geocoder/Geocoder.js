import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import React, { useEffect, useState } from "react";

import "./Geocoder.scss";

export default function Geocoder({
  mapboxgl,
  onGeocoderResult,
  clearGeocoderResult,
}) {
  useEffect(() => {
    // Initialize geocoder
    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
    });

    geocoder.addTo("#geocoder");

    geocoder.on("result", onGeocoderResult);

    geocoder.on("clear", clearGeocoderResult);
  }, []);
  return <div id="geocoder"></div>;
}
