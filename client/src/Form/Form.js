import { propertiesContainsFilter } from "@turf/turf";
import React from "react";
import {
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
      routeDistance: props.routeDistance,
      handleSubmit: props.handleSubmit,
      unit: "mi",
      radioButtons: [
        { name: "Running", value: "1" },
        { name: "Cycling", value: "2" },
      ],
      radioButtonValue: "1",
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
    event.preventDefault();
    this.state.handleSubmit({
      distance: this.state.distance,
      unit: this.state.unit,
      mode: this.state.radioButtons
        .filter(
          (radioButton) => radioButton.value === this.state.radioButtonValue
        )[0]
        .name.toLowerCase(),
    });
  }

  onDistanceChanged(event) {
    this.setState({ distance: event.target.value });
  }

  onUnitChanged(event) {
    this.setState({ unit: event.target.value.toLowerCase() });
  }

  render() {
    return (
      <Col lg={4}>
        <Geocoder
          mapboxgl={this.state.mapboxgl}
          onGeocoderResult={this.state.onGeocoderResult}
          clearGeocoderResult={this.state.clearGeocoderResult}
          initialCoords={this.state.initialCoords}
        ></Geocoder>
        <Container>
          <FormComponent onSubmit={this.onSubmit}>
            <FormComponent.Group className="mb-3" controlId="distance">
              <FormComponent.Label>Distance:</FormComponent.Label>
              <Row>
                <Col sm={8} md={10}>
                  <FormComponent.Control
                    type="text"
                    placeholder="Desired distance"
                    value={this.state.distance}
                    onChange={this.onDistanceChanged}
                  />
                </Col>
                <Col sm={4} md={2}>
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
              <FormComponent.Text className="text-muted">
                {this.state.routeDistance}
              </FormComponent.Text>
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
        </Container>
      </Col>
    );
  }
}
