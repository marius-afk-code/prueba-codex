from __future__ import annotations

import json
import os

from openai import OpenAI


def generate_report_from_metrics(metrics: dict, model: str = "gpt-4o-mini") -> tuple[bool, str]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return False, "Falta configurar OPENAI_API_KEY"

    client = OpenAI(api_key=api_key)

    prompt = (
        "Eres analista táctico especializado en fútbol base. "
        "Debes redactar un informe breve y accionable para entrenadores. "
        "Usa EXCLUSIVAMENTE los datos JSON recibidos; no inventes partidos, tendencias ni causas no observables. "
        "Evita frases vacías y genéricas. Si faltan datos, dilo explícitamente.\n\n"
        "Salida obligatoria en español y en este formato exacto:\n"
        "TENDENCIAS NEGATIVAS\n"
        "- ...\n- ...\n- ...\n"
        "TENDENCIAS POSITIVAS\n"
        "- ...\n- ...\n- ...\n"
        "FOCOS DE ENTRENAMIENTO (SEMANA)\n"
        "- ...\n- ...\n- ...\n"
        "RESUMEN\n"
        "Lo más importante esta semana es...\n\n"
        "Cada bullet debe apoyarse en un dato concreto del JSON (porcentajes, conteos o promedios)."
    )

    user_data = json.dumps(metrics, ensure_ascii=False, indent=2)

    response = client.responses.create(
        model=model,
        input=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": f"Datos disponibles:\n{user_data}"},
        ],
        temperature=0.2,
    )

    return True, response.output_text.strip()
