(() => {
  const pitch = document.getElementById("pitch");
  if (!pitch) return;

  const minuteInput = document.getElementById("minute");
  const typeInput = document.getElementById("for_or_against");
  const playTypeInput = document.getElementById("play_type");
  const abpWrap = document.getElementById("abp_subtype_wrap");
  const abpSubtypeInput = document.getElementById("abp_subtype");
  const eventsList = document.getElementById("events-list");
  const hiddenEvents = document.getElementById("goal_events");
  const markersLayer = document.getElementById("markers-layer");
  const addEventBtn = document.getElementById("add-event-btn");
  const pitchHelp = document.getElementById("pitch-help");

  const events = [];
  let pendingStart = null;
  let pendingEnd = null;

  const clamp = (value) => Math.max(0, Math.min(100, Number(value.toFixed(2))));

  const resetPending = () => {
    pendingStart = null;
    pendingEnd = null;
    addEventBtn.disabled = true;
    renderPendingMarkers();
  };

  const isTransition = () => playTypeInput.value === "Transición";
  const isAbp = () => playTypeInput.value === "ABP";

  const setHelpText = () => {
    if (isTransition()) {
      pitchHelp.textContent = pendingStart
        ? "Transición: marca el 2º clic (fin)."
        : "Transición: marca el 1º clic (inicio).";
    } else {
      pitchHelp.textContent = "Haz 1 clic para fijar la ubicación del evento.";
    }
  };

  const updateControlVisibility = () => {
    abpWrap.classList.toggle("hidden", !isAbp());
    if (!isAbp()) abpSubtypeInput.value = "";
    resetPending();
    setHelpText();
  };

  const addMarker = (point, type) => {
    if (!point) return;
    const marker = document.createElement("span");
    marker.className = `marker marker-${type}`;
    marker.style.left = `${point.x}%`;
    marker.style.top = `${point.y}%`;
    markersLayer.appendChild(marker);
  };

  const renderPendingMarkers = () => {
    markersLayer.innerHTML = "";
    addMarker(pendingStart, "start");
    addMarker(pendingEnd, "end");
  };

  const renderSavedEvents = () => {
    eventsList.innerHTML = "";

    events.forEach((event, index) => {
      const li = document.createElement("li");
      li.className = "event-item";

      const abpText = event.abp_subtype ? ` · ${event.abp_subtype}` : "";
      const endText = event.x_end !== null && event.y_end !== null
        ? ` · fin (${event.x_end.toFixed(1)}, ${event.y_end.toFixed(1)})`
        : "";

      li.innerHTML = `
        <span>
          ${event.for_or_against === "for" ? "A favor" : "En contra"} · Min ${event.minute} · ${event.play_type}${abpText}
          · inicio (${event.x_start.toFixed(1)}, ${event.y_start.toFixed(1)})${endText}
        </span>
        <button type="button" data-index="${index}" class="btn danger">Borrar</button>
      `;
      eventsList.appendChild(li);
    });

    hiddenEvents.value = JSON.stringify(events);

    eventsList.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.index);
        events.splice(idx, 1);
        renderSavedEvents();
      });
    });
  };

  const readPointFromClick = (event) => {
    const rect = pitch.getBoundingClientRect();
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100);
    return { x, y };
  };

  pitch.addEventListener("click", (event) => {
    const point = readPointFromClick(event);

    if (isTransition()) {
      if (!pendingStart || (pendingStart && pendingEnd)) {
        pendingStart = point;
        pendingEnd = null;
        addEventBtn.disabled = true;
      } else {
        pendingEnd = point;
        addEventBtn.disabled = false;
      }
    } else {
      pendingStart = point;
      pendingEnd = null;
      addEventBtn.disabled = false;
    }

    renderPendingMarkers();
    setHelpText();
  });

  addEventBtn.addEventListener("click", () => {
    const minute = Number(minuteInput.value);
    if (!Number.isInteger(minute) || minute < 0 || minute > 120) {
      alert("Minuto inválido (0-120).");
      return;
    }

    const playType = playTypeInput.value;
    const abpSubtype = isAbp() ? abpSubtypeInput.value : null;

    if (isAbp() && !abpSubtype) {
      alert("Debes seleccionar un subtipo ABP.");
      return;
    }

    if (!pendingStart) {
      alert("Debes marcar una ubicación en el campo.");
      return;
    }

    if (isTransition() && !pendingEnd) {
      alert("En Transición debes marcar inicio y fin (2 clics).");
      return;
    }

    events.push({
      for_or_against: typeInput.value,
      minute,
      play_type: playType,
      abp_subtype: abpSubtype,
      x_start: pendingStart.x,
      y_start: pendingStart.y,
      x_end: isTransition() ? pendingEnd.x : null,
      y_end: isTransition() ? pendingEnd.y : null,
    });

    renderSavedEvents();
    resetPending();
    setHelpText();
  });

  playTypeInput.addEventListener("change", updateControlVisibility);

  updateControlVisibility();
  renderSavedEvents();
})();
