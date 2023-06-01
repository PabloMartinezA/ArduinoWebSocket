// Declare variables
var targetUrl = `ws://${window.location.hostname}/ws`;
var websocket;
var ctx;
var myChart;
const MAX_DATA_COUNT = 20;

var ledState = null;
var previousLedState = null;

var isChartInitialized = false;
var notificationShown = false;

var chartData = []; // Initialize it as an empty array

// Add function for body load
window.addEventListener("load", onLoad);

// Function to run during on load of the HTML Page
function onLoad() {
  initializeSocket();
  initializeChart();
  initializeThreshold();
}

// Initialize the chart
function initializeChart(){
  ctx = document.getElementById("myChart").getContext("2d");
  myChart = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [{ label : "Valores del Sensor" }],
    },
    options: {
      borderWidth: 3,
      borderColor: ["rgba(255, 99, 132, 1)"],
      plugins: {
        title: {
          display: true,
          text: "Gráfico en tiempo real del sensor de luz",
          font: {
            family: "Arial",
            size: 30,
            weight: "bold",
          },
          color: "black",
        },
        legend: {
          labels: {
            font: {
              family: "Arial",
              size: 30,
            },
            color: "black",
          },
        },
      },
      scales: {
        x: {
          ticks: {
            font: {
              family: "Arial",
              size: 15,
              weight: "bold",
            },
            color: "black",
          },
        },
        y: {
          ticks: {
            font: {
              family: "Arial",
              size: 15,
              weight: "bold",
            },
            color: "black",
          },
        },
      },
    },
  });
  // Marque el estado de inicialización del gráfico como verdadero
  isChartInitialized = true;
}

function updateChartFontColor(color) {
  if (isChartInitialized) {
  myChart.options.plugins.title.color = color;
  myChart.options.scales.x.ticks.color = color;
  myChart.options.scales.y.ticks.color = color;
  myChart.update();
  }
}

// Initialize the Websockets
function initializeSocket() {
  console.log(
    `Opening WebSocket connection to Microcontroller :: ${targetUrl}`
  );
  websocket = new WebSocket(targetUrl);
  websocket.onopen = onOpen;
  websocket.onclose = onClose;
  websocket.onmessage = onMessage;
}
// Websocket Callback Client function 
function onOpen(event) {
  console.log("Starting connection to server..");
}
function onClose(event) {
  console.log("Closing connection to server..");
  setTimeout(initializeSocket, 2000);
}

function showNotification(message, type) {
  Swal.fire({
    title: "Notificación",
    text: message,
    icon: type, // Puede ser "success", "error", "warning", "info", etc.
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000 // Duración en milisegundos
  });
}

function onMessage(event) {
  console.log("WebSocket message received:", event);
  var sensorValue = parseFloat(event.data);
  var ledStateLabel = document.getElementById("ledStateLabel");
  var body = document.querySelector("body");
  
  // Verificar el valor del sensor y actualizar el estado del LED
  if (sensorValue >= getThreshold()) {
    ledState = "on";
  } else {
    ledState = "off";
  }
  
  // Mostrar notificación solo cuando el estado del LED cambie
  if (ledState !== previousLedState) {
    if (ledState === "on") {
      ledStateLabel.textContent = "LED está encendido";
      ledStateLabel.style.color = "green";
      showNotification("LED está encendido", "success");
    } else {
      ledStateLabel.textContent = "LED está apagado";
      ledStateLabel.style.color = "red";
      showNotification("LED está apagado", "error");
    }
  }

  // Actualizar el estado anterior del LED
  previousLedState = ledState;

  if (sensorValue >= getThreshold()) {
    body.classList.remove("light-bg");
    body.classList.add("dark-bg");
    document.getElementById("sensorValueLabel").style.color = "white"; // Cambiar color del texto a blanco
    updateChartFontColor("white");
  } else {
    body.classList.remove("dark-bg");
    body.classList.add("light-bg");
    document.getElementById("sensorValueLabel").style.color = "black"; // Cambiar color del texto a negro
    updateChartFontColor("black");
  }

  if (sensorValue >= 1000  && !notificationShown) {
    showNotification("Hay muy poca luz", "warning");
    notificationShown = true;
    } else if (sensorValue <= 100  && !notificationShown) {
      showNotification("Hay demasiada luz", "warning");
      notificationShown = true;
    }
  

  // Show only MAX_DATA_COUNT data
  if (myChart.data.labels.length > MAX_DATA_COUNT) {
    removeFirstData();
  }
  addData(getCurrentDateTime(), sensorValue);
  // Update the sensor value label
  document.getElementById("sensorValueLabel").textContent = "Valor del sensor: " + event.data;

  var sensorValue = parseFloat(event.data);
  var label = getCurrentDateTime();

  // Update the chart and table with the new data
  updateChartAndTable(label, sensorValue);

  
}

