// Name: OCR
// Description: Capture a screenshot and recognize the text using tesseract.js

import "@johnlindquist/kit";

//both win and linux implementations were created by chatgpt (gpt4), without _any_ tests!! 😅
const captureScreenshot = async () => {
    const tmpFile = `/tmp/screenshot-${Date.now()}.png`;

    if (isMac) {
        await exec(`screencapture -i ${tmpFile}`);
    } else if (isWin) {
        const psScript = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait('%{PRTSC}')
      Start-Sleep -m 500
      $clipboardData = Get-Clipboard -Format Image
      $clipboardData.Save('${tmpFile}', [System.Drawing.Imaging.ImageFormat]::Png)
    `;
        await exec(`powershell -Command "${psScript.replace(/\n/g, '')}"`);
    } else if (isLinux) {
        // Check if gnome-screenshot is available
        try {
            await exec('gnome-screenshot --version');
            await exec(`gnome-screenshot -f ${tmpFile}`);
        } catch (error) {
            // If gnome-screenshot is not available, try using ImageMagick's 'import' command
            await exec(`import ${tmpFile}`);
        }
    }

    return tmpFile;
};

const recognizeText = async (filePath, language) => {
    const { createWorker } = await npm("tesseract.js");
    const worker = await createWorker();

    await worker.loadLanguage(language);
    await worker.initialize(language);

    const { data } = await worker.recognize(filePath);

    await worker.terminate();

    return data.text;
};

const languages = [
    { name: "Spanish", value: "spa" },
    { name: "French", value: "fra" },
    { name: "Portuguese", value: "por" },
    { name: "English", value: "eng" },
];
//@todo train a model for typescript (https://github.com/tesseract-ocr/tesstrain)

// if ctrl is pressed, show a modal to select a language
const selectedLanguage = flag.ctrl
    ? await arg("Select a language:", languages)
    : "eng";

// Hide the Kit modal before capturing the screenshot
await hide();

const filePath = await captureScreenshot();
if (!await pathExists(filePath)) exit()

const text = await recognizeText(filePath, selectedLanguage);

if (text) {
    await clipboard.writeText(text.trim());
    notify("Text recognized and copied to clipboard");
} else {
    notify("No text found in the screenshot");
}

// Clean up temporary file
await remove(filePath);
