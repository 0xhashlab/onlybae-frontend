import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Complaints Policy - OnlyBae' };

export default function ComplaintsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/browse" className="text-muted hover:text-foreground text-sm transition-colors mb-8 inline-block">&larr; Back</Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Complaints Policy</h1>
        <p className="text-muted text-sm mb-8">Last updated: March 27, 2026</p>

        <div className="prose-custom">
          <p>At OnlyBae.vip, operated by BAE Media LLC, we take all user complaints seriously and are committed to resolving them fairly and promptly.</p>

          <h2>How to Submit a Complaint</h2>
          <p>If you have a complaint regarding our website content, AI characters, chat interactions, adult toy synchronization, billing, or any other aspect of the Services, please contact us via email at: <a href="mailto:support@onlybae.vip" className="text-accent hover:underline">support@onlybae.vip</a></p>
          <p>Please include the following information in your email:</p>
          <ul>
            <li>Your full name and registered email address (if applicable)</li>
            <li>A detailed description of the complaint</li>
            <li>The date and time the issue occurred (if relevant)</li>
            <li>Any relevant screenshots or supporting evidence</li>
          </ul>

          <h2>Review Process</h2>
          <p>All complaints will be reviewed thoroughly and resolved within <strong className="text-foreground">5 business days</strong>. You will receive a written response outlining the outcome of our investigation.</p>

          <h2>Appeals Process</h2>
          <p>If you are not satisfied with the outcome of your complaint, you may submit an appeal by replying to our response email or sending a new email to <a href="mailto:support@onlybae.vip" className="text-accent hover:underline">support@onlybae.vip</a>. Appeals will be reviewed by a different team member and you will be notified of the final decision within an additional <strong className="text-foreground">5 business days</strong>.</p>

          <p className="mt-8 text-muted">We appreciate your feedback and strive to maintain a high standard of service and compliance on our platform.</p>
        </div>
      </div>
    </div>
  );
}
