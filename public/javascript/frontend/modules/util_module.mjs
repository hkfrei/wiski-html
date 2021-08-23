import * as Comlink from "https://unpkg.com/comlink/dist/esm/comlink.mjs";
const noDataPeriodLabels = {
  pt24h: "Innerhalb der letzten 24 Std. gibt es keine Daten.",
  pt48h: "Innerhalb der letzten 48 Std. gibt es keine Daten.",
  p7d: "Innerhalb der letzten Woche gibt es keine Daten.",
  p1m: "Innerhalb des letzten Monats gibt es keine Daten.",
  p1y: "Innerhalb des letzten Jahres gibt es keine Daten.",
};
const locale = "de-CH";
const notNormalizedYAxis = ["Niederschlag"];

const graphDataWorker = new Worker("javascript/frontend/graphDataHelper.js");
const graphDataHelper = Comlink.wrap(graphDataWorker);
/*
 * change the time-range of data a graph displays.
 * @param {object} params - function parameter object.
 * @param {umber} params.ts_id - kiwis time-series id.
 * @param {string} params.period - the request period for the graph.
 * @param {object} params.chart - chart.js instance.
 * @param {string} params.url - url to request graph data from kiwis.
 * @returns {Promise} - chart.js object.
 */
const changeGraphDate = async ({ tsId, period, chart, url } = {}) => {
  if (!tsId || !period) {
    return;
  }
  // threshold can be changed according to period if needed.
  const threshold = period === "p1y" ? 50 : 50;
  const wait = document.querySelector(`.wait-${tsId}`);
  if (period !== "pt24h") {
    window.requestAnimationFrame(() => {
      wait.style.visibility = "visible";
    });
  }
  try {
    const timeSeries = await graphDataHelper.getGraphData({
      url,
      tsId,
      period,
    });
    const { data, labels } = await prepStationData({
      data: timeSeries[0].data,
      canvas: chart.canvas,
      threshold,
    });
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    if (timeSeries[0].parametertype_name === "Bodensaugspannung") {
      const xMin = data[0].x;
      const xMax = data[data.length - 1].x;
      upateBodenAnnotations({ chart, xMin, xMax });
    }
    chart.update();
    updatePeriodLabel({ data: chart.data.datasets[0].data, tsId, period });
    window.requestAnimationFrame(() => {
      wait.style.visibility = "hidden";
    });
    return chart;
  } catch (error) {
    console.error(error);
    alert("Fehler beim Wechseln des Datums: " + error);
  }
};

/*
 * prepares kiwis timeseries data in order to be readable by chart.js.
 * @param {object} params - function parameter object.
 * @param {array} params.data - time-series data from kiwis.
 * @param {<canvas>} params.canvas - html canvas element.
 * @returns {object} result - { labels:['the labels'], data:['chart.js optimized data'] }.
 */
const prepStationData = async ({ data, canvas, threshold } = {}) => {
  if (!data || Array.isArray(data) === false || data.length === 0) {
    displayDiagramLoadError(canvas);
  }
  const result = await graphDataHelper.prepStationData({ data, threshold });
  return result;
};

/*
 * displays an error message on a 2d canvas.
 * @param {<canvas>} node - html canvas element.
 */
const displayDiagramLoadError = (canvas) => {
  const ctx = canvas.getContext("2d");
  ctx.font = "16px Arial";
  ctx.textAlign = "center";
  ctx.fillText(
    "Diagramm konnte nicht geladen werden.",
    canvas.width / 2,
    canvas.height / 2
  );
};

/*
 * create a chart
 * @param {objet} params - function parameter object.
 * @param {object} params.ctx - 2d context from canvas.
 * @param {array} params.labels - dates to label the x axes.
 * @param {object} timeSerie - time series response object from kiwis.
 * @param {array} data - the data to create the graph.
 * @returns {object} chart - chart.js instance.
 */
