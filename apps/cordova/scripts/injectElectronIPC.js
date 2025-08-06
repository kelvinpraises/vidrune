// scripts/injectElectronIPC.js
module.exports = function (context) {
  if (!context.opts.platforms.includes("electron")) return;

  const fs = require("fs");
  const path = require("path");

  // Path to Cordova's generated main.js
  const mainPath = path.join(
    context.opts.projectRoot,
    "platforms/electron/platform_www/cdv-electron-main.js"
  );

  if (fs.existsSync(mainPath)) {
    let mainContent = fs.readFileSync(mainPath, "utf8");

    // Inject your IPC handlers
    const ipcCode = `
    const { runGemmaInference } = require('./inference/gemma.js');

    // Inject IPC handler
    ipcMain.handle('caption-image', async (event, imageData) => {
        return await runGemmaInference(imageData);
    });
    `;

    // Insert after existing requires
    mainContent = mainContent.replace(
      /const\s*\{[^}]*\}\s*=\s*require\('electron'\);/s,
      "$&" + ipcCode
    );

    fs.writeFileSync(mainPath, mainContent);
    console.log("✅ Injected IPC handlers into main.js");
  }
};
