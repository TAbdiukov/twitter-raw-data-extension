// Only run on profile pages
let currentPath = window.location.pathname;
let pathSegments = currentPath.split('/').filter(segment => segment);

// List of non-user paths (first segment)
const nonUserPaths = ['home', 'explore', 'notifications', 'messages', 'i', 'settings', 'logout', 'search', 'hashtag'];
// Allowed tabs under user profiles
const allowedTabs = ['with_replies', 'media', 'likes', 'lists', 'topics'];

// Function to initialize the panel
function initPanel() {
  // Remove existing panel if any
  const oldPanel = document.getElementById('raw-data-panel');
  if (oldPanel) oldPanel.remove();

  if (
    pathSegments.length > 0 &&
    !nonUserPaths.includes(pathSegments[0]) &&
    (pathSegments.length === 1 || (pathSegments.length === 2 && allowedTabs.includes(pathSegments[1])))
  ) {
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
      </style>
      <div style="background:${bgColor}; border:1px solid ${borderColor}; padding:15px; width:400px; border-radius:16px; box-shadow:0 4px 12px rgba(0,0,0,0.25);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
          <h3 style="margin:0; font-size:1.25rem; font-weight:700; color:${textColor};">Raw User Data</h3>
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
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const isSelectAll = (isMac && e.metaKey && e.key === 'a') || (!isMac && e.ctrlKey && e.key === 'a');
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
        .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)/g, (match) =>
          /:$/.test(match)
            ? `<span class="json-key">${match}</span>`
            : `<span class="json-string">${match}</span>`
        )
        .replace(/\b(true)\b/g, '<span class="json-boolean-true">$1</span>')
        .replace(/\b(false)\b/g, '<span class="json-boolean-false">$1</span>')
        .replace(/\b(null)\b/g, '<span class="json-null">$1</span>')
        .replace(/\b([0-9]+(\.[0-9]*)?(e[+-]?[0-9]*)?)\b/g, '<span class="json-number">$1</span>');
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
