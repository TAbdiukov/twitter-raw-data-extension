File: .\background.js
```
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
```

File: .\content.js
```
// Only run on profile pages
let currentPath = window.location.pathname;
let pathSegments = currentPath.split('/').filter(segment => segment);

// List of non-user paths (first segment)
const nonUserPaths = ['home', 'explore', 'notifications', 'messages', 'i', 'settings', 'logout', 'search', 'hashtag'];

// Function to initialize the panel
function initPanel() {
  // Remove existing panel if any
  const oldPanel = document.getElementById('raw-data-panel');
  if (oldPanel) oldPanel.remove();

  // Check if we're on a user-related page (profile, tweet, media tab, etc.)
  const isUserPage = (
    pathSegments.length > 0 &&
    !nonUserPaths.includes(pathSegments[0]) &&
    // Either:
    // 1. Just the username (profile page)
    // 2. Username + tab (media, likes, etc.)
    // 3. Username + status + tweet ID (tweet page)
    // 4. Username + status + tweet ID + photo (photo in tweet)
    (pathSegments.length === 1 ||
     pathSegments.length === 2 ||
     (pathSegments.length >= 3 && pathSegments[1] === 'status'))
  );

  if (isUserPage) {
    const isDarkMode = true;

    const bgColor = isDarkMode ? '#15202b' : 'white';
    const textColor = isDarkMode ? 'white' : 'black';
    const borderColor = isDarkMode ? '#38444d' : '#ddd';
    const inputBgColor = isDarkMode ? '#253341' : 'white';
    const buttonColor = '#1da1f2';
    const buttonHoverColor = '#1a91da';
    const closeColor = isDarkMode ? '#8899a6' : '#657786';

    const username = pathSegments[0];

    const panelHTML = `
    <div id="raw-data-panel" style="position:fixed;top:10px;right:10px;z-index:10000;font-family:'TwitterChirp', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <style>
        .json-key { color: ${isDarkMode ? '#9cdcfe' : '#001080'}; }
        .json-string { color: ${isDarkMode ? '#d7ba7d' : '#a31515'}; }
        .json-boolean-true { color: ${isDarkMode ? '#6a9955' : '#098658'}; }
        .json-boolean-false { color: ${isDarkMode ? '#ce9178' : '#a31515'}; }
        .json-null { color: ${isDarkMode ? '#b267e6' : '#660099'}; }
        .json-number { color: ${isDarkMode ? '#b5cea8' : '#2b91af'}; }
        .panel-button {
          margin-top: 8px;
          padding: 0 16px;
          height: 36px;
          width: 100%;
          background-color: ${buttonColor};
          color: white;
          border: none;
          border-radius: 9999px;
          font-weight: 700;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .panel-button:hover {
          background-color: ${buttonHoverColor};
        }
        .panel-button:disabled {
          background-color: ${inputBgColor};
          color: ${textColor};
          opacity: 0.5;
          cursor: not-allowed;
        }
        .panel-logo {
          width: 24px;
          height: 24px;
          margin-right: 8px;
          vertical-align: middle;
        }
      </style>
      <div style="background:${bgColor}; border:1px solid ${borderColor}; padding:15px; width:400px; border-radius:16px; box-shadow:0 4px 12px rgba(0,0,0,0.25);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
          <div style="display:flex; align-items:center;">
            <img src="${chrome.runtime.getURL('/assets/icons/icon128.png')}" 
                 class="panel-logo" 
                 alt="Extension Logo">
            <h3 style="margin:0; font-size:1.25rem; font-weight:700; color:${textColor};">Raw User Data</h3>
          </div>
          <button id="close-btn" style="background:none; border:none; cursor:pointer; color:${closeColor}; font-size:1.25rem; padding:0;">✖</button>
        </div>
        <div style="margin-bottom:12px; display:flex; align-items:center;">
          <span style="color:${textColor};">Profile:</span>
          <strong style="color:${textColor}; margin-left:8px;">@${username}</strong>
        </div>

        <div id="data-content" style="max-height:400px; overflow:auto; font-family:monospace; background:${inputBgColor}; border-radius:8px; padding:12px; margin-bottom:15px; color:${textColor}; font-size:0.875rem; white-space: pre;"></div>

        <button id="copy-json-btn" class="panel-button" disabled>
          Copy JSON
        </button>

        <button id="fetch-btn" class="panel-button" style="margin-top:12px;">
          Fetch Data
        </button>
      </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', panelHTML);

    const dataContent = document.getElementById('data-content');
    dataContent.setAttribute('tabindex', '0');

    const fetchBtn = document.getElementById('fetch-btn');
    const copyJsonBtn = document.getElementById('copy-json-btn');
    const closeBtn = document.getElementById('close-btn');

    let lastJson = null;

    dataContent.addEventListener('keydown', e => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isSelectAll = (isMac && e.metaKey && e.key === 'a') ||
              (!isMac && e.ctrlKey && e.key === 'a');
    if (isSelectAll) {
      e.preventDefault();
      const sel = window.getSelection();
      sel.removeAllRanges();
      const range = document.createRange();
      range.selectNodeContents(dataContent);
      sel.addRange(range);
    }
    });

    const syntaxHighlight = (json) => {
      if (!json) return 'null';
      const jsonString = typeof json !== 'string' ? JSON.stringify(json, null, 1) : json;

      return jsonString
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Optimized regex for strings
        .replace(/("(\\["\\\/bfnrt]|\\u[a-fA-F0-9]{4}|[^"\\])*")(\s*:)?/g, (match, p1, p2, p3) => {
          if (p3) return `<span class="json-key">${p1}</span>:`;
          return `<span class="json-string">${p1}</span>`;
        })
        .replace(/\b(true)\b/g, '<span class="json-boolean-true">$1</span>')
        .replace(/\b(false)\b/g, '<span class="json-boolean-false">$1</span>')
        .replace(/\b(null)\b/g, '<span class="json-null">$1</span>')
        // Optimized regex for numbers
        .replace(/\b-?\d+(\.\d+)?([eE][+-]?\d+)?\b/g, '<span class="json-number">$&</span>');
    };

    const displayData = (data) => {
      try {
        lastJson = data;
        dataContent.innerHTML = syntaxHighlight(data);
        copyJsonBtn.disabled = false;
        copyJsonBtn.style.backgroundColor = buttonColor;
        copyJsonBtn.style.color = 'white';
      } catch (e) {
        dataContent.textContent = "Error formatting data";
        lastJson = null;
        copyJsonBtn.disabled = true;
        copyJsonBtn.style.backgroundColor = inputBgColor;
        copyJsonBtn.style.color = textColor;
      }
    };

    copyJsonBtn.addEventListener('click', async () => {
      if (!lastJson) return;
      try {
        await navigator.clipboard.writeText(JSON.stringify(lastJson, null, 2));
        copyJsonBtn.textContent = 'Copied!';
        setTimeout(() => (copyJsonBtn.textContent = 'Copy JSON'), 1500);
      } catch (e) {
        copyJsonBtn.textContent = 'Copy failed';
        setTimeout(() => (copyJsonBtn.textContent = 'Copy JSON'), 1500);
      }
    });

    fetchBtn.addEventListener('click', async () => {
      if (!username) return;
      dataContent.textContent = `Fetching data for: ${username}...`;

      chrome.runtime.sendMessage({ action: "getCookies", username }, async (response) => {
        if (response.error) {
          dataContent.textContent = response.error;
          return;
        }

        try {
          const qid = "sLVLhk0bGj3MVFEKTdax1w";
          const operationName = "UserByScreenName";
          const currentDomain = window.location.hostname;
          const url = `https://${currentDomain}/i/api/graphql/${qid}/${operationName}`;

          const variables = { "screen_name": username, "withSafetyModeUserFields": true };
          const features = {
            "c9s_tweet_anatomy_moderator_badge_enabled": true,
            "responsive_web_home_pinned_timelines_enabled": true,
            "blue_business_profile_image_shape_enabled": true,
            "creator_subscriptions_tweet_preview_api_enabled": true,
            "freedom_of_speech_not_reach_fetch_enabled": true,
            "graphql_is_translatable_rweb_tweet_is_translatable_enabled": true,
            "graphql_timeline_v2_bookmark_timeline": true,
            "hidden_profile_likes_enabled": true,
            "highlights_tweets_tab_ui_enabled": true,
            "interactive_text_enabled": true,
            "longform_notetweets_consumption_enabled": true,
            "longform_notetweets_inline_media_enabled": true,
            "longform_notetweets_rich_text_read_enabled": true,
            "longform_notetweets_richtext_consumption_enabled": true,
            "profile_foundations_tweet_stats_enabled": true,
            "profile_foundations_tweet_stats_tweet_frequency": true,
            "responsive_web_birdwatch_note_limit_enabled": true,
            "responsive_web_edit_tweet_api_enabled": true,
            "responsive_web_enhance_cards_enabled": false,
            "responsive_web_graphql_exclude_directive_enabled": true,
            "responsive_web_graphql_skip_user_profile_image_extensions_enabled": false,
            "responsive_web_graphql_timeline_navigation_enabled": true,
            "responsive_web_media_download_video_enabled": false,
            "responsive_web_text_conversations_enabled": false,
            "responsive_web_twitter_article_data_v2_enabled": true,
            "responsive_web_twitter_article_tweet_consumption_enabled": false,
            "responsive_web_twitter_blue_verified_badge_is_enabled": true,
            "rweb_lists_timeline_redesign_enabled": true,
            "spaces_2022_h2_clipping": true,
            "spaces_2022_h2_spaces_communities": true,
            "standardized_nudges_misinfo": true,
            "subscriptions_verification_info_verified_since_enabled": true,
            "tweet_awards_web_tipping_enabled": false,
            "tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled": true,
            "tweetypie_unmention_optimization_enabled": true,
            "verified_phone_label_enabled": false,
            "vibe_api_enabled": true,
            "view_counts_everywhere_api_enabled": true
          };

          const params = new URLSearchParams({
            variables: JSON.stringify(variables),
            features: JSON.stringify(features)
          });

          const apiResponse = await fetch(`${url}?${params}`, {
            headers: {
              'Authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
              'X-Csrf-Token': response.ct0,
              'Cookie': `auth_token=${response.authToken}; ct0=${response.ct0}`
            }
          });

          const data = await apiResponse.json();
          const userResult = data?.data?.user?.result;
          displayData(userResult || data);
        } catch (error) {
          dataContent.textContent = `Error: ${error.message}`;
        }
      });
    });

    closeBtn.addEventListener('click', () => {
      document.getElementById('raw-data-panel').style.display = 'none';
    });
  }
}

