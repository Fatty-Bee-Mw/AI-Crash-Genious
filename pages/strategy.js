import Head from 'next/head';

export default function Strategy() {
  const title = 'Crash AI Genius — Best Crash Game Strategy';
  const desc = 'Learn safe cashout strategy, house-edge avoidance, and volatility-aware tactics powered by Crash AI Genius.';
  const url = 'https://your-site.example/strategy';
  return (
    <main className="min-h-screen text-white p-6 md:p-10 max-w-3xl mx-auto">
      <Head>
        <title>{title}</title>
        <meta name="description" content={desc} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={desc} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={url} />
      </Head>
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#8DB600]">Best Crash Game Strategy</h1>
      <p className="mt-3 text-slate-300/90">This guide explains how our predictor targets the golden small-window, adapts to volatility, and recommends a safe cashout.</p>
      <ul className="mt-6 space-y-3 list-disc list-inside text-slate-200/90">
        <li>Focus on small rounds (1.02x–1.99x) for frequent safe exits.</li>
        <li>Follow the confidence badge: lower confidence = more conservative.</li>
        <li>Respect session loss caps and cooldowns.</li>
        <li>Increase risk only after steady performance.</li>
      </ul>
    </main>
  );
}
