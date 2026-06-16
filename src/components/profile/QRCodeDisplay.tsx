import React, { useRef } from 'react';
import QRCode from 'react-qr-code';

interface QRCodeDisplayProps {
  data: string;
  size?: number;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ data, size = 160 }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const svg = containerRef.current?.querySelector('svg');
    if (!svg) return;

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'qr-code.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  if (!data) return null;

  return (
    <section aria-label="QR code" className="flex flex-col md:flex-row items-center gap-4">
      <div ref={containerRef} className="surface-raised p-4 rounded-xl">
        <div className="bg-white p-2 rounded-lg">
          <QRCode value={data} size={size} />
        </div>
      </div>
      <div className="flex flex-col gap-2 w-full md:w-auto">
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center justify-center rounded-lg border border-white/[0.08] px-3 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-white/[0.06] transition-colors"
        >
          Download QR (SVG)
        </button>
        <p className="text-muted-foreground text-xs md:text-sm">
          Scan deze code om je profiel te koppelen. Deel deze code niet publiekelijk.
        </p>
      </div>
    </section>
  );
};
