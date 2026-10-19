/**
 * Utility to reliably trigger print in both standard browsers and sandboxed iframes
 */
export const printElement = (elementId: string, title: string = '배정 확인표 출력') => {
  const el = document.getElementById(elementId);
  if (!el) {
    window.focus();
    window.print();
    return;
  }

  try {
    const iframe = document.createElement('iframe');
    iframe.id = 'hidden-print-iframe';
    // Non-zero dimensions to avoid Chromium print suppression
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.width = '800px';
    iframe.style.height = '1000px';
    iframe.style.border = '0';
    iframe.style.opacity = '0.01';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.focus();
      window.print();
      return;
    }

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((s) => s.outerHTML)
      .join('\n');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="ko">
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          ${styles}
          <style>
            @page {
              size: auto;
              margin: 5mm 6mm;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
            }
            .print-only-container {
              display: block !important;
            }
            .print-ticket-page {
              display: block !important;
              width: 100% !important;
              max-width: 440px !important;
              margin: 0 auto !important;
              page-break-after: auto !important;
              break-after: auto !important;
            }
            .print-ticket-page:not(:last-child) {
              page-break-after: always !important;
              break-after: page !important;
              margin-bottom: 20px !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          </style>
        </head>
        <body>
          <div style="width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px 0;">
            ${el.innerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn('Iframe print failed, falling back to window.print:', err);
        window.focus();
        window.print();
      }

      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 5000);
    }, 350);
  } catch (err) {
    console.error('Print utility error:', err);
    window.focus();
    window.print();
  }
};
