import { Capacitor, registerPlugin } from '@capacitor/core';

type CsvCell = string | number | boolean | null | undefined;

interface FileExportPlugin {
  saveToDownloads(options: {
    filename: string;
    content: string;
    mimeType?: string;
  }): Promise<{ uri: string; filename: string; path: string }>;
}

const FileExport = registerPlugin<FileExportPlugin>('FileExport');

const escapeCell = (value: CsvCell): string => {
  const str = value == null ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const buildCsvContent = (headers: string[], rows: CsvCell[][]): string => {
  const csv = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => row.map(escapeCell).join(',')),
  ].join('\r\n');
  return '\uFEFF' + csv;
};

const downloadCsvWeb = (filename: string, content: string): void => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadCsv = async (
  filename: string,
  headers: string[],
  rows: CsvCell[][]
): Promise<{ savedToDownloads: boolean; path?: string }> => {
  const normalizedName = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  const content = buildCsvContent(headers, rows);

  if (Capacitor.getPlatform() === 'android') {
    const result = await FileExport.saveToDownloads({
      filename: normalizedName,
      content,
      mimeType: 'text/csv',
    });
    return { savedToDownloads: true, path: result.path };
  }

  downloadCsvWeb(normalizedName, content);
  return { savedToDownloads: false };
};

export const csvFilename = (prefix: string): string =>
  `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`;
