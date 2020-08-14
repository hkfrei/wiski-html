// load the things we need
var express = require("express");
var compression = require("compression");
var app = express();
// set the view engine to ejs
app.set("view engine", "ejs");
app.use(compression());
app.use(express.static("public"));
// index page
app.get("/", function (req, res) {
  // caching strategy:
  // public:      allow caching on a server.
  // max-age:     how long can content be stored in users browsers.
  // s-maxage:    how long can content be stored on a cdn.
  res.set("Cache-Control", "public, max-age=300, s-maxage=600s");
  var endpoints = ["/wasser?stationid=123", "/boden?stationid=123"];
  res.render("pages/index", {
    endpoints: endpoints,
  });
});

// wasser page
app.get("/wasser", function (req, res) {
  const { stationid } = req.query;
  res.render("pages/wasser", { station: stationid });
});
// boden page
app.get("/boden", function (req, res) {
  const { stationid } = req.query;
  res.render("pages/boden", { station: stationid });
});
// not found
app.use(function (req, res, next) {
  res.status(404).send("Sorry this route does not exist!");
});

const port = process.env.PORT || 8080;
app.listen(port);
console.log(`${port} is the magic port`);

module.exports = { app };
