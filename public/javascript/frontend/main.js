import { changeGraphDate } from "./modules/util_module.mjs";
const timeRadios = document.querySelectorAll(".graph-time-radio");
timeRadios.forEach((radio) =>
  radio.addEventListener("click", (e) => changeGraphDate(e))
);

const graphContainers = document.querySelectorAll(".graph-container");
for (const node of graphContainers) {
  const ts_id = node.dataset.tsid;
  const url = node.dataset.diagramdataurl;
  // json data for diagrams
  fetch(`${url}&ts_id=${ts_id}`)
    .then((response) => response.json())
    .then((diagram_data) => {
      const ctx = node.getContext("2d");
      const station = diagram_data[0];
      const labels = [];
      const data = [];
      station.data.forEach((element) => {
        const date = new Date(element[0]);
        labels.push(date);
        data.push({ x: date, y: element[1] });
      });
      const chart = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              backgroundColor: "rgba(0,191,255,0.1)", //color of the fill
              borderColor: "deepskyblue", // color of the line
              label: data.stationparameter_name,
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
              },
            ],
          },
          showLines: true,
        },
      });
    });
}
