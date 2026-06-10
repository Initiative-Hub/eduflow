'use client';

import setupLocatorUI from '@locator/runtime';
import { useEffect } from 'react';

export default function Locator() {
  useEffect(() => {
    setupLocatorUI();
  }, []);

  return null;
}
