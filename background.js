// background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.runtime.openOptionsPage();
});