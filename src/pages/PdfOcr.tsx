import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { save, open } from '@tauri-apps/plugin-dialog';
import Dropzone, { type PdfFile } from '../components/Dropzone';
import FileItem from '../components/FileItem';
import ProgressBar from '../components/ProgressBar';

interface OcrResult {
  output_path: string;
  output_size: number;
  page_count: number;
}

type OutputFormat = 'pdf' | 'txt' | 'docx';

const outputFormats: { key: OutputFormat; label: string; desc: string; icon: string }[] = [
  { key: 'pdf', label: 'PDF', desc: 'PDF dengan teks yang bisa dicari', icon: '📄' },
  { key: 'txt', label: 'TXT', desc: 'File teks biasa', icon: '📝' },
  { key: 'docx', label: 'Word (DOCX)', desc: 'Dokumen Microsoft Word', icon: '📋' },
];

interface AnyFile { name: string; path: string; }

export default function PdfOcr() {
  const navigate = useNavigate();
  const [file, setFile] = useState<AnyFile | null>(null);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('pdf');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [error, setError] = useState('');

  const handleFiles = (files: PdfFile[]) => { setFile(files[0]); setResult(null); setError(''); };
  const removeFile = () => { setFile(null); setResult(null); setError(''); };

  // Allow selecting image files directly
  const handleSelectImage = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Gambar', extensions: ['png', 'jpg', 'jpeg', 'bmp', 'tiff', 'webp'] }],
      });
      if (!selected) return;
      const path = selected as string;
      setFile({ name: path.split('/').pop() || 'image', path });
      setResult(null);
      setError('');
    } catch (err) { console.error(err); }
  };

  const getOutputExt = () => {
    if (outputFormat === 'txt') return 'txt';
    if (outputFormat === 'docx') return 'docx';
    return 'pdf';
  };

  const handleOcr = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(10);
    setError('');
    setResult(null);
    try {
      const tempDir = await invoke<string>('get_temp_dir');
      setProgress(20);
      const baseName = file.name.replace(/\.(pdf|png|jpg|jpeg|bmp|tiff|webp)$/i, '');
      const res = await invoke<OcrResult>('ocr_pdf', {
        inputPath: file.path,
        outputPath: `${tempDir}/ocr_${baseName}.${getOutputExt()}`,
        language: 'eng',
        outputFormat,
      });
      setProgress(100);
      setResult(res);
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err.message || 'Terjadi kesalahan.');
    } finally {
      setProcessing(false);
    }
  };

  const formatSize = (b: number) => b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(2) + ' MB';

  const handleSave = async () => {
    if (!result) return;
    const baseName = file?.name.replace(/\.(pdf|png|jpg|jpeg|bmp|tiff|webp)$/i, '') || 'output';
    const ext = getOutputExt();
    const savePath = await save({
      defaultPath: `ocr_${baseName}.${ext}`,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
    });
    if (savePath) await invoke('save_file_to', { source: result.output_path, destination: savePath });
  };

  const isPdf = file ? /\.pdf$/i.test(file.name) : true;

  return (
    <>
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Kembali</button>
        <h2>◎ OCR — Scan ke Teks</h2>
        <p>Baca teks dari PDF scan atau foto/gambar. Output bisa PDF, TXT, atau Word.</p>
      </div>
      <div className="page-body">
        <div className="tool-page">
          {/* Input section */}
          {!file && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Dropzone onFilesSelected={handleFiles} />
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>atau</div>
              <button className="btn-secondary" onClick={handleSelectImage}>
                🖼️ Pilih Gambar (PNG/JPG/TIFF/...)
              </button>
            </div>
          )}
          {file && <div className="file-list"><FileItem file={file as PdfFile} onRemove={removeFile} /></div>}

          {file && !result && !error && (
            <div className="options-panel animate-in">
              <h4>📤 Format Output</h4>
              <div className="quality-options">
                {outputFormats.map((f) => (
                  <button
                    key={f.key}
                    className={`quality-btn ${outputFormat === f.key ? 'selected' : ''}`}
                    onClick={() => setOutputFormat(f.key)}
                  >
                    <span className="quality-label">{f.icon} {f.label}</span>
                    <span className="quality-desc">{f.desc}</span>
                  </button>
                ))}
              </div>
              {!isPdf && (
                <p style={{ fontSize: '12px', color: 'var(--success)', marginTop: '10px' }}>
                  ✓ Mode gambar: OCR langsung dari foto/gambar
                </p>
              )}
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Menggunakan Tesseract OCR (bahasa: Inggris). PDF banyak halaman memerlukan waktu lebih lama.
              </p>
            </div>
          )}

          {processing && (
            <ProgressBar
              progress={progress}
              status="Menjalankan OCR... (mungkin memerlukan beberapa menit)"
            />
          )}

          {error && (
            <div className="result-card animate-in" style={{ borderColor: 'rgba(225,112,85,0.3)' }}>
              <h4>✕ Error</h4>
              <p style={{ color: 'var(--danger)', fontSize: '14px' }}>{error}</p>
            </div>
          )}

          {result && (
            <div className="result-card success animate-in">
              <h4>✓ OCR Berhasil!</h4>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                {result.page_count} halaman diproses → {outputFormat.toUpperCase()} ({formatSize(result.output_size)})
              </p>
              {outputFormat === 'pdf' && (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                  Teks kini dapat dicari dan disalin di dalam PDF.
                </p>
              )}
              <button className="btn-primary" onClick={handleSave}>
                💾 Simpan File {outputFormat.toUpperCase()}
              </button>
            </div>
          )}

          {file && !processing && !result && !error && (
            <button className="btn-primary" onClick={handleOcr}>Mulai OCR</button>
          )}
        </div>
      </div>
    </>
  );
}
