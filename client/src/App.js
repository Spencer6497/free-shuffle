import React, { Component } from "react";

import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";

import logo from "./logo.svg";

import "./App.css";
import mapboxgl from "!mapbox-gl"; // eslint-disable-line import/no-webpack-loader-syntax

mapboxgl.accessToken =
  "pk.eyJ1Ijoic3BlbmNlcjY0OTciLCJhIjoiY2w0bHF6NXpiMDBpaTNnbzJleHA3ZDYzbCJ9.ZZGzmhDOJtzWZJSAa8M0gQ";

export default class App extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      lng: -84.5,
      lat: 39.1,
      zoom: 9,
      distance: "",
    };
    this.mapContainer = React.createRef();
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  markerArr = [];
  clientIP = "";

  componentDidMount() {
    this.fetchClientIP().then((res) => (this.clientIP = res.ip));

    const { lng, lat, zoom } = this.state;
    const map = new mapboxgl.Map({
      container: this.mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [lng, lat],
      zoom: zoom,
      proximity: this.clientIP,
    });

    map.on("move", () => {
      this.setState({
        lng: map.getCenter().lng.toFixed(4),
        lat: map.getCenter().lat.toFixed(4),
        zoom: map.getZoom().toFixed(2),
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
      this.markerArr.forEach((marker) => marker.remove());
      const newCoords = e.result.center;
      const marker = new mapboxgl.Marker().setLngLat(newCoords).addTo(map);
      this.markerArr.push(marker);
      map.flyTo({
        center: newCoords,
        zoom: 13,
        speed: 1,
      });
      results.innerText = JSON.stringify(e.result, null, 2);
    });

    // Clear results container when search is cleared.
    geocoder.on("clear", () => {
      results.innerText = "";
      this.markerArr.forEach((marker) => marker.remove());
    });
  }

  fetchClientIP = async () => {
    const response = await fetch("/api/clientIP");
    const body = await response.json();
    return body;
  };

  handleChange(event) {
    this.setState({ distance: event.target.value });
  }

  handleSubmit(event) {
    alert("A distance was submitted: " + this.state.distance);
    event.preventDefault();
  }

  render() {
    const { lng, lat, zoom } = this.state;
    return (
      <div>
        <div className="sidebar">
          Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
        </div>
        <div ref={this.mapContainer} className="map-container" />
        <div id="geocoder"></div>
        <form onSubmit={this.handleSubmit}>
          <label>
            Distance:
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
