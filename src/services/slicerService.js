const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { parseGcode } = require('../utils/gcodeParser');

const PRUSA_PATH = process.env.PRUSA_PATH || '/opt/squashfs-root/AppRun';
const PROFILE_PATH = path.resolve(__dirname, '../../profiles/bambu_a1mini_quote.ini');

function slice(stlPath, outputDir) {
    return new Promise((resolve, reject) => {
        const fileName = path.basename(stlPath).replace(/\.[^.]+$/, '');
        const gcodePath = path.join(outputDir, `${fileName}_${Date.now()}.gcode`);

        const cmd = `"${PRUSA_PATH}" --load "${PROFILE_PATH}" --export-gcode "${stlPath}" --output "${gcodePath}"`;

        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                return reject(new Error(`Slicing failed: ${stderr || error.message}`));
            }

            try {
                const parsed = parseGcode(gcodePath);

                if (fs.existsSync(gcodePath)) {
                    fs.unlinkSync(gcodePath);
                }

                resolve({
                    grams: parsed.grams,
                    timeMinutes: parsed.timeMinutes,
                    lengthMm: parsed.lengthMm
                });

            } catch (parseError) {
                if (fs.existsSync(gcodePath)) {
                    fs.unlinkSync(gcodePath);
                }

                reject(new Error(`Parse failed: ${parseError.message}`));
            }
        });
    });
}

module.exports = { slice };
