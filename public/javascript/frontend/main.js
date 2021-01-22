import {
  changeGraphDate,
  getGraphData,
  prepStationData,
  createChart,
  updatePeriodLabel,
} from "./modules/util_module.mjs";
const charts = {};

const maximizeLink = document.querySelector(".maximize-link");
if (
  maximizeLink &&
  window.location.host.indexOf("wiski-html-h2eptfuxza-ew.a.run.app") !== -1
) {
  maximizeLink.innerHTML = "";
}

const timeRadios = document.querySelectorAll(".graph-time-radio");
timeRadios.forEach((radio) =>
  radio.addEventListener("click", (e) => {
    const tsId = e.target.id.split("-")[2];
    const period = e.target.value;
    const url = e.target.dataset.diagramdataurl;
    const chart = charts[tsId];
    changeGraphDate({ tsId, period, chart, url });
  })
);

/* send messages to the parent window when the size of the
 * accordion changes
 */
const container = document.querySelector(".info-container");
const accordionHeaders = document.querySelectorAll(".btn-link");
accordionHeaders.forEach((header) => {
  header.addEventListener("click", (e) => {
    window.setTimeout(function () {
      const parent = window.parent;
      parent.postMessage(
        { height: container.offsetHeight },
        "http://app.lisag.ch:3000" // @TODO change to production url
      );
    }, 450); // wait for the animation to end
  });
});

const graphContainers = document.querySelectorAll(".graph-container");
for (const node of graphContainers) {
  const tsId = node.dataset.tsid;
  const url = node.dataset.diagramdataurl;
  const unitNames = JSON.parse(node.dataset.unitnames);
  // json data for diagrams
  getGraphData({ url, tsId, period: "PT24H" })
    .then((timeSeries) => {
      const ctx = node.getContext("2d");
      const timeSerie = timeSeries[0];
      let labels = [];
      let data = [];
      try {
        const graphData = prepStationData({
          data: timeSerie.data,
          canvas: node,
        });
        labels = graphData.labels;
        data = graphData.data;
      } catch (error) {
        return;
      }
      if (Array.isArray(data) && data.length > 0) {
        charts[tsId] = createChart({
          ctx,
          timeSerie,
          labels,
          unitNames,
          data,
        });
      }
      if (charts[tsId]) {
        updatePeriodLabel(charts[tsId].data.datasets[0].data, tsId);
      }
    })
    .catch((error) => console.error(error));
}
