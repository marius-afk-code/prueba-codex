from __future__ import annotations

import csv
import io
import json
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import List

from flask import Flask, Response, flash, redirect, render_template, request, url_for

DATA_FILE = Path("partidos.json")
DATE_FORMAT = "%Y-%m-%d"


@dataclass
class Partido:
    fecha: str
    rival: str
    goles: int
    asistencias: int
    tarjetas: int


class RegistroPartidos:
    def __init__(self, data_file: Path = DATA_FILE) -> None:
        self.data_file = data_file
        self.partidos: List[Partido] = self._cargar()

    def _asegurar_archivo(self) -> None:
        if not self.data_file.exists():
            with self.data_file.open("w", encoding="utf-8") as file:
                json.dump([], file, ensure_ascii=False, indent=2)

    def _cargar(self) -> List[Partido]:
        self._asegurar_archivo()
        with self.data_file.open("r", encoding="utf-8") as file:
            data = json.load(file)
        return [Partido(**item) for item in data]

    def guardar(self) -> None:
        with self.data_file.open("w", encoding="utf-8") as file:
            json.dump([asdict(p) for p in self.partidos], file, ensure_ascii=False, indent=2)

    def agregar_partido(self, partido: Partido) -> None:
        self.partidos.append(partido)
        self.guardar()

    def listar_partidos(self) -> List[Partido]:
        return self.partidos

    def obtener_partido(self, index: int) -> Partido | None:
        if 0 <= index < len(self.partidos):
            return self.partidos[index]
        return None


app = Flask(__name__)
app.secret_key = "dev-secret-key"
registro = RegistroPartidos()


def validar_fecha(valor: str) -> bool:
    try:
        datetime.strptime(valor, DATE_FORMAT)
        return True
    except ValueError:
        return False


def validar_entero_no_negativo(valor: str) -> bool:
    return valor.isdigit()


@app.route("/")
def inicio() -> str:
    partidos = registro.listar_partidos()
    return render_template("index.html", partidos=partidos)


@app.route("/partidos/nuevo", methods=["GET", "POST"])
def nuevo_partido() -> str | Response:
    if request.method == "POST":
        fecha = request.form.get("fecha", "").strip()
        rival = request.form.get("rival", "").strip()
        goles = request.form.get("goles", "").strip()
        asistencias = request.form.get("asistencias", "").strip()
        tarjetas = request.form.get("tarjetas", "").strip()

        if not validar_fecha(fecha):
            flash("La fecha debe tener formato AAAA-MM-DD.", "error")
            return render_template("nuevo_partido.html")

        if not rival:
            flash("El rival es obligatorio.", "error")
            return render_template("nuevo_partido.html")

        if not all(
            validar_entero_no_negativo(valor)
            for valor in [goles, asistencias, tarjetas]
        ):
            flash("Goles, asistencias y tarjetas deben ser números no negativos.", "error")
            return render_template("nuevo_partido.html")

        partido = Partido(
            fecha=fecha,
            rival=rival,
            goles=int(goles),
            asistencias=int(asistencias),
            tarjetas=int(tarjetas),
        )

        registro.agregar_partido(partido)
        flash("Partido guardado correctamente.", "success")
        return redirect(url_for("inicio"))

    return render_template("nuevo_partido.html")


@app.route("/partidos/<int:partido_id>")
def detalle_partido(partido_id: int) -> str | tuple[str, int]:
    partido = registro.obtener_partido(partido_id)
    if partido is None:
        return "Partido no encontrado", 404

    return render_template("detalle_partido.html", partido=partido, partido_id=partido_id)


@app.route("/exportar-csv")
def exportar_csv() -> Response:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Fecha", "Rival", "Goles", "Asistencias", "Tarjetas"])

    for p in registro.listar_partidos():
        writer.writerow([p.fecha, p.rival, p.goles, p.asistencias, p.tarjetas])

    csv_data = output.getvalue()
    output.close()

    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=partidos.csv"},
    )


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