// Initialize panel for current page
initPanel();

// Detect page changes (SPA navigation)
const observer = new MutationObserver(() => {
  const newPath = window.location.pathname;
  if (newPath !== currentPath) {
    currentPath = newPath;
    pathSegments = newPath.split('/').filter(segment => segment);
    initPanel();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  characterData: true
});

```

File: .\manifest.json
```
{
  "manifest_version": 3,
  "name": "Twitter Raw Data Inspector",
  "version": "1.0",
  "description": "Displays raw Twitter user data on profile pages",
  "permissions": ["cookies", "scripting", "activeTab"],
  "host_permissions": ["*://*.twitter.com/*", "*://*.x.com/*"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://twitter.com/*", "https://x.com/*"],
      "js": ["content.js"],
      "run_at": "document_end"
    }
  ],
  "web_accessible_resources": [
    {
	  "resources": [
        "panel.html", 
        "panel.js",
        "/assets/icons/icon128.png"
      ],
      "matches": ["<all_urls>"]
    }
  ],
  "action": {
    "default_icon": {
      "16": "/assets/icons/icon16.png",
      "48": "/assets/icons/icon48.png"
    }
  },
  "icons": {
    "16": "/assets/icons/icon16.png",
    "48": "/assets/icons/icon48.png",
    "128": "/assets/icons/icon128.png"
  }
}

