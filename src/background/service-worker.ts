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

const HANDLED_MESSAGE_TYPES = [
  'SAVE_ARTICLE',
  'GET_ALL_ARTICLES',
  'DELETE_ARTICLE',
  'CLEAR_ALL',
  'EXPORT_JSON',
  'EXPORT_CSV',
  'GRABAR_API',
  'EXTRACT_ARTICLE',
  'GET_CLEAN_SNAPSHOT',
  'PRINT_TAB_TO_PDF'
];

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !HANDLED_MESSAGE_TYPES.includes(msg.type)) {
    return false; // Evita mantener abierto el puerto de forma indefinida para otros contextos
  }

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
            chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_NOW' }).catch(() => {});
          }
          sendResponse({ ok: true });
          break;
        }
        case 'GET_CLEAN_SNAPSHOT': {
          // Forward to active content script tab and return response
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab?.id) {
            throw new Error('No active tab found');
          }
          const response = await chrome.tabs.sendMessage(tab.id, { 
            type: 'GET_CLEAN_SNAPSHOT', 
            payload: msg.payload 
          });
          sendResponse({ ok: true, payload: response });
          break;
        }
        case 'PRINT_TAB_TO_PDF': {
          // Use Chrome Debugger Protocol to generate a real-text PDF from the snapshot tab
          const tabId: number = msg.payload.tabId;
          const debugTarget = { tabId };

          await chrome.debugger.attach(debugTarget, '1.3');
          try {
            // Enable required domains
            await chrome.debugger.sendCommand(debugTarget, 'Page.enable', {});
            await chrome.debugger.sendCommand(debugTarget, 'Runtime.enable', {});

            // Prepare images for PDF:
            // - Hero photo: downscale via canvas (JPEG 50%, max 700x260). CSS fallback if CORS blocks it.
            // - Inline body images: strip (duplicates / large base64 embeds).
            // - Portal logo: keep as-is (in .portal-top-bar).
            const stripScript = [
              '(function(){',
              '  function downscaleImg(img, maxW, maxH, quality) {',
              '    try {',
              '      if(!img || !img.complete || !img.naturalWidth) return false;',
              '      // Keep full aspect ratio - no crop',
              '      var r = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);',
              '      var w = Math.round(img.naturalWidth * r);',
              '      var h = Math.round(img.naturalHeight * r);',
              '      var c = document.createElement("canvas");',
              '      c.width = w; c.height = h;',
              '      c.getContext("2d").drawImage(img, 0, 0, w, h);',
              '      var d = c.toDataURL("image/jpeg", quality);',
              '      img.setAttribute("data-pdf-src", img.src);',
              '      img.setAttribute("data-pdf-w", img.style.width);',
              '      img.setAttribute("data-pdf-h", img.style.height);',
              '      img.setAttribute("data-pdf-of", img.style.objectFit);',
              '      // Pin exact pixel dimensions so CSS width:100% does not stretch',
              '      img.style.width = w + "px";',
              '      img.style.height = h + "px";',
              '      img.style.objectFit = "fill";',
              '      img.style.maxHeight = "none";',
              '      img.src = d;',
              '      return true;',
              '    } catch(e) { return false; }',
              '  }',
              '  var hero = document.querySelector("#pdf-capture-wrapper .hero-container img, #pdf-capture-wrapper .hero-image");',
              '  if(hero) {',
              '    var ok = downscaleImg(hero, 380, 220, 0.55);',
              '    if(!ok) {',
              '      // CSS-only fallback: show complete image, not cropped',
              '      hero.style.width = "auto";',
              '      hero.style.maxWidth = "380px";',
              '      hero.style.maxHeight = "220px";',
              '      hero.style.height = "auto";',
              '      hero.style.objectFit = "contain";',
              '      var hc = hero.closest(".hero-container");',
              '      if(hc) { hc.style.textAlign = "left"; hc.style.overflow = "visible"; }',
              '    } else {',
              '      // Center the fixed-size downscaled image',
              '      var hc2 = hero.closest(".hero-container");',
              '      if(hc2) { hc2.style.textAlign = "left"; hc2.style.overflow = "visible"; hc2.style.maxHeight = "none"; }',
              '    }',
              '  }',
              '  document.querySelectorAll("#pdf-capture-wrapper img").forEach(function(img){',
              '    var isLogo = img.closest(".portal-top-bar") || img.closest("header");',
              '    var isHero = img.closest(".hero-container") || img.classList.contains("hero-image");',
              '    if(!isLogo && !isHero){',
              '      img.setAttribute("data-pdf-src", img.src||"");',
              '      img.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";',
              '      img.style.maxHeight="0"; img.style.overflow="hidden";',
              '    }',
              '  });',
              '  document.querySelectorAll("#pdf-capture-wrapper figure,#pdf-capture-wrapper .article-image").forEach(function(el){',
              '    if(!el.closest(".hero-container")) el.style.display="none";',
              '  });',
              '  window.__pdfImagesStripped=true;',
              '})()'
            ].join('\n');

            await chrome.debugger.sendCommand(debugTarget, 'Runtime.evaluate', { expression: stripScript, awaitPromise: false });

            // Generate PDF via CDP – produces real selectable text, identical to print view
            const result = await chrome.debugger.sendCommand(debugTarget, 'Page.printToPDF', {
              landscape: false,
              displayHeaderFooter: false,
              printBackground: true,
              scale: 1,
              paperWidth: 8.5,
              paperHeight: 11,
              marginTop: 0.4,
              marginBottom: 0.4,
              marginLeft: 0.4,
              marginRight: 0.4,
              preferCSSPageSize: false
            }) as { data: string };

            sendResponse({ ok: true, payload: { data: result.data } });

            // Restore stripped images after capture
            const restoreScript = [
              '(function(){',
              '  if(!window.__pdfImagesStripped) return;',
              '  document.querySelectorAll("[data-pdf-src]").forEach(function(img){',
              '    img.src = img.getAttribute("data-pdf-src")||"";',
              '    img.style.width = img.getAttribute("data-pdf-w")||"";',
              '    img.style.height = img.getAttribute("data-pdf-h")||"";',
              '    img.style.objectFit = img.getAttribute("data-pdf-of")||"";',
              '    img.style.maxHeight=""; img.style.overflow="";',
              '    img.removeAttribute("data-pdf-src");',
              '    img.removeAttribute("data-pdf-w");',
              '    img.removeAttribute("data-pdf-h");',
              '    img.removeAttribute("data-pdf-of");',
              '  });',
              '  document.querySelectorAll("#pdf-capture-wrapper figure,#pdf-capture-wrapper .hero-image,#pdf-capture-wrapper .article-image").forEach(function(el){el.style.display="";});',
              '  window.__pdfImagesStripped=false;',
              '})()'
            ].join('\n');
            chrome.debugger.sendCommand(debugTarget, 'Runtime.evaluate', { expression: restoreScript, awaitPromise: false }).catch(() => {});
          } finally {
            // Always detach debugger to remove the banner ASAP
            chrome.debugger.detach(debugTarget).catch(() => {});
          }
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
