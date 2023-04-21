// Name: OCR
// Description: Capture a screenshot and recognize the text using tesseract.js

import "@johnlindquist/kit";

const captureScreenshot = async () => {
    const tmpFile = `/tmp/screenshot-${Date.now()}.png`;
    await exec(`screencapture -i ${tmpFile}`);
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

const text = await recognizeText(filePath, selectedLanguage);

if (text) {
    await clipboard.writeText(text);
    await notify("Text recognized and copied to clipboard");
} else {
    await notify("No text found in the screenshot");
}

// Clean up temporary file
await remove(filePath);
