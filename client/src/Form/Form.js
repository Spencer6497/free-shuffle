import React from "react";
import { Col } from "react-bootstrap";

import "./Form.scss";
import Geocoder from "./Geocoder/Geocoder";

export default function Form({
  distance,
  routeDistance,
  distanceChanged,
  handleSubmit,
  mapboxgl,
  onGeocoderResult,
  clearGeocoderResult,
}) {
  function onSubmit(event) {
    event.preventDefault();
    handleSubmit(event.target.value);
  }

  return (
    <Col lg={4}>
      <Geocoder
        mapboxgl={mapboxgl}
        onGeocoderResult={onGeocoderResult}
        clearGeocoderResult={clearGeocoderResult}
      ></Geocoder>
      <form onSubmit={onSubmit}>
        <label>
          Distance (miles):
          <br></br>
          <input
            type="text"
            value={distance}
            onChange={distanceChanged}
          ></input>
          <pre>{routeDistance}</pre>
        </label>
        <input type="submit" id="distanceSubmitButton"></input>
      </form>
    </Col>
  );
}
