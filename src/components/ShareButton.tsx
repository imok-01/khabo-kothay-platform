import { useState } from 'react';
import { Link2, Check } from 'lucide-react';

export default function ShareButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const full = new URL(url, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(full);
    } catch {
      // clipboard unavailable — fall back to the browser's share API, then nothing
      if (navigator.share) {
        await navigator.share({ url: full }).catch(() => undefined);
      }
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button type="button" className="btn btn--ghost" onClick={share} aria-live="polite">
      {copied ? <Check size={15} aria-hidden="true" /> : <Link2 size={15} aria-hidden="true" />}
      {copied ? 'Link copied' : 'Share'}
    </button>
  );
}
