import React from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";

import { lineIntersect } from "@turf/turf";
import { distance as turfDistance } from "@turf/turf";

import "./App.scss";
import mapboxgl from "!mapbox-gl"; // eslint-disable-line import/no-webpack-loader-syntax
import NavBar from "./NavBar/NavBar";
import Form from "./Form/Form";

mapboxgl.accessToken =
  "pk.eyJ1Ijoic3BlbmNlcjY0OTciLCJhIjoiY2w0bHF6NXpiMDBpaTNnbzJleHA3ZDYzbCJ9.ZZGzmhDOJtzWZJSAa8M0gQ";

const urlBase = "https://api.mapbox.com/isochrone/v1/mapbox/";

export default class App extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      zoom: 12,
      firstIso: null,
      secondIso: null,
      initialCoords: [],
      startAndEnd: [],
      firstStop: [],
      secondStop: [],
      routeDistance: 0,
      map: null,
      markerArr: [],
    };
    this.mapContainer = React.createRef();
    this.handleSubmit = this.handleSubmit.bind(this);
    this.geocoderResult = this.geocoderResult.bind(this);
    this.clearGeocoderResult = this.clearGeocoderResult.bind(this);
  }

  componentDidMount() {
    const map = new mapboxgl.Map({
      container: this.mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [-84.5, 39.1],
      zoom: this.state.zoom,
    });

    // set the map state and subsequently resize for responsive display
    this.setState({ map: map }, () => {
      this.state.map.on("load", () => {
        this.state.map.resize();

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((position) => {
            const userCoords = [
              position.coords.longitude,
              position.coords.latitude,
            ];
            this.setState({ initialCoords: userCoords });
          });
        }
      });
    });
  }

  geocoderResult = (e) => {
    this.clearGeocoderResult();
    const newCoords = e.result.center;
    const marker = new mapboxgl.Marker({ color: "red" })
      .setLngLat(newCoords)
      .addTo(this.state.map);
    this.setState({ startAndEnd: newCoords, markerArr: [marker] });
    this.state.map.flyTo({
      center: newCoords,
      zoom: 13,
      speed: 1,
    });
  };

  clearGeocoderResult = () => {
    this.state.markerArr.forEach((marker) => marker.remove());
    this.setState({ routeDistance: 0, initialCoords: [], markerArr: [] });
    if (this.state.map.getSource("geojson")) {
      this.state.map.removeLayer("route");
      this.state.map.removeSource("geojson");
    }
  };

  getIso = async (distance, profile, units) => {
    const distanceAsInt = parseInt(distance);
    const query = await fetch(
      `${urlBase}${profile === "running" ? "walking" : profile}/${
        this.state.startAndEnd[0]
      },${this.state.startAndEnd[1]}?contours_meters=${Math.floor(
        (units === "mi" ? distanceAsInt * 1609.34 : distanceAsInt * 1000) / 3
      )}&polygons=true&access_token=${mapboxgl.accessToken}`,
      { method: "GET" }
    );
    const data = await query.json();
    this.setState({ firstIso: data });
    const maxNumPoints = data.features[0].geometry.coordinates[0].length;
    const randomPoint =
      data.features[0].geometry.coordinates[0][
        Math.floor(Math.random() * maxNumPoints)
      ];
    const marker = new mapboxgl.Marker({ color: "blue" })
      .setLngLat(randomPoint)
      .addTo(this.state.map);
    this.state.markerArr.push(marker);
  };

  // Draw new iso from last point
  getAndDrawNewIso = async (newCoords, distance, profile, units) => {
    const distanceAsInt = parseInt(distance);
    const query = await fetch(
      `${urlBase}${profile === "running" ? "walking" : profile}/${
        newCoords.lng
      },${newCoords.lat}?contours_meters=${Math.floor(
        (units === "mi" ? distanceAsInt * 1609.34 : distanceAsInt * 1000) / 3
      )}&polygons=true&access_token=${mapboxgl.accessToken}`,
      { method: "GET" }
    );
    const data = await query.json();
    // set secondIso and use Turf.js to find intersections
    this.setState({ secondIso: data }, () => {
      const intersections = lineIntersect(
        this.state.firstIso,
        this.state.secondIso
      );
      // find the intersection whose distance from the 1st stop is closest to a third of the entered distance
      const secondStop = intersections.features.reduce((acc, current) => {
        const currentDistanceFromFirst = turfDistance(
          this.state.firstStop,
          current,
          { units: "miles" }
        );
        const prevDistanceFromFirst = turfDistance(this.state.firstStop, acc, {
          units: "miles",
        });
        return Math.abs(currentDistanceFromFirst - this.state.distance / 3) <
          Math.abs(prevDistanceFromFirst - this.state.distance / 3)
          ? current
          : acc;
      });

      // Set 2nd stop and plot all of them on the map
      this.setState(
        {
          secondStop: secondStop.geometry.coordinates,
        },
        () => {
          const marker = new mapboxgl.Marker({ color: "yellow" })
            .setLngLat(this.state.secondStop)
            .addTo(this.state.map);
          this.state.markerArr.push(marker);
          this.getRoute(
            [
              this.state.startAndEnd,
              this.state.firstStop,
              this.state.secondStop,
              this.state.startAndEnd,
            ],
            profile,
            units
          );
        }
      );
    });
  };

  getRoute = async (coords, profile, units) => {
    const formattedAPIString = coords
      .reduce((acc, curr) => {
        return acc + curr.toString() + ";";
      }, "")
      .slice(0, -1);
    const query = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/${
        profile === "running" ? "walking" : profile
      }/${formattedAPIString}?continue_straight=false&alternatives=true&banner_instructions=true&steps=true&geometries=geojson&access_token=${
        mapboxgl.accessToken
      }`,
      { method: "GET" }
    );

    const json = await query.json();
    const data = json.routes[0];
    this.setState({
      routeDistance:
        units === "mi" ? data.distance / 1609 : data.distance / 1000,
    });
    const route = data.geometry.coordinates;
    const geojson = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: route,
      },
    };
    this.state.map.addSource("geojson", {
      type: "geojson",
      data: geojson,
    });
    this.state.map.addLayer({
      id: "route",
      type: "line",
      source: "geojson",
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#3887be",
        "line-width": 5,
        "line-opacity": 0.75,
      },
    });
  };

  handleSubmit({ distance, unit, mode }) {
    // replace this w/ form validation
    if (distance !== "" && this.state.markerArr.length > 0) {
      this.state.markerArr.forEach((marker, index) => {
        if (index > 0) {
          marker.remove();
        }
      });
      this.state.markerArr.splice(1);
      if (this.state.map.getSource("geojson")) {
        this.state.map.removeLayer("route");
        this.state.map.removeSource("geojson");
      }
      this.getIso(distance, mode, unit).then(() => {
        // get last marker and make an iso from it
        const lastMarkerCoords =
          this.state.markerArr[this.state.markerArr.length - 1].getLngLat();
        this.setState({ firstStop: lastMarkerCoords.toArray() });
        this.getAndDrawNewIso(lastMarkerCoords, distance, mode, unit);
      });
    }
  }

  render() {
    return (
      <Container fluid className="parent-container">
        <NavBar></NavBar>
        <Row>
          <Form
            distance={this.state.distance}
            routeDistance={this.state.routeDistance}
            handleSubmit={this.handleSubmit}
            mapboxgl={mapboxgl}
            initialCoords={this.state.initialCoords}
            onGeocoderResult={this.geocoderResult}
            clearGeocoderResult={this.clearGeocoderResult}
          ></Form>
          <Col lg={8}>
            <div ref={this.mapContainer} className="map-container" />
          </Col>
        </Row>
      </Container>
    );
  }
}
