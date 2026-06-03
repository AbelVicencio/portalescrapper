"use strict";
(() => {
  // src/storage/store.ts
  var STORAGE_KEY = "portalescrapper_articles";
  async function getAllArticles() {
    const res = await chrome.storage.local.get(STORAGE_KEY);
    return res[STORAGE_KEY] || [];
  }
  async function saveArticle(article) {
    const existing = await getAllArticles();
    const without = existing.filter((a) => a.id !== article.id);
    without.unshift(article);
    await chrome.storage.local.set({ [STORAGE_KEY]: without });
  }
  async function deleteArticle(id) {
    const list = await getAllArticles();
    const filtered = list.filter((a) => a.id !== id);
    await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
  }
  async function clearAll() {
    await chrome.storage.local.remove(STORAGE_KEY);
  }
  async function updateBadge(count) {
    await chrome.action.setBadgeText({ text: "" });
  }

  // src/background/service-worker.ts
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
  });
  var HANDLED_MESSAGE_TYPES = [
    "SAVE_ARTICLE",
    "GET_ALL_ARTICLES",
    "DELETE_ARTICLE",
    "CLEAR_ALL",
    "EXPORT_JSON",
    "EXPORT_CSV",
    "GRABAR_API",
    "EXTRACT_ARTICLE",
    "GET_CLEAN_SNAPSHOT"
  ];
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || !HANDLED_MESSAGE_TYPES.includes(msg.type)) {
      return false;
    }
    (async () => {
      try {
        switch (msg.type) {
          case "SAVE_ARTICLE": {
            await saveArticle(msg.payload);
            await updateBadge();
            sendResponse({ ok: true, type: "ARTICLE_SAVED", payload: { id: msg.payload.id } });
            break;
          }
          case "GET_ALL_ARTICLES": {
            const list = await getAllArticles();
            sendResponse({ ok: true, type: "ALL_ARTICLES", payload: list });
            break;
          }
          case "DELETE_ARTICLE": {
            await deleteArticle(msg.payload.id);
            await updateBadge();
            sendResponse({ ok: true });
            break;
          }
          case "CLEAR_ALL": {
            await clearAll();
            await updateBadge(0);
            sendResponse({ ok: true });
            break;
          }
          case "EXPORT_JSON":
          case "EXPORT_CSV": {
            sendResponse({ ok: true });
            break;
          }
          case "GRABAR_API": {
            await saveArticle(msg.payload);
            await updateBadge();
            sendResponse({ ok: true });
            break;
          }
          case "EXTRACT_ARTICLE": {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
              chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_NOW" }).catch(() => {
              });
            }
            sendResponse({ ok: true });
            break;
          }
          case "GET_CLEAN_SNAPSHOT": {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) {
              throw new Error("No active tab found");
            }
            const response = await chrome.tabs.sendMessage(tab.id, {
              type: "GET_CLEAN_SNAPSHOT",
              payload: msg.payload
            });
            sendResponse({ ok: true, payload: response });
            break;
          }
        }
      } catch (e) {
        sendResponse({ ok: false, error: e?.message || String(e) });
      }
    })();
    return true;
  });
  chrome.tabs.onActivated.addListener(() => {
    updateBadge();
  });
  chrome.runtime.onInstalled.addListener(() => {
    updateBadge();
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
    });
  });
  chrome.action.onClicked.addListener(async (tab) => {
    if (tab.id) {
      await chrome.sidePanel.open({ tabId: tab.id }).catch(() => {
      });
    }
  });
})();
//# sourceMappingURL=service-worker.js.map
