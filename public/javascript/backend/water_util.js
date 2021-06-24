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
  }
  return result;
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
    const latest_measurements = [];
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
    // extract the measure parameters (names) for this station
    const measure_params = time_series.map(
      (serie) => serie.stationparameter_name
    );
    return {
      info: {
        ...firstStation,
        stationNumber,
        station_website_host: env.hydrodaten_station_host,
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
