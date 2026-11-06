"use strict";

const calendar = document.getElementById("calendar");
const monthTitle = document.getElementById("month-title");
const prevButton = document.getElementById("prev-month");
const nextButton = document.getElementById("next-month");
const API_URL = "https://script.google.com/macros/s/AKfycbzPvN6DPWnUqzALz7Iu-pKLULjxP5I1cGEEN3Qn84bmWO4bSy3JbfO7Bnves3ppZd26/exec";
let dadesFCFA = null;


const monthNames = [
  "Gener", "Febrer", "Març", "Abril",
  "Maig", "Juny", "Juliol", "Agost",
  "Setembre", "Octubre", "Novembre", "Desembre"
];

const dayNames = [
  "DIVENDRES", "DISSABTE", "DIUMENGE", "DILLUNS"
];

// Comencem pel novembre de 2026.
let currentYear = 2026;
let currentMonth = 10;

function createDate(year, month, day) {
  return new Date(year, month, day, 12);
}


function createDay(date, selectedMonth) {
  const cell = document.createElement("div");
  cell.className = "day";

  if (date.getMonth() !== selectedMonth) {
    cell.style.opacity = "0.45";
  }

  const number = document.createElement("span");
  number.className = "day-number";
  number.textContent = date.getDate();
  cell.appendChild(number);

  if (!dadesFCFA) return cell;

  // Convertim una data DD/MM/AAAA en una data local.
  function parseDate(value) {
    if (!value) return null;

    const parts = value.split("/");
    if (parts.length !== 3) return null;

    return new Date(
      Number(parts[2]),
      Number(parts[1]) - 1,
      Number(parts[0]),
      12
    );
  }

  const sameDay = (a, b) =>
    a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  // Activitats que coincideixen amb la data.
  const events = dadesFCFA.Esdeveniments.filter(event => {
    const start = parseDate(event.DataInici);
    const end = parseDate(event.DataFi) || start;

    return start && end && date >= start && date <= end;
  });

  // Partits programats per a la data.
  const matches = dadesFCFA.Partits.filter(match =>
    sameDay(parseDate(match.Data), date)
  );

  // Detectem els descansos o bloquejos.
  const blocked = events.some(event =>
    event.Tipus?.toLowerCase() === "descans"
  );

  if (blocked) {
    cell.classList.add("blocked");
  } else if (events.length || matches.length) {
    cell.classList.add("has-events");
  }

  // Mostrem les activitats del dia.
  events.forEach(event => {
    const label = document.createElement("span");
    label.className = "event-label";

    label.textContent = event.Nom;
    cell.appendChild(label);
  });

  // Si hi ha partits, indiquem quants.
  if (matches.length > 0) {
    const label = document.createElement("span");
    label.className = "event-label";
    label.textContent =
      `${matches.length} partit${matches.length === 1 ? "" : "s"}`;

    cell.appendChild(label);
  }

  return cell;
}

function renderCalendar() {
  calendar.replaceChildren();

  monthTitle.textContent =
    `${monthNames[currentMonth]} ${currentYear}`;

  // Capçaleres dels quatre dies.
  dayNames.forEach(name => {
    const header = document.createElement("div");
    header.className = "day-header";
    header.textContent = name;
    calendar.appendChild(header);
  });

  const firstDay = createDate(
    currentYear, currentMonth, 1
  );

  const lastDay = createDate(
    currentYear + 0, currentMonth + 1, 0
  );

  // Retrocedim fins al divendres anterior
  // o coincident amb el primer dia del mes.
  const startDate = createDate(
    currentYear, currentMonth, 1
  );

  const daysBack = (startDate.getDay() + 2) % 7;
  startDate.setDate(startDate.getDate() - daysBack);

  // Cada fila representa divendres-dilluns.
  const cursor = new Date(startDate);

  while (cursor <= lastDay) {
    for (let offset = 0; offset < 4; offset++) {
      const date = new Date(cursor);
      date.setDate(cursor.getDate() + offset);

      calendar.appendChild(
        createDay(date, currentMonth)
      );
    }

    cursor.setDate(cursor.getDate() + 7);
  }
}

function changeMonth(amount) {
  const next = createDate(
    currentYear, currentMonth + amount, 1
  );

  currentYear = next.getFullYear();
  currentMonth = next.getMonth();

  renderCalendar();
}

prevButton.addEventListener("click", () => {
  changeMonth(-1);
});

nextButton.addEventListener("click", () => {
  changeMonth(1);
});

async function carregarDades() {
  try {
    const resposta = await fetch(API_URL);

    if (!resposta.ok) {
      throw new Error("Error HTTP: " + resposta.status);
    }

    const dades = await resposta.json();
    dadesFCFA = dades;
    
    renderCalendar();


    console.log("API FCFA connectada correctament");
    console.log("Competicions:", dades.Competicions?.length);
    console.log("Esdeveniments:", dades.Esdeveniments?.length);
    console.log("Seus:", dades.Seus?.length);
    console.log("Partits:", dades.Partits?.length);

  } catch (error) {
    console.error("Error connectant amb l'API:", error);
  }
}

carregarDades();
renderCalendar();
