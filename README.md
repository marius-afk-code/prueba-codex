# Registro de fútbol (Web con Flask)

Aplicación web para registrar estadísticas de partidos de fútbol con persistencia en `partidos.json`.

## Características
- Pantalla de inicio con tabla de partidos registrados.
- Formulario para añadir partido (fecha, rival, goles, asistencias, tarjetas).
- Vista de detalle por partido.
- Exportación de datos a CSV.
- Validaciones de fecha `AAAA-MM-DD` y números no negativos.

## Estructura del proyecto
- `app.py` - Aplicación Flask (backend + rutas).
- `templates/` - Plantillas HTML.
- `static/` - Estilos CSS.
- `partidos.json` - Persistencia de datos (se crea automáticamente si no existe).
- `requirements.txt` - Dependencias.

## Instalación y ejecución (Windows)

### 1) Abrir terminal en la carpeta del proyecto
Puedes usar PowerShell o CMD.

### 2) Crear y activar entorno virtual
```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Si usas CMD:
```cmd
py -m venv .venv
.venv\Scripts\activate.bat
```

### 3) Instalar dependencias
```powershell
pip install -r requirements.txt
```

### 4) Ejecutar la aplicación
```powershell
python app.py
```

### 5) Abrir en el navegador
Visita: `http://127.0.0.1:5000/`

## Notas
- Si `partidos.json` no existe, la app lo crea automáticamente con una lista vacía.
- El botón **Exportar CSV** descarga un archivo llamado `partidos.csv`.
