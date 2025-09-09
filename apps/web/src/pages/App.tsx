import React, { useState } from 'react';

export default function App() {
  const [tab, setTab] = useState<'home' | 'results' | 'tracks'>('home');
  return (
    <div className="mx-auto max-w-md p-4 text-slate-900">
      <header className="mb-4 text-center text-xl font-semibold">Getaway SG</header>
      <nav className="mb-4 grid grid-cols-3 gap-2 text-sm">
        <button className={`rounded border p-2 ${tab==='home'?'bg-slate-900 text-white':''}`} onClick={() => setTab('home')}>Home</button>
        <button className={`rounded border p-2 ${tab==='results'?'bg-slate-900 text-white':''}`} onClick={() => setTab('results')}>Results</button>
        <button className={`rounded border p-2 ${tab==='tracks'?'bg-slate-900 text-white':''}`} onClick={() => setTab('tracks')}>My Tracks</button>
      </nav>
      {tab === 'home' && <Home />}
      {tab === 'results' && <Results />}
      {tab === 'tracks' && <Tracks />}
    </div>
  );
}

function Home() {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm">Dates</label>
        <div className="flex gap-2">
          <button className="rounded-full border px-3 py-1 text-sm">This weekend</button>
          <button className="rounded-full border px-3 py-1 text-sm">Next weekend</button>
        </div>
      </div>
      <div>
        <label className="block text-sm">Vibes</label>
        <div className="flex flex-wrap gap-2">
          {['Beach', 'Food', 'Nature', 'City'].map((v) => (
            <button key={v} className="rounded-full border px-3 py-1 text-sm">{v}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm">Budget</label>
        <input type="range" min={100} max={1000} defaultValue={400} className="w-full" />
      </div>
      <button className="w-full rounded bg-slate-900 p-3 text-white">Search</button>
    </div>
  );
}

function Results() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded border p-3">
          <div className="flex items-center justify-between">
            <div className="font-medium">Destination</div>
            <div className="text-lg font-semibold">$199</div>
          </div>
          <div className="text-sm text-slate-600">Airline • 2h 30m</div>
          <div className="mt-1 text-xs"><span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-700">Leave Hack</span></div>
          <button className="mt-2 w-full rounded border p-2 text-sm">Track Price</button>
        </div>
      ))}
    </div>
  );
}

function Tracks() {
  return (
    <div className="space-y-2 text-sm">
      <div className="rounded border p-3">
        <div className="flex items-center justify-between">
          <div>SIN → DPS • Max $250</div>
          <button className="rounded border px-2 py-1">Send test alert</button>
        </div>
      </div>
      <div className="rounded border p-3">
        <div className="flex items-center justify-between">
          <div>SIN → BKK • Max $180</div>
          <button className="rounded border px-2 py-1">Send test alert</button>
        </div>
      </div>
    </div>
  );
} 