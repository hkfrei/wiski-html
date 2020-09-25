import { changeGraphDate } from "./modules/util_module.mjs";

const timeRadios = document.querySelectorAll(".graph-time-radio");
timeRadios.forEach((radio) =>
  radio.addEventListener("click", (e) => changeGraphDate(e))
);
