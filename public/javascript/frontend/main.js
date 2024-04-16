import {
  changeGraphDate,
  graphDataHelper,
  prepStationData,
  createChart,
  updatePeriodLabel,
  normalizeYAxis,
} from "./modules/util_module.mjs";

const charts = {};
const wiskiContainer = document.getElementById("wiski-container");
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
 * logic for downloading time series data in excel format.
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
if (downloadButton) {
  downloadButton.addEventListener("click", downloadTimeSeries);
}

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

/*
 * load the diagrams with the initial period of 24h.
 */
const graphContainers = document.querySelectorAll(".graph-container");
for (const node of graphContainers) {
  const tsId = node.dataset.tsid;
  const url = node.dataset.diagramdataurl;
  const unitNames = JSON.parse(node.dataset.unitnames);
  const statistics = node.dataset.statistics
    ? JSON.parse(node.dataset.statistics)
    : false;
  try {
    // iife because to levele avait is not supported by every browser.
    (async function () {
      const timeSeries = await graphDataHelper.getGraphData({
        url,
        tsId,
        period: "pt24h",
      });
      const ctx = node.getContext("2d");
      const timeSerie = timeSeries[0];
      let labels = [];
      let data = [];

      const graphData = await prepStationData({
        data: timeSerie.data,
        canvas: node,
      });
      labels = graphData.labels;
      data = graphData.data;

      if (Array.isArray(data)) {
        charts[tsId] = createChart({
          ctx,
          timeSerie,
          labels,
          unitNames,
          data,
          statistics,
        });
      }
      if (charts[tsId]) {
        updatePeriodLabel({
          data: charts[tsId].data.datasets[0].data,
          tsId,
          period: "pt24h",
        });
      }
    })();
  } catch (error) {
    alert("Es gab einen Fehler beim Laden der Diagramme: " + error);
  }
}

/*
 * if the page runs in an iframe, hide the body vertical scrollbar
 * because it can create flackering when chart tooltips are displayed.
 * that said, it is important for the iframe user, to make the iframe content scrollable.
 */
if (window.location !== window.parent.location) {
  wiskiContainer.style.overflowY = "hidden";
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

/*
 * wait for the initial creation of the diagrams (pt24h) and
 * then call a callback function to normalize the y axis.
 * @param {function} cb - the callback function to execute.
 */
const waitForInitialDiagramLoad = (cb) => {
  window.requestAnimationFrame(() => {
    if (graphContainers.length === Object.keys(charts).length) {
      cb();
    } else {
      waitForInitialDiagramLoad(cb);
    }
  });
};

waitForInitialDiagramLoad(() => normalizeYAxis({ graphContainers, charts }));
