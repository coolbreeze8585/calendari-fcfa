"use strict";

const calendar = document.getElementById("calendar");
const monthTitle = document.getElementById("month-title");
const prevButton = document.getElementById("prev-month");
const nextButton = document.getElementById("next-month");
const API_URL = "https://script.google.com/macros/s/AKfycbzPvN6DPWnUqzALz7Iu-pKLULjxP5I1cGEEN3Qn84bmWO4bSy3JbfO7Bnves3ppZd26/exec";
let dadesFCFA = null;
// Estat inicial del panell de filtres segons la pantalla.
const filtersPanel = document.getElementById("filters-panel");
const desktopMedia = window.matchMedia("(min-width: 769px)");

function updateFiltersPanel() {
  if (desktopMedia.matches) {
    filtersPanel.open = true;
  }
}

updateFiltersPanel();

desktopMedia.addEventListener("change", updateFiltersPanel);


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

const filtersActive =
  document.getElementById("filter-competition").value !== "" ||
  document.getElementById("filter-team").value !== "" ||
  document.getElementById("filter-search").value.trim() !== "";

  const events = dadesFCFA.Esdeveniments.filter(event => {
    const start = parseDate(event.DataInici);
    const end = parseDate(event.DataFi) || start;

    return start && end && date >= start && date <= end;
  });

  // Competició seleccionada al filtre.
const selectedCompetition =
  document.getElementById("filter-competition").value;

  // Equip seleccionat al filtre.
const selectedTeam =
  document.getElementById("filter-team").value;

const searchText = document.getElementById("filter-search")
  .value.trim().toLocaleLowerCase("ca");

