'use client';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center px-6">
      {/* Hero */}
      <div className="flex max-w-2xl flex-col items-center text-center pt-24 pb-16">
        {/* Shield + Medical Cross */}
        <svg
          width="80"
          height="96"
          viewBox="0 0 80 96"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mb-8"
        >
          <path
            d="M40 4L8 20V44C8 66.08 21.92 86.56 40 92C58.08 86.56 72 66.08 72 44V20L40 4Z"
            stroke="#14b8a6"
            strokeWidth="3"
            fill="none"
          />
          <rect x="35" y="32" width="10" height="32" rx="2" fill="#14b8a6" />
          <rect x="24" y="43" width="32" height="10" rx="2" fill="#14b8a6" />
        </svg>

        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Never bring an insurance card{' '}
          <span className="text-teal-400">again.</span>
        </h1>

        <p className="mb-10 text-lg text-zinc-400 max-w-lg">
          BoMed is smart scheduling for PT &amp; athletic training. Your practice asks for your info through Bolo. You say yes or no. No clipboard. No phone tag. No fax.
        </p>

        {/* CTA */}
        <div className="flex gap-4">
          <a
            href="/dashboard"
            className="rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-500"
          >
            Practice Dashboard
          </a>
          <a
            href="#how-it-works"
            className="rounded-lg border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
          >
            How It Works
          </a>
        </div>
      </div>

      {/* How it works */}
      <div id="how-it-works" className="w-full max-w-4xl py-16 border-t border-zinc-800">
        <h2 className="text-2xl font-bold text-center mb-12">How it works</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <Step
            number="1"
            title="Practice requests"
            description="Your PT practice sends a data request through Bolo — demographics, insurance, or both."
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            }
          />
          <Step
            number="2"
            title="You grant access"
            description="You see the request in Bolo and approve it. Only the fields they asked for. Nothing more."
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            }
          />
          <Step
            number="3"
            title="Data flows in"
            description="Your info lands in the practice system instantly. Verified. No clipboard. Revoke anytime."
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <path d="M22 4L12 14.01l-3-3" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Trust layer explainer */}
      <div className="w-full max-w-4xl py-16 border-t border-zinc-800">
        <div className="flex flex-col sm:flex-row gap-8 items-start">
          <div className="flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-teal-400 mb-2">Powered by Bolo</div>
            <h2 className="text-2xl font-bold mb-4">Your data. Your rules.</h2>
            <p className="text-zinc-400 mb-4">
              BoMed doesn&apos;t store your personal information. When a practice needs your demographics or insurance, they request it through the <strong className="text-zinc-200">Bolo trust layer</strong> — a permission protocol that puts you in control.
            </p>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-0.5">&#10003;</span>
                <span>Every data request requires your explicit grant</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-0.5">&#10003;</span>
                <span>Revoke access instantly — no cached copies</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-0.5">&#10003;</span>
                <span>Only the fields they ask for, nothing more</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-0.5">&#10003;</span>
                <span>Every access is logged and metered</span>
              </li>
            </ul>
          </div>

          <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="text-xs font-mono text-zinc-500 mb-4">// What crosses the trust boundary</div>
            <div className="space-y-3">
              <DataRow label="Name" value="Alison Park" granted />
              <DataRow label="Insurance" value="BCBS PPO Gold" granted />
              <DataRow label="Member ID" value="XHR-9928471" granted />
              <DataRow label="DOB" value="1994-03-12" granted />
              <DataRow label="Full medical history" value="—" granted={false} />
              <DataRow label="Lab results" value="—" granted={false} />
              <DataRow label="Medications" value="—" granted={false} />
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-800 text-xs text-zinc-500">
              Only granted fields cross. Everything else stays local.
            </div>
          </div>
        </div>
      </div>

      {/* For practices */}
      <div className="w-full max-w-4xl py-16 border-t border-zinc-800">
        <h2 className="text-2xl font-bold text-center mb-4">For practices</h2>
        <p className="text-zinc-400 text-center mb-12 max-w-lg mx-auto">
          Stop chasing paperwork. Get verified patient data before they walk in the door.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FeatureCard
            title="Zero clipboard"
            description="Patient demographics and insurance arrive digitally, verified, before the appointment."
          />
          <FeatureCard
            title="FHIR R4 native"
            description="Standards-compliant API. Plug into PointClickCare, Epic, or any EHR that speaks FHIR."
          />
          <FeatureCard
            title="Bolo-verified identity"
            description="Every patient who grants access is verified through the Bolo trust layer. No spoofing."
          />
          <FeatureCard
            title="Metered API"
            description="Pay per request. No upfront cost. No per-seat licensing. Scale as you grow."
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-4xl py-8 border-t border-zinc-800 text-center">
        <p className="text-xs text-zinc-600">
          BoMed is built on the <a href="https://bolospot.com" className="text-teal-400/60 hover:text-teal-400 transition">Bolo</a> trust layer. Your data stays yours.
        </p>
      </footer>
    </div>
  );
}

function Step({ number, title, description, icon }: { number: string; title: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-4">{icon}</div>
      <div className="text-xs font-bold text-teal-400 mb-1">Step {number}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-zinc-400">{description}</p>
    </div>
  );
}

function DataRow({ label, value, granted }: { label: string; value: string; granted: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-400">{label}</span>
      <div className="flex items-center gap-2">
        {granted ? (
          <>
            <span className="text-zinc-200 font-mono text-xs">{value}</span>
            <span className="text-green-400 text-xs">&#10003;</span>
          </>
        ) : (
          <>
            <span className="text-zinc-600 font-mono text-xs">{value}</span>
            <span className="text-red-400 text-xs">&#10007;</span>
          </>
        )}
      </div>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-zinc-400">{description}</p>
    </div>
  );
}
