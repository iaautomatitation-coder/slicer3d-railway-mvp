# Slicer3D Railway MVP

Este es el backend limpio, canónico y consolidado para el proyecto de cotización 3D, diseñado específicamente para ser desplegado en Railway de manera automatizada.

## Características Principales (Requisitos estrictos)

1. **Endpoint Único (`POST /quote`)**: Recibe archivos STL o 3MF y devuelve únicamente información parseada en JSON limpio (tiempo y peso extraído directamente del GCODE).
2. **Health Check (`GET /health`)**: Permite que Railway u otros monitorizadores validen que la aplicación está arriba y sirviendo adecuadamente.
3. **Puro FDM, Sin SLA**: Todo el código de SLA o de soporte condicional FDM/SLA antiguo se removió.
4. **Sin Polling (`async/await`)**: Se sube y procesa de manera secuencial hasta entregar una respuesta en 1 sola llamada HTTP.
5. **Configuración en Archivo (`.ini`)**: Todos los parámetros de inyección e impresión ya no se mandan por comandos CLI. Están configurados rígidamente dentro de `profiles/bambu_a1mini_quote.ini`.
6. **Docker Optimizado Headless (`xvfb-run`)**: Instalación de PrusaSlicer como AppImage extraída para evadir los problemas habituales de FUSE y dependencias GL en contenedores de Ubuntu/Nodejs.

## Estructura de Directorios

```plaintext
slicer3d-railway-mvp/
├── Dockerfile                  # Configuración de Contenedor Railway (Prusa + OS)
├── README.md                   # Esta documentación técnica
├── package.json                # Dependencias (Express, Multer, Cors)
├── server.js                   # Entry point (Endpoints, manejo HTTP)
├── profiles/
│   └── bambu_a1mini_quote.ini  # Perfil PrusaSlicer configurado exacto
├── src/
│   ├── services/
│   │   └── slicerService.js    # Capa de ejecución CLI de PrusaSlicer
│   └── utils/
│       └── gcodeParser.js      # Lógica pura de RegExp para extracción de data gcode
└── temp/
    ├── outputs/                # Destino de archivos temporales .gcode generados
    └── uploads/                # Archivos originales que se suban (.stl/.3mf)
```

## Ejecución Local
Si tienes Node instalado y quieres ver que cargue la app (aunque requieras PrusaSlicer instalado en tu LocalMachine para procesar un STL real).

```bash
npm install
npm run dev
```

Los G-codes parseados de prueba y uploads serán removidos de la memoria automáticamente al finalizar la consulta `/quote` liberando espacio de la instancia.
