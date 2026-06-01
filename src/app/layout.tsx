import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Keymaster — Claude API key manager",
  description:
    "Local dashboard for managing your Anthropic API keys, usage, and purpose alignment.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

const STRIP_EXTENSION_ATTRS = `
(function(){
  var bad = /^(bis_skin_checked|bis_register|fdprocessedid|__processed_)/;
  try {
    var orig = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, value) {
      if (typeof name === 'string' && bad.test(name)) return;
      return orig.call(this, name, value);
    };
  } catch (e) {}
  function sweep(){
    try {
      var nodes = document.querySelectorAll('*');
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        for (var j = el.attributes.length - 1; j >= 0; j--) {
          var n = el.attributes[j].name;
          if (bad.test(n)) el.removeAttribute(n);
        }
      }
    } catch (e) {}
  }
  sweep();
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(sweep).observe(document.documentElement, {
      childList: true, subtree: true, attributes: true
    });
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-screen" suppressHydrationWarning>
        {process.env.NODE_ENV !== "production" && (
          <script
            dangerouslySetInnerHTML={{ __html: STRIP_EXTENSION_ATTRS }}
          />
        )}
        <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
