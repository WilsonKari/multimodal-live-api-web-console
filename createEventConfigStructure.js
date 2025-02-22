const fs = require('fs');
const path = require('path');

const basePath = 'src/components/event-config';

const directories = [
  `${basePath}/EventConfigList`,
  `${basePath}/EventConfigList/EventCard`,
  `${basePath}/EventConfigList/EventCard/EventConfigModal`,
];

const files = [
  `${basePath}/EventConfigList/EventConfigList.tsx`,
  `${basePath}/EventConfigList/EventConfigList.scss`,
  `${basePath}/EventConfigList/EventCard/EventCard.tsx`,
  `${basePath}/EventConfigList/EventCard/EventCard.scss`,
  `${basePath}/EventConfigList/EventCard/EventConfigModal/EventConfigModal.tsx`,
  `${basePath}/EventConfigList/EventCard/EventConfigModal/EventConfigModal.scss`,
];

function createDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  } else {
    console.log(`Directory already exists: ${dirPath}`);
  }
}

function createFile(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '// ' + filePath);
    console.log(`Created file: ${filePath}`);
  } else {
    console.log(`File already exists: ${filePath}`);
  }
}

// Create base directory
createDirectory(basePath);

// Create directories
directories.forEach(createDirectory);

// Create files
files.forEach(createFile);

console.log('Directory and file structure created successfully!');
