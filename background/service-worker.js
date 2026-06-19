function escapeXML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Set initial instruction when user types "b "
chrome.omnibox.onInputStarted.addListener(() => {
  chrome.omnibox.setDefaultSuggestion({
    description: 'Type a keyword to search your Keyworder'
  });
});

// On omnibox input changed (typing)
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  chrome.storage.local.get(['bookmarks'], (result) => {
    const bookmarks = result.bookmarks || {};
    const textLower = text.toLowerCase().trim();
    const suggestions = [];

    if (!textLower) {
      chrome.omnibox.setDefaultSuggestion({
        description: 'Type a keyword to search your Keyworder'
      });
      return;
    }
    
    for (const [keyword, data] of Object.entries(bookmarks)) {
      if (keyword.includes(textLower)) {
        suggestions.push({
          content: keyword,
          description: `<match>${escapeXML(keyword)}</match> - <url>${escapeXML(data.url)}</url>`
        });
      }
    }
    
    // Sort suggestions to prioritize items that start with the text, then by length
    suggestions.sort((a, b) => {
      const aStarts = a.content.startsWith(textLower);
      const bStarts = b.content.startsWith(textLower);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.content.length - b.content.length;
    });

    if (suggestions.length > 0) {
      const bestMatch = suggestions[0];
      // Set the very best match as the default top suggestion
      chrome.omnibox.setDefaultSuggestion({
        description: `Go to: <match>${escapeXML(bestMatch.content)}</match> - <url>${escapeXML(bookmarks[bestMatch.content].url)}</url>`
      });
      
      // Pass the remaining suggestions to the dropdown
      suggest(suggestions.slice(1));
    } else {
      chrome.omnibox.setDefaultSuggestion({
        description: `Search Google for: <match>${escapeXML(text)}</match>`
      });
      suggest([]);
    }
  });
});

// On omnibox enter
chrome.omnibox.onInputEntered.addListener((text) => {
  chrome.storage.local.get(['bookmarks'], (result) => {
    const bookmarks = result.bookmarks || {};
    const textLower = text.toLowerCase().trim();
    
    // 1. Check for exact match first (if they used arrow keys to select a suggestion, it will be exact)
    if (bookmarks[textLower]) {
      chrome.tabs.update({ url: bookmarks[textLower].url });
      return;
    }
    
    // 2. If no exact match (they just pressed Enter on their search string), find the best partial match
    const matches = Object.keys(bookmarks).filter(k => k.includes(textLower));
    if (matches.length > 0) {
      matches.sort((a, b) => {
        const aStarts = a.startsWith(textLower);
        const bStarts = b.startsWith(textLower);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.length - b.length;
      });
      
      chrome.tabs.update({ url: bookmarks[matches[0]].url });
    } else {
      // 3. Fallback: Google search
      chrome.tabs.update({ url: `https://www.google.com/search?q=${encodeURIComponent(text)}` });
    }
  });
});
