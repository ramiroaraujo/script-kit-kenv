// Name: OCR
// Description: Capture a screenshot and recognize the text using tesseract.js

import "@johnlindquist/kit";

const captureScreenshot = async () => {
    const tmpFile = `/tmp/screenshot-${Date.now()}.png`;
    await exec(`screencapture -i ${tmpFile}`);
    return tmpFile;
};

const recognizeText = async (filePath) => {
    const { createWorker } = await npm("tesseract.js");
    const worker = await createWorker({
        logger: (m) => console.log(m),
    });

    await worker.load();
    await worker.loadLanguage("eng");
    await worker.initialize("eng");

    const { data } = await worker.recognize(filePath);

    await worker.terminate();

    return data.text;
};

//wait for 1000ms to allow the screenshot to be taken

await wait(1000)
const filePath = await captureScreenshot();
const text = await recognizeText(filePath);

if (text) {
    await clipboard.writeText(text);
    await notify("Text recognized and copied to clipboard");
} else {
    await notify("No text found in the screenshot");
}

// Clean up temporary file
await remove(filePath);
