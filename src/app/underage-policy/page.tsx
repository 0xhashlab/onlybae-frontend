import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Underage Policy - OnlyBae' };

export default function UnderagePolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/browse" className="text-muted hover:text-foreground text-sm transition-colors mb-8 inline-block">&larr; Back</Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Underage Policy</h1>
        <p className="text-muted text-sm mb-8">Last updated: March 27, 2026</p>

        <div className="prose-custom">
          <p>At OnlyBae.vip, operated by BAE Media LLC, we are committed to preventing access by anyone under 18 (or the legal age in their jurisdiction). The Services contain adult-oriented, AI-generated content and are strictly for users 18 and older.</p>

          <h2>1. Age Verification</h2>
          <p>Upon visiting the Website, you will encounter an age gate requiring confirmation that you are 18 or older. Providing false age information violates our <Link href="/terms" className="text-accent hover:underline">Terms</Link> and may result in immediate termination.</p>

          <h2>2. Content Responsibility</h2>
          <p>All visual content on the platform is pre-created. Users cannot generate new images or videos. You are responsible for your chat messages. We strictly prohibit any attempt to solicit, describe, or engage in content resembling minors or involving child exploitation (see <Link href="/content-removal" className="text-accent hover:underline">Content Removal Policy</Link>). Such attempts will trigger moderation and may result in account suspension or termination.</p>

          <h2>3. Content Moderation</h2>
          <p>Moderation tools monitor for underage-related violations in chats and platform content. Flagged violations lead to review and appropriate action.</p>

          <h2>4. Content Removal</h2>
          <p>Any content we determine, in our sole discretion, violates this Policy will be promptly removed.</p>

          <h2>5. Contact</h2>
          <p>If you see a violation or have questions: <a href="mailto:support@onlybae.vip" className="text-accent hover:underline">support@onlybae.vip</a></p>

          <h2>6. Termination</h2>
          <p>We reserve the right to suspend or terminate access for anyone suspected of underage use or violation of this Policy.</p>

          <p className="mt-8 text-muted font-semibold">Important Note: It is your responsibility to comply with local laws regarding adult content. BAE Media is not liable for any misrepresentation of age.</p>
        </div>
      </div>
    </div>
  );
}
