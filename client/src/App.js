import React from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";

import { lineIntersect } from "@turf/turf";
import { distance } from "@turf/turf";

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
      distance: 3, // miles by default, must be converted into meters
      profile: "walking", // mode of transport for Isochrone, walking by default
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
      // proximity: this.clientIP, need to grab location from user's browser
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
    this.setState({ startAndEnd: newCoords });
    const marker = new mapboxgl.Marker({ color: "red" })
      .setLngLat(newCoords)
      .addTo(this.state.map);
    this.state.markerArr.push(marker);
    this.state.map.flyTo({
      center: newCoords,
      zoom: 13,
      speed: 1,
    });
  };

  clearGeocoderResult = () => {
    this.state.markerArr.forEach((marker) => marker.remove());
    this.setState({ routeDistance: 0, initialCoords: [] });
    // Add better null handling when logic is fully fleshed out
    // i.e. maybe have a state variable dataHasBeenFetched or something to prevent submit logic with null input
    if (this.state.map.getSource("geojson")) {
      this.state.map.removeLayer("isoLayer");
      this.state.map.removeSource("iso");
      this.state.map.removeLayer("newIsoLayer");
      this.state.map.removeSource("newIso");
      this.state.map.removeLayer("route");
      this.state.map.removeSource("geojson");
    }
  };

  /**
   * Must convert miles to meters before sending to API
   */
  getIso = async () => {
    const query = await fetch(
      `${urlBase}${this.state.profile}/${this.state.startAndEnd[0]},${
        this.state.startAndEnd[1]
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
      // find the intersection whose distance from the 1st stop is closest to a third of the entered distance
      const secondStop = intersections.features.reduce((acc, current) => {
        const currentDistanceFromFirst = distance(
          this.state.firstStop,
          current,
          { units: "miles" }
        );
        const prevDistanceFromFirst = distance(this.state.firstStop, acc, {
          units: "miles",
        });
        return Math.abs(currentDistanceFromFirst - this.state.distance / 3) <
          Math.abs(prevDistanceFromFirst - this.state.distance / 3)
          ? current
          : acc;
      });

      // const randomIntersectionIndex = Math.floor(
      //   Math.random() * intersections.features.length
      // );

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
      `https://api.mapbox.com/directions/v5/mapbox/walking/${formattedAPIString}?continue_straight=false&alternatives=true&banner_instructions=true&steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`,
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

  handleSubmit({ distance, unit }) {
    if (distance !== "") {
      this.setState({ distance: distance }, () => {
        // Add better null handling when logic is fully fleshed out
        // i.e. maybe have a state variable dataHasBeenFetched or something to prevent submit logic with null input
        if (this.state.markerArr.length > 0) {
          // remove current layers and markers, re-paint with newly-requested route
          this.state.markerArr.forEach((marker, index) => {
            if (index > 0) {
              marker.remove();
            }
          });
          this.state.markerArr.splice(1);
          if (this.state.map.getSource("geojson")) {
            this.state.map.removeLayer("isoLayer");
            this.state.map.removeSource("iso");
            this.state.map.removeLayer("route");
            this.state.map.removeSource("geojson");
          }
          this.getIso().then(() => {
            // get last marker and make an iso from it
            const lastMarkerCoords =
              this.state.markerArr[this.state.markerArr.length - 1].getLngLat();
            this.setState({ firstStop: lastMarkerCoords.toArray() });
            this.getAndDrawNewIso(lastMarkerCoords);
          });
        }
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
