import React, { useEffect } from 'react';

interface GoogleAdBannerProps {
  adSlot?: string;
  adClient?: string;
  format?: 'auto' | 'horizontal' | 'rectangle';
  className?: string;
}

export default function GoogleAdBanner({
  adSlot = '', // Insert your Google AdSense Slot ID here
  adClient = '', // Insert your Google AdSense Client ID (e.g. ca-pub-xxxxxxxxxxxx)
  format = 'auto',
  className = '',
}: GoogleAdBannerProps) {
  const hasAdSense = Boolean(adClient && adSlot);

  useEffect(() => {
    if (hasAdSense) {
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      } catch (err) {
        // AdSense script may be blocked by user ad-blockers
      }
    }
  }, [hasAdSense]);

  return (
    <div className={`w-full flex items-center justify-center my-3 overflow-hidden ${className}`}>
      {hasAdSense ? (
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%' }}
          data-ad-client={adClient}
          data-ad-slot={adSlot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      ) : (
        /* Subtle placeholder area ready for your Google AdSense account */
        <div className="w-full max-w-3xl py-2 px-4 rounded-md border border-dashed border-border text-center bg-surface-50 text-[11px] text-text-muted flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-dim">
            Advertisement
          </span>
          <span>Google AdSense Slot (Ready for deployment)</span>
          <span className="text-[10px] text-text-dim">100% Free Tool</span>
        </div>
      )}
    </div>
  );
}

