import { propertiesContainsFilter } from "@turf/turf";
import React from "react";
import {
  Badge,
  Button,
  ButtonGroup,
  Col,
  Container,
  Row,
  ToggleButton,
} from "react-bootstrap";
import { Form as FormComponent, FormGroup } from "react-bootstrap";
import { render } from "react-dom";

import "./Form.scss";
import Geocoder from "./Geocoder/Geocoder";

export default class Form extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      distance: 3, // miles by default
      initialCoords: props.initialCoords,
      distanceChanged: false,
      routeDistance: props.routeDistance,
      handleSubmit: props.handleSubmit,
      unit: "mi",
      radioButtons: [
        { name: "Running", value: "1" },
        { name: "Cycling", value: "2" },
      ],
      radioButtonValue: "1",
      validationMessage: "",
      distanceValid: true,
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
    if (this.props.initialCoords !== prevProps.initialCoords) {
      this.setState({ initialCoords: this.props.initialCoords });
    }
  }

  onSubmit(event) {
    const form = event.currentTarget;
    event.preventDefault();
    if (form.checkValidity() === true) {
      this.state.handleSubmit({
        distance: this.state.distance,
        distanceChanged: this.state.distanceChanged,
        unit: this.state.unit,
        mode: this.state.radioButtons
          .filter(
            (radioButton) => radioButton.value === this.state.radioButtonValue
          )[0]
          .name.toLowerCase(),
      });
      this.setState({ distanceChanged: false });
    }
  }

  onDistanceChanged(event) {
    this.setState(
      { distance: event.target.value, distanceChanged: true },
      () => {
        this.distanceValid();
      }
    );
  }

  onUnitChanged(event) {
    this.setState({ unit: event.target.value.toLowerCase() });
  }

  distanceValid() {
    if (!this.state.distance) {
      this.setState({
        validationMessage: "Distance is required.",
        distanceValid: false,
      });
    } else {
      const maxValue = this.state.unit === "mi" ? 62 : 99;
      if (this.state.distance < 0.25 || this.state.distance > maxValue) {
        this.setState({
          validationMessage: `Please enter a value between 0.25 and ${maxValue}`,
          distanceValid: false,
        });
      } else {
        this.setState({ distanceValid: true });
      }
    }
  }

  render() {
    return (
      <Col lg={4}>
        <Container>
          <Geocoder
            mapboxgl={this.state.mapboxgl}
            onGeocoderResult={this.state.onGeocoderResult}
            clearGeocoderResult={this.state.clearGeocoderResult}
            initialCoords={this.state.initialCoords}
          ></Geocoder>
          <FormComponent noValidate className="mb-3" onSubmit={this.onSubmit}>
            <FormComponent.Group className="mb-3" controlId="distance">
              <FormComponent.Label>Distance:</FormComponent.Label>
              <Row className="distance-input">
                <Col sm={8} md={10} className="mb-2">
                  <FormComponent.Control
                    required
                    type="number"
                    min="0.25"
                    max={this.state.unit === "mi" ? "62" : "99"}
                    step="0.25"
                    placeholder="Desired distance"
                    isInvalid={!this.state.distanceValid}
                    value={this.state.distance}
                    onChange={this.onDistanceChanged}
                  />
                  <FormComponent.Control.Feedback type="invalid">
                    {this.state.validationMessage}
                  </FormComponent.Control.Feedback>
                </Col>
                <Col sm={4} md={2} className="mb-2">
                  <FormComponent.Select
                    aria-label="Units Selector"
                    value={this.state.unit}
                    onChange={this.onUnitChanged}
                  >
                    <option>mi</option>
                    <option>km</option>
                  </FormComponent.Select>
                </Col>
              </Row>
            </FormComponent.Group>
            <FormComponent.Group className="mb-3" controlId="mode">
              <FormComponent.Label>Mode of transit:</FormComponent.Label>
              <Row>
                <ButtonGroup>
                  {this.state.radioButtons.map((radio, idx) => (
                    <ToggleButton
                      style={{ zIndex: 0 }}
                      key={idx}
                      id={`radioButton-${idx}`}
                      type="radio"
                      variant="secondary"
                      name="radio"
                      value={radio.value}
                      checked={this.state.radioButtonValue === radio.value}
                      onChange={(e) =>
                        this.setState({
                          radioButtonValue: e.currentTarget.value,
                        })
                      }
                    >
                      {radio.name}
                    </ToggleButton>
                  ))}
                </ButtonGroup>
              </Row>
            </FormComponent.Group>
            <Button variant="primary" type="submit">
              Find a Route
            </Button>
          </FormComponent>
          {this.state.routeDistance > 0 && (
            <h2>
              Route found!
              <Badge bg="success">
                {this.state.routeDistance.toFixed(2)} {this.state.unit}
              </Badge>
            </h2>
          )}
        </Container>
      </Col>
    );
  }
}
