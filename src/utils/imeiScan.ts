/** Pull a 14–16 digit IMEI out of raw QR/barcode text (URLs, labels, etc.). */
export const extractImeiFromScan = (raw: string): string => {
  const trimmed = raw.trim();
  const imeiMatch = trimmed.match(/\d{14,16}/);
  if (imeiMatch) return imeiMatch[0];
  return trimmed.replace(/\D/g, '');
};
