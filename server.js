const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { slice } = require('./src/services/slicerService');

const app = express();
const PORT = process.env.PORT || 3000;
const COSTO_FILAMENTO_KG = parseFloat(process.env.COSTO_FILAMENTO_KG) || 400;

app.use(cors());
app.use(express.json());

// Setup temporary folder for uploads
const UPLOAD_DIR = path.resolve(__dirname, 'temp/uploads');
const OUTPUT_DIR = path.resolve(__dirname, 'temp/outputs');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const upload = multer({ 
    dest: UPLOAD_DIR,
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (['.stl', '.3mf'].includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Solo se admiten archivos .stl o .3mf'), false);
        }
    }
});

/**
 * Endpoint: GET /health
 */
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'slicer3d-quote-backend' });
});

/**
 * Endpoint: POST /quote
 */
app.post('/quote', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No se ha subido ningún archivo.' });
    }

    const stlPath = req.file.path;
    const originalName = req.file.originalname;

    try {
        console.log(`[QUOTE-REQUEST] Processing file: ${originalName}`);
        
        // Execute Slicing
        const metrics = await slice(stlPath, OUTPUT_DIR);
        
        // Calculate Cost
        const cost = (metrics.grams * COSTO_FILAMENTO_KG) / 1000;
        
        // Cleanup input file
        fs.unlinkSync(stlPath);

        // Final Response
        res.json({
            success: true,
            fileName: originalName,
            metrics: {
                grams: metrics.grams,
                timeMinutes: metrics.timeMinutes,
                timeFormatted: formatTime(metrics.timeMinutes),
                lengthMm: metrics.lengthMm
            },
            quote: {
                filamentCost: parseFloat(cost.toFixed(2)),
                currency: 'MXN',
                costPerKg: COSTO_FILAMENTO_KG
            }
        });

    } catch (error) {
        console.error(`[QUOTE-ERR] Error for ${originalName}:`, error.message);
        if (fs.existsSync(stlPath)) fs.unlinkSync(stlPath);
        res.status(500).json({ success: false, error: error.message });
    }
});

function formatTime(totalMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = Math.round(totalMinutes % 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

app.listen(PORT, () => {
    console.log(`🚀 Slicer Quoting Backend listening on port ${PORT}`);
    console.log(`📍 Configured Filament Cost: $${COSTO_FILAMENTO_KG}/kg`);
});
