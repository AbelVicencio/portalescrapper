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
    "GET_CLEAN_SNAPSHOT",
    "PRINT_TAB_TO_PDF"
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
          case "PRINT_TAB_TO_PDF": {
            const tabId = msg.payload.tabId;
            const debugTarget = { tabId };
            await chrome.debugger.attach(debugTarget, "1.3");
            try {
              await chrome.debugger.sendCommand(debugTarget, "Page.enable", {});
              await chrome.debugger.sendCommand(debugTarget, "Runtime.enable", {});
              const stripScript = [
                "(function(){",
                "  function downscaleImg(img, maxW, maxH, quality) {",
                "    try {",
                "      if(!img || !img.complete || !img.naturalWidth) return false;",
                "      // Keep full aspect ratio - no crop",
                "      var r = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);",
                "      var w = Math.round(img.naturalWidth * r);",
                "      var h = Math.round(img.naturalHeight * r);",
                '      var c = document.createElement("canvas");',
                "      c.width = w; c.height = h;",
                '      c.getContext("2d").drawImage(img, 0, 0, w, h);',
                '      var d = c.toDataURL("image/jpeg", quality);',
                '      img.setAttribute("data-pdf-src", img.src);',
                '      img.setAttribute("data-pdf-w", img.style.width);',
                '      img.setAttribute("data-pdf-h", img.style.height);',
                '      img.setAttribute("data-pdf-of", img.style.objectFit);',
                "      // Pin exact pixel dimensions so CSS width:100% does not stretch",
                '      img.style.width = w + "px";',
                '      img.style.height = h + "px";',
                '      img.style.objectFit = "fill";',
                '      img.style.maxHeight = "none";',
                "      img.src = d;",
                "      return true;",
                "    } catch(e) { return false; }",
                "  }",
                '  var hero = document.querySelector("#pdf-capture-wrapper .hero-container img, #pdf-capture-wrapper .hero-image");',
                "  if(hero) {",
                "    var ok = downscaleImg(hero, 380, 220, 0.55);",
                "    if(!ok) {",
                "      // CSS-only fallback: show complete image, not cropped",
                '      hero.style.width = "auto";',
                '      hero.style.maxWidth = "380px";',
                '      hero.style.maxHeight = "220px";',
                '      hero.style.height = "auto";',
                '      hero.style.objectFit = "contain";',
                '      var hc = hero.closest(".hero-container");',
                '      if(hc) { hc.style.textAlign = "left"; hc.style.overflow = "visible"; }',
                "    } else {",
                "      // Center the fixed-size downscaled image",
                '      var hc2 = hero.closest(".hero-container");',
                '      if(hc2) { hc2.style.textAlign = "left"; hc2.style.overflow = "visible"; hc2.style.maxHeight = "none"; }',
                "    }",
                "  }",
                '  document.querySelectorAll("#pdf-capture-wrapper img").forEach(function(img){',
                '    var isLogo = img.closest(".portal-top-bar") || img.closest("header");',
                '    var isHero = img.closest(".hero-container") || img.classList.contains("hero-image");',
                "    if(!isLogo && !isHero){",
                '      img.setAttribute("data-pdf-src", img.src||"");',
                '      img.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";',
                '      img.style.maxHeight="0"; img.style.overflow="hidden";',
                "    }",
                "  });",
                '  document.querySelectorAll("#pdf-capture-wrapper figure,#pdf-capture-wrapper .article-image").forEach(function(el){',
                '    if(!el.closest(".hero-container")) el.style.display="none";',
                "  });",
                "  window.__pdfImagesStripped=true;",
                "})()"
              ].join("\n");
              await chrome.debugger.sendCommand(debugTarget, "Runtime.evaluate", { expression: stripScript, awaitPromise: false });
              const result = await chrome.debugger.sendCommand(debugTarget, "Page.printToPDF", {
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
              });
              sendResponse({ ok: true, payload: { data: result.data } });
              const restoreScript = [
                "(function(){",
                "  if(!window.__pdfImagesStripped) return;",
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
                "  });",
                '  document.querySelectorAll("#pdf-capture-wrapper figure,#pdf-capture-wrapper .hero-image,#pdf-capture-wrapper .article-image").forEach(function(el){el.style.display="";});',
                "  window.__pdfImagesStripped=false;",
                "})()"
              ].join("\n");
              chrome.debugger.sendCommand(debugTarget, "Runtime.evaluate", { expression: restoreScript, awaitPromise: false }).catch(() => {
              });
            } finally {
              chrome.debugger.detach(debugTarget).catch(() => {
              });
            }
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
