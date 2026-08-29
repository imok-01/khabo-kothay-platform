import { useState } from 'react';
import { Link2, Check } from 'lucide-react';
import { track } from '../lib/analytics';
import { Button } from './ui';

interface ShareButtonProps {
  url: string;
  /** Optional share title (e.g. restaurant name). */
  title?: string;
  /** Optional share text (e.g. tagline / short real description). */
  text?: string;
}

export default function ShareButton({ url, title, text }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const full = new URL(url, window.location.origin).toString();
    try {
      // Prefer the native share sheet (carries title + text + url); fall back
      // to copying the link when sharing isn't available or is cancelled.
      if (navigator.share) {
        await navigator.share({ title, text, url: full });
      } else {
        await navigator.clipboard.writeText(full);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(full);
      } catch {
        /* clipboard unavailable and no share — nothing to do */
      }
    }
    setCopied(true);
    track('share_clicked');
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Button variant="ghost" icon={copied ? Check : Link2} onClick={share} aria-live="polite">
      {copied ? 'Link copied' : 'Share'}
    </Button>
  );
}
