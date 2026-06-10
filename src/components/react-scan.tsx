'use client';

import Script from 'next/script';

export default function ReactScan() {
  return (
    <Script
      src="//unpkg.com/react-scan/dist/auto.global.js"
      crossOrigin="anonymous"
      strategy="beforeInteractive"
    />
  );
}