// Get the current date time.  This will serve as the x-axis of our sensor data
function getCurrentDateTime() {
  var today = new Date();
  var date =
    today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();
  var time =
    today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
  var dateTime = date + " " + time;
  return dateTime;
}

// add sensor data to chart
function addData(label, data) {
  myChart.data.labels.push(label);
  myChart.data.datasets.forEach((dataset) => {
    dataset.data.push(data);
  });
  myChart.update();
}

// Remove the first data
function removeFirstData() {
  myChart.data.labels.splice(0, 1);
  myChart.data.datasets.forEach((dataset) => {
    dataset.data.shift();
  });
}

//Initialize the threshold input
function initializeThreshold() {
  var thresholdInput = document.getElementById("threshold");
  thresholdInput.addEventListener("input", function () {
    // Actualizar la etiqueta del umbral de luz según el valor seleccionado por el usuario
    var thresholdLabel = document.getElementById("thresholdLabel");
    thresholdLabel.textContent = "Umbral de luz: " + thresholdInput.value;
    
    // Enviar el nuevo umbral al servidor WebSocket
    sendThresholdValue(thresholdInput.value);
  });

  // Enviar el umbral inicial al servidor WebSocket
  sendThresholdValue(thresholdInput.value);
}

// Update the threshold value
function updateThreshold(value) {
  var thresholdLabel = document.getElementById("thresholdLabel");
  thresholdLabel.textContent = "Umbral de luz: " + value;
}

// Obtener el umbral de luz actual
function getThreshold() {
  var thresholdInput = document.getElementById("threshold");
  return parseInt(thresholdInput.value);
}

// Enviar el nuevo umbral al servidor WebSocket
function sendThresholdValue(value) {
  if (websocket.readyState === websocket.OPEN) {
    websocket.send(value);
  }
}

// Function to fill the table with data
function fillTable() {
  var tableBody = document.getElementById("table-body");
  tableBody.innerHTML = ""; // Clear the table body before filling it again

  var startIndex = Math.max(0, chartData.length - 20); // Get the starting index
  var endIndex = chartData.length; // Get the ending index

  for (var i = startIndex; i < endIndex; i++) {
    var row = document.createElement("tr");

    var dateCell = document.createElement("td");
    dateCell.textContent = chartData[i].label;
    row.appendChild(dateCell);

    var thresholdCell = document.createElement("td");
    thresholdCell.textContent = getThreshold();
    row.appendChild(thresholdCell);

    var sensorValueCell = document.createElement("td");
    sensorValueCell.textContent = chartData[i].data;
    row.appendChild(sensorValueCell);

    tableBody.appendChild(row);
  }
}

function updateChartAndTable(label, data) {
  // Add the new data to the chartData array
  chartData.push({ label: label, data: data });

  // Limit the chartData array to 30 values
  if (chartData.length > 20) {
    chartData.shift(); // Remove the first element
  }

  // Update the chart
  addData(label, data);

  // Update the table
  fillTable();
}







