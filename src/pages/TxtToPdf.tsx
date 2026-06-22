import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import ProgressBar from '../components/ProgressBar';

interface ConvertResult {
  output_path: string;
  output_size: number;
}

interface DocFile {
  name: string;
  size: number;
  path: string;
}

const formatSize = (b: number) =>
  b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(2) + ' MB';

export default function TxtToPdf() {
  const navigate = useNavigate();
  const [file, setFile] = useState<DocFile | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [error, setError] = useState('');

  const handlePick = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Text Files', extensions: ['txt', 'text'] }],
    });
    if (!selected) return;
    const path = selected as string;
    const name = path.split(/[\\/]/).pop() || 'document.txt';
    setFile({ name, size: 0, path });
    setResult(null);
    setError('');
  };

  const handleConvert = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(30);
    setError('');
    setResult(null);
    try {
      const tempDir = await invoke<string>('get_temp_dir');
      const outputPath = `${tempDir}/${file.name.replace(/\.(txt|text)$/i, '')}.pdf`;
      setProgress(60);
      const res = await invoke<ConvertResult>('txt_to_pdf', {
        inputPath: file.path,
        outputPath,
      });
      setProgress(100);
      setResult(res);
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err.message || 'Terjadi kesalahan.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    const baseName = file?.name.replace(/\.(txt|text)$/i, '') || 'output';
    const savePath = await save({
      defaultPath: `${baseName}.pdf`,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    });
    if (savePath) await invoke('save_file_to', { source: result.output_path, destination: savePath });
  };

  return (
    <>
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Kembali</button>
        <h2>📄 TXT → PDF</h2>
        <p>Konversi file teks biasa (.txt) menjadi dokumen PDF.</p>
      </div>
      <div className="page-body">
        <div className="tool-page">
          {!file && (
            <div className="dropzone" onClick={handlePick}>
              <span className="drop-icon">📄</span>
              <h3>Pilih File .txt</h3>
              <p>Klik untuk memilih file teks dari komputer Anda</p>
            </div>
          )}
          {file && (
            <div className="file-list">
              <div className="file-item">
                <div className="file-icon">📄</div>
                <div className="file-info">
                  <div className="file-name">{file.name}</div>
                  <div className="file-size">{file.path}</div>
                </div>
                <button className="file-remove" onClick={() => { setFile(null); setResult(null); setError(''); }}>✕</button>
              </div>
            </div>
          )}

          {processing && <ProgressBar progress={progress} status="Mengkonversi dengan LibreOffice..." />}

          {error && (
            <div className="result-card animate-in" style={{ borderColor: 'rgba(225,112,85,0.3)' }}>
              <h4>✕ Error</h4>
              <p style={{ color: 'var(--danger)', fontSize: '13px', whiteSpace: 'pre-wrap' }}>{error}</p>
            </div>
          )}

          {result && (
            <div className="result-card success animate-in">
              <h4>✓ Konversi Berhasil!</h4>
              <div className="result-stats">
                <div className="stat-item">
                  <div className="stat-value">{formatSize(result.output_size)}</div>
                  <div className="stat-label">Ukuran PDF</div>
                </div>
              </div>
              <button className="btn-primary" onClick={handleSave}>💾 Simpan PDF</button>
            </div>
          )}

          {file && !processing && !result && !error && (
            <button className="btn-primary" onClick={handleConvert}>Konversi ke PDF</button>
          )}

          <div className="options-panel" style={{ marginTop: '20px' }}>
            <h4>ℹ Tentang Fitur Ini</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Menggunakan <strong>LibreOffice</strong> untuk konversi. Pastikan LibreOffice terinstall di sistem Anda:<br />
              <code style={{ fontSize: '12px', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>
                sudo apt install libreoffice
              </code>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
