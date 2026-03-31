import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy Policy - OnlyBae' };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/browse" className="text-muted hover:text-foreground text-sm transition-colors mb-8 inline-block">&larr; Back</Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-muted text-sm mb-8">Last updated: March 27, 2026</p>

        <div className="prose-custom">
          <p>Welcome to OnlyBae.vip!</p>
          <p>This Privacy Policy explains how BAE Media LLC (&quot;We&quot;, &quot;Us&quot;, or &quot;Our&quot;) collects, uses, and protects your personal information when you use the Website at www.onlybae.vip and the Services.</p>
          <p>We may update this Policy periodically. Continued use constitutes acceptance of the revised Policy.</p>

          <h2>1. Information We Collect</h2>
          <p>We collect:</p>
          <ul>
            <li>Information you provide during registration (such as email address);</li>
            <li>Usage data, IP address, browser information, and interaction data (including chat messages with our pre-existing AI characters);</li>
            <li>Technical data collected via cookies and analytics tools;</li>
            <li>Data from third parties (e.g., analytics providers) where lawful.</li>
          </ul>
          <p>We do not collect sensitive data beyond what is necessary for the Services. Since users cannot generate new visual content, we do not process any image or video generation prompts.</p>

          <h2>2. Purpose of Processing</h2>
          <p>We process Personal Data to:</p>
          <ul>
            <li>Provide and improve the Services (including chat interactions with AI characters and adult toy sync functionality);</li>
            <li>Analyze usage and behavior to enhance user experience;</li>
            <li>Communicate with you regarding your account or the Services;</li>
            <li>Comply with legal obligations.</li>
          </ul>

          <h2>3. Marketing</h2>
          <p>We may send marketing communications about our Services if you have given consent (where required). You may opt out at any time by following the instructions in the communication or by contacting us.</p>

          <h2>4. Sharing and Disclosure</h2>
          <p>We may share your data with trusted service providers (e.g., hosting providers, analytics services, payment processors) who are bound by confidentiality obligations. We do not sell your Personal Data. We may disclose information if required by law, to protect our rights, or in connection with a business transfer.</p>

          <h2>5. Data Security and Retention</h2>
          <p>We implement reasonable technical and organizational security measures to protect your Personal Data. We retain data only as long as necessary to fulfill the purposes outlined above or as required by applicable law.</p>

          <h2>6. Your Rights</h2>
          <p>You have the right to access, correct, delete, restrict, or object to the processing of your Personal Data. EU residents may also exercise the additional rights described in the GDPR section below. To exercise any of these rights, please contact us at <a href="mailto:support@onlybae.vip" className="text-accent hover:underline">support@onlybae.vip</a>. We will respond within a reasonable timeframe (generally within one month).</p>

          <h2>7. Children</h2>
          <p>The Services are not intended for anyone under 18 years of age. See our <Link href="/underage-policy" className="text-accent hover:underline">Underage Policy</Link> for more details.</p>

          <h2>8. Contact</h2>
          <p>If you have any questions about this Privacy Policy or wish to exercise your rights, please contact us at: <a href="mailto:support@onlybae.vip" className="text-accent hover:underline">support@onlybae.vip</a></p>

          <h2>GDPR (for EU Residents)</h2>
          <p>If you are a resident of the European Union, you are entitled to enhanced rights and protection provided by the General Data Protection Regulation 2016/679, commonly referred to as GDPR. These rights include, but are not limited to, transparency regarding the processing of your personal data, the right to access and rectify your information, the right to erasure, the right to restrict processing, and the right to data portability. We are committed to upholding these rights and ensuring compliance with the GDPR in our handling of your personal data.</p>
        </div>
      </div>
    </div>
  );
}
