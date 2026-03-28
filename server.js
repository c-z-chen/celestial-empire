const express = require('express');
const path = require('path');

const app = express();
const PORT = 8000;

// Serve static files from current directory
app.use(express.static(__dirname));

// Or specifically serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});