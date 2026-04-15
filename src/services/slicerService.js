'use strict';

// ============================================================
// PrintLab 3D — slicerService.js
// Ejecuta PrusaSlicer CLI y aplica TIME_FACTOR calibrado
//
// TIME_FACTOR = 0.885:
//   Validado contra Cabello.stl (16.06g, 44m22s Bambu Studio)
//   PrusaSlicer devuelve ~50m15s → × 0.885 = ~44m28s (+0.2%)
//   Recolectar 5+ piezas más para confirmar estabilidad del factor.
//   Rango esperado: 0.80–0.95x según geometría.
// ============================================================

const { exec }    = require('child_process');
const path        = require('path');
const fs          = require('fs');
const { parseGcode } = require('../utils/gcodeParser');

const PRUSA_PATH   = process.env.PRUSA_PATH   || '/opt/squashfs-root/AppRun';
const PROFILE_PATH = path.resolve(__dirname, '../../profiles/bambu_a1mini_quote.ini');
const TIME_FACTOR  = parseFloat(process.env.TIME_FACTOR  || '0.885');

// Verificar dependencias al cargar el módulo
if (!fs.existsSync(PROFILE_PATH)) {
    console.error(`[slicerService] ADVERTENCIA: perfil no encontrado en ${PROFILE_PATH}`);
}

/**
 * Realiza slicing de un archivo STL y retorna métricas ajustadas.
 * @param {string} stlPath   — ruta absoluta al STL
 * @param {string} outputDir — directorio para el G-code temporal
 * @returns {Promise<{ grams: number, timeMinutes: number, lengthMm: number|null }>}
 */
function slice(stlPath, outputDir) {
    return new Promise((resolve, reject) => {
        const baseName = path.basename(stlPath).replace(/\.[^.]+$/, '');
        const gcodePath = path.join(outputDir, `${baseName}_${Date.now()}.gcode`);

        // --dont-arrange: no reorganizar la plataforma (cotización de 1 pieza)
        // --loglevel 1:   solo errores fatales en stderr
        const cmd = `"${PRUSA_PATH}" --load "${PROFILE_PATH}" --export-gcode "${stlPath}" --output "${gcodePath}" --dont-arrange --loglevel 1`;

        console.log(`[slicerService] Iniciando slicing: ${path.basename(stlPath)}`);
        console.log(`[slicerService] Perfil: ${PROFILE_PATH}`);
        console.log(`[slicerService] TIME_FACTOR: ${TIME_FACTOR}`);

        exec(cmd, { timeout: 120000 }, (error, stdout, stderr) => {
            if (error) {
                console.error(`[slicerService] Error de ejecución:`, error.message);
                if (stderr) console.error(`[slicerService] stderr:`, stderr.substring(0, 500));
                return reject(new Error(`Slicing fallido: ${stderr || error.message}`));
            }

            if (!fs.existsSync(gcodePath)) {
                console.error(`[slicerService] G-code no generado. stdout:`, stdout.substring(0, 300));
                return reject(new Error('PrusaSlicer no generó el G-code. Verificar perfil y STL.'));
            }

            const sizeKb = fs.statSync(gcodePath).size / 1024;
            console.log(`[slicerService] G-code generado: ${sizeKb.toFixed(1)} KB`);

            try {
                const parsed = parseGcode(gcodePath);

                // Aplicar TIME_FACTOR para alinear con Bambu Studio
                const timeAdjusted = parseFloat((parsed.timeMinutes * TIME_FACTOR).toFixed(2));

                console.log(`[slicerService] Raw tiempo: ${parsed.timeMinutes} min → Ajustado (×${TIME_FACTOR}): ${timeAdjusted} min`);

                if (fs.existsSync(gcodePath)) fs.unlinkSync(gcodePath);

                resolve({
                    grams:       parsed.grams,
                    timeMinutes: timeAdjusted,
                    lengthMm:    parsed.lengthMm,
                });

            } catch (parseError) {
                if (fs.existsSync(gcodePath)) fs.unlinkSync(gcodePath);
                reject(new Error(`Parse fallido: ${parseError.message}`));
            }
        });
    });
}

module.exports = { slice };
