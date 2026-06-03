"use strict";
(() => {
  // src/sidepanel/snapshot-helper.ts
  function showPopupAlert(msg, type) {
    let alertEl = document.getElementById("local-alert-banner");
    if (!alertEl) {
      alertEl = document.createElement("div");
      alertEl.id = "local-alert-banner";
      alertEl.className = "local-alert";
      document.body.appendChild(alertEl);
    }
    alertEl.innerHTML = msg;
    alertEl.className = `local-alert ${type} show`;
    setTimeout(() => {
      if (alertEl) alertEl.classList.remove("show");
    }, 7e3);
  }
  document.addEventListener("DOMContentLoaded", () => {
    const closeBtn = document.getElementById("btn-snapshot-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        window.close();
      });
    }
    const saveBtn = document.getElementById("btn-snapshot-save");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        const cleanTitle = (document.title || "snapshot").replace(/[^a-zA-Z0-9-_ ]/g, "_").trim();
        const filename = `${cleanTitle}.html`;
        let savedHtml = document.documentElement.outerHTML;
        try {
          const docParser = new DOMParser().parseFromString(savedHtml, "text/html");
          const actionBar = docParser.querySelector(".action-bar");
          if (actionBar) {
            actionBar.remove();
          }
          docParser.querySelectorAll("script").forEach((s) => {
            if (s.src.includes("snapshot-helper") || s.src.includes("html2pdf")) {
              s.remove();
            }
          });
          savedHtml = "<!DOCTYPE html>\n" + docParser.documentElement.outerHTML;
        } catch (e) {
          console.warn("[PortalScrapper] Error cleaning saved HTML:", e);
        }
        const blob = new Blob([savedHtml], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
      });
    }
    const printBtn = document.getElementById("btn-snapshot-print");
    if (printBtn) {
      printBtn.addEventListener("click", async () => {
        try {
          const medialogIdStr = document.body.getAttribute("data-medialog-id");
          const medialogId = medialogIdStr ? parseInt(medialogIdStr, 10) : NaN;
          if (medialogId && !isNaN(medialogId)) {
            const result = await chrome.storage.local.get("pdfDefaultFolder");
            const defaultFolder = result.pdfDefaultFolder || "\\\\10.0.5.225\\rec24h\\mediarchivos\\medialogs";
            const fullNetworkPath = `${defaultFolder}\\${medialogId}.pdf`;
            await navigator.clipboard.writeText(fullNetworkPath);
            showPopupAlert("\u{1F4CB} Ruta de red y nombre copiados al clipboard", "success");
          }
        } catch (clipErr) {
          console.warn("Error copying print path to clipboard:", clipErr);
        }
        window.print();
      });
    }
    const uploadBtn = document.getElementById("btn-snapshot-upload");
    if (uploadBtn) {
      uploadBtn.addEventListener("click", async () => {
        const html2pdf = window.html2pdf;
        if (!html2pdf) {
          showPopupAlert("\u26A0\uFE0F La librer\xEDa de PDF a\xFAn se est\xE1 cargando. Por favor, reintenta en unos segundos.", "warning");
          return;
        }
        const medialogIdStr = document.body.getAttribute("data-medialog-id");
        const medialogId = medialogIdStr ? parseInt(medialogIdStr, 10) : NaN;
        const superabstract = document.body.getAttribute("data-superabstract") || "";
        if (!medialogId || isNaN(medialogId)) {
          showPopupAlert("\u26A0\uFE0F Primero debes grabar la nota en el Side Panel para obtener un Medialog ID.", "warning");
          return;
        }
        uploadBtn.setAttribute("disabled", "true");
        const originalBgColor = uploadBtn.style.backgroundColor;
        const originalBorderColor = uploadBtn.style.borderColor;
        showPopupAlert("\u23F3 Generando documento PDF... Por favor espera.", "warning");
        uploadBtn.textContent = "\u23F3 Generando PDF...";
        try {
          const element = document.getElementById("pdf-capture-wrapper");
          const opt = {
            margin: [10, 10, 10, 10],
            filename: `${medialogId}.pdf`,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: "mm", format: "letter", orientation: "portrait" },
            pagebreak: { mode: ["css", "legacy"] }
          };
          const blob = await html2pdf().set(opt).from(element).output("blob");
          showPopupAlert("\u{1F4E6} PDF generado. Iniciando transmisi\xF3n al servidor...", "warning");
          uploadBtn.textContent = "\u{1F4E4} Conectando...";
          const extension = "pdf";
          const nomArchivo = `${medialogId}.${extension}`;
          const formData = new FormData();
          formData.append("file1", blob, nomArchivo);
          formData.append("nomArchivo", nomArchivo);
          formData.append("tamanio", blob.size.toString());
          formData.append("extension", extension);
          formData.append("texto", `${superabstract.replace(/[/\\?%*:|"<>]/g, "-").trim()}.pdf`);
          formData.append("cabeza", "");
          formData.append("fDocumento", "");
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "https://www.medialog.com.mx/portales/CargaPDF.asp?Func=2", true);
          xhr.withCredentials = true;
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const percent = Math.round(event.loaded / event.total * 100);
              uploadBtn.textContent = `\u{1F4E4} Subiendo... ${percent}%`;
              showPopupAlert(`\u{1F4E4} Transmitiendo archivo PDF: ${percent}% completado...`, "warning");
            }
          });
          const uploadPromise = new Promise((resolve, reject) => {
            xhr.onload = () => {
              resolve({
                ok: xhr.status >= 200 && xhr.status < 300,
                status: xhr.status,
                text: xhr.responseText
              });
            };
            xhr.onerror = () => {
              reject(new Error("Fallo de conexi\xF3n o red con el servidor Medialog."));
            };
          });
          xhr.send(formData);
          const result = await uploadPromise;
          if (!result.ok) {
            throw new Error(`Servidor respondi\xF3 con c\xF3digo HTTP ${result.status}`);
          }
          if (result.text.includes("archivo adjunto cargado") || result.text.includes("Guardando Adjunto")) {
            uploadBtn.textContent = "\u2705 Guardado";
            uploadBtn.style.backgroundColor = "#22c55e";
            uploadBtn.style.borderColor = "#22c55e";
            const apiToken = document.body.getAttribute("data-api-token");
            let linkCopied = false;
            if (apiToken) {
              try {
                const hashResponse = await fetch(`https://api.medialog.com.mx/v1/medialogs/hash/${medialogId}`, {
                  headers: { "Authorization": `Bearer ${apiToken}` }
                });
                if (hashResponse.ok) {
                  const hashData = await hashResponse.json();
                  const hash = hashData?.data?.[0]?.hash || hashData?.hash || null;
                  if (hash) {
                    const lnk = `https://www.medialog.com.mx/mx.asp?h=${hash}&E=MnBkanlvYmM=&X=dXlwZGp5b2Jj`;
                    await navigator.clipboard.writeText(lnk);
                    linkCopied = true;
                  }
                }
              } catch (linkErr) {
                console.warn("[PortalScrapper] Could not generate link for clipboard:", linkErr);
              }
            }
            if (linkCopied) {
              showPopupAlert("\u2705 \xA1\xC9xito! PDF guardado y LINK copiado al clipboard.", "success");
            } else {
              showPopupAlert("\u2705 \xA1\xC9xito! PDF guardado con \xE9xito en el servidor Medialog.", "success");
            }
          } else {
            console.error("[PortalScrapper] Respuesta del servidor:", result.text);
            throw new Error("El servidor no confirm\xF3 la carga exitosa (es probable que tu sesi\xF3n haya expirado).");
          }
        } catch (err) {
          console.error("[PortalScrapper] PDF Upload failed:", err);
          uploadBtn.removeAttribute("disabled");
          uploadBtn.textContent = "\u{1F4E4} Reintentar";
          uploadBtn.style.backgroundColor = originalBgColor;
          uploadBtn.style.borderColor = originalBorderColor;
          showPopupAlert(`\u274C Error: ${err.message || err}<br><span style="font-weight:bold;">Redirigiendo a inicio de sesi\xF3n de Medialog en 3 segundos...</span>`, "error");
          setTimeout(() => {
            window.location.href = "https://www.medialog.com.mx/acceso.asp";
          }, 3e3);
        }
      });
    }
  });
})();
//# sourceMappingURL=snapshot-helper.js.map
