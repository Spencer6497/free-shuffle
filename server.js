const axios = require("axios");
const cors = require("cors");
const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 5000;
const accessToken =
  process.env.ACCESS_TOKEN ||
  "pk.eyJ1Ijoic3BlbmNlcjY0OTciLCJhIjoiY2w0bHF6NXpiMDBpaTNnbzJleHA3ZDYzbCJ9.ZZGzmhDOJtzWZJSAa8M0gQ";

const urlBase = "https://api.mapbox.com/isochrone/v1/mapbox/";

app.use(cors()); // Enable CORS
app.use(express.json()); // Recognize Request Objects as JSON objects
app.use(express.static("build")); // serve static files (css & js) from the 'public' directory
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/api/getIso", (req, res) => {
  axios
    .get(
      `${urlBase}${
        req.query.profile === "running" ? "walking" : req.query.profile
      }/${req.query.lng},${req.query.lat}?contours_meters=${Math.floor(
        (req.query.units === "mi"
          ? req.query.distance * 1609.34
          : req.query.distance * 1000) / 3
      )}&polygons=true&access_token=${accessToken}`
    )
    .then((response) => {
      res.send(response.data);
    })
    .catch((error) => {});
});

app.get("/api/getRoute", (req, res) => {
  axios
    .get(
      `https://api.mapbox.com/directions/v5/mapbox/${
        req.query.profile === "running" ? "walking" : req.query.profile
      }/${
        req.query.formattedAPIString
      }?continue_straight=true&alternatives=true&geometries=geojson&access_token=${accessToken}`
    )
    .then((response) => {
      res.send(response.data);
    })
    .catch((error) => {});
});

app.listen(port, () => console.log(`Listening on port ${port}`));
