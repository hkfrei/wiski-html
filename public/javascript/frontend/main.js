import {
  changeGraphDate,
  getGraphData,
  prepStationData,
  createChart,
  updatePeriodLabel,
} from "./modules/util_module.mjs";

const charts = {};

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

/*
 * logic for downloading time series data
 */
const downloadTimeRange = document.getElementById("downloadTimerange");
const downloadParameter = document.getElementById("downloadParameter");
const downloadButton = document.getElementById("downloadTimeSeriesButton");
const downloadSpinner = document.getElementById("download__spinner");

const downloadTimeSeries = async () => {
  downloadSpinner.style.visibility = "visible";
  const ts_id = downloadParameter.value;
  const period = downloadTimeRange.value;
  const basicUrl = downloadButton.dataset.requesturl;
  const url = `${basicUrl}&ts_id=${ts_id}&period=${period}`;
  try {
    // Step 1: start the fetch and obtain a reader
    let response = await fetch(url);
    const reader = response.body.getReader();
    // Step 3: read the data
    let chunks = []; // array of received binary chunks (comprises the body)
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      chunks.push(value);
    }
    const blob = new Blob(chunks);
    const objUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = objUrl;
    a.download = `time_series_${period}_${new Date().toLocaleDateString()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(objUrl);
    downloadSpinner.style.visibility = "hidden";
  } catch (error) {
    alert(error);
    downloadSpinner.style.visibility = "hidden";
  }
};
downloadButton.addEventListener("click", downloadTimeSeries);

/* send messages to the parent window when the size of the
 * accordion changes
 */
const container = document.querySelector(".info-container");
const accordionHeaders = document.querySelectorAll(".btn-link");
accordionHeaders.forEach((header) => {
  header.addEventListener("click", (e) => {
    window.setTimeout(function () {
      sendHeightStatus(container);
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
      if (Array.isArray(data)) {
        charts[tsId] = createChart({
          ctx,
          timeSerie,
          labels,
          unitNames,
          data,
        });
      }
      if (charts[tsId]) {
        updatePeriodLabel({
          data: charts[tsId].data.datasets[0].data,
          tsId,
          period: "pt24h",
        });
      }
    })
    .catch((error) => console.error(error));
}

/*
 * post a message to the parent window with the
 * height of this site in order it can update it's
 * iframe height.
 */
const sendHeightStatus = (container) => {
  window.parent.postMessage({ height: container.offsetHeight }, "*");
};
/* on the first page load, send the height
 * of the iframe to the reqesting app.
 */
window.requestAnimationFrame(() => {
  window.requestAnimationFrame(() => sendHeightStatus(container));
});
