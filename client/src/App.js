import React from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";

import { lineIntersect, bbox } from "@turf/turf";
import { distance as turfDistance } from "@turf/turf";

import "./App.scss";
import mapboxgl from "!mapbox-gl"; // eslint-disable-line import/no-webpack-loader-syntax
import NavBar from "./NavBar/NavBar";
import Form from "./Form/Form";
import arrow from "./images/arrow.png";

mapboxgl.accessToken =
  "pk.eyJ1Ijoic3BlbmNlcjY0OTciLCJhIjoiY2w0bHF6NXpiMDBpaTNnbzJleHA3ZDYzbCJ9.ZZGzmhDOJtzWZJSAa8M0gQ";

const urlBase = "https://api.mapbox.com/isochrone/v1/mapbox/";

const previouslyGeneratedPoints = new Set();

export default class App extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      initialCoords: [],
      startAndEnd: [],
      routeDistance: 0,
      map: null,
      loading: false,
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
      zoom: 12,
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
            this.state.map.flyTo({
              center: userCoords,
              zoom: 14,
              speed: 1,
            });
            this.setState({ initialCoords: userCoords });
          });
        }

        this.state.map.loadImage(arrow, (err, img) => {
          if (err) {
            return;
          }
          this.state.map.addImage("arrowHead", img);
        });
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
      zoom: 14,
      speed: 1,
    });
  };

  clearGeocoderResult = () => {
    previouslyGeneratedPoints.clear();
    this.state.markerArr.forEach((marker) => marker.remove());
    this.setState({ routeDistance: 0, initialCoords: [], markerArr: [] });
    if (this.state.map.getSource("geojson")) {
      this.state.map.removeLayer("route");
      this.state.map.removeLayer("arrowId");
      this.state.map.removeSource("geojson");
    }
  };

  getIso = async (coords, distance, profile, units) => {
    const distanceAsFloat = parseFloat(distance);
    const query = await fetch(
      `${urlBase}${profile === "running" ? "walking" : profile}/${coords[0]},${
        coords[1]
      }?contours_meters=${Math.floor(
        (units === "mi" ? distanceAsFloat * 1609.34 : distanceAsFloat * 1000) /
          3
      )}&polygons=true&access_token=${mapboxgl.accessToken}`,
      { method: "GET" }
    );
    const data = await query.json();
    return data;
  };

  getRoute = async (coords, profile) => {
    const formattedAPIString = coords
      .reduce((acc, curr) => {
        return acc + curr.toString() + ";";
      }, "")
      .slice(0, -1);
    const query = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/${
        profile === "running" ? "walking" : profile
      }/${formattedAPIString}?continue_straight=true&alternatives=true&geometries=geojson&access_token=${
        mapboxgl.accessToken
      }`,
      { method: "GET" }
    );

    const json = await query.json();
    const data = json.routes[0];
    return data;
  };

  handleSubmit({ distanceChanged, distance, unit, mode }) {
    // replace this w/ form validation
    if (distance !== "" && this.state.markerArr.length > 0) {
      this.setState({ loading: true });
      if (distanceChanged) {
        previouslyGeneratedPoints.clear();
      }
      this.state.markerArr.forEach((marker, index) => {
        if (index > 0) {
          marker.remove();
        }
      });
      this.state.markerArr.splice(1);
      if (this.state.map.getSource("geojson")) {
        this.state.map.removeLayer("route");
        this.state.map.removeLayer("arrowId");
        this.state.map.removeSource("geojson");
      }
      this.getIso(this.state.startAndEnd, distance, mode, unit).then(
        (firstIso) => {
          // retrieve random point along the isochrone and place a marker there
          const maxNumPoints =
            firstIso.features[0].geometry.coordinates[0].length;
          let randomPoint =
            firstIso.features[0].geometry.coordinates[0][
              Math.floor(Math.random() * maxNumPoints)
            ];
          // ensure that "random" point hasn't been visited already
          if (!previouslyGeneratedPoints.has(randomPoint[0])) {
            previouslyGeneratedPoints.add(randomPoint[0]);
          } else {
            let retryCount = 0;
            let newPointFound = false;
            while (retryCount < maxNumPoints && !newPointFound) {
              retryCount++;
              // get another random point, test it against the Set of already-visited points
              randomPoint =
                firstIso.features[0].geometry.coordinates[0][
                  Math.floor(Math.random() * maxNumPoints)
                ];
              if (!previouslyGeneratedPoints.has(randomPoint[0])) {
                newPointFound = true;
                previouslyGeneratedPoints.add(randomPoint[0]);
                break;
              }
            }
            if (!newPointFound) {
              // all points along the isochrone have been visited
              // clear the list and start over
              previouslyGeneratedPoints.clear();
              previouslyGeneratedPoints.add(randomPoint[0]);
            }
          }

          // use the previously-returned marker to make a second, overlapping iso
          const firstStop = randomPoint;
          this.getIso(firstStop, distance, mode, unit).then((secondIso) => {
            // set secondIso and use Turf.js to find intersections
            const intersections = lineIntersect(firstIso, secondIso);
            // find the intersection whose distance from the 1st stop is closest to a third of the entered distance
            const secondStop = intersections.features.reduce((acc, current) => {
              const currentDistanceFromFirst = turfDistance(
                firstStop,
                current,
                { units: "miles" }
              );
              const prevDistanceFromFirst = turfDistance(firstStop, acc, {
                units: "miles",
              });
              return Math.abs(currentDistanceFromFirst - distance / 3) <
                Math.abs(prevDistanceFromFirst - distance / 3)
                ? current
                : acc;
            }).geometry.coordinates;

            this.getRoute(
              [
                this.state.startAndEnd,
                firstStop,
                secondStop,
                this.state.startAndEnd,
              ],
              mode
            ).then((route) => {
              // Only accept routes within <0.5 mi/km of desired distance
              // we can change error range, but if we make it smaller, more API calls will have to be made, negatively impacting performance
              const error = Math.abs(
                distance -
                  (unit === "mi"
                    ? route.distance / 1609
                    : route.distance / 1000)
              );
              if (error < 0.5) {
                this.setState({
                  routeDistance:
                    unit === "mi"
                      ? route.distance / 1609
                      : route.distance / 1000,
                });
                const routeCoords = route.geometry.coordinates;
                this.renderMap(routeCoords, firstStop, secondStop);
                this.setState({ loading: false });
              } else {
                this.handleSubmit({ distanceChanged, distance, unit, mode });
              }
            });
          });
        }
      );
    }
  }

  renderMap(route, firstStop, secondStop) {
    let marker = new mapboxgl.Marker({ color: "blue" })
      .setLngLat(firstStop)
      .addTo(this.state.map);
    this.state.markerArr.push(marker);

    marker = new mapboxgl.Marker({ color: "blue" })
      .setLngLat(secondStop)
      .addTo(this.state.map);
    this.state.markerArr.push(marker);

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
    this.state.map
      .addLayer({
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
      })
      .addLayer({
        id: "arrowId",
        type: "symbol",
        source: "geojson",
        layout: {
          "symbol-placement": "line",
          "symbol-spacing": 100,
          "icon-allow-overlap": true,
          "icon-image": "arrowHead",
          "icon-size": 0.05,
          visibility: "visible",
        },
      });
    this.state.map.fitBounds(bbox(geojson), { padding: 50 });
  }

  render() {
    return (
      <Container fluid className="parent-container">
        <NavBar></NavBar>
        <Row className="main-row">
          <Form
            distance={this.state.distance}
            routeDistance={this.state.routeDistance}
            handleSubmit={this.handleSubmit}
            mapboxgl={mapboxgl}
            initialCoords={this.state.initialCoords}
            onGeocoderResult={this.geocoderResult}
            clearGeocoderResult={this.clearGeocoderResult}
          ></Form>
          <Col lg={8} className="flex-50">
            <div ref={this.mapContainer} className="map-container" />
          </Col>
        </Row>
      </Container>
    );
  }
}
