// load the things we need
var express = require("express");
var app = express();
var path = require("path");
// set the view engine to ejs
app.set("view engine", "ejs");

app.use(express.static("public"));
// index page
app.get("/", function (req, res) {
  // caching strategy:
  // public:      allow caching on a server.
  // max-age:     how long can content be stored in users browsers.
  // s-maxage:    how long can content be stored on a cdn.
  //res.set("Cache-Control", "public, max-age=300, s-maxage=600s");
  var drinks = [
    { name: "Bloody Mary", drunkness: 3 },
    { name: "Martini", drunkness: 5 },
    { name: "Scotch", drunkness: 10 },
  ];
  var tagline =
    "Any code of your own that you haven't looked at for six or more months might as well have been written by someone else.";

  res.render("pages/index", {
    drinks: drinks,
    tagline: tagline,
  });
});

// about page
app.get("/about", function (req, res) {
  res.render("pages/about");
});
const port = process.env.PORT || 8080;
app.listen(port);
console.log(`${port} is the magic port`);

module.exports = { app };
