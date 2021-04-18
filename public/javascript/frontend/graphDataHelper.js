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
};

Comlink.expose(graphDataHelper);
