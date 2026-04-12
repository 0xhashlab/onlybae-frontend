import { redirect } from 'next/navigation';

// Wallet was merged into the Me (profile) page.
// Keep this route as a permanent redirect so any bookmarks, PWA shortcuts, or
// historical links continue to work.
export default function WalletPage() {
  redirect('/profile');
}
