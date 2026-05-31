const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

const startIdx = content.indexOf('<main class="main-content" id="mainContent">');
const endIdx = content.indexOf('<script src="app.js"></script>');

if (startIdx !== -1 && endIdx !== -1) {
    const before = content.substring(0, startIdx);
    // Find the end of the main tag's wrapper
    const newMain = `        <main class="main-content" id="mainContent">
            <!-- Dynamic content injected here -->
        </main>
    </div>

    <!-- Toast -->
    <div class="toast-container" id="toastContainer"></div>

    `;
    const after = content.substring(endIdx);
    
    fs.writeFileSync('index.html', before + newMain + after);
    console.log('Successfully cleaned index.html');
} else {
    console.log('Could not find start or end tags');
}
