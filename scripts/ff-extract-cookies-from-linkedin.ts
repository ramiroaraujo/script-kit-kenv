// Name: ff Extract Cookies from LinkedIn

import "@johnlindquist/kit";

// Read the clipboard for cookies in JSON format
const cookiesJson = await clipboard.readText();

// Parse the JSON
let cookies;

try {
    cookies = JSON.parse(cookiesJson);
} catch (e) {
    notify("The clipboard does not contain a valid JSON.");
    exit();
}

// Filter out cookies that are not from LinkedIn or do not have the required names
cookies = cookies.filter(cookie =>
    cookie.domain.indexOf('.linkedin.com') > -1 && (cookie.name === "li_a" || cookie.name === "li_at")
);

// Check if we have found the required cookies
if (cookies.length === 0) {
    notify("No LinkedIn cookies found in the provided JSON.");
    exit();
}

// Construct the cookie string
const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join("; ");

// Copy the string to the clipboard
await clipboard.writeText(cookieString);

// Notify the user
notify("The LinkedIn cookies have been copied to the clipboard.");