// Partits del dia que corresponen a la competició seleccionada.
const matches = dadesFCFA.Partits.filter(match => {
  if (!sameDay(parseDate(match.Data), date)) {
    return false;
  }

  // Filtre per equip.
  if (selectedTeam &&
      match.EquipA !== selectedTeam &&
      match.EquipB !== selectedTeam) {
    return false;
  }
// Cerca de text als noms dels equips.
if (searchText) {
  const teamA = String(match.EquipA || "").toLocaleLowerCase("ca");
  const teamB = String(match.EquipB || "").toLocaleLowerCase("ca");

  if (!teamA.includes(searchText) && !teamB.includes(searchText)) {
    return false;
  }
}
  // Filtre per competició.
  if (selectedCompetition) {
    const event = dadesFCFA.Esdeveniments.find(
      e => e.EsdevenimentID === match.EsdevenimentID
    );

    if (event?.CompeticioID !== selectedCompetition) {
      return false;
    }
  }

  return true;
});

  const blocked = events.some(event =>
    event.Tipus?.toLowerCase() === "descans"
  );

  if (blocked) {
    cell.classList.add("blocked");
  } else if (events.length || matches.length) {
    cell.classList.add("has-events");
  }

  const activities = [];

  // La competició seleccionada mostra totes les seves jornades,
  // independentment dels partits de l'equip triat.
  const competitions = new Map();
  const dayEvents = events.filter(event => Boolean(event.CompeticioID));
  dayEvents.forEach(event => {
    const id = event.CompeticioID;
    if (selectedCompetition && id !== selectedCompetition) return;
    const eventMatches = dadesFCFA.Partits.filter(match =>
      match.EsdevenimentID === event.EsdevenimentID &&
      sameDay(parseDate(match.Data), date)
    );
    const relevant = eventMatches.filter(match =>
      (!selectedTeam || match.EquipA === selectedTeam || match.EquipB === selectedTeam) &&
      (!searchText || String(match.EquipA || "").toLocaleLowerCase("ca").includes(searchText) ||
        String(match.EquipB || "").toLocaleLowerCase("ca").includes(searchText))
    );
    if (!selectedCompetition && (selectedTeam || searchText) && !relevant.length) return;
    const time = eventMatches.map(m => m.Hora).filter(Boolean).sort()[0] || event.HoraInici || "23:59";
    if (!competitions.has(id)) competitions.set(id, { id, time, matches: [] });
    const group = competitions.get(id);
    group.matches.push(...eventMatches);
    if (time < group.time) group.time = time;
  });

  competitions.forEach(group => {
    const competition = dadesFCFA.Competicions.find(
      c => c.CompeticioID === group.id
    );

    activities.push({
  id: group.id,
  time: group.time,
  name: competition?.Nom || group.id,
  type: "competition",
  matchCount: group.matches.length
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
  // Els descansos sempre són visibles.
  // Les activitats generals només apareixen sense filtres.
  if (isRest || !filtersActive) {
    activities.push({
      time: event.HoraInici || (isRest ? "00:00" : "23:59"),
      name: event.Nom,
      type: isRest ? "rest" : "general"
    });
  }
}
    });

  // Mostrem els tryouts només quan no hi ha filtres actius.
if (!filtersActive) {
  tryoutGroups.forEach(group => {
    group.events.sort((a, b) =>
      timeToMinutes(a.HoraInici) - timeToMinutes(b.HoraInici)
    );

    activities.push(group);
  });
}
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
  const showCount =
    activity.type === "competition" &&
    selectedTeam &&
    activity.matchCount > 1;

  label.textContent =
    (activity.time === "23:59" ? "" : activity.time + " · ") +
    activity.name +
    (showCount ? ` (${activity.matchCount})` : "");
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

    const competitionMatches = dadesFCFA.Partits.filter(match => {
      const event = dadesFCFA.Esdeveniments.find(
        e => e.EsdevenimentID === match.EsdevenimentID
      );
      if (event?.CompeticioID !== activity.id || !sameDay(parseDate(match.Data), date)) return false;
      // Sense competició triada, el filtre d'equip/cerca continua restringint els partits.
      if (!selectedCompetition && selectedTeam && match.EquipA !== selectedTeam && match.EquipB !== selectedTeam) return false;
      if (!selectedCompetition && searchText && !String(match.EquipA || "").toLocaleLowerCase("ca").includes(searchText) && !String(match.EquipB || "").toLocaleLowerCase("ca").includes(searchText)) return false;
      return true;
    });

    if (competitionMatches.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "Jornada registrada, sense partits programats per a aquest dia.";
      panel.appendChild(empty);
    }

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

  const ajornat = ["ajornat", "no disputat", "no disputats"]
  .includes(match.Estat?.trim().toLowerCase());

  row.textContent =
    (match.Hora || "Hora pendent") +
    " · " +
    match.EquipA +
    " – " +
    match.EquipB +
    (ajornat
      ? " · ⏸️ AJORNAT"
      : match.Camp
        ? " · " + match.Camp
        : "");
      
        if (selectedTeam && (match.EquipA === selectedTeam || match.EquipB === selectedTeam)) {
          row.style.fontWeight = "700";
          row.style.borderLeft = "3px solid currentColor";
          row.style.paddingLeft = "0.65rem";
        }
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

// Desplaçament automàtic als detalls només en mòbils.
if (window.matchMedia("(max-width: 768px)").matches) {
  details.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

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


function renderAgenda() {
  const results = document.getElementById("agenda-results");
  const selectedTeam = document.getElementById("agenda-team").value;
  const selectedCompetitions = Array.from(document.querySelectorAll(
    ".agenda-competition-checkbox:checked"
  )).map(input => input.value);
  results.replaceChildren();

  if (!dadesFCFA || (!selectedTeam && selectedCompetitions.length === 0)) {
    results.textContent = "Selecciona un equip o una competició per consultar les jornades.";
    return;
  }

  function dateValue(value) {
    if (!value) return Number.POSITIVE_INFINITY;
    const parts = String(value).split("/").map(Number);
    if (parts.length !== 3 || parts.some(x => !Number.isFinite(x))) return Number.POSITIVE_INFINITY;
    return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
  }

  const eventMap = new Map(dadesFCFA.Esdeveniments.map(e => [e.EsdevenimentID, e]));
  const matchesByEvent = new Map();
  dadesFCFA.Partits.forEach(match => {
    if (!matchesByEvent.has(match.EsdevenimentID)) matchesByEvent.set(match.EsdevenimentID, []);
    matchesByEvent.get(match.EsdevenimentID).push(match);
  });

  // Amb competició seleccionada, totes les jornades. Sense competició,
  // només les jornades en què participa l'equip seleccionat.
  const events = dadesFCFA.Esdeveniments.filter(event => {
    if (!event.CompeticioID) return false;
    if (selectedCompetitions.length && !selectedCompetitions.includes(event.CompeticioID)) return false;
    const eventMatches = matchesByEvent.get(event.EsdevenimentID) || [];
    return selectedCompetitions.length > 0 || eventMatches.some(m =>
      m.EquipA === selectedTeam || m.EquipB === selectedTeam
    );
  }).sort((a, b) =>
    dateValue(a.DataInici) - dateValue(b.DataInici) ||
    String(a.Nom || "").localeCompare(String(b.Nom || ""), "ca")
  );

  const heading = document.createElement("h3");
  heading.textContent = selectedTeam
    ? `Agenda de ${selectedTeam}`
    : "Jornades de les competicions seleccionades";
  results.appendChild(heading);

  if (!events.length) {
    const p = document.createElement("p");
    p.textContent = "No hi ha jornades disponibles amb aquests filtres.";
    results.appendChild(p);
    return;
  }

  events.forEach(event => {
    const venue = dadesFCFA.Seus.find(s => s.SeuID === event.SeuID);
    const competition = dadesFCFA.Competicions.find(c => c.CompeticioID === event.CompeticioID);
    const allMatches = (matchesByEvent.get(event.EsdevenimentID) || []).slice();
    const visibleMatches = selectedTeam
      ? allMatches.filter(m => m.EquipA === selectedTeam || m.EquipB === selectedTeam)
      : allMatches;
    visibleMatches.sort((a, b) =>
      dateValue(a.Data) - dateValue(b.Data) ||
      String(a.Hora || "").localeCompare(String(b.Hora || ""))
    );

    const section = document.createElement("details");
    section.className = "agenda-group competition-details";
    const summary = document.createElement("summary");
    const dateLabel = event.DataInici || "Data pendent";
    const name = event.Nom || competition?.Nom || event.CompeticioID;
    const count = visibleMatches.length;
    summary.textContent = `${dateLabel} · ${competition?.Nom || event.CompeticioID} · ${name} (${count} ${count === 1 ? "partit" : "partits"})`;
    section.appendChild(summary);

    const title = document.createElement("h4");
    title.textContent = `📍 ${venue?.NomSeu || event.SeuID || "Seu pendent de confirmar"}`;
    if (venue?.MapsURL) {
      const link = document.createElement("a");
      link.href = venue.MapsURL;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = " 🗺️";
      link.title = "Obrir la seu a Google Maps";
      title.appendChild(link);
    }
    section.appendChild(title);

    if (!visibleMatches.length) {
      const p = document.createElement("p");
      p.textContent = selectedTeam
        ? "Aquest equip no té cap partit programat en aquesta jornada."
        : "No hi ha partits registrats en aquesta jornada.";
      section.appendChild(p);
    }

    visibleMatches.forEach(match => {
      const row = document.createElement("p");
      const field = String(match.Camp || "").trim();
      const fieldText = field ? " · " + (/^camp\b/i.test(field) ? field : "Camp " + field) : "";
      const status = String(match.Estat || "").trim().toLowerCase();
      const postponed = ["ajornat", "no disputat", "no disputats"].includes(status);
      row.textContent = `${match.Data || dateLabel} · ${match.Hora || "Hora pendent"} · ${match.EquipA} – ${match.EquipB}` +
        (postponed ? " · ⏸️ NO DISPUTAT / AJORNAT" : fieldText);
      section.appendChild(row);
    });
    results.appendChild(section);
  });
}

async function carregarDades() {
  try {
    const resposta = await fetch(API_URL);

    if (!resposta.ok) {
      throw new Error("Error HTTP: " + resposta.status);
    }

    const dades = await resposta.json();
dadesFCFA = dades;

// Omplim el desplegable de competicions.
const competitionSelect = document.getElementById("filter-competition");

competitionSelect.innerHTML =
  '<option value="">Totes les competicions</option>';

const competitions = [...dades.Competicions].sort((a, b) =>
  a.Nom.localeCompare(b.Nom, "ca")
);

competitions.forEach(competition => {
  const option = document.createElement("option");
  option.value = competition.CompeticioID;
  option.textContent = competition.Nom;
  competitionSelect.appendChild(option);
});

// Competicions de l'Agenda: selecció múltiple.
const agendaCompetitionsList =
  document.getElementById("agenda-competitions-list");

agendaCompetitionsList.replaceChildren();

competitions.forEach(competition => {
  const label = document.createElement("label");
  label.className = "agenda-competition-option";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.value = competition.CompeticioID;
  checkbox.className = "agenda-competition-checkbox";

  const name = document.createElement("span");
  name.textContent = competition.Nom;

  label.appendChild(checkbox);
  label.appendChild(name);

  agendaCompetitionsList.appendChild(label);
});


  // Actualitzem el comptador de competicions seleccionades.
  const agendaCompetitionsCount =
    document.getElementById("agenda-competitions-count");

  function updateAgendaCompetitionsCount() {
    const selected = document.querySelectorAll(
      ".agenda-competition-checkbox:checked"
    ).length;

    agendaCompetitionsCount.textContent =
      selected === 0
        ? "Totes"
        : selected === 1
          ? "1 seleccionada"
          : `${selected} seleccionades`;
  }

  // Actualitzem l'Agenda quan canvien les competicions.
agendaCompetitionsList.addEventListener("change", () => {
  updateAgendaCompetitionsCount();
  renderAgenda();
});

// Actualitzem l'Agenda quan canvia l'equip.
document.getElementById("agenda-team")
  .addEventListener("change", renderAgenda);

  // Botó per restablir els filtres de l'Agenda.
  document.getElementById("agenda-clear-filters")
    .addEventListener("click", () => {
      document.getElementById("agenda-team").value = "";

      document.querySelectorAll(
        ".agenda-competition-checkbox"
      ).forEach(checkbox => {
        checkbox.checked = false;
      });

      updateAgendaCompetitionsCount();

      renderAgenda();
    });

// Omplim el desplegable d'equips.
const teamSelect = document.getElementById("filter-team");

teamSelect.innerHTML =
  '<option value="">Tots els equips</option>';

// Recollim els equips dels partits, sense duplicats.
const teams = [...new Set(
  dades.Partits.flatMap(match => [match.EquipA, match.EquipB])
    .map(team => String(team || "").trim())
    .filter(Boolean)
)].sort((a, b) => a.localeCompare(b, "ca"));

teams.forEach(team => {
  const option = document.createElement("option");
  option.value = team;
  option.textContent = team;
  teamSelect.appendChild(option);
});

// Omplim el selector d'equips de l'Agenda.
const agendaTeamSelect = document.getElementById("agenda-team");

agendaTeamSelect.innerHTML =
  '<option value="">Selecciona un equip...</option>';

teams.forEach(team => {
  const option = document.createElement("option");
  option.value = team;
  option.textContent = team;
  agendaTeamSelect.appendChild(option);
});

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
document.getElementById("filter-competition")
  .addEventListener("change", () => {
    renderCalendar();
    document.getElementById("day-details").replaceChildren();
  });

  document.getElementById("filter-team")
  .addEventListener("change", () => {
    renderCalendar();
    document.getElementById("day-details").replaceChildren();
  });
document.getElementById("clear-filters")
  .addEventListener("click", () => {
    // Restablim tots els filtres.
    document.getElementById("filter-competition").value = "";
    document.getElementById("filter-team").value = "";
    document.getElementById("filter-search").value = "";

    // Actualitzem el calendari i eliminem els detalls anteriors.
    renderCalendar();
    document.getElementById("day-details").replaceChildren();
  });
document.getElementById("filter-search")
  .addEventListener("input", () => {
    renderCalendar();
    document.getElementById("day-details").replaceChildren();
  });

  // Navegació entre Calendari i Agenda d'equip.
const calendarView = document.getElementById("calendar-view");
const agendaView = document.getElementById("agenda-view");

const calendarButton = document.getElementById("view-calendar");
const agendaButton = document.getElementById("view-agenda");

function changeView(view) {
  const showCalendar = view === "calendar";

  calendarView.hidden = !showCalendar;
  agendaView.hidden = showCalendar;

  calendarButton.classList.toggle("active", showCalendar);
  agendaButton.classList.toggle("active", !showCalendar);

  if (showCalendar) {
    calendarButton.setAttribute("aria-current", "page");
    agendaButton.removeAttribute("aria-current");
  } else {
    agendaButton.setAttribute("aria-current", "page");
    calendarButton.removeAttribute("aria-current");
  }
}

calendarButton.addEventListener("click", () => {
  changeView("calendar");
});

agendaButton.addEventListener("click", () => {
  changeView("agenda");
});

carregarDades();
renderCalendar();
