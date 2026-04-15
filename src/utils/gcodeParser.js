'use strict';

// ============================================================
// PrintLab 3D — gcodeParser.js
// Extrae tiempo de impresión y consumo de filamento del G-code
// generado por PrusaSlicer CLI con bambu_a1mini_quote.ini
//
// Validado contra Cabello.stl:
//   Gramos: 15.86 g  (Bambu Studio: 16.06 g → error -1.2%)
//   Tiempo: 50m 15s  (Bambu Studio total: 44m 22s → error +13.2%)
//   Con TIME_FACTOR = 0.885 → ~44m 28s (error +0.2%)
// ============================================================

const fs = require('fs');

/**
 * Parsea un archivo G-code y extrae gramos y tiempo.
 * @param {string} filePath — ruta absoluta al .gcode
 * @returns {{ grams: number, timeMinutes: number, lengthMm: number|null }}
 */
function parseGcode(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');

    // ── Gramos ────────────────────────────────────────────────
    const grams = extractNumber(content, [
        /;\s*filament used \[g\]\s*=\s*([\d.]+)/i,
        /;\s*total filament used \[g\]\s*=\s*([\d.]+)/i,
        /;\s*filament used\s*=\s*([\d.]+)\s*g/i,
        /;\s*filament used:\s*([\d.]+)\s*g/i,
    ]);

    // ── Longitud en mm (fallback para calcular gramos) ────────
    const lengthMm = extractNumber(content, [
        /;\s*filament used \[mm\]\s*=\s*([\d.]+)/i,
        /;\s*total filament used \[mm\]\s*=\s*([\d.]+)/i,
    ]);

    // ── Tiempo — PrusaSlicer "normal mode" ────────────────────
    const timeLine = extractText(content, [
        /;\s*estimated printing time \(normal mode\)\s*=\s*([^\n\r]+)/i,
        /;\s*estimated printing time\s*=\s*([^\n\r]+)/i,
        /;\s*total estimated time\s*=\s*([^\n\r]+)/i,
    ]);
    const timeMinutes = timeLine ? parseTimeToMinutes(timeLine) : null;

    // ── Fallback: calcular gramos desde mm ────────────────────
    let gramsResult = grams;
    if (!gramsResult && lengthMm) {
        const r = 1.75 / 2;
        const volumeCm3 = Math.PI * r * r * lengthMm / 1000;
        gramsResult = volumeCm3 * 1.24;
        console.log(`[gcodeParser] Gramos calculados desde ${lengthMm}mm → ${gramsResult.toFixed(2)}g`);
    }

    // ── Validación ────────────────────────────────────────────
    if (!gramsResult || gramsResult <= 0) {
        throw new Error('No se encontró consumo de filamento en el G-code. Verificar perfil .ini.');
    }
    if (!timeMinutes || timeMinutes <= 0) {
        throw new Error('No se encontró tiempo de impresión en el G-code. Verificar perfil .ini.');
    }

    const result = {
        grams:       parseFloat(gramsResult.toFixed(2)),
        timeMinutes: parseFloat(timeMinutes.toFixed(2)),
        lengthMm:    lengthMm || null,
    };

    console.log(`[gcodeParser] grams=${result.grams} timeMinutes=${result.timeMinutes} lengthMm=${result.lengthMm}`);
    return result;
}

function extractNumber(content, patterns) {
    for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match && match[1] !== undefined) {
            const value = parseFloat(match[1]);
            if (!Number.isNaN(value) && value > 0) return value;
        }
    }
    return null;
}

function extractText(content, patterns) {
    for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match && match[1]) return match[1].trim();
    }
    return null;
}

function parseTimeToMinutes(timeStr) {
    const days    = parseInt((timeStr.match(/(\d+)\s*d/i)      || [null, 0])[1], 10) || 0;
    const hours   = parseInt((timeStr.match(/(\d+)\s*h/i)      || [null, 0])[1], 10) || 0;
    const minutes = parseInt((timeStr.match(/(\d+)\s*m(?!s)/i) || [null, 0])[1], 10) || 0;
    const seconds = parseInt((timeStr.match(/(\d+)\s*s/i)      || [null, 0])[1], 10) || 0;

    const total = days * 1440 + hours * 60 + minutes + seconds / 60;
    return total > 0 ? parseFloat(total.toFixed(2)) : null;
}

module.exports = { parseGcode };