const createChart = ({
  ctx,
  labels,
  timeSerie,
  data,
  unitNames,
  statistics,
}) => {
  const chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          backgroundColor: "rgba(0,191,255,0.1)", //color of the fill
          borderColor: "deepskyblue", // color of the line
          label: timeSerie.stationparameter_name,
          data,
        },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: "point" },
      plugins: {
        tooltip: {
          displayColors: false,
          titleMarginBottom: 0,
          footerMarginTop: 0,
        },
      },
      locale,
      elements: {
        point: {
          pointStyle: "circle",
          borderWidth: 2,
        },
      },
      scales: {
        x: {
          adapters: {
            date: {},
          },
          ticks: { maxTicksLimit: 6, font: { size: 11 } },
          type: "timeseries",
          time: {
            displayFormats: {
              month: "dd.MM.yy.",
              day: "dd.MM.",
              hour: "dd.MM. - HH:mm",
            },
            tooltipFormat: "dd.MM.yy / HH:mm",
          },
        },
        y: {
          ticks: {
            beginAtZero: false,
            font: { size: 11 },
          },
          title: {
            display: true,
            font: { size: 10 },
            text: unitNames[timeSerie.ts_unitsymbol]
              ? `[${unitNames[timeSerie.ts_unitsymbol]}]`
              : `[${timeSerie.ts_unitsymbol}]`,
          },
        },
      },
      showLines: true,
    },
  });
  if (timeSerie.parametertype_name === "Bodensaugspannung") {
    // use the annotation plugin to draw colored boxes with the "feuchtigkeit" categories.
    chart.options.plugins.annotation = getBodenAnnotations(data);
  }
  if (statistics !== false && typeof statistics === "object") {
    chart.options.plugins.annotation = getStatisticAnnotations(statistics);
    chart.statistics = statistics;
  }
  return chart;
};

/*
 * updates the label with the parameter and the max/min date above the diagram.
 * @param {array} data - data to get min/max date.
 * @param {number} tsId - the timeseries id.
 */
const updatePeriodLabel = ({ data, tsId, period } = {}) => {
  if (!data || !tsId || !period) {
    return;
  }
  if (Array.isArray(data)) {
    let minValue, maxValue;
    let label = document.getElementById(`messzeitraum-${tsId}`);
    label.innerHTML = "";
    data.forEach((element, i) => {
      if (i === 0) {
        minValue = element.x;
        maxValue = element.x;
      } else {
        if (element.x < minValue) {
          minValue = element.x;
        }
        if (element.x > maxValue) {
          maxValue = element.x;
        }
      }
    });
    const labelText = document.createElement("span");
    labelText.style.fontWeight = "normal";
    if (minValue && maxValue) {
      labelText.innerHTML = `(${minValue.toLocaleDateString(
        locale
      )} bis ${maxValue.toLocaleDateString(locale)})`;
    } else {
      labelText.classList.add("text-danger");
      labelText.innerHTML = `<br />${noDataPeriodLabels[period]}`;
    }

    label.append(labelText);
  }
};

/*
 * update the width of the horizontal boxes in the saugspannung diagrams
 * @param {array} data - the diagram data
 * @returns void.
 */
const getBodenAnnotations = (data) => {
  const xMin = data[0].x;
  const xMax = data[data.length - 1].x;
  return {
    annotations: {
      nass: {
        type: "box",
        // optional drawTime to control layering, overrides global drawTime setting
        drawTime: "beforeDatasetsDraw",
        // Left edge of the box. in units along the x axis
        xMin,
        // Right edge of the box
        xMax,
        // Top edge of the box in units along the y axis
        yMax: 6,
        // Bottom edge of the box
        yMin: 0,
        backgroundColor: "rgba(255,0,0,0.5)",
        borderWidth: 0,
      },
      sehrFeucht: {
        type: "box",
        drawTime: "beforeDatasetsDraw",
        xMin,
        xMax,
        yMax: 10,
        yMin: 6,
        backgroundColor: "rgba(255,127,0,0.5)",
        borderWidth: 0,
      },
      feucht: {
        type: "box",
        drawTime: "beforeDatasetsDraw",
        xMin,
        xMax,
        yMax: 20,
        yMin: 10,
        backgroundColor: "rgba(255,193,37,0.5)",
        borderWidth: 0,
      },
      trocken: {
        type: "box",
        drawTime: "beforeDatasetsDraw",
        xMin,
        xMax,
        yMax: 100,
        yMin: 20,
        backgroundColor: "rgba(34,139,34,0.5)",
        borderWidth: 0,
      },
    },
  };
};

