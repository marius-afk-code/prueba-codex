# Informe Inteligente (MVP) para entrenadores

Aplicación Flask para registrar partidos en pocos minutos y generar un informe automático con IA basado solo en datos reales capturados.

## Funcionalidades principales
- Registro/login/logout con usuarios almacenados en SQLite.
- Cada usuario ve únicamente sus propios partidos e informes.
- Alta rápida de partido con:
  - fecha, rival, goles a favor/en contra, nota corta.
  - eventos de gol mediante mini-campo clicable (minuto, tipo, coordenadas x/y).
- Listado y detalle de partidos.
- Generación de informe IA para últimos N partidos (3/5/10), guardado con timestamp en DB.
- Persistencia completa en SQLite con SQLAlchemy.

## Estructura
- `app.py`: rutas Flask, validaciones y autenticación.
- `models.py`: modelos SQLAlchemy (`User`, `Match`, `GoalEvent`, `Report`).
- `services/analytics.py`: métricas y patrones simples para el análisis.
- `services/ai_report.py`: prompt y llamada a OpenAI.
- `templates/`: vistas HTML.
- `static/`: CSS y JS del campo clicable.

## Requisitos
- Python 3.10+

## Instalación y ejecución (Windows)

### 1) Crear y activar entorno virtual
```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 2) Instalar dependencias
```powershell
pip install -r requirements.txt
```

### 3) Ejecutar app
```powershell
py app.py
```

Abrir en navegador:
- `http://127.0.0.1:5000/`

## Configurar OPENAI_API_KEY
Si no configuras la variable, la app mostrará: `Falta configurar OPENAI_API_KEY` al generar informe.

### Windows (setx)
```powershell
setx OPENAI_API_KEY "sk-tu-api-key-aqui"
```
Cierra y vuelve a abrir la terminal para que se aplique.

## Inicializar base de datos SQLite
La app crea automáticamente la base y tablas al iniciar:
- archivo SQLite: `instance/informes.db`
- creación automática mediante `db.create_all()` en `app.py`.

## Validaciones aplicadas
- Fecha válida en formato `AAAA-MM-DD`.
- Goles: enteros no negativos.
- Eventos de gol:
  - minuto entre 0 y 120.
  - `for_or_against` en `{for, against}`.
  - `play_type` en `Centro`, `ABP`, `Transición`, `Combinación`, `Individual`, `Otro`.
  - coordenadas `x,y` entre 0 y 100.
