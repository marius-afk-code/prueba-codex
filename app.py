from __future__ import annotations

import json
from datetime import datetime
from functools import wraps

from flask import Flask, flash, g, redirect, render_template, request, session, url_for
from sqlalchemy import text
from werkzeug.security import check_password_hash, generate_password_hash

from models import GoalEvent, Match, Report, User, db
from services.ai_report import generate_report_from_metrics
from services.analytics import build_analytics

DATE_FORMAT = "%Y-%m-%d"
PLAY_TYPES = [
    "ABP",
    "Centro lateral",
    "Transición",
    "Pase filtrado",
    "Disparo exterior",
    "Error (pérdida/portero)",
    "Combinación",
    "Individual",
    "Otro",
]
ABP_SUBTYPES = ["Córner", "Falta frontal", "Falta lateral", "Penalti", "Saque de banda", "Otro ABP"]

app = Flask(__name__)
app.config["SECRET_KEY"] = "dev-secret-key"
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///informes.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)


with app.app_context():
    db.create_all()

    cols = {
        row[1]
        for row in db.session.execute(text("PRAGMA table_info(goal_event)")).fetchall()
    }
    migrations = {
        "abp_subtype": "ALTER TABLE goal_event ADD COLUMN abp_subtype VARCHAR(40)",
        "x_start": "ALTER TABLE goal_event ADD COLUMN x_start FLOAT",
        "y_start": "ALTER TABLE goal_event ADD COLUMN y_start FLOAT",
        "x_end": "ALTER TABLE goal_event ADD COLUMN x_end FLOAT",
        "y_end": "ALTER TABLE goal_event ADD COLUMN y_end FLOAT",
    }
    for col, query in migrations.items():
        if col not in cols:
            db.session.execute(text(query))

    # Compatibilidad con esquema anterior que tenía x/y.
    cols = {
        row[1]
        for row in db.session.execute(text("PRAGMA table_info(goal_event)")).fetchall()
    }
    if {"x", "y", "x_start", "y_start"}.issubset(cols):
        db.session.execute(
            text(
                "UPDATE goal_event "
                "SET x_start = COALESCE(x_start, x), y_start = COALESCE(y_start, y) "
                "WHERE x_start IS NULL OR y_start IS NULL"
            )
        )

    db.session.commit()


def login_required(view):
    @wraps(view)
    def wrapped_view(*args, **kwargs):
        if g.user is None:
            flash("Debes iniciar sesión para continuar.", "error")
            return redirect(url_for("login"))
        return view(*args, **kwargs)

    return wrapped_view


@app.before_request
def load_logged_user() -> None:
    user_id = session.get("user_id")
    if user_id is None:
        g.user = None
    else:
        g.user = db.session.get(User, user_id)


def _in_range(value: float) -> bool:
    return 0 <= value <= 100


