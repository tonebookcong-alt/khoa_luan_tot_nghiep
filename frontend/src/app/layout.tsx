import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Inter } from 'next/font/google';
import './globals.css';
import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { TopProgressBar } from '@/components/layout/TopProgressBar';
// Footer removed — design không có footer

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-headline',
  weight: ['400', '500', '600', '700', '800'],
});

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-body',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'PhoneMarket — Mua bán điện thoại tích hợp AI',
  description: 'Nền tảng mua bán điện thoại cũ với định giá AI tự động, minh bạch và an toàn',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${plusJakarta.variable} ${inter.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
        {/*
          Bitdefender (extension) gắn `bis_skin_checked="1"` vào mọi <div> trước khi React hydrate
          → gây hydration mismatch trong Next.js 15. Script chạy ở head (before hydrate)
          để strip attribute này + observer xóa khi extension thêm lại sau.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var BAD=['bis_skin_checked','bis_register','__processed_'];function clean(n){if(!n||!n.removeAttribute)return;for(var i=0;i<n.attributes.length;i++){var a=n.attributes[i].name;for(var j=0;j<BAD.length;j++){if(a===BAD[j]||a.indexOf(BAD[j])===0){n.removeAttribute(a);i--;break}}}}function walk(r){clean(r);if(r.children)for(var i=0;i<r.children.length;i++)walk(r.children[i])}walk(document.documentElement);if(typeof MutationObserver!=='undefined'){new MutationObserver(function(ms){for(var i=0;i<ms.length;i++){var m=ms[i];if(m.type==='attributes')clean(m.target);else if(m.addedNodes)for(var j=0;j<m.addedNodes.length;j++)if(m.addedNodes[j].nodeType===1)walk(m.addedNodes[j])}}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:BAD})}})();`,
          }}
        />
      </head>
      <body className="text-on-surface min-h-screen" suppressHydrationWarning>
        <Suspense fallback={null}>
          <TopProgressBar />
        </Suspense>
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
