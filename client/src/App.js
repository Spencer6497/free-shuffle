import React, { Component } from "react";

import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";

import { pointGrid } from "@turf/turf";

import logo from "./logo.svg";

import "./App.css";
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
      this.setState({ lng: newCoords[0], lat: newCoords[1] }, () => {
        this.getIso().then(() => {
          // get last marker and make an iso from it
          const lastMarkerCoords =
            this.state.markerArr[this.state.markerArr.length - 1].getLngLat();
          this.getAndDrawNewIso(lastMarkerCoords);
        });
      });
      const marker = new mapboxgl.Marker({ color: "red" })
        .setLngLat(newCoords)
        .addTo(map);
      this.state.markerArr.push(marker);
      this.state.map.flyTo({
        center: newCoords,
        zoom: 13,
        speed: 1,
      });
      results.innerText = JSON.stringify(e.result, null, 2);
    });

    // Clear results container when search is cleared.
    geocoder.on("clear", () => {
      results.innerText = "";
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
        this.state.distance * 1609.34
      )}&polygons=true&access_token=${mapboxgl.accessToken}`,
      { method: "GET" }
    );
    const data = await query.json();
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
    // this.getRoute([this.state.lng, this.state.lat], randomPoint);
    // this.getRoute(randomPoint, [this.state.lng, this.state.lat]);
  };

  // Draw new iso from last point
  getAndDrawNewIso = async (newCoords) => {
    const query = await fetch(
      `${urlBase}${this.state.profile}/${newCoords.lng},${
        newCoords.lat
      }?contours_meters=${Math.floor(
        this.state.distance * 1609.34
      )}&polygons=true&access_token=${mapboxgl.accessToken}`,
      { method: "GET" }
    );
    const data = await query.json();
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

  /**
   * Builds a route from start --> end and paints it on the map
   * @param {start coordinate} start
   * @param {end coordinate} end
   */
  getRoute = async (start, end) => {
    const query = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/cycling/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`,
      { method: "GET" }
    );

    const json = await query.json();
    const data = json.routes[0];
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
      this.getIso();
    }
  }

  render() {
    return (
      <div>
        <div ref={this.mapContainer} className="map-container" />
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
          </label>
          <input type="submit" id="distanceSubmitButton"></input>
        </form>
        <pre id="result"></pre>
      </div>
    );
  }
}
