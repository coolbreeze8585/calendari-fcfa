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

  function parseDate(value) {
    if (!value) return null;

    const parts = value.split("/");
    if (parts.length !== 3) return null;

    const [day, month, year] = parts.map(Number);
    return new Date(year, month - 1, day, 12);
  }

  function sameDay(a, b) {
    return a && b &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }

  const events = dadesFCFA.Esdeveniments.filter(event => {
    const start = parseDate(event.DataInici);
    const end = parseDate(event.DataFi) || start;

    return start && end && date >= start && date <= end;
  });

  const matches = dadesFCFA.Partits.filter(match =>
    sameDay(parseDate(match.Data), date)
  );

  const blocked = events.some(event =>
    event.Tipus?.toLowerCase() === "descans"
  );

  if (blocked) {
    cell.classList.add("blocked");
  } else if (events.length || matches.length) {
    cell.classList.add("has-events");
  }

  const activities = [];

  // Agrupem els partits per competició.
  const competitions = new Map();

  matches.forEach(match => {
    const event = dadesFCFA.Esdeveniments.find(
      e => e.EsdevenimentID === match.EsdevenimentID
    );

    if (!event || !event.CompeticioID) return;

    const id = event.CompeticioID;
    const time = match.Hora || "23:59";

    if (!competitions.has(id)) {
      competitions.set(id, {
        id,
        time,
        matches: []
      });
    }

    const group = competitions.get(id);
    group.matches.push(match);

    if (time < group.time) {
      group.time = time;
    }
  });

  competitions.forEach(group => {
    const competition = dadesFCFA.Competicions.find(
      c => c.CompeticioID === group.id
    );

    activities.push({
      id: group.id,
      time: group.time,
      name: competition?.Nom || group.id,
      type: "competition"
    });
  });

 
  // Agrupem els tryouts per data i seu.
  const tryoutGroups = new Map();

  events
    .filter(event => !event.CompeticioID)
    .forEach(event => {
      const isRest = event.Tipus?.toLowerCase() === "descans";
      const isTryout = event.Tipus?.toLowerCase() === "tryout";

      if (isTryout) {
        const venueId = event.SeuID || "sense-seu";
        const key = venueId;

        if (!tryoutGroups.has(key)) {
          const venue = dadesFCFA.Seus.find(
            s => s.SeuID === venueId
          );

          tryoutGroups.set(key, {
            time: event.HoraInici || "23:59",
            name: "Tryouts Selecció Catalana",
            type: "tryout-group",
            venue: venue?.NomSeu || venueId,
            mapsUrl: venue?.MapsURL || "",
            events: []
          });
        }

        const group = tryoutGroups.get(key);
        group.events.push(event);

        if (timeToMinutes(event.HoraInici) <
            timeToMinutes(group.time)) {
          group.time = event.HoraInici;
        }
      } else {
        activities.push({
          time: event.HoraInici || (isRest ? "00:00" : "23:59"),
          name: event.Nom,
          type: isRest ? "rest" : "general"
        });
      }
    });

  tryoutGroups.forEach(group => {
    group.events.sort((a, b) =>
      timeToMinutes(a.HoraInici) - timeToMinutes(b.HoraInici)
    );

    activities.push(group);
  });

  // Ordenem cronològicament.
  
  function timeToMinutes(time) {  
    if (!time || time === "23:59") return 1439;

    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

  activities.sort((a, b) =>
    timeToMinutes(a.time) - timeToMinutes(b.time) ||
    a.name.localeCompare(b.name, "ca")
  );


  activities.forEach(activity => {
    const label = document.createElement("span");
    label.className = "event-label";

    if (activity.type === "rest") {
      label.classList.add("rest-label");
      label.textContent = "🔒 " + activity.name;
    } else {
      label.textContent =
        (activity.time === "23:59" ? "" : activity.time + " · ") +
        activity.name;
    }

    cell.appendChild(label);
  });
  
cell.style.cursor = "pointer";

cell.addEventListener("click", () => {
  const details = document.getElementById("day-details");

  const formattedDate = date.toLocaleDateString("ca-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  details.innerHTML = "";

  const heading = document.createElement("h2");
  heading.textContent = formattedDate;

  details.appendChild(heading);
  
const activityList = document.createElement("div");
activityList.className = "day-activities";

if (activities.length === 0) {
  const emptyMessage = document.createElement("p");
  emptyMessage.textContent = "No hi ha activitats programades.";
  activityList.appendChild(emptyMessage);
} else {
  
activities.forEach(activity => {
  
if (activity.type === "tryout-group") {
  const panel = document.createElement("details");
  panel.className = "competition-details tryout-details";

  const summary = document.createElement("summary");
  summary.textContent =
    activity.time + " · " + activity.name;

  panel.appendChild(summary);

  const venueTitle = document.createElement("h3");
  venueTitle.className = "tryout-venue";
  venueTitle.textContent = "📍 " + activity.venue;
  panel.appendChild(venueTitle);
  
if (activity.mapsUrl) {
  const mapsLink = document.createElement("a");
  mapsLink.href = activity.mapsUrl;
  mapsLink.textContent = "🗺️";
  mapsLink.title = "Obrir ubicació a Google Maps";
  mapsLink.setAttribute("aria-label", "Obrir ubicació a Google Maps");
  mapsLink.target = "_blank";
  mapsLink.rel = "noopener noreferrer";
  mapsLink.className = "maps-icon";

  venueTitle.appendChild(mapsLink);
}



  activity.events.forEach(event => {
    const row = document.createElement("p");

    row.textContent =
      (event.HoraInici || "Hora pendent") +
      " · " +
      event.Nom;

    panel.appendChild(row);
  });

  activityList.appendChild(panel);
  return;
}

  if (activity.type === "competition") {
    const panel = document.createElement("details");
    panel.className = "competition-details";

    const summary = document.createElement("summary");
    summary.textContent =
      (activity.time === "23:59" ? "" : activity.time + " · ") +
      activity.name;

    panel.appendChild(summary);

    const competitionMatches = matches.filter(match => {
      const event = dadesFCFA.Esdeveniments.find(
        e => e.EsdevenimentID === match.EsdevenimentID
      );

      return event?.CompeticioID === activity.id;
    });

    competitionMatches.sort((a, b) => {
      const timeA = a.Hora || "23:59";
      const timeB = b.Hora || "23:59";
      return timeA.localeCompare(timeB, "ca", { numeric: true });
    });

    
const venueGroups = new Map();

// Agrupem els partits segons la seu.
competitionMatches.forEach(match => {
  const event = dadesFCFA.Esdeveniments.find(
    e => e.EsdevenimentID === match.EsdevenimentID
  );

  const venueId = event?.SeuID || "sense-seu";

  if (!venueGroups.has(venueId)) {
    const venue = dadesFCFA.Seus.find(
      s => s.SeuID === venueId
    );

    venueGroups.set(venueId, {
      name: venue?.NomSeu || "Seu pendent de confirmar",
      mapsUrl: venue?.MapsURL || "",
      matches: []
    });
  }

  venueGroups.get(venueId).matches.push(match);
});

// Ordenem les seus per l'hora del primer partit.
const sortedVenues = [...venueGroups.values()].sort(
  (a, b) => {
    const firstA = a.matches[0]?.Hora || "23:59";
    const firstB = b.matches[0]?.Hora || "23:59";

    return timeToMinutes(firstA) - timeToMinutes(firstB);
  }
);

// Mostrem les seus i els seus partits.
sortedVenues.forEach(venue => {
  const venueSection = document.createElement("div");
  venueSection.className = "venue-section";

  const venueTitle = document.createElement("h3");
  venueTitle.textContent = "📍 " + venue.name;
  venueSection.appendChild(venueTitle);
  
if (venue.mapsUrl) {
  const mapsLink = document.createElement("a");
  mapsLink.href = venue.mapsUrl;
  mapsLink.textContent = "🗺️";
  mapsLink.title = "Obrir ubicació a Google Maps";
  mapsLink.setAttribute("aria-label", "Obrir ubicació a Google Maps");
  mapsLink.target = "_blank";
  mapsLink.rel = "noopener noreferrer";
  mapsLink.className = "maps-icon";

  venueTitle.appendChild(mapsLink);
}



  venue.matches.forEach(match => {
    const row = document.createElement("p");

    row.textContent =
      (match.Hora || "Hora pendent") +
      " · " +
      match.EquipA +
      " – " +
      match.EquipB +
      (match.Camp ? " · Camp " + match.Camp : "");

    venueSection.appendChild(row);
  });

  panel.appendChild(venueSection);
});


    activityList.appendChild(panel);
  } else {
    const item = document.createElement("p");
    item.textContent =
      (activity.type === "rest" ? "🔒 " : "") +
      (activity.time === "23:59" || activity.type === "rest"
        ? ""
        : activity.time + " · ") +
      activity.name;

    activityList.appendChild(item);
  }
});

}

details.appendChild(activityList);

});


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