```

File: .\panel.html
```
<div id="data-container" style="display:none;">
  <div style="background:#fff; border:1px solid #ccc; padding:10px; max-width:400px;">
    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
      <h3 style="margin:0;">Raw User Data</h3>
      <button id="close-btn" style="background:none; border:none; cursor:pointer;">✖</button>
    </div>
    <div id="data-content" style="max-height:400px; overflow:auto; font-family:monospace;"></div>
    <button id="fetch-btn" style="margin-top:10px; padding:5px 10px;">Fetch Data</button>
  </div>
</div>

```

File: .\panel.js
```
document.addEventListener('DOMContentLoaded', () => {
  const dataContainer = document.getElementById('data-container');
  const dataContent = document.getElementById('data-content');
  const fetchBtn = document.getElementById('fetch-btn');
  const closeBtn = document.getElementById('close-btn');

  // Extract username from URL
  const getUsername = () => {
    const path = window.location.pathname;
    return path.split('/')[1].replace('@', '');
  };

  // Display data in readable format
  const displayData = (data) => {
    try {
      dataContent.textContent = JSON.stringify(data, null, 2);
    } catch (e) {
      dataContent.textContent = "Error formatting data";
    }
  };

  // Fetch user data from Twitter API
  const fetchUserData = async () => {
    const username = getUsername();
    if (!username) return;

    dataContent.textContent = "Fetching data...";

    chrome.runtime.sendMessage(
      { action: "getCookies", username },
      async (bgResponse) => {
        if (bgResponse.error) {
          dataContent.textContent = bgResponse.error;
          return;
        }

        try {
          const qid = "sLVLhk0bGj3MVFEKTdax1w";
          const operationName = "UserByScreenName";

          const currentDomain = window.location.hostname;
          const url = `https://${currentDomain}/i/api/graphql/${qid}/${operationName}`;

          const variables = {
            "screen_name": username,
            "withSafetyModeUserFields": true
          };

        const features = {
            "c9s_tweet_anatomy_moderator_badge_enabled": true,
            "responsive_web_home_pinned_timelines_enabled": true,
            "blue_business_profile_image_shape_enabled": true,
            "creator_subscriptions_tweet_preview_api_enabled": true,
            "freedom_of_speech_not_reach_fetch_enabled": true,
            "graphql_is_translatable_rweb_tweet_is_translatable_enabled": true,
            "graphql_timeline_v2_bookmark_timeline": true,
            "hidden_profile_likes_enabled": true,
            "highlights_tweets_tab_ui_enabled": true,
            "interactive_text_enabled": true,
            "longform_notetweets_consumption_enabled": true,
            "longform_notetweets_inline_media_enabled": true,
            "longform_notetweets_rich_text_read_enabled": true,
            "longform_notetweets_richtext_consumption_enabled": true,
            "profile_foundations_tweet_stats_enabled": true,
            "profile_foundations_tweet_stats_tweet_frequency": true,
            "responsive_web_birdwatch_note_limit_enabled": true,
            "responsive_web_edit_tweet_api_enabled": true,
            "responsive_web_enhance_cards_enabled": false,
            "responsive_web_graphql_exclude_directive_enabled": true,
            "responsive_web_graphql_skip_user_profile_image_extensions_enabled": false,
            "responsive_web_graphql_timeline_navigation_enabled": true,
            "responsive_web_media_download_video_enabled": false,
            "responsive_web_text_conversations_enabled": false,
            "responsive_web_twitter_article_data_v2_enabled": true,
            "responsive_web_twitter_article_tweet_consumption_enabled": false,
            "responsive_web_twitter_blue_verified_badge_is_enabled": true,
            "rweb_lists_timeline_redesign_enabled": true,
            "spaces_2022_h2_clipping": true,
            "spaces_2022_h2_spaces_communities": true,
            "standardized_nudges_misinfo": true,
            "subscriptions_verification_info_verified_since_enabled": true,
            "tweet_awards_web_tipping_enabled": false,
            "tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled": true,
            "tweetypie_unmention_optimization_enabled": true,
            "verified_phone_label_enabled": false,
            "vibe_api_enabled": true,
            "view_counts_everywhere_api_enabled": true
        };

          const params = new URLSearchParams({
            'variables': JSON.stringify(variables),
            'features': JSON.stringify(features)
          });

          const apiResponse = await fetch(`${url}?${params}`, {
            headers: {
              'Authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
              'X-Csrf-Token': bgResponse.ct0,
              'Cookie': `auth_token=${bgResponse.authToken}; ct0=${bgResponse.ct0}`
            }
          });

          const data = await apiResponse.json();
          const userResult = data?.data?.user?.result;

          if (!apiResponse.ok) {
            throw new Error(`HTTP error ${apiResponse.status}`);
          }

          if (!userResult) {
            throw new Error("User data not found");
          }

          displayData(userResult);
        } catch (error) {
          dataContent.textContent = `Error: ${error.message}`;
        }
      }
    );
  };

  // Event Listeners
  fetchBtn.addEventListener('click', fetchUserData);
  closeBtn.addEventListener('click', () => {
    dataContainer.style.display = 'none';
  });

  // Initial setup
  dataContainer.style.display = 'block';
});

```
