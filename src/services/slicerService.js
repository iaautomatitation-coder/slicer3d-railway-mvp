const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { parseGcode } = require('../utils/gcodeParser');

const PRUSA_PATH = process.env.PRUSA_PATH || 'prusa-slicer';
const PROFILE_PATH = path.resolve(__dirname, '../../profiles/bambu_a1mini_quote.ini');

function slice(stlPath, outputDir) {
    return new Promise((resolve, reject) => {
        const fileName = path.basename(stlPath).replace(/\.[^.]+$/, '');
        const gcodePath = path.join(outputDir, `${fileName}_${Date.now()}.gcode`);

        const cmd = `"${PRUSA_PATH}" --load "${PROFILE_PATH}" --export-gcode "${stlPath}" --output "${gcodePath}"`;

        console.log(`[SLICER] Executing: ${cmd}`);

        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`[SLICER-ERR] ${error.message}`);
                return reject(new Error(`Slicing failed: ${stderr || error.message}`));
            }

            try {
                const parsed = parseGcode(gcodePath);

                const metrics = {
                    success: true,
                    grams: parsed.filamento_gramos,
                    timeMinutes: (parsed.tiempo_horas * 60) + parsed.tiempo_minutos + (parsed.tiempo_segundos / 60),
                    lengthMm: null
                };

                if (fs.existsSync(gcodePath)) {
                    fs.unlinkSync(gcodePath);
                }

                resolve(metrics);
            } catch (parseError) {
                if (fs.existsSync(gcodePath)) {
                    fs.unlinkSync(gcodePath);
                }

                reject(new Error(`Failed to parse G-code output: ${parseError.message}`));
            }
        });
    });
}

module.exports = { slice };
