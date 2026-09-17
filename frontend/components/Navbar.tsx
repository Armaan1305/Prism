export default function Navbar() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        
        {/* Logo */}
        <a
          href="/"
          className="text-xl font-semibold tracking-tight text-white"
        >
          PRISM<span className="text-zinc-500">.</span>
        </a>

        {/* Navigation */}
        <div className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
          <a href="#product" className="transition hover:text-white">
            Product
          </a>

          <a href="#how-it-works" className="transition hover:text-white">
            How it works
          </a>

          <a href="#technology" className="transition hover:text-white">
            Technology
          </a>
        </div>

        {/* GitHub */}
        <a
          href="#"
          className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/5"
        >
          Connect GitHub
        </a>
      </nav>
    </header>
  );
}