def parse_match_form(form) -> tuple[dict, list[str]]:
    errors: list[str] = []

    date_value = form.get("date", "").strip()
    opponent = form.get("opponent", "").strip()
    goals_for = form.get("goals_for", "").strip()
    goals_against = form.get("goals_against", "").strip()
    notes_short = form.get("notes_short", "").strip()
    raw_events = form.get("goal_events", "[]")

    parsed_date = None
    try:
        parsed_date = datetime.strptime(date_value, DATE_FORMAT).date()
    except ValueError:
        errors.append("La fecha debe tener formato AAAA-MM-DD.")

    if not opponent:
        errors.append("El rival es obligatorio.")

    if not goals_for.isdigit() or not goals_against.isdigit():
        errors.append("Goles a favor y en contra deben ser enteros no negativos.")

    try:
        events = json.loads(raw_events)
        if not isinstance(events, list):
            raise ValueError
    except (json.JSONDecodeError, ValueError):
        events = []
        errors.append("Eventos de gol inválidos.")

    valid_events = []
    for idx, event in enumerate(events, start=1):
        side = event.get("for_or_against")
        play_type = event.get("play_type")
        abp_subtype = event.get("abp_subtype")

        try:
            minute = int(event.get("minute"))
            x_start = float(event.get("x_start"))
            y_start = float(event.get("y_start"))
        except (TypeError, ValueError):
            errors.append(f"Evento {idx}: minuto o coordenadas inicio inválidas.")
            continue

        if side not in {"for", "against"}:
            errors.append(f"Evento {idx}: tipo de gol inválido.")
        if play_type not in PLAY_TYPES:
            errors.append(f"Evento {idx}: tipo de jugada inválido.")
        if minute < 0 or minute > 120:
            errors.append(f"Evento {idx}: minuto fuera de rango (0-120).")
        if not _in_range(x_start) or not _in_range(y_start):
            errors.append(f"Evento {idx}: coordenadas inicio fuera de rango (0-100).")

        x_end = None
        y_end = None

        if play_type == "ABP":
            if abp_subtype not in ABP_SUBTYPES:
                errors.append(f"Evento {idx}: subtipo ABP obligatorio e inválido.")
        else:
            abp_subtype = None

        if play_type == "Transición":
            try:
                x_end = float(event.get("x_end"))
                y_end = float(event.get("y_end"))
            except (TypeError, ValueError):
                errors.append(f"Evento {idx}: transición requiere clic de inicio y fin.")

            if x_end is not None and y_end is not None and (not _in_range(x_end) or not _in_range(y_end)):
                errors.append(f"Evento {idx}: coordenadas fin fuera de rango (0-100).")
        else:
            x_end = None
            y_end = None

        valid_events.append(
            {
                "for_or_against": side,
                "minute": minute,
                "play_type": play_type,
                "abp_subtype": abp_subtype,
                "x_start": x_start,
                "y_start": y_start,
                "x_end": x_end,
                "y_end": y_end,
            }
        )

    payload = {
        "date": parsed_date,
        "opponent": opponent,
        "goals_for": int(goals_for) if goals_for.isdigit() else None,
        "goals_against": int(goals_against) if goals_against.isdigit() else None,
        "notes_short": notes_short or None,
        "goal_events": valid_events,
    }
    return payload, errors


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username", "").strip().lower()
        password = request.form.get("password", "")

        if not username or not password:
            flash("Usuario y contraseña son obligatorios.", "error")
            return render_template("register.html")

        existing = User.query.filter_by(username=username).first()
        if existing:
            flash("Ese usuario ya existe.", "error")
            return render_template("register.html")

        user = User(username=username, password_hash=generate_password_hash(password))
        db.session.add(user)
        db.session.commit()
        flash("Usuario creado. Ya puedes iniciar sesión.", "success")
        return redirect(url_for("login"))

    return render_template("register.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username", "").strip().lower()
        password = request.form.get("password", "")
        user = User.query.filter_by(username=username).first()

        if user is None or not check_password_hash(user.password_hash, password):
            flash("Credenciales inválidas.", "error")
            return render_template("login.html")

        session.clear()
        session["user_id"] = user.id
        flash("Bienvenido.", "success")
        return redirect(url_for("inicio"))

    return render_template("login.html")


@app.route("/logout")
def logout():
    session.clear()
    flash("Sesión cerrada.", "success")
    return redirect(url_for("login"))


@app.route("/")
@login_required
def inicio():
    partidos = Match.query.filter_by(user_id=g.user.id).order_by(Match.date.desc()).all()
    return render_template("index.html", partidos=partidos)


@app.route("/partidos/nuevo", methods=["GET", "POST"])
@login_required
def nuevo_partido():
    if request.method == "POST":
        payload, errors = parse_match_form(request.form)

        if errors:
            for err in errors:
                flash(err, "error")
            return render_template(
                "nuevo_partido.html",
                play_types=PLAY_TYPES,
                abp_subtypes=ABP_SUBTYPES,
            )

        match = Match(
            user_id=g.user.id,
            date=payload["date"],
            opponent=payload["opponent"],
            goals_for=payload["goals_for"],
            goals_against=payload["goals_against"],
            notes_short=payload["notes_short"],
        )

        for event_data in payload["goal_events"]:
            match.goal_events.append(GoalEvent(**event_data))

        db.session.add(match)
        db.session.commit()
        flash("Partido guardado correctamente.", "success")
        return redirect(url_for("inicio"))

    return render_template("nuevo_partido.html", play_types=PLAY_TYPES, abp_subtypes=ABP_SUBTYPES)


@app.route("/partidos/<int:match_id>")
@login_required
def detalle_partido(match_id: int):
    partido = Match.query.filter_by(id=match_id, user_id=g.user.id).first()
    if partido is None:
        return "Partido no encontrado", 404
    return render_template("detalle_partido.html", partido=partido)


@app.route("/informes", methods=["GET", "POST"])
@login_required
def informes():
    if request.method == "POST":
        n_value = request.form.get("num_matches", "5")
        if n_value not in {"3", "5", "10"}:
            n_value = "5"
        n = int(n_value)

        matches = (
            Match.query.filter_by(user_id=g.user.id)
            .order_by(Match.date.desc())
            .limit(n)
            .all()
        )

        if not matches:
            flash("No hay partidos para generar informe.", "error")
            return redirect(url_for("informes"))

        analytics = build_analytics(matches)
        ok, content = generate_report_from_metrics(analytics.summary)

        if not ok:
            flash(content, "error")
            return redirect(url_for("informes"))

        report = Report(user_id=g.user.id, num_matches=n, content=content)
        db.session.add(report)
        db.session.commit()
        flash("Informe generado y guardado.", "success")
        return redirect(url_for("informes"))

    historial = Report.query.filter_by(user_id=g.user.id).order_by(Report.created_at.desc()).all()
    ultimo = historial[0] if historial else None
    return render_template("informes.html", ultimo=ultimo, historial=historial)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
