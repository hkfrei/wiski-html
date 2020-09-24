import { changeGraphDate } from "./modules/util_module.mjs";

const selects = document.querySelectorAll('*[id^="select-"]');
selects.forEach((select) => {
  select.addEventListener("change", (e) => changeGraphDate(e));
});
