import React, { useState } from 'react';

export default function App() {
  const [tab, setTab] = useState<'home' | 'results' | 'tracks'>('home');
  return (
    <div className="min-h-screen bg-brand-bg text-white">
      <div className="mx-auto max-w-md p-4">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-brand">Tripz</h1>
          <p className="text-sm text-brand-muted">Smart weekend escapes from Singapore</p>
        </header>
        <nav className="mb-6 grid grid-cols-3 gap-2 text-sm">
          <button className={`card p-3 text-center transition ${tab==='home'?'bg-brand text-white':'bg-surface-2 text-brand-muted'}`} onClick={() => setTab('home')}>Home</button>
          <button className={`card p-3 text-center transition ${tab==='results'?'bg-brand text-white':'bg-surface-2 text-brand-muted'}`} onClick={() => setTab('results')}>Results</button>
          <button className={`card p-3 text-center transition ${tab==='tracks'?'bg-brand text-white':'bg-surface-2 text-brand-muted'}`} onClick={() => setTab('tracks')}>My Tracks</button>
        </nav>
        {tab === 'home' && <Home />}
        {tab === 'results' && <Results />}
        {tab === 'tracks' && <Tracks />}
      </div>
    </div>
  );
}

function Home() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Find a smart weekend escape</h2>
        <p className="text-sm text-brand-muted">Discover the best deals from Singapore</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">When</label>
          <div className="flex gap-2">
            <button className="btn-primary text-sm px-4 py-2">This weekend</button>
            <button className="card text-sm px-4 py-2 text-brand-muted">Next weekend</button>
            <button className="card text-sm px-4 py-2 text-brand-muted">Long weekend</button>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Vibe</label>
          <div className="flex flex-wrap gap-2">
            {['Beach', 'Food', 'Nature', 'City', 'Family'].map((v) => (
              <button key={v} className="card px-3 py-2 text-sm text-brand-muted hover:bg-surface-3 transition">
                {v}
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Budget: S$400</label>
          <input type="range" min={100} max={1200} defaultValue={400} className="w-full accent-brand" />
          <div className="flex justify-between text-xs text-brand-muted mt-1">
            <span>S$100</span>
            <span>S$1200</span>
          </div>
        </div>
        
        <button className="btn-primary w-full py-3 text-base font-medium">
          Find Getaways
        </button>
      </div>
    </div>
  );
}

function Results() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">6 getaways found</h2>
        <select className="card bg-surface-2 text-sm px-3 py-2">
          <option>Best</option>
          <option>Cheapest</option>
          <option>Shortest</option>
        </select>
      </div>
      
      <div className="grid gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-4 hover:bg-surface-3 transition">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">Bangkok</div>
              <div className="text-xl font-bold text-brand">S${199 + i * 20}</div>
            </div>
            <div className="text-sm text-brand-muted mb-2">SQ • 2h 30m • 1 stop</div>
            <div className="flex items-center justify-between">
              <span className="text-xs bg-brand-accent/20 text-brand-accent px-2 py-1 rounded-full">Leave Hack</span>
              <button className="card text-sm px-3 py-1 hover:bg-surface-3 transition">Track</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tracks() {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">My Tracks</h2>
        <p className="text-sm text-brand-muted">Get notified when prices drop</p>
      </div>
      
      <div className="space-y-3">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">SIN → DPS</div>
            <div className="text-sm text-brand-muted">Max S$250</div>
          </div>
          <div className="text-xs text-brand-muted mb-3">Last checked: 2 hours ago</div>
          <div className="flex gap-2">
            <button className="card text-sm px-3 py-1 hover:bg-surface-3 transition">Edit</button>
            <button className="card text-sm px-3 py-1 hover:bg-surface-3 transition">Test alert</button>
            <button className="text-sm text-brand-danger px-3 py-1">Delete</button>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">SIN → BKK</div>
            <div className="text-sm text-brand-muted">Max S$180</div>
          </div>
          <div className="text-xs text-brand-muted mb-3">Last checked: 1 hour ago</div>
          <div className="flex gap-2">
            <button className="card text-sm px-3 py-1 hover:bg-surface-3 transition">Edit</button>
            <button className="card text-sm px-3 py-1 hover:bg-surface-3 transition">Test alert</button>
            <button className="text-sm text-brand-danger px-3 py-1">Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
} 