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
  prepStationData: function ({ data, threshold = 50 } = {}) {
    const result = { labels: [], data: [] };
    for (const element of data) {
      // don't add falsy values except 0
      if (!element[1] && element[1] !== 0) {
        continue;
      }
      const date = new Date(element[0]);
      // use absolute values where available
      const value = element[2] ? element[2] : element[1];
      result.data.push({ x: date, y: value });
    }
    const downsampled = this.downsample(result.data, threshold);
    result.labels = downsampled.map((element) => element.x);
    result.data = downsampled;
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
  downsample: function (data, threshold) {
    // this function is from flot-downsample (MIT), with modifications

    var dataLength = data.length;
    if (threshold >= dataLength || threshold <= 0) {
      return data; // nothing to do
    }

    var sampled = [],
      sampledIndex = 0;

    // bucket size, leave room for start and end data points
    var every = (dataLength - 2) / (threshold - 2);

    var a = 0, // initially a is the first point in the triangle
      maxAreaPoint,
      maxArea,
      area,
      nextA;

    // always add the first point
    sampled[sampledIndex++] = data[a];

    for (var i = 0; i < threshold - 2; i++) {
      // Calculate point average for next bucket (containing c)
      var avgX = 0,
        avgY = 0,
        avgRangeStart = Math.floor((i + 1) * every) + 1,
        avgRangeEnd = Math.floor((i + 2) * every) + 1;
      avgRangeEnd = avgRangeEnd < dataLength ? avgRangeEnd : dataLength;

      var avgRangeLength = avgRangeEnd - avgRangeStart;

      for (; avgRangeStart < avgRangeEnd; avgRangeStart++) {
        avgX += data[avgRangeStart].x * 1; // * 1 enforces Number (value may be Date)
        avgY += data[avgRangeStart].y * 1;
      }
      avgX /= avgRangeLength;
      avgY /= avgRangeLength;

      // Get the range for this bucket
      var rangeOffs = Math.floor((i + 0) * every) + 1,
        rangeTo = Math.floor((i + 1) * every) + 1;

      // Point a
      var pointAX = data[a].x * 1, // enforce Number (value may be Date)
        pointAY = data[a].y * 1;

      maxArea = area = -1;

      for (; rangeOffs < rangeTo; rangeOffs++) {
        // Calculate triangle area over three buckets
        area =
          Math.abs(
            (pointAX - avgX) * (data[rangeOffs].y - pointAY) -
              (pointAX - data[rangeOffs].x) * (avgY - pointAY)
          ) * 0.5;
        if (area > maxArea) {
          maxArea = area;
          maxAreaPoint = data[rangeOffs];
          nextA = rangeOffs; // Next a is this b
        }
      }

      sampled[sampledIndex++] = maxAreaPoint; // Pick this point from the bucket
      a = nextA; // This a is the next a (chosen b)
    }

    sampled[sampledIndex] = data[dataLength - 1]; // Always add last

    return sampled;
  },
};

Comlink.expose(graphDataHelper);
