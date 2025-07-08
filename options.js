// options.js
document.getElementById("save").addEventListener("click", () => {
  const key = document.getElementById("apikey").value.trim();
  chrome.storage.sync.set({ OPENAI_API_KEY: key }, () => {
    document.getElementById("status").innerText = "✅ 저장됨!";
    setTimeout(() => document.getElementById("status").innerText = "", 1500);
  });
});

window.onload = () => {
  chrome.storage.sync.get("OPENAI_API_KEY", (data) => {
    if (data.OPENAI_API_KEY) {
      document.getElementById("apikey").value = data.OPENAI_API_KEY;
    }
  });
};