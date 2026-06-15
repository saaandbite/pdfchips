import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import Dropzone, { type PdfFile } from '../components/Dropzone';
import FileItem from '../components/FileItem';
import ProgressBar from '../components/ProgressBar';

interface CropResult { output_path: string; output_size: number; }
interface Rect { x: number; y: number; w: number; h: number; } // normalized 0-1

export default function PdfCrop() {
  const navigate = useNavigate();
  const [file, setFile] = useState<PdfFile | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CropResult | null>(null);
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleFiles = (files: PdfFile[]) => {
    setFile(files[0]);
    setResult(null);
    setError('');
    setRect(null);
    setPreview(null);
  };
  const removeFile = () => {
    setFile(null);
    setResult(null);
    setError('');
    setRect(null);
    setPreview(null);
  };

  // Load preview when file is selected
  useEffect(() => {
    if (!file) return;
    setLoadingPreview(true);
    invoke<string>('render_pdf_page', { inputPath: file.path, page: 1, dpi: 150 })
      .then((data) => { setPreview(data); setLoadingPreview(false); })
      .catch(() => { setLoadingPreview(false); });
  }, [file]);

  const getRelPos = (e: React.MouseEvent): { x: number; y: number } | null => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  };

  const onMouseDown = (e: React.MouseEvent) => {
    const pos = getRelPos(e);
    if (!pos) return;
    e.preventDefault();
    setDragging(true);
    setDragStart(pos);
    setRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
    setResult(null);
    setError('');
  };

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !dragStart) return;
    const pos = getRelPos(e);
    if (!pos) return;
    setRect({
      x: Math.min(dragStart.x, pos.x),
      y: Math.min(dragStart.y, pos.y),
      w: Math.abs(pos.x - dragStart.x),
      h: Math.abs(pos.y - dragStart.y),
    });
  }, [dragging, dragStart]);

  const onMouseUp = useCallback(() => { setDragging(false); setDragStart(null); }, []);

  const handleCrop = async () => {
    if (!file || !rect || rect.w < 0.01 || rect.h < 0.01) {
      setError('Pilih area crop terlebih dahulu dengan drag pada preview.');
      return;
    }
    setProcessing(true); setProgress(20); setError(''); setResult(null);
    try {
      const tempDir = await invoke<string>('get_temp_dir');
      setProgress(50);
      const res = await invoke<CropResult>('crop_pdf', {
        inputPath: file.path,
        outputPath: `${tempDir}/cropped_${file.name}`,
        x: rect.x,
        y: rect.y,
        width: rect.w,
        height: rect.h,
      });
      setProgress(100); setResult(res);
    } catch (err: any) { setError(typeof err === 'string' ? err : err.message || 'Error'); }
    finally { setProcessing(false); }
  };

  const handleSave = async () => {
    if (!result) return;
    const savePath = await save({ defaultPath: `cropped_${file?.name}`, filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (savePath) await invoke('save_file_to', { source: result.output_path, destination: savePath });
  };

  const formatSize = (b: number) => b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(2) + ' MB';

  const selectionStyle: React.CSSProperties = rect ? {
    position: 'absolute',
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.w * 100}%`,
    height: `${rect.h * 100}%`,
    border: '2px solid var(--accent)',
    background: 'rgba(99,102,241,0.15)',
    pointerEvents: 'none',
    boxSizing: 'border-box',
  } : {};

  return (
    <>
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Kembali</button>
        <h2>⬡ Crop PDF</h2>
        <p>Pilih area yang ingin disimpan dengan cara drag pada preview halaman.</p>
      </div>
      <div className="page-body">
        <div className="tool-page">
          {!file && <Dropzone onFilesSelected={handleFiles} />}
          {file && <div className="file-list"><FileItem file={file} onRemove={removeFile} /></div>}

          {file && !result && (
            <div className="options-panel animate-in" style={{ padding: '16px' }}>
              <h4 style={{ marginBottom: '10px' }}>
                🖱️ Drag untuk memilih area crop
                {rect && rect.w > 0.01 && rect.h > 0.01 && (
                  <span style={{ fontSize: '12px', color: 'var(--success)', marginLeft: '10px' }}>
                    ✓ Area dipilih ({(rect.w * 100).toFixed(0)}% × {(rect.h * 100).toFixed(0)}%)
                  </span>
                )}
              </h4>

              {loadingPreview && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  ⏳ Memuat preview...
                </div>
              )}

              {preview && (
                <div
                  ref={canvasRef}
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: '100%',
                    cursor: 'crosshair',
                    userSelect: 'none',
                    border: '1.5px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    lineHeight: 0,
                  }}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseUp}
                >
                  <img
                    src={preview}
                    alt="Preview halaman PDF"
                    style={{ width: '100%', display: 'block', pointerEvents: 'none' }}
                    draggable={false}
                  />
                  {rect && rect.w > 0.001 && <div style={selectionStyle} />}
                </div>
              )}

              {!preview && !loadingPreview && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                  Gagal memuat preview. Anda tetap bisa melakukan crop.
                </div>
              )}

              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Klik dan seret pada preview untuk memilih bagian yang ingin dipertahankan. Area di luar seleksi akan dipotong.
              </p>
            </div>
          )}

          {processing && <ProgressBar progress={progress} status="Memotong halaman..." />}
          {error && (
            <div className="result-card animate-in" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
              <h4>✕ Error</h4>
              <p style={{ color: 'var(--danger)', fontSize: '14px' }}>{error}</p>
            </div>
          )}
          {result && (
            <div className="result-card success animate-in">
              <h4>✓ Crop Berhasil!</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '14px' }}>
                Area yang dipilih berhasil di-crop ({formatSize(result.output_size)}).
              </p>
              <button className="btn-primary" onClick={handleSave}>💾 Simpan File</button>
            </div>
          )}
          {file && preview && !processing && !result && (
            <button
              className="btn-primary"
              onClick={handleCrop}
              disabled={!rect || rect.w < 0.01 || rect.h < 0.01}
            >
              ✂️ Mulai Crop
            </button>
          )}
          {file && !preview && !loadingPreview && !processing && !result && (
            <button className="btn-primary" onClick={handleCrop}>✂️ Mulai Crop</button>
          )}
        </div>
      </div>
    </>
  );
}
