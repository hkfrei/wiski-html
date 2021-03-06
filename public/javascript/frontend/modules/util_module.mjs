const noDataPeriodLabels = {
  pt24h: "Innerhalb der letzten 24 Std. gibt es keine Daten.",
  pt48h: "Innerhalb der letzten 48 Std. gibt es keine Daten.",
  p7d: "Innerhalb der letzten Woche gibt es keine Daten.",
  p1m: "Innerhalb des letzten Monats gibt es keine Daten.",
  p1y: "Innerhalb des letzten Jahres gibt es keine Daten.",
};
const locale = "de-CH";
/*
 * change the time-range of data a graph displays.
 * @param {object} params - function parameter object.
 * @param {umber} params.ts_id - kiwis time-series id.
 * @param {string} params.period - the request period for the graph.
 * @param {object} params.chart - chart.js instance.
 * @param {string} params.url - url to request graph data from kiwis.
 * @returns {Promise} - chart.js object.
 */
const changeGraphDate = ({ tsId, period, chart, url } = {}) => {
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
  getGraphData({ url, tsId, period })
    .then((timeSeries) => {
      try {
        const { data, labels } = prepStationData({
          data: timeSeries[0].data,
          canvas: chart.canvas,
        });
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.downsample(threshold);
        chart.update();
        updatePeriodLabel({ data: chart.data.datasets[0].data, tsId, period });
        window.requestAnimationFrame(() => {
          wait.style.visibility = "hidden";
        });

        return chart;
      } catch (error) {
        return;
      }
    })
    .catch((error) => console.error(error));
};

/*
 * gets graph data for a certain timeseries and period
 * @param {object} params - function parameter object.
 * @param {string} params.url - base url to fetch graph data.
 * @param {number} params.tsId - the timeseries id.
 * @param {string} params.period - the period to request the data for e.g. "PT24H".
 * @returns {Promise} - a promise wich fullfills with a timeseries including the data.
 */
const getGraphData = ({ url, tsId, period } = {}) => {
  if (!url || !tsId || !period) {
    return Promise.reject(
      "Diagrammdaten konnten nicht geladen werden. Bitte Funktionsparameter überprüfen."
    );
  }
  return fetch(`${url}&ts_id=${tsId}&period=${period}`)
    .then((response) => response.json())
    .then((timeSeries) => timeSeries);
};

/*
 * prepares kiwis timeseries data in order to be readable by chart.js.
 * @param {object} params - function parameter object.
 * @param {array} params.data - time-series data from kiwis.
 * @param {<canvas>} params.canvas - html canvas element.
 * @returns {object} result - { labels:['the labels'], data:['chart.js optimized data'] }.
 */
const prepStationData = ({ data, canvas } = {}) => {
  if (!data || Array.isArray(data) === false || data.length === 0) {
    displayDiagramLoadError(canvas);
  }
  const result = { labels: [], data: [] };
  data.forEach((element) => {
    const date = new Date(element[0]);
    result.labels.push(date);
    result.data.push({ x: date, y: element[1] });
  });
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
  return new Chart(ctx, {
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
              labelString: `[${unitNames[timeSerie.ts_unitsymbol]}]`,
            },
          },
        ],
      },
      showLines: true,
    },
  });
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

export {
  changeGraphDate,
  getGraphData,
  prepStationData,
  displayDiagramLoadError,
  createChart,
  updatePeriodLabel,
};
