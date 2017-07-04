const fs = require('fs')
const path = require('path')

const outputFile = path.join(__dirname, './emojione.html')
const emoticonsPath = path.join(__dirname, './emojione')

// Init file.
fs.writeFileSync(outputFile, '<div class="emoticons-pack">\n')

const files = fs.readdirSync(emoticonsPath)
files.map((file) => {
  fs.appendFileSync(outputFile, `  <img src="emoticons/emojione/${file}" />\n`);
})

// Finish writing data.
fs.appendFileSync(outputFile, '</div>');
