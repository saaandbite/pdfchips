import { useNavigate } from 'react-router-dom';

const groups = [
  {
    title: 'Atur Halaman',
    tools: [
      { title: 'Gabung PDF', desc: 'Gabungkan beberapa PDF jadi satu.', icon: '⊕', path: '/merge' },
      { title: 'Pisah PDF', desc: 'Pisahkan halaman tertentu.', icon: '✂', path: '/split' },
      { title: 'Rotasi PDF', desc: 'Putar halaman 90°, 180°, 270°.', icon: '↻', path: '/rotate' },
      { title: 'Crop PDF', desc: 'Potong margin halaman PDF.', icon: '⬡', path: '/crop' },
    ],
  },
  {
    title: 'Ukuran & Kualitas',
    tools: [
      { title: 'Kompres PDF', desc: 'Kurangi ukuran file PDF.', icon: '↓', path: '/compress' },
      { title: 'Watermark', desc: 'Tambahkan teks watermark.', icon: '◈', path: '/watermark' },
    ],
  },
  {
    title: 'Konversi',
    tools: [
      { title: 'PDF → Gambar', desc: 'Konversi halaman ke PNG/JPG.', icon: '▣', path: '/to-image' },
      { title: 'Gambar → PDF', desc: 'Konversi gambar ke satu PDF.', icon: '⊞', path: '/image-to-pdf' },
      { title: 'PDF → Teks',   desc: 'Ekstrak teks dari PDF ke .txt.', icon: 'T', path: '/to-text' },
      { title: 'OCR Scan',     desc: 'Kenali teks dari PDF hasil scan.', icon: '◎', path: '/ocr' },
    ],
  },
  {
    title: 'Ke PDF',
    tools: [
      { title: 'TXT → PDF',      desc: 'Konversi teks biasa ke PDF.',        icon: '📄', path: '/txt-to-pdf' },
      { title: 'Markdown → PDF', desc: 'Konversi file .md ke PDF.', icon: 'Ⓜ', path: '/markdown-to-pdf' },
      { title: 'Word → PDF',     desc: 'Konversi .docx/.doc ke PDF.',        icon: '📝', path: '/word-to-pdf' },
      { title: 'PPT → PDF',      desc: 'Konversi .pptx/.ppt ke PDF.',        icon: '📊', path: '/ppt-to-pdf' },
    ],
  },
  {
    title: 'Keamanan',
    tools: [
      { title: 'Proteksi PDF', desc: 'Tambahkan password ke PDF.', icon: '⊘', path: '/protect' },
      { title: 'Buka Kunci PDF', desc: 'Hapus password dari PDF.', icon: '⊙', path: '/unlock' },
    ],
  },
  {
    title: 'Informasi',
    tools: [
      { title: 'Info PDF', desc: 'Lihat metadata dan detail file.', icon: 'ⓘ', path: '/info' },
    ],
  },
];

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Pilih salah satu alat untuk mulai memproses file PDF Anda.</p>
      </div>
      <div className="page-body">
        {groups.map((group) => (
          <div key={group.title} style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '10px' }}>
              {group.title}
            </h3>
            <div className="tools-grid">
              {group.tools.map((t) => (
                <div key={t.title} className="tool-card" onClick={() => navigate(t.path)}>
                  <div className="card-icon">{t.icon}</div>
                  <h3>{t.title}</h3>
                  <p>{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
