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
          <p>At OnlyBae.vip, operated by BAE Media LLC, we are committed to maintaining a safe, lawful, and respectful environment. All content (characters, images, galleries, and videos) is pre-created, fictional, and entirely AI-generated. This Content Removal Policy covers prohibited content, moderation, removal procedures, complaint handling, and appeals.</p>

          <h2>1. Prohibited (Blocked) Content</h2>
          <p>The following content is strictly forbidden and will not be tolerated:</p>
          <ul>
            <li>Any content resembling minors or involving child exploitation material;</li>
            <li>Illegal content (violence, bestiality, incest, illegal drugs/weapons, etc.);</li>
            <li>Hate speech, discrimination, or harassment;</li>
            <li>Content encouraging self-harm, suicide, or terrorism;</li>
            <li>Infringement of privacy, copyright, trademarks, or impersonation of real persons/celebrities;</li>
            <li>Any other content violating applicable law or our <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Terms of Service</Link>.</li>
          </ul>
          <p>Although users cannot generate new visual content, any chat interactions that attempt to solicit or describe prohibited material may still be flagged and reviewed.</p>

          <h2>2. Content Moderation</h2>
          <p>We employ moderation tools to review flagged chat messages and ensure all platform content complies with this policy. Violations may lead to content removal (where applicable), warnings, account suspension, or permanent termination.</p>

          <h2>3. Content Removal Process</h2>
          <p>If any pre-existing platform content unintentionally resembles a real person or otherwise violates this Policy:</p>
          <ul>
            <li>Contact us at <a href="mailto:support@onlybae.vip" className="text-accent hover:underline">support@onlybae.vip</a>.</li>
            <li>Provide your full name, email address, a detailed description of the issue, and any supporting evidence (e.g., screenshots or links).</li>
            <li>We will review the request and respond within <strong className="text-foreground">5 business days</strong>.</li>
            <li>Upon valid verification, the content will be removed promptly while maintaining user privacy.</li>
          </ul>

          <h2>4. Appeals / Takedown Appeal Process</h2>
          <p>If you believe you have been depicted in our content and wish to appeal the removal (or non-removal) of such content, or if you disagree with any decision made under this policy:</p>
          <ul>
            <li>Notify us by sending an email to <a href="mailto:support@onlybae.vip" className="text-accent hover:underline">support@onlybae.vip</a>.</li>
            <li>Clearly state the grounds for your appeal and include any relevant evidence.</li>
          </ul>
          <p>We will review your appeal within <strong className="text-foreground">5 business days</strong> and provide a written response.</p>
          <p>If there is still a disagreement regarding the appeal, we will allow the matter to be resolved by a neutral third-party body at our expense. You will be informed of the details of this process in our response.</p>

          <h2>5. Complaint Procedure</h2>
          <ul>
            <li>Submit complaints via <a href="mailto:support@onlybae.vip" className="text-accent hover:underline">support@onlybae.vip</a>.</li>
            <li>Include your full name, email, detailed description of the issue, date/time (if relevant), and any screenshots.</li>
            <li>We acknowledge receipt within <strong className="text-foreground">24 hours</strong> and aim to resolve the matter within <strong className="text-foreground">5 business days</strong>.</li>
            <li>You will be notified of the outcome in writing.</li>
          </ul>

          <h2>6. Privacy of Requests</h2>
          <p>All complaints, removal requests, and appeals are handled confidentially and will not be disclosed to third parties except as required by law.</p>

          <h2>7. Termination</h2>
          <p>We reserve the right to suspend or terminate user accounts for any violations of this policy or our Terms of Service.</p>

          <h2>8. Contact</h2>
          <p>For questions about this Content Removal Policy, complaints, or appeals, please contact us at: <a href="mailto:support@onlybae.vip" className="text-accent hover:underline">support@onlybae.vip</a></p>
        </div>
      </div>
    </div>
  );
}
