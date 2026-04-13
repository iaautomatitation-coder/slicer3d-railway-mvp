const fs = require('fs');

function parseGCode(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');

        const grams = extractNumber(content, [
    /filament used \[g\]\s*=\s*([\d.]+)/i,
    /filament used\s*=\s*([\d.]+)\s*g/i,
    /filament used:\s*([\d.]+)\s*g/i,
    /total filament used\s*=\s*([\d.]+)\s*g/i,
    /filament used.*?([\d.]+)\s*g/i
]);

        const lengthMm = extractNumber(content, [
            /filament used \[mm\]\s*=\s*([\d.]+)/i,
            /total filament used \[mm\]\s*=\s*([\d.]+)/i,
            /filament used \[cm3\]/i
        ], true);

        const timeLine = extractText(content, [
            /estimated printing time \(normal mode\)\s*=\s*([^\n\r]+)/i,
            /estimated printing time\s*=\s*([^\n\r]+)/i,
            /total estimated time\s*=\s*([^\n\r]+)/i,
            /estimated printing time:\s*([^\n\r]+)/i
        ]);

        const timeMinutes = timeLine ? parseTimeToMinutes(timeLine) : null;

        return {
            success: true,
            grams: grams,
            timeMinutes: timeMinutes,
            lengthMm: lengthMm
        };
    } catch (error) {
        console.error('[PARSER-ERR] Error parsing G-code:', error.message);
        return { success: false, error: error.message };
    }
}

function extractNumber(content, patterns, allowNull = false) {
    for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match && match[1] !== undefined) {
            const value = parseFloat(match[1]);
            if (!Number.isNaN(value)) return parseFloat(value.toFixed(2));
        }
    }
    return allowNull ? null : null;
}

function extractText(content, patterns) {
    for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    return null;
}

function parseTimeToMinutes(timeStr) {
    const days = (timeStr.match(/(\d+)\s*d/i) || [null, 0])[1];
    const hours = (timeStr.match(/(\d+)\s*h/i) || [null, 0])[1];
    const minutes = (timeStr.match(/(\d+)\s*m(?!s)/i) || [null, 0])[1];
    const seconds = (timeStr.match(/(\d+)\s*s/i) || [null, 0])[1];

    const total =
        (parseInt(days, 10) || 0) * 1440 +
        (parseInt(hours, 10) || 0) * 60 +
        (parseInt(minutes, 10) || 0) +
        ((parseInt(seconds, 10) || 0) / 60);

    return total > 0 ? parseFloat(total.toFixed(2)) : null;
}

module.exports = { parseGCode, parseGcode: parseGCode };
