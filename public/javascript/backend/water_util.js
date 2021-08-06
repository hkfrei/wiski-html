var fetch = require("node-fetch");
var env = require("./ENV.js");

/*
 * add the correct labels to the latest measurement
 * @param {object} measurement - measurement object returned from kiwis
 * @returns {object} result - measurement object with correct unit labels in data.
 */
const labelLatestMeasurement = (measurement) => {
  if (!measurement) {
    return null;
  }
  const result = { ...measurement }; // copy object
  if (result.data.length > 0) {
    const data = result.data[0];
    const { parametertype_name, ts_unitsymbol } = result;
    const unit_name = env.unit_names[ts_unitsymbol]
      ? env.unit_names[ts_unitsymbol]
      : ts_unitsymbol;
    if (parametertype_name === "Grundwasserspiegel") {
      result.value = `Abstich: ${data[1]} ${ts_unitsymbol}`;
    } else {
      result.value = `${data[1]} ${unit_name}`;
    }
    if (data[2]) {
      result.absoluteValue = `${data[2]} ${unit_name}`;
    }
    // add some additional infos for bodenfeuchte -> saugspannung
    if (result.parametertype_name.indexOf("saugspannung") !== -1) {
      result.saugspannung = getSaugspannungMetadata(data[1]);
    }
  }
  return result;
};

/*
 * create a colored latest measurement value for bodenfeuchte.
 * @param {number} value - the saugspannung value.
 * @returns {object} result - contains hex color, text and html to display the result.
 */
const getSaugspannungMetadata = (value) => {
  const result = {
    color: "",
    text: "",
    html: "<span>Keine Daten verfügbar</span>",
  };
  if (!value) {
    return result;
  }
  if (value > 20) {
    result.color = "#28a745";
    result.text = "trocken";
  }
  if (value > 10 && value <= 20) {
    result.color = "#ffc107";
    result.text = "feucht";
  }
  if (value >= 6 && value <= 10) {
    result.color = "#ff7f00";
    result.text = "sehr feucht";
  }
  if (value < 6) {
    result.color = "#dc3545";
    result.text = "nass";
  }
  result.html = `<span style="padding:8px; border-radius:4px; width:20px; height:10px; background-color:${result.color};">`;
  result.html += `<strong>${value}</strong> Centibar (${result.text})</span>`;
  return result;
};

/*
 * add statistical values to timeseries
 * @param {object} params - function parameter object.
 * @param {array} params.statistics - statistics objects/timeseries
 * @param {array} params.timeseries - timeseries objects to add statistics to.
 * @returns {array} params.timeseries - the input timeseries objects with enhanced with statistical data.
 */
const addStatisticsToTimeSeries = ({ statistics, timeseries } = {}) => {
  const result = [];
  timeseries.forEach((serie) => {
    statistics.forEach((statistic) => {
      if (
        statistic.stationparameter_name.toLowerCase() ===
        serie.stationparameter_name.toLowerCase()
      ) {
        if (!serie.statistics) {
          serie.statistics = {};
        }
        serie.statistics[statistic.ts_name] = statistic.data[0][1];
      }
    });
    result.push(serie);
  });
  return result;
};

/*
 * filters out the statistical timeseries from an array or timeseries
 * @param {array} timeseries - timeseries/latest measurement objects received from kiwis
 * @returns {array} - the timeseries objects with statistical values.
 */
const getStatisticsFromTimeseries = (timeseries) => {
  if (!timeseries) {
    return [];
  }
  return timeseries.filter((element) => {
    const shortname = element.ts_shortname.toLowerCase();
    if (
      shortname.indexOf("max") !== -1 ||
      shortname.indexOf("min") !== -1 ||
      shortname.indexOf("mean") !== -1
    ) {
      return true;
    }
    return false;
  });
};

/*
 * removes statistical values from an array or timeseries
 * @param {array} timeseries - timeseries/latest measurement objects received from kiwis
 * @returns {array} - timeseries without statistical values.
 */
const removeStatisticsFromTimeseries = (timeseries) => {
  if (!timeseries) {
    return [];
  }
  return timeseries.filter((element) => {
    const shortname = element.ts_shortname.toLowerCase();
    if (
      shortname.indexOf("max") !== -1 ||
      shortname.indexOf("min") !== -1 ||
      shortname.indexOf("mean") !== -1
    ) {
      return false;
    }
    return true;
  });
};

