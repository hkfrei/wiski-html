module.exports = {
  kiwis_host: "https://kiwis.innetag.ch",
  time_series_list:
    "/KiWIS/KiWIS?returnfields=station_id%2Cts_id%2Cts_name%2Cts_type_name%2Cparametertype_name%2Cstationparameter_name%2Ccoverage%2Cts_unitname%2Cts_unitsymbol%2Cts_unitname_abs%2Cts_unitsymbol_abs&timeseriesgroup_id=41608&id=timeSeriesList&datasource=1&service=kisters&type=queryServices&request=getTimeseriesList&format=objson",
  latest_measurement:
    "/KiWIS/KiWIS?datasource=1&service=kisters&type=queryServices&request=getTimeseriesValues&metadata=true&format=dajson&returnfields=Timestamp,Value,Absolute Value",
  diagram_data:
    "/KiWIS/KiWIS?dateformat=yyyy-MM-dd%27T%27HH%3Amm%3AssXXX&metadata=true&timezone=CET&md_returnfields=station_id%2Cts_id%2Cparametertype_name%2Cstationparameter_name%2Cts_unitsymbol&returnfields=Timestamp%2CValue&id=timeSeriesValues&datasource=1&service=kisters&type=queryServices&request=getTimeseriesValues&format=dajson",
  station_info:
    "/KiWIS/KiWIS?datasource=1&service=kisters&type=queryServices&request=getStationList&format=objson&returnfields=station_id,station_no,station_name,object_type,parametertype_name,stationparameter_name,site_name,station_local_x,station_local_y,ca_sta&ca_sta_returnfields=OBJECT_DESCRIPTION,STA_LOCATION_TYPE,SPECIALISM,admin_level,station_status,station_diary_status,DATAOWNER,WEBSITE_DATAOWNER_1,admin_name,station_elevation,station_gauge_datum,ONLINE_PUBLICATION,catchment_size,CATCHMENT_SIZE,SUITABILITY_ZONE,SOIL_TYPE,DESCRIPTION_4,GW_AREA,WTO_OBJECT,HQ2,HQ5,HQ10,HQ20,HQ30,HQ50,HQ100,HQ300,HQx_VALID_FROM,HQx_VALID_TILL,Q347,Q182,Q182_Q347_VALID_FROM,Q182_Q347_VALID_TILL,Q_GS2,Q_GS3,Q_GS4,Q_GS5,Q_GSx_VALID_FROM,Q_GSx_VALID_TILL,WL_GS2,WL_GS3,WL_GS4,WL_GS5,WL_GSx_VALID_FROM,WL_GSx_VALID_TILL,LONG_TERM_VAL_MIN,LONG_TERM_VAL_MEAN,LONG_TERM_VAL_MAX,LONG_TERM_VAL_VALID_FROM,LONG_TERM_VAL_VALID_TILL,LONG_TERM_VAL_MIN_DATE,LONG_TERM_VAL_MAX_DATE",
  station_measure_params:
    "/KiWIS/KiWIS?service=kisters&type=queryServices&request=getParameterList&datasource=1&format=objson",
  graph:
    "/KiWIS/KiWIS?service=kisters&type=queryServices&request=getgraph&datasource=1&template=sg_example&format=jpg",
  hydrodaten_station_host: "https://www.hydrodaten.admin.ch/de/",
  unit_names: {
    m: "m.ü.Meer",
    cumec: "m3/s",
  },
  service_host: "https://wiski-html-h2eptfuxza-oa.a.run.app",
  measure_periods: {
    pt24h: "24 Std.",
    pt48h: "48 Std.",
    p7d: "1 Woche",
    p1m: "1 Monat",
    p1y: "1 Jahr",
  },
};
