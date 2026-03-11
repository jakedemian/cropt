import type { Metadata } from 'next'
import Footer from '@/components/shared/Footer'

export const metadata: Metadata = {
  title: 'DMCA / Copyright — Cropt',
}

export default function DmcaPage() {
  return (
    <div className="min-h-full bg-[#24272f] text-white">

      {/* Header */}
      <header className="flex items-center justify-between px-4 h-12 border-b border-white/5">
        <a href="/" className="flex items-center gap-1.5">
          <img src="/icons/cropt-logo.png" alt="Cropt" className="w-6 h-6" />
          <span className="font-semibold text-sm tracking-wide">Cropt</span>
        </a>
        <a
          href="/create"
          className="px-3 h-8 flex items-center rounded text-xs font-medium bg-[#0fff95] text-[#24272f] hover:bg-[#0de882] transition-colors"
        >
          Create a Meme →
        </a>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-2">DMCA / Copyright Policy</h1>
        <p className="text-white/40 text-sm mb-10">Last updated: March 2026</p>

        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">What Cropt Hosts</h2>
          <p className="text-white/60 text-sm leading-relaxed">
            Cropt is a platform that allows users to create and share image compositions ("memes"). All content is uploaded anonymously by users. Cropt does not create, curate, or editorially select any user-submitted content.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">Reporting Copyright Infringement</h2>
          <p className="text-white/60 text-sm leading-relaxed mb-4">
            If you believe content hosted on Cropt infringes your copyright, please send a DMCA takedown notice to:
          </p>
          <p className="text-white font-medium text-sm mb-4">
            <a href="mailto:dmca@cropt.app" className="text-[#0fff95] hover:underline">dmca@cropt.app</a>
          </p>
          <p className="text-white/60 text-sm leading-relaxed mb-3">Your notice must include:</p>
          <ul className="text-white/60 text-sm leading-relaxed list-disc list-inside space-y-1.5">
            <li>A description of the copyrighted work you claim has been infringed</li>
            <li>The URL of the allegedly infringing content on Cropt</li>
            <li>Your contact information (name, address, phone number, email)</li>
            <li>A statement that you have a good faith belief the use is not authorized by the copyright owner</li>
            <li>A statement that the information in your notice is accurate, under penalty of perjury</li>
            <li>Your physical or electronic signature</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">Response Time</h2>
          <p className="text-white/60 text-sm leading-relaxed">
            We respond to valid DMCA notices within 48 hours. Upon receipt of a valid notice, we will promptly remove or disable access to the allegedly infringing content and notify the uploader.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">Counter-Notification</h2>
          <p className="text-white/60 text-sm leading-relaxed">
            If you believe your content was removed in error, you may submit a counter-notification to the email above. Counter-notifications must include your contact information, identification of the removed content, a statement under penalty of perjury that the content was removed by mistake, and your consent to jurisdiction of the federal district court for your location.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-3">Repeat Infringers</h2>
          <p className="text-white/60 text-sm leading-relaxed">
            Cropt reserves the right to terminate access for users who are repeat infringers of intellectual property rights.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  )
}
