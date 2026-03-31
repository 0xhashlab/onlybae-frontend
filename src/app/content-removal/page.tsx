import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Content Removal Policy - OnlyBae' };

export default function ContentRemovalPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/browse" className="text-muted hover:text-foreground text-sm transition-colors mb-8 inline-block">&larr; Back</Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Content Removal Policy</h1>
        <p className="text-muted text-sm mb-8">Last updated: March 27, 2026</p>

        <div className="prose-custom">
          <p>At OnlyBae.vip, operated by BAE Media LLC, we are committed to a safe, lawful, and respectful environment. All content (characters, images, galleries, and videos) is pre-created, fictional, and AI-generated. This Content Removal Policy covers prohibited content, moderation, removal procedures, and how to submit complaints.</p>

          <h2>1. Prohibited (Blocked) Content</h2>
          <p>The following content is strictly forbidden and will not be tolerated:</p>
          <ul>
            <li>Any content resembling minors or involving child exploitation material;</li>
            <li>Illegal content (violence, bestiality, incest, illegal drugs/weapons, etc.);</li>
            <li>Hate speech, discrimination, or harassment;</li>
            <li>Content encouraging self-harm, suicide, or terrorism;</li>
            <li>Infringement of privacy, copyright, trademarks, or impersonation of real persons/celebrities;</li>
            <li>Any other content violating applicable law or our Terms.</li>
          </ul>
          <p>Although users cannot generate new visual content, any chat interactions that attempt to solicit or describe prohibited material may still be flagged.</p>

          <h2>2. Content Moderation</h2>
          <p>We employ moderation tools to review flagged chat messages and ensure platform content complies with this policy. Violations may lead to content removal (where applicable), warnings, account suspension, or termination.</p>

          <h2>3. Content Removal Process</h2>
          <p>If any pre-existing platform content unintentionally resembles a real person or violates this Policy:</p>
          <ul>
            <li>Contact us at <a href="mailto:support@onlybae.vip" className="text-accent hover:underline">support@onlybae.vip</a>.</li>
            <li>Provide your name, email, description of the issue, and supporting evidence (if applicable).</li>
            <li>We will review and respond within 5 business days.</li>
            <li>Upon valid verification, the content will be removed promptly while maintaining user privacy.</li>
          </ul>

          <h2>4. Complaint Procedure</h2>
          <ul>
            <li>Submit complaints via <a href="mailto:support@onlybae.vip" className="text-accent hover:underline">support@onlybae.vip</a></li>
            <li>Include full name, email, detailed description, date/time, and any screenshots.</li>
            <li>We acknowledge receipt within 24 hours and aim to resolve within 5 business days.</li>
            <li>You will be notified of the outcome.</li>
          </ul>

          <h2>5. Privacy of Requests</h2>
          <p>All complaints and removal requests are handled confidentially.</p>

          <h2>6. Termination</h2>
          <p>We reserve the right to suspend or terminate accounts for violations.</p>

          <h2>7. Contact</h2>
          <p>Questions about this Policy: <a href="mailto:support@onlybae.vip" className="text-accent hover:underline">support@onlybae.vip</a></p>
        </div>
      </div>
    </div>
  );
}
