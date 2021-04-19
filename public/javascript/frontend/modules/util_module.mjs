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
  const threshold = period === "P1Y" ? 100 : 50;
  const wait = document.querySelector(`.wait-${tsId}`);
  if (period !== "PT24H") {
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
    });
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.downsample(threshold);
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
const prepStationData = async ({ data, canvas } = {}) => {
  if (!data || Array.isArray(data) === false || data.length === 0) {
    displayDiagramLoadError(canvas);
  }
  const result = await graphDataHelper.prepStationData({ data });
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
const createChart = ({ ctx, labels, timeSerie, data, unitNames }) => {
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
      downsample: {
        enabled: true,
        threshold: 50,
      },
      tooltips: { mode: "nearest" },
      scales: {
        xAxes: [
          {
            ticks: { maxTicksLimit: 4 },
            type: "time",
            time: {
              displayFormats: { day: "D MMM", hour: "D MMM ha" },
              tooltipFormat: "dddd DD.MM.YYYY HH:mm",
            },
          },
        ],
        yAxes: [
          {
            ticks: {
              beginAtZero: false,
            },
            scaleLabel: {
              display: true,
              labelString: unitNames[timeSerie.ts_unitsymbol]
                ? `[${unitNames[timeSerie.ts_unitsymbol]}]`
                : `[${timeSerie.stationparameter_name}]`,
            },
          },
        ],
      },
      showLines: true,
    },
  });
  if (timeSerie.parametertype_name === "Bodensaugspannung") {
    chart.options.scales.yAxes = [
      {
        ticks: {
          suggestedMin: 0,
          suggestedMax: 100,
        },
        scaleLabel: {
          display: true,
          labelString: `[${unitNames[timeSerie.ts_unitsymbol]}]`,
        },
      },
    ];
    // use the annotation plugin to draw colored boxes with the "feuchtigkeit" categories.
    chart.options.annotation = getBodenAnnotations(data);
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
    annotations: [
      {
        type: "box",
        // optional drawTime to control layering, overrides global drawTime setting
        drawTime: "beforeDatasetsDraw",
        // optional annotation ID (must be unique)
        id: "nass",
        // ID of the X scale to bind onto
        xScaleID: "x-axis-0",
        // ID of the Y scale to bind onto
        yScaleID: "y-axis-0",
        // Left edge of the box. in units along the x axis
        xMin,
        // Right edge of the box
        xMax,
        // Top edge of the box in units along the y axis
        yMax: 6,
        // Bottom edge of the box
        yMin: 0,
        backgroundColor: "rgba(255,0,0,0.5)",
      },
      {
        type: "box",
        drawTime: "beforeDatasetsDraw",
        id: "sehr feucht",
        xScaleID: "x-axis-0",
        yScaleID: "y-axis-0",
        xMin,
        xMax,
        yMax: 10,
        yMin: 6,
        backgroundColor: "rgba(255,127,0,0.5)",
      },
      {
        type: "box",
        drawTime: "beforeDatasetsDraw",
        id: "feucht",
        xScaleID: "x-axis-0",
        yScaleID: "y-axis-0",
        xMin,
        xMax,
        yMax: 20,
        yMin: 10,
        backgroundColor: "rgba(255,193,37,0.5)",
      },
      {
        type: "box",
        drawTime: "beforeDatasetsDraw",
        id: "trocken",
        xScaleID: "x-axis-0",
        yScaleID: "y-axis-0",
        xMin,
        xMax,
        yMax: 100,
        yMin: 20,
        backgroundColor: "rgba(34,139,34,0.5)",
      },
    ],
  };
};

const upateBodenAnnotations = ({ chart, xMin, xMax }) => {
  if (!chart || !xMin || !xMax) {
    return;
  }
  const elements = chart.annotation.elements;
  const elementKeys = Object.keys(elements);
  elementKeys.forEach((key) => {
    elements[key].options.xMin = xMin;
    elements[key].options.xMax = xMax;
  });
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
      charts[tsId].options.scales.yAxes = [
        {
          ticks: {
            suggestedMin: minMax.min,
            suggestedMax: minMax.max,
          },
        },
      ];
      charts[tsId].update();
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
