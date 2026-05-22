import * as storage from '../storage/store';

// Make the toolbar icon open the Side Panel automatically (required for side panel extensions)
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

let port: chrome.runtime.Port | null = null;

async function connectToSidePanel() {
  if (port) return port;
  try {
    // Side panel opens via chrome.sidePanel.open; service worker only routes messages.
    // Port is mainly used for keep-alive in long sessions (optional).
  } catch {}
  return port;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      switch (msg.type) {
        case 'SAVE_ARTICLE': {
          await storage.saveArticle(msg.payload);
          await storage.updateBadge();
          sendResponse({ ok: true, type: 'ARTICLE_SAVED', payload: { id: msg.payload.id } });
          break;
        }
        case 'GET_ALL_ARTICLES': {
          const list = await storage.getAllArticles();
          sendResponse({ ok: true, type: 'ALL_ARTICLES', payload: list });
          break;
        }
        case 'DELETE_ARTICLE': {
          await storage.deleteArticle(msg.payload.id);
          await storage.updateBadge();
          sendResponse({ ok: true });
          break;
        }
        case 'CLEAR_ALL': {
          await storage.clearAll();
          await storage.updateBadge(0);
          sendResponse({ ok: true });
          break;
        }
        case 'EXPORT_JSON':
        case 'EXPORT_CSV': {
          // Handled by side panel directly (storage read + download)
          sendResponse({ ok: true });
          break;
        }
        case 'GRABAR_API': {
          // Side panel should perform the HTTP call after storing draft locally
          // We still update local store from SW as secondary backup
          await storage.saveArticle(msg.payload);
          await storage.updateBadge();
          sendResponse({ ok: true });
          break;
        }
        case 'EXTRACT_ARTICLE': {
          // Forward to active content script tab
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab?.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_NOW' });
          }
          sendResponse({ ok: true });
          break;
        }
      }
    } catch (e: any) {
      sendResponse({ ok: false, error: e?.message || String(e) });
    }
  })();
  return true; // async response
});

chrome.tabs.onActivated.addListener(() => {
  storage.updateBadge();
});

chrome.runtime.onInstalled.addListener(() => {
  storage.updateBadge();
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
  }
});

export {};
