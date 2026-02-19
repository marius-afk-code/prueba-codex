from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import List

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

    def _cargar(self) -> List[Partido]:
        if not self.data_file.exists():
            return []

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


def pedir_entero(mensaje: str) -> int:
    while True:
        valor = input(mensaje).strip()
        if valor.isdigit():
            return int(valor)
        print("❌ Debes introducir un número entero mayor o igual a 0.")


def pedir_fecha(mensaje: str) -> str:
    while True:
        valor = input(mensaje).strip()
        try:
            datetime.strptime(valor, DATE_FORMAT)
            return valor
        except ValueError:
            print("❌ Formato inválido. Usa AAAA-MM-DD.")


def crear_partido_desde_input() -> Partido:
    fecha = pedir_fecha("Fecha del partido (AAAA-MM-DD): ")
    rival = input("Rival: ").strip()
    goles = pedir_entero("Goles: ")
    asistencias = pedir_entero("Asistencias: ")
    tarjetas = pedir_entero("Tarjetas: ")

    return Partido(
        fecha=fecha,
        rival=rival,
        goles=goles,
        asistencias=asistencias,
        tarjetas=tarjetas,
    )


def mostrar_partidos(partidos: List[Partido]) -> None:
    if not partidos:
        print("\nNo hay partidos registrados todavía.\n")
        return

    print("\n--- Historial de partidos ---")
    for idx, partido in enumerate(partidos, start=1):
        print(
            f"{idx}. Fecha: {partido.fecha} | Rival: {partido.rival} | "
            f"Goles: {partido.goles} | Asistencias: {partido.asistencias} | "
            f"Tarjetas: {partido.tarjetas}"
        )
    print()


def menu() -> None:
    registro = RegistroPartidos()

    while True:
        print("=== Registro de estadísticas de fútbol ===")
        print("1. Registrar partido")
        print("2. Ver partidos registrados")
        print("3. Salir")
        opcion = input("Selecciona una opción: ").strip()

        if opcion == "1":
            partido = crear_partido_desde_input()
            registro.agregar_partido(partido)
            print("\n✅ Partido guardado correctamente.\n")
        elif opcion == "2":
            mostrar_partidos(registro.listar_partidos())
        elif opcion == "3":
            print("¡Hasta luego!")
            break
        else:
            print("\n❌ Opción no válida. Elige 1, 2 o 3.\n")


if __name__ == "__main__":
    menu()
