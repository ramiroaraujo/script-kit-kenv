// Name: Smaller screenshot

import '@johnlindquist/kit';

const Jimp = await npm('jimp');

const buffer = await clipboard.readImage();
const image = await Jimp.read(buffer);

// Get the original dimensions
const height = image.bitmap.height;

// Resize the image to 50% of its original dimensions
const resizedImage = image.resize(Jimp.AUTO, Math.round(height * 0.5));

// Get the modified buffer (e.g., in PNG format)
const resizedBuffer = await resizedImage.getBufferAsync(Jimp.MIME_PNG);

//copy it back to the clipboard
await clipboard.writeImage(resizedBuffer);

notify('Smaller screenshot copied to clipboard');
