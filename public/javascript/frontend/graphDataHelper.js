importScripts("https://unpkg.com/comlink/dist/umd/comlink.js");

const graphDataHelper = {
  /*
   * a cache for downloaded time series
   */
  cache: {},

  /*
   * gets graph data for a certain timeseries and period
   * @param {object} params - function parameter object.
   * @param {string} params.url - base url to fetch graph data.
   * @param {number} params.tsId - the timeseries id.
   * @param {string} params.period - the period to request the data for e.g. "PT24H".
   * @returns {Promise} - a promise wich fullfills with a timeseries including the data.
   */
  getGraphData: async function ({ url, tsId, period } = {}) {
    // have a look at he cache first...
    if (this.cache[tsId] && this.cache[tsId][period]) {
      return this.cache[tsId][period];
    }
    try {
      // use object spread to make sure allready cached values do not get lost.
      this.cache[tsId] = { ...this.cache[tsId] };
      const response = await fetch(`${url}&ts_id=${tsId}&period=${period}`);
      const timeSeries = await response.json();
      // put it to the cache for later usage.
      this.cache[tsId][period] = timeSeries;
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
    for (const element of data) {
      // don't add falsy values except 0
      if (!element[1] && element[1] !== 0) {
        continue;
      }
      const date = new Date(element[0]);
      // use absolute values where available
      const value = element[2] ? element[2] : element[1];
      result.labels.push(date);
      result.data.push({ x: date, y: value });
    }
    return result;
  },

  /*
   * get min/max value of a yearly time series.
   * @param {object} params - function parameter object.
   * @param {array} params.data - time-series data from kiwis.
   * @returns {object} result - {min:x, max:y}.
   */
  getYearlyMinMax: function ({ data }) {
    const result = { min: 0, max: 0 };
    for (var i = 0; i < data.length; i++) {
      // use absolute values when available
      const value = data[i][2] ? data[i][2] : data[i][1];
      if (!value) {
        continue;
      }
      /* if we have a value and the result is still 0,
       * set result min and max to the value. necessary
       * to not have a too wide range e.g. 0 to xy
       */
      if (result.min === 0 && result.max === 0) {
        result.min = value;
        result.max = value;
        continue;
      }
      if (value < result.min) {
        result.min = value;
      }
      if (value > result.max) {
        result.max = value;
      }
    }
    return result;
  },
};

Comlink.expose(graphDataHelper);
