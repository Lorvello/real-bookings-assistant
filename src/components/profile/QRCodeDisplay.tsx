import React, { useRef } from 'react';
import QRCode from 'react-qr-code';
import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';

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
        <Button type="button" variant="secondary" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download QR (SVG)
        </Button>
        <p className="text-muted-foreground text-xs md:text-sm max-w-xs">
          Scan this code to link your profile. Keep it private, do not share it publicly.
        </p>
      </div>
    </section>
  );
};
