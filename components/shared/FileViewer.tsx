// @ts-nocheck
'use client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Download, X, FileText, Image, FileSpreadsheet } from 'lucide-react';

type FileViewerProps = {
  open: boolean;
  onClose: () => void;
  fileUrl: string | null;
  fileName?: string;
};

function getFileExtension(fileName?: string, url?: string): string {
  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext) return ext;
  }
  if (url) {
    // Try to extract from URL before query params
    const path = url.split('?')[0];
    const ext = path.split('.').pop()?.toLowerCase();
    if (ext) return ext;
  }
  return '';
}

function getFileType(ext: string): 'pdf' | 'image' | 'docx' | 'excel' | 'csv' | 'unknown' {
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image';
  if (['doc', 'docx'].includes(ext)) return 'docx';
  if (['xls', 'xlsx'].includes(ext)) return 'excel';
  if (ext === 'csv') return 'csv';
  return 'unknown';
}

function PdfViewer({ url }: { url: string }) {
  return (
    <iframe
      src={`${url}#toolbar=1&navpanes=0`}
      className="w-full h-full min-h-[70vh] rounded-md border border-slate-200"
      title="PDF Viewer"
    />
  );
}

function ImageViewer({ url, fileName }: { url: string; fileName?: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[50vh] bg-slate-50 rounded-md p-4">
      <img src={url} alt={fileName || 'File preview'} className="max-w-full max-h-[65vh] object-contain rounded shadow-sm" />
    </div>
  );
}

function DocxViewer({ url }: { url: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const mammoth = await import('mammoth');
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        if (!cancelled) setHtml(result.value);
      } catch (e: any) {
        if (!cancelled) setError('Could not render document. Try downloading instead.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [url]);

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>;
  if (error) return <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3"><FileText className="h-10 w-10 text-slate-300" /><p className="text-sm text-slate-500">{error}</p></div>;
  return (
    <div className="prose prose-sm max-w-none p-4 bg-white rounded-md border border-slate-200 overflow-auto max-h-[70vh]" dangerouslySetInnerHTML={{ __html: html || '' }} />
  );
}

function ExcelViewer({ url }: { url: string }) {
  const [sheets, setSheets] = useState<{ name: string; data: string[][] }[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const XLSX = await import('xlsx');
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const parsed = workbook.SheetNames.map((name) => ({
          name,
          data: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 }) as string[][],
        }));
        if (!cancelled) setSheets(parsed);
      } catch {
        if (!cancelled) setError('Could not render spreadsheet. Try downloading instead.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [url]);

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>;
  if (error) return <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3"><FileSpreadsheet className="h-10 w-10 text-slate-300" /><p className="text-sm text-slate-500">{error}</p></div>;

  const sheet = sheets[activeSheet];
  return (
    <div className="space-y-2">
      {sheets.length > 1 && (
        <div className="flex gap-1 border-b border-slate-200 pb-2">
          {sheets.map((s, i) => (
            <button key={s.name} onClick={() => setActiveSheet(i)} className={`px-3 py-1 text-xs rounded-t font-medium transition-colors ${i === activeSheet ? 'bg-indigo-100 text-indigo-700 border border-b-0 border-indigo-200' : 'text-slate-500 hover:bg-slate-100'}`}>
              {s.name}
            </button>
          ))}
        </div>
      )}
      <div className="overflow-auto max-h-[65vh] rounded-md border border-slate-200">
        <table className="w-full text-xs border-collapse">
          <tbody>
            {(sheet?.data || []).slice(0, 200).map((row, ri) => (
              <tr key={ri} className={ri === 0 ? 'bg-slate-100 font-semibold sticky top-0' : ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                {(row || []).map((cell, ci) => (
                  <td key={ci} className="px-2 py-1.5 border border-slate-200 whitespace-nowrap max-w-[200px] truncate">{cell?.toString() || ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CsvViewer({ url }: { url: string }) {
  const [rows, setRows] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const response = await fetch(url);
        const text = await response.text();
        const parsed = text.split('\n').filter(Boolean).map((line) => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          for (const char of line) {
            if (char === '"') { inQuotes = !inQuotes; }
            else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
            else { current += char; }
          }
          result.push(current.trim());
          return result;
        });
        if (!cancelled) setRows(parsed);
      } catch {
        if (!cancelled) setError('Could not parse CSV.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [url]);

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>;
  if (error) return <div className="text-sm text-slate-500 text-center py-10">{error}</div>;

  return (
    <div className="overflow-auto max-h-[65vh] rounded-md border border-slate-200">
      <table className="w-full text-xs border-collapse">
        <tbody>
          {rows.slice(0, 200).map((row, ri) => (
            <tr key={ri} className={ri === 0 ? 'bg-slate-100 font-semibold sticky top-0' : ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-2 py-1.5 border border-slate-200 whitespace-nowrap max-w-[200px] truncate">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FileViewer({ open, onClose, fileUrl, fileName }: FileViewerProps) {
  const ext = getFileExtension(fileName, fileUrl || undefined);
  const fileType = getFileType(ext);

  const typeLabels = { pdf: 'PDF Document', image: 'Image', docx: 'Word Document', excel: 'Spreadsheet', csv: 'CSV File', unknown: 'File' };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold text-slate-900 truncate pr-4">
              {fileName || typeLabels[fileType]}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {fileUrl && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => window.open(fileUrl, '_blank')}>
                  <Download className="h-3 w-3 mr-1" /> Download
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto mt-2">
          {!fileUrl ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : fileType === 'pdf' ? (
            <PdfViewer url={fileUrl} />
          ) : fileType === 'image' ? (
            <ImageViewer url={fileUrl} fileName={fileName} />
          ) : fileType === 'docx' ? (
            <DocxViewer url={fileUrl} />
          ) : fileType === 'excel' ? (
            <ExcelViewer url={fileUrl} />
          ) : fileType === 'csv' ? (
            <CsvViewer url={fileUrl} />
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
              <FileText className="h-12 w-12 text-slate-300" />
              <p className="text-sm text-slate-500">Preview not available for this file type.</p>
              <Button variant="outline" onClick={() => window.open(fileUrl, '_blank')}>
                <Download className="h-4 w-4 mr-2" /> Download File
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
