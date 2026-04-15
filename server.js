'use strict';

// ============================================================
// PrintLab 3D — server.js
// Backend Railway: Express + PrusaSlicer CLI
// GET  /health  → estado del servidor
// POST /quote   → slicing real + métricas
// Compatibilidad: Node >= 12 (sin optional chaining ni nullish coalescing)
// ============================================================

const express = require('express');
const cors    = require('cors');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const { slice } = require('./src/services/slicerService');

const app  = express();
const PORT = process.env.PORT || 3000;
const COSTO_FILAMENTO_KG = parseFloat(process.env.COSTO_FILAMENTO_KG || '400');

app.use(cors());
app.use(express.json());

// ── Directorios temporales ────────────────────────────────────
const UPLOAD_DIR = path.resolve(__dirname, 'temp/uploads');
const OUTPUT_DIR = path.resolve(__dirname, 'temp/outputs');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ── Multer ────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: function(req, file, cb) { cb(null, UPLOAD_DIR); },
    filename: function(req, file, cb) {
        var ext      = path.extname(file.originalname).toLowerCase();
        var safeName = Date.now() + '_' + Math.random().toString(36).slice(2, 7) + ext;
        cb(null, safeName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: function(req, file, cb) {
        var ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.stl') return cb(null, true);
        cb(new Error('Formato no soportado: ' + ext + '. Solo .stl'), false);
    }
});

// ── GET /health ───────────────────────────────────────────────
app.get('/health', function(req, res) {
    res.json({ status: 'ok' });
});

// ── GET / ─────────────────────────────────────────────────────
app.get('/', function(req, res) {
    res.json({
        status: 'ok',
        service: 'PrintLab 3D Slicer API',
        endpoints: ['GET /health', 'POST /quote']
    });
});

// ── POST /quote ───────────────────────────────────────────────
app.post('/quote', upload.single('file'), function(req, res) {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No se recibio archivo .stl' });
    }

    var stlPath      = req.file.path;
    var originalName = req.file.originalname;
    var fileKb       = (req.file.size / 1024).toFixed(1);
    console.log('[QUOTE] ' + originalName + ' (' + fileKb + ' KB)');

    slice(stlPath, OUTPUT_DIR)
        .then(function(metrics) {
            var cost = parseFloat(((metrics.grams * COSTO_FILAMENTO_KG) / 1000).toFixed(2));

            res.json({
                success:  true,
                fileName: originalName,
                metrics: {
                    grams:         metrics.grams,
                    timeMinutes:   metrics.timeMinutes,
                    timeFormatted: formatTime(metrics.timeMinutes),
                    lengthMm:      metrics.lengthMm
                },
                quote: {
                    filamentCost: cost,
                    currency:     'MXN',
                    costPerKg:    COSTO_FILAMENTO_KG
                }
            });

            cleanupFile(stlPath);
        })
        .catch(function(err) {
            console.error('[QUOTE-ERR] ' + originalName + ':', err.message);
            var status = 500;
            if (err.message && err.message.indexOf('timeout') !== -1) status = 504;
            res.status(status).json({ success: false, error: err.message });
            cleanupFile(stlPath);
        });
});

// ── Error handler multer ──────────────────────────────────────
app.use(function(err, req, res, next) {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'Archivo demasiado grande. Maximo 100 MB.' });
    }
    if (err.message && err.message.indexOf('Formato no soportado') !== -1) {
        return res.status(415).json({ error: err.message });
    }
    console.error('[SERVER-ERR]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// ── Helpers ───────────────────────────────────────────────────
function formatTime(totalMinutes) {
    var h = Math.floor(totalMinutes / 60);
    var m = Math.round(totalMinutes % 60);
    if (h > 0 && m > 0) return h + 'h ' + m + 'm';
    if (h > 0) return h + 'h';
    return m + 'm';
}

function cleanupFile(filePath) {
    try {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {
        console.warn('[CLEANUP] No se pudo eliminar:', filePath);
    }
}

// ── Arranque ──────────────────────────────────────────────────
app.listen(PORT, function() {
    console.log('[server] PrintLab 3D Slicer API — puerto ' + PORT);
    console.log('[server] COSTO_FILAMENTO_KG: $' + COSTO_FILAMENTO_KG);
});

module.exports = app;
