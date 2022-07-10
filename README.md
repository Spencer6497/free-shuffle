# Freeshuffle
Randomly generate running and cycling routes using Mapbox and Turf.js

![meme](https://i.imgflip.com/6lsb2k.jpg "Meme")

*I'm not paying you to go on a run!*

## Inspiration
One day, I got bored with my normal running routes so I googled "Random running route generator". I stumbled upon a website called https://routeshuffle.com/. <br>
While the functionality was pretty neat, I soon realized that I wouldn't be able to export the route into Google Maps. Whatever. <br>
Then I realized that I wasn't able so save a route either. <br>
I wasn't even able to log in and make a free account!
<br>
<br>
Thus, Freeshuffle was born.

## How it works
Freeshuffle relies on the underlying logic of Isodistances, or places that are equidistant from a given point, something like *this:*
<br>
<br>
![Isochrone example](https://ci5.googleusercontent.com/proxy/UGZs_d2CJLDuW4f-6qsuRrlORNkPRerbfVi1QnpboHhbz6QJd-gP_2t1TAho2hIVaMzVHjK3Z547IwTnhLXxJx06MQf7LCQ2A0uv1LEw2tJsXpVb16bH4c9NpRfRZvJ8=s0-d-e1-ft "Isochrone example")
<br>
<br>
Basically, it plots the chosen start/end on a map, takes a desired distance as input, and does the following:
1. Calls the [Mapbox Isochrone API](https://docs.mapbox.com/api/navigation/isochrone/) with the starting/ending coordinates and  1/3 of the desired distance as query parameters (1/3 was chosen as 2 other points [3 total] is the minimum # of points required to plot a circle-like shape)
2. Draws the returned isochrone (isodistance in our case) around the Start/End point
3. Chooses a random point along the isodistance as the 2nd stop on the route
4. Calls the Mapbox Isochrone API *again* with the 2nd stop and 1/3 of desired distance as query params
5. Paints *another* isodistance around *it*
6. Finds a list of all intersections between these isodistances (using [Turf.js](https://turfjs.org/))
7. Picks whichever intersection is closest to 1/3 of the desired distance (straight-line distance, using Turf.js again)
8. Plots all three points and calls the [Mapbox Directions API](https://docs.mapbox.com/api/navigation/directions/) to find a route between them
9. Throws the result out if it doesn't fall within 0.5 miles/km of the desired distance and recurses
10. Paints the route on the map

Visualization of the algorithm in action (please excuse the messy UI :) ):
<br>
<br>
![Freeshuffle algorithm visualization](client/src/images/Isochrones.gif)
