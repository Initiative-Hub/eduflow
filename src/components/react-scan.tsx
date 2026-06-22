'use client';

import Script from 'next/script';

const REACT_SCAN_SCRIPT_SRC =
  'https://unpkg.com/react-scan@0.5.7/dist/auto.global.js';

export default function ReactScan() {
  return (
    <Script
      src={REACT_SCAN_SCRIPT_SRC}
      crossOrigin="anonymous"
      strategy="beforeInteractive"
    />
  );
}
