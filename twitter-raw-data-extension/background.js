chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getCookies") {
    getTwitterCookies(request.username, sendResponse);
    return true; // Indicates async response
  }
});

async function getTwitterCookies(username, sendResponse) {
  try {
    // Try x.com domain first
    let cookies = await chrome.cookies.getAll({ domain: ".x.com" });

    // If no cookies found, try twitter.com
    if (cookies.length === 0) {
      cookies = await chrome.cookies.getAll({ domain: ".twitter.com" });
    }

    const ct0 = cookies.find(c => c.name === "ct0")?.value;
    const authToken = cookies.find(c => c.name === "auth_token")?.value;

    // Detailed error messages
    if (!ct0 && !authToken) {
      sendResponse({ error: "Required cookies not found (ct0 and auth_token). Are you logged in to X?" });
    } else if (!ct0) {
      sendResponse({ error: "Required cookie not found: ct0 . Are you logged in to X?" });
    } else if (!authToken) {
      sendResponse({ error: "Required cookie not found: auth_token . Are you logged in to X?" });
    } else {
      sendResponse({ ct0, authToken, username });
    }
  } catch (error) {
    sendResponse({ error: `Cookie retrieval failed: ${error.message}` });
  }
}