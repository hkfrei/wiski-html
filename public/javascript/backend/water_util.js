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
    // get the correct timeseries group for this station
    const ts_group_id = env.ts_group_id[firstStation.object_type];
    // get possible diagrams/timeseries this station
    const timeSeriesResponse = await fetch(
      `${env.kiwis_host}${env.time_series_list}&station_id=${stationid}&timeseriesgroup_id=${ts_group_id}`
    );
    const time_series = await timeSeriesResponse.json();

    // get latest measurements for each time series
    const latest_measurements = [];
    for (const serie of time_series) {
      const latest_measurement_response = await fetch(
        `${env.kiwis_host}${env.latest_measurement}&ts_id=${serie.ts_id}`
      );
      const latest_measurement = await latest_measurement_response.json();
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
      measure_params,
      time_series,
      unit_names: env.unit_names,
      measure_periods: env.measure_periods,
      service_host: env.service_host,
    };
  },
};
module.exports = waterUtil;
