import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import Dropzone, { type PdfFile } from '../components/Dropzone';
import FileItem from '../components/FileItem';
import ProgressBar from '../components/ProgressBar';

interface ToImageResult {
  output_dir: string;
  image_count: number;
  format: string;
}

export default function PdfToImage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<PdfFile | null>(null);
  const [format, setFormat] = useState<'png' | 'jpg'>('png');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ToImageResult | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedTo, setSavedTo] = useState('');

  const handleFiles = (files: PdfFile[]) => {
    setFile(files[0]);
    setResult(null);
    setError('');
    setSavedTo('');
  };

  const removeFile = () => {
    setFile(null);
    setResult(null);
    setError('');
    setSavedTo('');
  };

  const handleConvert = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(15);
    setError('');
    setResult(null);
    setSavedTo('');
    try {
      const tempDir = await invoke<string>('get_temp_dir');
      const baseName = file.name.replace(/\.pdf$/i, '');
      const outputDir = `${tempDir}/images_${baseName}`;
      setProgress(30);
      const res = await invoke<ToImageResult>('pdf_to_image', {
        inputPath: file.path,
        outputDir: outputDir,
        format: format,
      });
      setProgress(100);
      setResult(res);
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err.message || 'Terjadi kesalahan.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveToFolder = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const destDir = await open({
        directory: true,
        title: 'Pilih Folder Tujuan',
      });
      if (!destDir) return;
      const count = await invoke<number>('copy_dir_to', {
        sourceDir: result.output_dir,
        destDir: destDir as string,
      });
      setSavedTo(`${count} file berhasil disimpan ke: ${destDir}`);
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err.message || 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenFolder = async () => {
    if (!result) return;
    try {
      await invoke('open_folder', { path: result.output_dir });
    } catch (err: any) {
      setError(typeof err === 'string' ? err : 'Gagal membuka folder.');
    }
  };

  return (
    <>
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Kembali ke Dashboard</button>
        <h2>🖼️ PDF ke Gambar</h2>
        <p>Konversikan setiap halaman PDF menjadi file gambar berkualitas tinggi (300 DPI).</p>
      </div>
      <div className="page-body">
        <div className="tool-page">
          {!file && <Dropzone onFilesSelected={handleFiles} />}

          {file && (
            <div className="file-list">
              <FileItem file={file} onRemove={removeFile} />
            </div>
          )}

          {file && !result && !error && (
            <div className="options-panel animate-in">
              <h4>🎨 Format Output</h4>
              <div className="quality-options">
                <button
                  className={`quality-btn ${format === 'png' ? 'selected' : ''}`}
                  onClick={() => setFormat('png')}
                >
                  <span className="quality-label">PNG</span>
                  <span className="quality-desc">Kualitas tinggi, cocok untuk dokumen</span>
                </button>
                <button
                  className={`quality-btn ${format === 'jpg' ? 'selected' : ''}`}
                  onClick={() => setFormat('jpg')}
                >
                  <span className="quality-label">JPG</span>
                  <span className="quality-desc">Ukuran kecil, cocok untuk berbagi</span>
                </button>
              </div>
            </div>
          )}

          {processing && <ProgressBar progress={progress} status="Mengonversi halaman dengan pdftoppm..." />}

          {error && (
            <div className="result-card animate-in" style={{ borderColor: 'rgba(225,112,85,0.3)' }}>
              <h4>❌ Error</h4>
              <p style={{ color: 'var(--danger)', fontSize: '14px' }}>{error}</p>
            </div>
          )}

          {result && (
            <div className="result-card success animate-in">
              <h4>✅ Konversi Berhasil!</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
                {result.image_count} halaman berhasil dikonversi ke format <strong>.{result.format.toUpperCase()}</strong> (300 DPI).
              </p>
              {savedTo && (
                <p style={{ color: 'var(--success)', fontSize: '12px', marginBottom: '12px', wordBreak: 'break-all' }}>
                  ✓ {savedTo}
                </p>
              )}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  className="btn-primary"
                  onClick={handleSaveToFolder}
                  disabled={saving}
                  style={{ flex: 1 }}
                >
                  {saving ? 'Menyimpan...' : '💾 Simpan ke Folder'}
                </button>
                <button
                  className="btn-secondary"
                  onClick={handleOpenFolder}
                  style={{ flex: 1 }}
                >
                  📂 Buka Folder Sementara
                </button>
              </div>
            </div>
          )}

          {file && !processing && !result && !error && (
            <button className="btn-primary" onClick={handleConvert}>
              🚀 Mulai Konversi
            </button>
          )}
        </div>
      </div>
    </>
  );
}
