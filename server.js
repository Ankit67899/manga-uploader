const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

const app = express();
const PORT = 3000;

// Set up view engine
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configure Multer for multiple image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { mangaTitle, chapterNumber } = req.body;
        // Sanitize names for folder paths
        const safeTitle = mangaTitle.replace(/[^a-zA-Z0-9]/g, '_');
        const dir = path.join(__dirname, 'public', 'uploads', safeTitle, `chapter_${chapterNumber}`);
        fs.ensureDirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Keep original file names or sort them numerically
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// --- ROUTES ---

// 1. Home Page: List all uploaded manga
app.get('/', (async (req, res) => {
    const uploadsDir = path.join(__dirname, 'public', 'uploads');
    await fs.ensureDir(uploadsDir);
    
    const mangaList = [];
    const folders = await fs.readdir(uploadsDir);

    for (const folder of folders) {
        const folderPath = path.join(uploadsDir, folder);
        const stats = await fs.stat(folderPath);
        if (stats.isDirectory()) {
            const chapters = await fs.readdir(folderPath);
            mangaList.push({
                title: folder.replace(/_/g, ' '),
                folderName: folder,
                chapters: chapters.sort()
            });
        }
    }

    res.render('index', { mangaList });
}));

// 2. Upload Page Form
app.get('/upload', (req, res) => {
    res.render('upload');
});

// 3. Handle Manga Chapter Upload
app.post('/upload', upload.array('mangaPages'), (req, res) => {
    res.redirect('/');
});

// 4. Reader Page: Read a specific chapter
app.get('/read/:mangaTitle/:chapter', async (req, res) => {
    const { mangaTitle, chapter } = req.params;
    const chapterPath = path.join(__dirname, 'public', 'uploads', mangaTitle, chapter);
    
    try {
        const files = await fs.readdir(chapterPath);
        // Filter out non-image files and sort naturally
        const pages = files
            .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

        res.render('reader', { mangaTitle: mangaTitle.replace(/_/g, ' '), chapter, pages });
    } catch (err) {
        res.status(404).send("Chapter not found!");
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});