const waterUtil = {
  getWaterStationInfo: async (stationid) => {
    // basic station information
    const stationInfoResponse = await fetch(
      `${env.kiwis_host}${env.station_info}&station_id=${stationid}`
    );
    const station_info = await stationInfoResponse.json();
    // filter out "Allgemein stations"
    const filtered_stations = station_info.filter(
      (station) => station.object_type !== "Allgemein"
    );
    let stationNumber = "";
    const firstStation = filtered_stations[0];
    if (firstStation.station_no.toLowerCase().indexOf("ch") !== -1) {
      // if it is a ch station get the numeric part of the station number
      // to be able to create the link to the station website.
      for (var i = 0; i < firstStation.station_no.length; i++) {
        if (Number.isInteger(parseInt(firstStation.station_no[i]))) {
          stationNumber += firstStation.station_no[i];
        }
      }
    }
    // get external documents for the station
    let docs;
    try {
      const docs_response = await fetch(
        `${env.documents_host}/UR_Hydrometrie/stations.php/${firstStation.station_no}`
      );
      docs = await docs_response.json();
    } catch (error) {
      docs = error;
    }
    // get the correct timeseries group for this station
    const ts_group_id = env.ts_group_id[firstStation.object_type];
    // get possible diagrams/timeseries this station
    const timeSeriesResponse = await fetch(
      `${env.kiwis_host}${env.time_series_list}&station_id=${stationid}&timeseriesgroup_id=${ts_group_id}`
    );
    let time_series = await timeSeriesResponse.json();

    // if it is a boden station, sort the timeseries the right order.
    if (
      firstStation.object_type &&
      firstStation.object_type.toLowerCase().indexOf("boden") !== -1
    ) {
      const sorted_time_series = [];
      time_series.forEach((serie) => {
        switch (serie.parametertype_name) {
          case "Bodensaugspannung":
            if (serie.stationparameter_name.indexOf("20 cm") !== -1) {
              sorted_time_series[0] = serie;
            }
            if (serie.stationparameter_name.indexOf("35 cm") !== -1) {
              sorted_time_series[1] = serie;
            }
            if (serie.stationparameter_name.indexOf("60 cm") !== -1) {
              sorted_time_series[2] = serie;
            }
            break;
          case "Niederschlag":
            sorted_time_series[3] = serie;
            break;
          case "Bodentemperatur":
            if (serie.stationparameter_name.indexOf("20 cm") !== -1) {
              sorted_time_series[4] = serie;
            }
            if (serie.stationparameter_name.indexOf("35 cm") !== -1) {
              sorted_time_series[5] = serie;
            }
            if (serie.stationparameter_name.indexOf("60 cm") !== -1) {
              sorted_time_series[6] = serie;
            }
            break;
          default:
            sorted_time_series.push(serie);
        }
      });
      // remove empty entries
      time_series = sorted_time_series.filter((entry) => entry !== null);
    }

    // get latest measurements for each time series
    let latest_measurements = [];
    for (const serie of time_series) {
      const latest_measurement_response = await fetch(
        `${env.kiwis_host}${env.latest_measurement}&ts_id=${serie.ts_id}`
      );
      const latest_measurement = await latest_measurement_response.json();
      // if latest measurement is not valid, check for a valid measurement a while back during "env.latest_measurement_period".
      const latest_data = latest_measurement[0].data;
      if (latest_data.length > 0 && latest_data[0][1] === null) {
        const latest_measurements_series_response = await fetch(
          `${env.kiwis_host}${env.latest_measurement}&ts_id=${serie.ts_id}&period=${env.latest_measurement_period}`
        );
        const latest_measurement_series = await latest_measurements_series_response.json();
        // get the youngest valid measurement of the "env.latest_measurement_period"
        const data = latest_measurement_series[0].data;
        for (let i = data.length - 1; i >= 0; i--) {
          const measurement = data[i];
          if (measurement[1] !== null) {
            latest_measurement[0].data[0] = measurement;
            break;
          }
        }
      }

      // create the correct unit labels
      latest_measurements.push(labelLatestMeasurement(latest_measurement[0]));
    }

    // get the statistic measurements
    const statistics = getStatisticsFromTimeseries(latest_measurements);

    // if  there are statistics, we have to do some further processing...
    if (statistics.length > 0) {
      latest_measurements = removeStatisticsFromTimeseries(latest_measurements);
      time_series = removeStatisticsFromTimeseries(time_series);
      time_series = addStatisticsToTimeSeries({
        statistics,
        timeseries: time_series,
      });
      console.log("timeseries", time_series);
    }

    // extract the measure parameters (names) for this station
    const measure_params = time_series.map(
      (serie) => serie.stationparameter_name
    );
    return {
      info: {
        ...firstStation,
        stationNumber,
        kiwis_host: env.kiwis_host,
        graph_url: env.graph,
        diagram_data: env.diagram_data,
        latest_measurements,
      },
      docs,
      measure_params,
      time_series,
      unit_names: env.unit_names,
      measure_periods: env.measure_periods,
      service_host: env.service_host,
      documents_host: env.documents_host,
    };
  },
};
module.exports = waterUtil;
