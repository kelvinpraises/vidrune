#!/usr/bin/env node
const shell = require("shelljs");
const fs = require("fs");
const path = require("path");

// Change to client directory and build
const clientDir = path.join(__dirname, "../../client");
process.chdir(clientDir);

// Build Vite app
shell.exec("npm run build");

async function processFiles() {
  // Get paths for cordova www directory
  const cordovaDir = path.join(__dirname, "..");
  const cordovaWwwDir = path.join(cordovaDir, "www");
  const clientOutDir = path.join(clientDir, "dist");

  // Delete cordova www dir
  if (fs.existsSync(cordovaWwwDir)) {
    fs.rmSync(cordovaWwwDir, { recursive: true, force: true });
    console.log('Deleted cordova "www" directory');
  }

  // Copy client dist to cordova www
  if (fs.existsSync(clientOutDir)) {
    fs.renameSync(clientOutDir, cordovaWwwDir);
    console.log('Moved client "/dist/" to cordova "/www/"');
  }

  // Fix HTML files: change absolute paths to relative paths
  const htmlFiles = getAllFiles(cordovaWwwDir, [".html"]);
  htmlFiles.forEach((file) => {
    let content = fs.readFileSync(file, "utf8");
    let modified = false;

    content = content.replace(/(?:src|href)="\/([^"]+)"/g, (match, path) => {
      modified = true;
      return match.replace(`"/${path}"`, `"./${path}"`);
    });

    if (modified) {
      fs.writeFileSync(file, content, "utf8");
      console.log(`Fixed paths in: ${path.relative(cordovaWwwDir, file)}`);
    }
  });

  // Fix JS files based on specific rules
  const jsFiles = getAllFiles(cordovaWwwDir, [".js"]);
  jsFiles.forEach((file) => {
    let content = fs.readFileSync(file, "utf8");
    const originalContent = content;

    // Rule 1: if you see src:"/ simply add src:"./
    content = content.replaceAll('src:"/', 'src:"./');

    // Rule 2: if you see "/earth-night.jpg" or "/earth-day.jpg" change to "./"
    content = content.replaceAll("/earth-night.jpg", "./earth-night.jpg");
    content = content.replaceAll("/earth-day.jpeg", "./earth-day.jpeg");

    // Rule 3: if you see URL("/assets/ change to URL("./"
    content = content.replaceAll('URL("/assets/', 'URL("./');

    if (content !== originalContent) {
      fs.writeFileSync(file, content, "utf8");
      console.log(`Fixed JS asset paths in: ${path.relative(cordovaWwwDir, file)}`);
    }
  });

  console.log("Build and path processing completed!");
}

// Get all files recursively with specified extensions
function getAllFiles(dirPath, extensions) {
  const files = [];

  function traverse(dir) {
    const entries = fs.readdirSync(dir);

    entries.forEach((entry) => {
      const fullPath = path.join(dir, entry);

      if (fs.statSync(fullPath).isDirectory()) {
        traverse(fullPath);
      } else if (extensions.includes(path.extname(entry))) {
        files.push(fullPath);
      }
    });
  }

  traverse(dirPath);
  return files;
}

processFiles();
