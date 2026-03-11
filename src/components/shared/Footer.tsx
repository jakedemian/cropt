export default function Footer() {
  return (
    <footer className="px-4 py-6 text-center text-xs text-white/20 border-t border-white/5">
      <span>© {new Date().getFullYear()} Cropt</span>
      <span className="mx-2">·</span>
      <a href="/dmca" className="hover:text-white/40 transition-colors">DMCA / Copyright</a>
    </footer>
  )
}
