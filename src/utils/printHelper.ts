/**
 * Ultra-reliable print helper for modern web apps, thermal receipt printers, and iframe environments.
 * 
 * In Chromium-based browsers, sandboxed iframes without `allow-modals` (such as embedded previews)
 * silently block direct `window.print()` calls without throwing an error.
 * This helper detects the environment:
 * 1. If running inside an iframe (window.self !== window.top) or forced:
 *    Opens a dedicated top-level print window that bypasses the sandbox restrictions and
 *    automatically invokes the native printer dialog via `window.print()` as soon as loaded.
 * 2. If running standalone (window.self === window.top):
 *    Applies `has-print-portal` to body and triggers synchronous native `window.print()`.
 *    Falls back to the dedicated print window if native print fails.
 */

export function isInIframe(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true;
  }
}

export function openDirectPrintWindow(
  title: string,
  printableElementHtml: string,
  options?: { isA4?: boolean }
): Window | null {
  // Collect all stylesheets and font links from current document
  const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((el) => el.outerHTML)
    .join('\n');

  const printWindow = window.open('', '_blank');

  const maxWidth = options?.isA4 ? '780px' : '440px';

  const fullHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
  ${styleTags}
  <style>
    @page {
      size: ${options?.isA4 ? 'A4 portrait' : 'auto'};
      margin: ${options?.isA4 ? '10mm 10mm' : '4mm 6mm'};
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #0f172a !important;
      font-family: "Pretendard", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .print-wrapper {
      width: 100%;
      max-width: ${maxWidth};
      margin: 0 auto;
      padding: 12px 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .print-ticket-page {
      width: 100%;
      max-width: ${maxWidth};
      margin: 0 auto 16px auto;
      page-break-after: auto;
      break-after: auto;
    }
    .print-ticket-page:not(:last-child) {
      page-break-after: always !important;
      break-after: page !important;
      margin-bottom: 24px !important;
    }
    @media print {
      body {
        padding: 0 !important;
        background: #fff !important;
      }
      .no-print-bar {
        display: none !important;
      }
      .print-wrapper {
        padding: 0 !important;
        margin: 0 auto !important;
      }
      .print-ticket-page {
        margin: 0 auto !important;
        box-shadow: none !important;
      }
    }
    .no-print-bar {
      position: sticky;
      top: 0;
      z-index: 99999;
      width: 100%;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      font-size: 13px;
    }
    .btn-print {
      background: #059669;
      color: #ffffff;
      font-weight: 800;
      border: none;
      padding: 8px 18px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      transition: background 0.15s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-print:hover {
      background: #047857;
    }
    .btn-close {
      background: #334155;
      color: #cbd5e1;
      font-weight: 600;
      border: 1px solid #475569;
      padding: 8px 14px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      margin-left: 8px;
      transition: background 0.15s;
    }
    .btn-close:hover {
      background: #475569;
      color: #fff;
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div style="display:flex;align-items:center;gap:10px;">
      <span style="font-size:18px;">🖨️</span>
      <div>
        <div style="font-weight:800;font-size:14px;letter-spacing:-0.2px;">성남시 대입 진학 박람회 - 티켓 인쇄</div>
        <div style="color:#94a3b8;font-size:11px;">프린터 대화상자가 자동으로 열립니다. 안 열릴 경우 [지금 바로 인쇄]를 클릭하세요.</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;">
      <button type="button" class="btn-print" onclick="window.focus(); window.print();">
        <span>지금 바로 인쇄</span>
      </button>
      <button type="button" class="btn-close" onclick="window.close();">닫기</button>
    </div>
  </div>

  <div class="print-wrapper">
    ${printableElementHtml}
  </div>

  <script>
    function triggerPrint() {
      try {
        window.focus();
        window.print();
      } catch (e) {
        console.warn('Print invocation error:', e);
      }
    }
    if (document.readyState === 'complete') {
      setTimeout(triggerPrint, 250);
    } else {
      window.addEventListener('load', function() {
        setTimeout(triggerPrint, 250);
      });
    }
  <\/script>
</body>
</html>`;

  if (printWindow) {
    try {
      printWindow.document.open();
      printWindow.document.write(fullHtml);
      printWindow.document.close();
      return printWindow;
    } catch (e) {
      console.warn('Writing to printWindow failed, falling back to Blob URL:', e);
    }
  }

  // Fallback: If popup was blocked or write failed, create Blob URL and trigger open
  try {
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.target = '_blank';
    link.rel = 'noopener,noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 15000);
    return null;
  } catch (err) {
    console.error('Blob URL fallback failed:', err);
    return null;
  }
}

export function printDocumentContent(
  title: string,
  printableElementHtml: string,
  options?: { isA4?: boolean; forceNewWindow?: boolean }
): void {
  document.body.classList.add('has-print-portal');

  // In an iframe (or if forceNewWindow is requested), direct window.print() is blocked by Chromium sandbox.
  // We MUST open the top-level print window so the printer dialog opens directly!
  if (options?.forceNewWindow || isInIframe()) {
    openDirectPrintWindow(title, printableElementHtml, options);
    return;
  }

  // In standalone top window: Direct native print
  window.focus();
  try {
    window.print();
  } catch (err) {
    console.warn('Native window.print() failed, opening direct print window fallback:', err);
    openDirectPrintWindow(title, printableElementHtml, options);
  }
}
