import { propertiesContainsFilter } from "@turf/turf";
import React from "react";
import { Button, Col, Container, Row } from "react-bootstrap";
import { Form as FormComponent, FormGroup } from "react-bootstrap";
import { render } from "react-dom";

import "./Form.scss";
import Geocoder from "./Geocoder/Geocoder";

export default class Form extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      distance: 3, // miles by default
      routeDistance: props.routeDistance,
      handleSubmit: props.handleSubmit,
      unit: "mi",
      mapboxgl: props.mapboxgl,
      onGeocoderResult: props.onGeocoderResult,
      clearGeocoderResult: props.clearGeocoderResult,
    };
    this.onSubmit = this.onSubmit.bind(this);
    this.onDistanceChanged = this.onDistanceChanged.bind(this);
    this.onUnitChanged = this.onUnitChanged.bind(this);
  }

  componentDidUpdate(prevProps) {
    if (this.props.routeDistance !== prevProps.routeDistance) {
      this.setState({ routeDistance: this.props.routeDistance });
    }
  }

  onSubmit(event) {
    event.preventDefault();
    this.state.handleSubmit({
      distance: this.state.distance,
      unit: this.state.unit,
    });
  }

  onDistanceChanged(event) {
    this.setState({ distance: event.target.value }, () => {
      console.log(this.state.distance);
    });
  }

  onUnitChanged(event) {
    this.setState({ unit: event.target.value }, () => {
      console.log(this.state.unit);
    });
  }

  render() {
    return (
      <Col lg={4}>
        <Geocoder
          mapboxgl={this.state.mapboxgl}
          onGeocoderResult={this.state.onGeocoderResult}
          clearGeocoderResult={this.state.clearGeocoderResult}
        ></Geocoder>
        <FormComponent onSubmit={this.onSubmit}>
          <FormComponent.Group className="mb-3" controlId="distance">
            <FormComponent.Label>Distance (miles):</FormComponent.Label>
            <Row>
              <Col sm={10}>
                <FormComponent.Control
                  type="text"
                  placeholder="Desired distance"
                  value={this.state.distance}
                  onChange={this.onDistanceChanged}
                />
              </Col>
              <Col sm={2}>
                <FormComponent.Select
                  aria-label="Units Selector"
                  value={this.state.unit}
                  onChange={this.onUnitChanged}
                >
                  <option>Mi</option>
                  <option>Km</option>
                </FormComponent.Select>
              </Col>
            </Row>
            <FormComponent.Text className="text-muted">
              {this.state.routeDistance}
            </FormComponent.Text>
          </FormComponent.Group>
          <Button variant="primary" type="submit">
            Find a Route
          </Button>
        </FormComponent>
      </Col>
    );
  }
}
