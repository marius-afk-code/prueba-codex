(() => {
  const pitch = document.getElementById("pitch");
  if (!pitch) return;

  const minuteInput = document.getElementById("minute");
  const typeInput = document.getElementById("for_or_against");
  const playTypeInput = document.getElementById("play_type");
  const eventsList = document.getElementById("events-list");
  const hiddenEvents = document.getElementById("goal_events");

  const events = [];

  const render = () => {
    eventsList.innerHTML = "";
    events.forEach((event, index) => {
      const li = document.createElement("li");
      li.className = "event-item";
      li.innerHTML = `
        <span>${event.for_or_against === "for" ? "A favor" : "En contra"} · Min ${event.minute} · ${event.play_type} · (${event.x.toFixed(1)}, ${event.y.toFixed(1)})</span>
        <button type="button" data-index="${index}" class="btn danger">Borrar</button>
      `;
      eventsList.appendChild(li);
    });

    hiddenEvents.value = JSON.stringify(events);

    eventsList.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.index);
        events.splice(idx, 1);
        render();
      });
    });
  };

  pitch.addEventListener("click", (ev) => {
    const minute = Number(minuteInput.value);
    if (!Number.isInteger(minute) || minute < 0 || minute > 120) {
      alert("Minuto inválido (0-120).");
      return;
    }

    const rect = pitch.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 100;
    const y = ((ev.clientY - rect.top) / rect.height) * 100;

    events.push({
      for_or_against: typeInput.value,
      minute,
      play_type: playTypeInput.value,
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
    });

    render();
  });
})();
