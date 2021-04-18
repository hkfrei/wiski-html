importScripts("https://unpkg.com/comlink/dist/umd/comlink.js");

const graphDataHelper = {
  /*
   * gets graph data for a certain timeseries and period
   * @param {object} params - function parameter object.
   * @param {string} params.url - base url to fetch graph data.
   * @param {number} params.tsId - the timeseries id.
   * @param {string} params.period - the period to request the data for e.g. "PT24H".
   * @returns {Promise} - a promise wich fullfills with a timeseries including the data.
   */
  getGraphData: async function ({ url, tsId, period } = {}) {
    try {
      const response = await fetch(`${url}&ts_id=${tsId}&period=${period}`);
      const timeSeries = await response.json();
      return timeSeries;
    } catch (error) {
      return error;
    }
  },

  /*
   * prepares kiwis timeseries data in order to be readable by chart.js.
   * @param {object} params - function parameter object.
   * @param {array} params.data - time-series data from kiwis.
   * @returns {object} result - { labels:['the labels'], data:['chart.js optimized data'] }.
   */
  prepStationData: function ({ data } = {}) {
    const result = { labels: [], data: [] };
    data.forEach((element) => {
      const date = new Date(element[0]);
      result.labels.push(date);
      result.data.push({ x: date, y: element[1] });
    });
    return result;
  },
};

Comlink.expose(graphDataHelper);
