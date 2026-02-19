from __future__ import annotations

import json
from datetime import datetime
from functools import wraps

from flask import Flask, flash, g, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

from models import GoalEvent, Match, Report, User, db
from services.ai_report import generate_report_from_metrics
from services.analytics import build_analytics

DATE_FORMAT = "%Y-%m-%d"
PLAY_TYPES = ["Centro", "ABP", "Transición", "Combinación", "Individual", "Otro"]

app = Flask(__name__)
app.config["SECRET_KEY"] = "dev-secret-key"
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///informes.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)


with app.app_context():
    db.create_all()


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
    except json.JSONDecodeError:
        events = []
        errors.append("Eventos de gol inválidos.")

    valid_events = []
    for idx, event in enumerate(events, start=1):
        side = event.get("for_or_against")
        play_type = event.get("play_type")

        try:
            minute = int(event.get("minute"))
            x = float(event.get("x"))
            y = float(event.get("y"))
        except (TypeError, ValueError):
            errors.append(f"Evento {idx}: minuto o coordenadas inválidas.")
            continue

        if side not in {"for", "against"}:
            errors.append(f"Evento {idx}: tipo de gol inválido.")
        if play_type not in PLAY_TYPES:
            errors.append(f"Evento {idx}: tipo de jugada inválido.")
        if minute < 0 or minute > 120:
            errors.append(f"Evento {idx}: minuto fuera de rango (0-120).")
        if x < 0 or x > 100 or y < 0 or y > 100:
            errors.append(f"Evento {idx}: coordenadas fuera de rango (0-100).")

        valid_events.append(
            {
                "for_or_against": side,
                "minute": minute,
                "play_type": play_type,
                "x": x,
                "y": y,
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
            return render_template("nuevo_partido.html", play_types=PLAY_TYPES)

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

    return render_template("nuevo_partido.html", play_types=PLAY_TYPES)


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
