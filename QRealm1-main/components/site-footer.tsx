import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="border-t border-[hsl(30,10%,15%)] bg-[#0D0D0D]">
      <div className="mx-auto max-w-6xl px-4 py-16">
        {/* Central Quote */}
        <div className="mb-12 text-center">
          <p className="font-serif text-xl italic leading-relaxed text-muted-foreground md:text-2xl">
            &ldquo;Interpretation is power. Knowledge is purification.&rdquo;
          </p>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-wrap items-center justify-center gap-8 text-sm" aria-label="Footer navigation">
          {[
            { label: "About", href: "/about" },
            { label: "Quantum Physics", href: "/quantum-physics" },
            { label: "Quantum Computing", href: "/quantum-computing" },
            { label: "Discourses", href: "/blogs" },
            { label: "Forums", href: "/forums" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="saffron-underline text-muted-foreground transition-colors duration-300 hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Bottom line */}
        <div className="mt-12 border-t border-[hsl(30,10%,12%)] pt-8 text-center">
          <p className="text-xs text-muted-foreground/60">
            Battle of Interpretations – Tattva Vimarsha &copy; {new Date().getFullYear()} Battle of Interpretations. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
