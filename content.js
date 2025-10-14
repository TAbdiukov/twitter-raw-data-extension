// Only run on profile pages
const path = window.location.pathname;
const pathSegments = path.split('/').filter(segment => segment);

if (pathSegments.length === 1) {
  // Detect dark mode (Twitter is always dark now)
  const isDarkMode = true;

  // Colors
  const bgColor = isDarkMode ? '#15202b' : 'white';
  const textColor = isDarkMode ? 'white' : 'black';
  const borderColor = isDarkMode ? '#38444d' : '#ddd';
  const inputBgColor = isDarkMode ? '#253341' : 'white';
  const buttonColor = isDarkMode ? '#1da1f2' : '#1da1f2';
  const buttonHoverColor = isDarkMode ? '#1a91da' : '#1a91da';
  const closeColor = isDarkMode ? '#8899a6' : '#657786';

  // Inject panel UI
  const panelHTML = `
  <div id="raw-data-panel" style="position:fixed;top:10px;right:10px;z-index:10000;font-family:'TwitterChirp', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <div style="background:${bgColor}; border:1px solid ${borderColor}; padding:15px; width:400px; border-radius:16px; box-shadow:0 4px 12px rgba(0,0,0,0.25);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <h3 style="margin:0; font-size:1.25rem; font-weight:700; color:${textColor};">Raw User Data</h3>
        <button id="close-btn" style="background:none; border:none; cursor:pointer; color:${closeColor}; font-size:1.25rem; padding:0;">✖</button>
      </div>

      <div id="data-content" style="max-height:400px; overflow:auto; font-family:monospace; background:${inputBgColor}; border-radius:8px; padding:12px; margin-bottom:15px; color:${textColor}; font-size:0.875rem;"></div>

      <button id="fetch-btn" style="margin-top:0; padding:0 16px; height:36px; width:100%; background-color:${buttonColor}; color:white; border:none; border-radius:9999px; font-weight:700; cursor:pointer; transition:background-color 0.2s;">
        Fetch Data
      </button>
    </div>
  </div>
  `;

  document.body.insertAdjacentHTML('beforeend', panelHTML);

  // Add functionality
  const dataContent = document.getElementById('data-content');
  const fetchBtn = document.getElementById('fetch-btn');
  const closeBtn = document.getElementById('close-btn');

  // Add button hover effect
  fetchBtn.addEventListener('mouseenter', () => {
    fetchBtn.style.backgroundColor = buttonHoverColor;
  });

  fetchBtn.addEventListener('mouseleave', () => {
    fetchBtn.style.backgroundColor = buttonColor;
  });

  const getUsername = () => {
    return window.location.pathname.split('/')[1].replace('@', '');
  };

  const displayData = (data) => {
    try {
      dataContent.textContent = JSON.stringify(data, null, 2);
    } catch (e) {
      dataContent.textContent = "Error formatting data";
    }
  };

  fetchBtn.addEventListener('click', async () => {
    const username = getUsername();
    if (!username) return;

    dataContent.textContent = `Fetching data for: ${username}...`;

    chrome.runtime.sendMessage(
      { action: "getCookies", username },
      async (response) => {
        if (response.error) {
          dataContent.textContent = response.error;
          return;
        }

        try {
          const qid = "sLVLhk0bGj3MVFEKTdax1w";
          const operationName = "UserByScreenName";

		  // Use current domain for API request
		  const currentDomain = window.location.hostname;
          const url = `https://${currentDomain}/i/api/graphql/${qid}/${operationName}`;

          const variables = {"screen_name": username, "withSafetyModeUserFields": true};
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
      }
    );
  });

  closeBtn.addEventListener('click', () => {
    document.getElementById('raw-data-panel').style.display = 'none';
  });
}