const changeGraphDate = (event) => {
  const ts_id = event.target.id.split("-")[2];
  const graph = document.getElementById(`graph-${ts_id}`);
  const splitted_src = graph.src.split("&");
  // remove the last element wich is the period
  splitted_src.pop();
  // add the new period to the array
  splitted_src.push(`period=${event.target.value}`);
  // create the new src url and assign it to the graph
  const new_src = splitted_src.join("&");
  graph.src = new_src;
  return new_src;
};

export { changeGraphDate };
