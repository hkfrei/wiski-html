// load the things we need
var express = require("express");
var compression = require("compression");
var helmet = require("helmet");
var app = express();
var waterUtil = require("./public/javascript/backend/water_util.js");
app.set("view engine", "ejs");
app.use(compression());
// secure the app but allow scripts required for bootstrap
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "https://stackpath.bootstrapcdn.com",
        "https://cdn.jsdelivr.net",
        "https://code.jquery.com",
      ],
      styleSrc: ["'self'", "https://stackpath.bootstrapcdn.com"],
      imgSrc: ["'self'", "https://kiwis.innetag.ch"],
    },
  })
);
app.use(express.static("public"));
// index page
app.get("/", function (req, res) {
  // caching strategy:
  // public:      allow caching on a server.
  // max-age:     how long can content be stored in users browsers.
  // s-maxage:    how long can content be stored on a cdn.
  res.set("Cache-Control", "public, max-age=300, s-maxage=600s");
  var endpoints = ["/wasser?stationid=22061", "/boden?stationid=22005"];
  res.render("pages/index", {
    endpoints: endpoints,
  });
});

// wasser page
app.get("/wasser", async (req, res, next) => {
  const { stationid } = req.query;
  try {
    const station = await waterUtil.getWaterStationInfo(stationid);
    res.render("pages/wasser", {
      station: station.info,
      time_series: station.time_series,
      measure_params: station.measure_params,
    });
  } catch (error) {
    return next(error);
  }
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
//error
app.use(function (err, req, res, next) {
  res.status(500).render("pages/error", { error: err.stack });
});

const port = process.env.PORT || 8080;
app.listen(port);
console.log(`${port} is the magic port`);

module.exports = { app };
