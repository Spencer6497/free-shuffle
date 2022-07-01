import React, { Component } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";

import { lineIntersect } from "@turf/turf";

import logo from "./logo.svg";

import "./App.scss";
import mapboxgl from "!mapbox-gl"; // eslint-disable-line import/no-webpack-loader-syntax

mapboxgl.accessToken =
  "pk.eyJ1Ijoic3BlbmNlcjY0OTciLCJhIjoiY2w0bHF6NXpiMDBpaTNnbzJleHA3ZDYzbCJ9.ZZGzmhDOJtzWZJSAa8M0gQ";

// Test isochrone stuff
const urlBase = "https://api.mapbox.com/isochrone/v1/mapbox/";

export default class App extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      lng: -84.5,
      lat: 39.1,
      zoom: 12,
      distance: 3, // miles by default, must be converted into meters
      profile: "walking", // mode of transport for Isochrone, walking by default
      firstIso: null,
      secondIso: null,
      startAndEnd: [],
      firstStop: [],
      secondStop: [],
      routeDistance: 0,
      map: null,
      markerArr: [],
    };
    this.mapContainer = React.createRef();
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  clientIP = "";

  componentDidMount() {
    const { lng, lat, zoom } = this.state;
    const map = new mapboxgl.Map({
      container: this.mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [lng, lat],
      zoom: zoom,
      proximity: this.clientIP,
    });

    // set the map state and subsequently set event listeners
    this.setState({ map: map }, () => {
      this.state.map.on("move", () => {
        // remove if unneeded
      });

      this.state.map.on("load", () => {
        this.state.map.resize();
        // remove if unneeded
      });
    });

    // Initialize geocoder
    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
    });

    geocoder.addTo("#geocoder");

    // Get the geocoder results container.
    const results = document.getElementById("result");

    // Add geocoder result to container.
    geocoder.on("result", (e) => {
      this.state.markerArr.forEach((marker) => marker.remove());
      const newCoords = e.result.center;
      // Set new longitude/latitude and subsequently get isochrone
      this.setState(
        { lng: newCoords[0], lat: newCoords[1], startAndEnd: e.result.center },
        () => {
          this.getIso().then(() => {
            // get last marker and make an iso from it
            const lastMarkerCoords =
              this.state.markerArr[this.state.markerArr.length - 1].getLngLat();
            this.setState({ firstStop: lastMarkerCoords.toArray() });
            this.getAndDrawNewIso(lastMarkerCoords);
          });
        }
      );
      const marker = new mapboxgl.Marker({ color: "red" })
        .setLngLat(newCoords)
        .addTo(map);
      this.state.markerArr.push(marker);
      this.state.map.flyTo({
        center: newCoords,
        zoom: 13,
        speed: 1,
      });
    });

    // Clear results container when search is cleared.
    geocoder.on("clear", () => {
      this.state.markerArr.forEach((marker) => marker.remove());
      this.state.map.removeLayer("isoLayer");
      this.state.map.removeSource("iso");
      this.state.map.removeLayer("newIsoLayer");
      this.state.map.removeSource("newIso");
    });
  }

  /**
   * Must convert miles to meters before sending to API
   */
  getIso = async () => {
    const query = await fetch(
      `${urlBase}${this.state.profile}/${this.state.lng},${
        this.state.lat
      }?contours_meters=${Math.floor(
        (this.state.distance * 1609.34) / 3
      )}&polygons=true&access_token=${mapboxgl.accessToken}`,
      { method: "GET" }
    );
    const data = await query.json();
    this.setState({ firstIso: data });
    // Add isochrone source/layer if not already existing and set its' data
    // the actual painting of the isochrone on the map can be removed in prod, this is simply for debugging purposes
    if (!this.state.map.getSource("iso")) {
      this.state.map.addSource("iso", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      this.state.map.addLayer(
        {
          id: "isoLayer",
          type: "line",
          // Use "iso" as the data source for this layer
          source: "iso",
          layout: {},
          paint: {
            "line-color": "red",
          },
        },
        "poi-label"
      );
    }
    this.state.map.getSource("iso").setData(data);
    const maxNumPoints = data.features[0].geometry.coordinates[0].length;
    const randomPoint =
      data.features[0].geometry.coordinates[0][
        Math.floor(Math.random() * maxNumPoints /* (maxNumPoints / 3) */) // when uncommented, scopes random point to part of isochrone
      ];
    // testing! This grabs the northernmost point of the isochrone (approx.)
    // const randomPoint = data.features[0].geometry.coordinates[0][0];
    const marker = new mapboxgl.Marker({ color: "blue" })
      .setLngLat(randomPoint)
      .addTo(this.state.map);
    this.state.markerArr.push(marker);
    // get route from start to random point
  };

  // Draw new iso from last point
  getAndDrawNewIso = async (newCoords) => {
    const query = await fetch(
      `${urlBase}${this.state.profile}/${newCoords.lng},${
        newCoords.lat
      }?contours_meters=${Math.floor(
        (this.state.distance * 1609.34) / 3
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
      const randomIntersectionIndex = Math.floor(
        Math.random() * intersections.features.length
      );
      // Set 2nd stop and plot all of them on the map
      this.setState(
        {
          secondStop:
            intersections.features[randomIntersectionIndex].geometry
              .coordinates,
        },
        () => {
          const marker = new mapboxgl.Marker({ color: "yellow" })
            .setLngLat(this.state.secondStop)
            .addTo(this.state.map);
          this.getRoute([
            this.state.startAndEnd,
            this.state.firstStop,
            this.state.secondStop,
            this.state.startAndEnd,
          ]);
        }
      );
    });
    if (!this.state.map.getSource("newIso")) {
      this.state.map.addSource("newIso", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      this.state.map.addLayer(
        {
          id: "newIsoLayer",
          type: "line",
          // Use "iso" as the data source for this layer
          source: "newIso",
          layout: {},
          paint: {
            "line-color": "blue",
          },
        },
        "poi-label"
      );
    }
    this.state.map.getSource("newIso").setData(data);
  };

  getRoute = async (coords) => {
    const formattedAPIString = coords
      .reduce((acc, curr) => {
        return acc + curr.toString() + ";";
      }, "")
      .slice(0, -1);
    const query = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/cycling/${formattedAPIString}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`,
      { method: "GET" }
    );

    const json = await query.json();
    const data = json.routes[0];
    this.setState({ routeDistance: data.distance / 1609 });
    const route = data.geometry.coordinates;
    const geojson = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: route,
      },
    };
    this.state.map.addLayer({
      id: Math.random().toString(),
      type: "line",
      source: {
        type: "geojson",
        data: geojson,
      },
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

  handleChange(event) {
    this.setState({ distance: event.target.value });
  }

  handleSubmit(event) {
    event.preventDefault();
    // Remove null check when submission logic is fully fleshed out
    if (this.state.map.getSource("iso")) {
      // remove current isochrone layer, re-paint with newly-entered distance
      this.state.map.removeLayer("isoLayer");
      this.state.map.removeSource("iso");
      this.getIso().then(() => {
        // get last marker and make an iso from it
        const lastMarkerCoords =
          this.state.markerArr[this.state.markerArr.length - 1].getLngLat();
        this.setState({ firstStop: lastMarkerCoords.toArray() });
        this.getAndDrawNewIso(lastMarkerCoords);
      });
    }
  }

  render() {
    return (
      <Container fluid className="parent-container">
        <Row>
          <Col lg={4}>
            <div id="geocoder"></div>
            <form onSubmit={this.handleSubmit}>
              <label>
                Distance (miles):
                <br></br>
                <input
                  type="text"
                  value={this.state.distance}
                  onChange={this.handleChange}
                ></input>
                <pre>{this.state.routeDistance}</pre>
              </label>
              <input type="submit" id="distanceSubmitButton"></input>
            </form>
          </Col>
          <Col lg={8}>
            <div ref={this.mapContainer} className="map-container" />
          </Col>
        </Row>
      </Container>
    );
  }
}