const getStatisticAnnotations = (statistics) => {
  const keys = Object.keys(statistics);
  const result = {
    annotations: {},
  };

  keys.forEach((key) => {
    let borderColor = "#377eb8";
    if (key.indexOf("min") !== -1) {
      borderColor = "#4daf4a";
    }
    if (key.indexOf("max") !== -1) {
      borderColor = "#e41a1c";
    }
    result.annotations[key] = {
      type: "line",
      yMin: statistics[key],
      yMax: statistics[key],
      borderColor,
      borderWidth: 1,
      borderDash: [6, 3],
      label: {
        backgroundColor: "rgba(255,255,255,0.3",
        color: "#000",
        content: key,
        enabled: true,
        font: { style: "normal" },
        position: "start",
        xPadding: 2,
        yPadding: 0,
      },
    };
  });
  return result;
};

const upateBodenAnnotations = ({ chart, xMin, xMax }) => {
  if (!chart || !xMin || !xMax) {
    return;
  }
  const annotations = chart.options.plugins.annotation.annotations;
  const annotationKeys = Object.keys(annotations);
  annotationKeys.forEach((key) => {
    annotations[key].xMin = xMin;
    annotations[key].xMax = xMax;
  });
};

/*
 * update the y-axis scales of a chart.
 * @param {object} params - function parameter object.
 * @param {object} params.chart - chart.js instance.
 * @param {object} minMax - min and max values to use for the y axis scales.
 */
const updateYAxis = ({ chart, minMax } = {}) => {
  if (!chart || typeof minMax !== "object") {
    return;
  }
  const currentYAxisConfig = chart.options.scales.y;
  chart.options.scales.y = {
    ...currentYAxisConfig,
    suggestedMin: minMax.min,
    suggestedMax: minMax.max,
  };
  chart.update();
};

const normalizeYAxis = async ({ graphContainers, charts }) => {
  for (const node of graphContainers) {
    const tsId = node.dataset.tsid;
    const chart = charts[tsId];
    const url = node.dataset.diagramdataurl;
    const label = chart.data.datasets[0].label;
    // don't change niederschlag
    if (notNormalizedYAxis.includes(label)) {
      continue;
    }
    const statistics = chart.statistics;
    // if there are statistical values, use them to scale the y axis
    if (statistics) {
      const keys = Object.keys(statistics);
      const minMax = {};
      keys.forEach((key) => {
        if (key.indexOf("min") !== -1) {
          minMax.min = statistics[key];
        }
        if (key.indexOf("max") !== -1) {
          minMax.max = statistics[key];
        }
      });
      updateYAxis({ chart, minMax });
      continue;
    }
    // fetch yearly data for the diagram
    try {
      const timeSerie = await graphDataHelper.getGraphData({
        url,
        tsId,
        period: "p1y",
      });
      const minMax = await graphDataHelper.getYearlyMinMax({
        data: timeSerie[0].data,
      });
      updateYAxis({ chart, minMax });
    } catch (error) {
      console.error(error);
    }
  }
};

export {
  graphDataHelper,
  changeGraphDate,
  prepStationData,
  displayDiagramLoadError,
  createChart,
  updatePeriodLabel,
  normalizeYAxis,
};
