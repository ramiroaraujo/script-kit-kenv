// Name: convert selected images

import "@johnlindquist/kit";

// Grab selected files
const files = (await getSelectedFile()).split("\n");

// Set up whitelist of formats
const supportedFormats = [".heic", ".png", ".gif", ".webp", ".jpg", ".jpeg"];

// Filter files based on supported formats
const selectedFiles = files.filter(file =>
  supportedFormats.some(format => file.toLowerCase().endsWith(format))
);

// Notify if no files are selected
if (!selectedFiles.length) {
  notify("No supported files selected");
  exit();
}

const convertHeic = await npm("heic-convert");
const sharp = await npm("sharp");

// Select the output format
const outputFormat = await arg("Choose an output format", [
  "jpg",
  "png",
  "webp",
]);

const getUniquePath = async (outputPath: string, suffix = "") => {
  if (await isFile(outputPath)) {
    const name = path.basename(outputPath, path.extname(outputPath));
    const newName = `${name}${suffix}-copy${path.extname(outputPath)}`;
    const newPath = path.join(path.dirname(outputPath), newName);
    return await getUniquePath(newPath, `${suffix}-copy`);
  } else {
    return outputPath;
  }
};

// Convert selected files to the chosen output format using appropriate libraries
for (const file of selectedFiles) {
  const content = await readFile(file);
  const name = path.basename(file).split(".")[0];
  const outputPath = path.join(path.dirname(file), name + `.${outputFormat}`);

  const uniqueOutputPath = await getUniquePath(outputPath);

  if (file.toLowerCase().endsWith(".heic")) {
    const formatMap = {
      jpg: "JPEG",
      png: "PNG",
    }
    const outputBuffer = await convertHeic({
      buffer: content,
      format: formatMap[outputFormat],
      quality: 0.5,
    });

    await writeFile(uniqueOutputPath, outputBuffer);
  } else {
    const sharpImage = sharp(content);

    switch (outputFormat) {
      case "jpg":
        await sharpImage.jpeg({ quality: 40 }).toFile(uniqueOutputPath);
        break;
      case "png":
        await sharpImage.png().toFile(uniqueOutputPath);
        break;
      case "webp":
        await sharpImage.webp({ quality: 40 }).toFile(uniqueOutputPath);
        break;
    }
  }
}

notify(`Converted selected files to ${outputFormat.toUpperCase()}`);
