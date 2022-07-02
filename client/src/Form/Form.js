import React from "react";
import { Col } from "react-bootstrap";

import "./Form.scss";

export default function Form({
  distance,
  routeDistance,
  addressChanged,
  handleSubmit,
}) {
  function onSubmit(event) {
    event.preventDefault();
    handleSubmit(event.target.value);
  }

  return (
    <Col lg={4}>
      <div id="geocoder"></div>
      <form onSubmit={onSubmit}>
        <label>
          Distance (miles):
          <br></br>
          <input type="text" value={distance} onChange={addressChanged}></input>
          <pre>{routeDistance}</pre>
        </label>
        <input type="submit" id="distanceSubmitButton"></input>
      </form>
    </Col>
  );
}
