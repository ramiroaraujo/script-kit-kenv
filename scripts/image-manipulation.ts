// Name: Image Manipulation

import '@johnlindquist/kit';

notify({ title: 'Image Manipulation', message: 'Coming soon...' });

// ## Idea
// Get selected images, perform select multiple operations to perform on them, and then save them
// Extra options:
// - Save to a new folder
// - Save to clipboard
// - Save as a copy (in the same folder)

// ## Operations
// - Resize
// - Crop
// - Rotate
// - Flip
// - Convert to other formats

// ## Some gotchas
// Some operations could be processor intensive, so we should figure out a way to show progress (notifications?)
// Probably overkill, but a preview would be nice, maybe only for small images, or a preview of the first image
// Operations should be performed at the end
// Warn if the image/s is/are too big. Also warn if HEIC images are selected, since they _slow_ to process
// One option could be to run them on the background, but I don't see a way of doing it with workers. It could be done
//   via command line, capturing the pid like `sleep 10 & disown`
//   but that would mean using cli tools for the manipulation, and not JS
//   probably faster, but less portable
//   on the bright side, we can run each transformation on a different thread
// Check `kit` source code for form handling, will be useful for resize and crop operations
