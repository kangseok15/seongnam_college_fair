import QRCode from 'qrcode';

export async function generateQrCodeUrl(payload: string): Promise<string> {
  try {
    return await QRCode.toDataURL(payload, {
      width: 200,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Error generating QR code', err);
    return '';
  }
}
