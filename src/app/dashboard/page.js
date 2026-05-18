'use client';

import { useUser, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

const worldTypes = [
  {
    id: 'indoor',
    label: 'Indoor spaces',
    description: 'Rooms, galleries, homes, offices, hotels, and other interior walkthroughs.',
  },
  {
    id: 'outdoor',
    label: 'Outdoor locations',
    description: 'Gardens, campuses, plazas, streets, and open-air attractions.',
  },
  {
    id: 'mixed',
    label: 'Mixed venue',
    description: 'A larger tour that combines indoor rooms with outdoor zones.',
  },
];

const firstSpaceOptions = [
  {
    id: 'capture',
    label: 'Capture with camera',
    description: 'Use the guided camera flow to build your first panorama.',
  },
  {
    id: 'upload',
    label: 'Upload panorama',
    description: 'Start from a ready-made 360 image and place it on the map.',
  },
  {
    id: 'blank',
    label: 'Start blank',
    description: 'Create the node map first and add panoramas when you are ready.',
  },
];

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const [worlds, setWorlds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(null);
  const [creating, setCreating] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [newWorld, setNewWorld] = useState({
    name: '',
    description: '',
    type: 'indoor',
    firstSpace: 'capture',
  });

  const fetchWorlds = useCallback(async () => {
    try {
      const res = await fetch('/api/worlds');
      if (res.ok) {
        const data = await res.json();
        setWorlds(data);
      }
    } catch (err) {
      console.error('Failed to fetch worlds:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorlds();
  }, [fetchWorlds]);

  const resetWizard = () => {
    setWizardStep(1);
    setNewWorld({
      name: '',
      description: '',
      type: 'indoor',
      firstSpace: 'capture',
    });
  };

  const openCreate = () => {
    resetWizard();
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!newWorld.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/worlds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newWorld.name.trim(),
          description: [
            newWorld.description.trim(),
            `Venue type: ${worldTypes.find(t => t.id === newWorld.type)?.label || 'Indoor spaces'}`,
            `First space: ${firstSpaceOptions.find(o => o.id === newWorld.firstSpace)?.label || 'Capture with camera'}`,
          ].filter(Boolean).join('\n'),
        }),
      });
      if (res.ok) {
        const world = await res.json();
        router.push(`/worlds/${world._id}`);
      }
    } catch (err) {
      console.error('Failed to create world:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (worldId) => {
    try {
      const res = await fetch(`/api/worlds/${worldId}`, { method: 'DELETE' });
      if (res.ok) {
        setWorlds(prev => prev.filter(w => w._id !== worldId));
        setShowDelete(null);
      }
    } catch (err) {
      console.error('Failed to delete world:', err);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const totals = worlds.reduce((acc, world) => {
    acc.nodes += world.nodes?.length || 0;
    acc.ready += world.nodes?.filter(n => n.panoramaUrl || n.status === 'ready').length || 0;
    acc.edges += world.edges?.length || 0;
    return acc;
  }, { nodes: 0, ready: 0, edges: 0 });

  const onboardingSteps = [
    { label: 'Create a world', done: worlds.length > 0 },
    { label: 'Add spaces', done: totals.nodes > 0 },
    { label: 'Add panoramas', done: totals.ready > 0 },
    { label: 'Connect and preview', done: totals.edges > 0 },
  ];
  const completedSteps = onboardingSteps.filter(s => s.done).length;

  const canAdvance = wizardStep !== 1 || newWorld.name.trim();

  return (
    <main className="app-shell">
      <div className="surface-grid" />

      <nav className="top-nav">
        <button className="brand-mark" onClick={() => router.push('/dashboard')} aria-label="XRPlot dashboard">
          <span className="brand-glyph">XR</span>
          <span>XRPlot</span>
        </button>
        <div className="top-nav-actions">
          <button className="btn btn-secondary" onClick={() => router.push('/create-tour')}>
            AI camera
          </button>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </nav>

      <section className="dashboard-v2">
        <header className="welcome-panel">
          <div>
            <p className="eyebrow">World builder</p>
            <h1>Build a tour map before the project work begins.</h1>
            <p className="welcome-copy">
              Welcome back{user?.firstName ? `, ${user.firstName}` : ''}. Create a world, add spaces as nodes,
              connect them as portals, then upload or capture panoramas when each space is ready.
            </p>
          </div>
          <div className="welcome-actions">
            <button className="btn btn-primary btn-lg" onClick={openCreate}>New world</button>
            <button className="btn btn-secondary btn-lg" onClick={() => router.push('/create-tour')}>Capture panorama</button>
          </div>
        </header>

        <section className="setup-strip" aria-label="Setup progress">
          <div className="progress-ring" style={{ '--progress': `${(completedSteps / onboardingSteps.length) * 100}%` }}>
            <span>{completedSteps}/{onboardingSteps.length}</span>
          </div>
          <div className="setup-copy">
            <p className="section-kicker">Suggested setup path</p>
            <h2>Follow these steps to get a usable world quickly.</h2>
            <div className="step-pills">
              {onboardingSteps.map((step, index) => (
                <span key={step.label} className={`step-pill ${step.done ? 'done' : completedSteps === index ? 'active' : ''}`}>
                  <span className="step-dot" />
                  {step.label}
                </span>
              ))}
            </div>
          </div>
          <button className="btn btn-secondary" onClick={openCreate}>Start guided setup</button>
        </section>

        <section className="metric-row" aria-label="Workspace summary">
          <div className="metric-card">
            <span className="metric-value">{worlds.length}</span>
            <span className="metric-label">Worlds</span>
          </div>
          <div className="metric-card">
            <span className="metric-value">{totals.nodes}</span>
            <span className="metric-label">Spaces</span>
          </div>
          <div className="metric-card">
            <span className="metric-value">{totals.ready}</span>
            <span className="metric-label">Ready panoramas</span>
          </div>
          <div className="metric-card">
            <span className="metric-value">{totals.edges}</span>
            <span className="metric-label">Connections</span>
          </div>
        </section>

        <div className="section-header">
          <div>
            <p className="section-kicker">Your worlds</p>
            <h2>Continue building</h2>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>Create world</button>
        </div>

        {loading ? (
          <div className="worlds-grid">
            {[1, 2, 3].map(i => (
              <div key={i} className="world-tile">
                <div className="skeleton tile-thumb" />
                <div className="skeleton" style={{ height: 20, width: '62%', marginBottom: 10 }} />
                <div className="skeleton" style={{ height: 14, width: '42%' }} />
              </div>
            ))}
          </div>
        ) : worlds.length === 0 ? (
          <div className="empty-workspace">
            <div className="empty-map-preview">
              <span className="preview-node n1" />
              <span className="preview-node n2" />
              <span className="preview-node n3" />
              <span className="preview-edge e1" />
              <span className="preview-edge e2" />
            </div>
            <h2>No worlds yet</h2>
            <p>Start with a guided setup so the project has a clear structure before you add detailed panorama work.</p>
            <div className="empty-actions">
              <button className="btn btn-primary btn-lg" onClick={openCreate}>Create your first world</button>
              <button className="btn btn-secondary btn-lg" onClick={() => router.push('/create-tour')}>Try camera capture</button>
            </div>
          </div>
        ) : (
          <div className="worlds-grid">
            <button className="new-world-tile" onClick={openCreate}>
              <span className="new-world-plus">+</span>
              <strong>Create a new world</strong>
              <span>Guided setup, venue type, and first-space plan.</span>
            </button>
            {worlds.map(world => {
              const readyCount = world.nodes?.filter(n => n.panoramaUrl || n.status === 'ready').length || 0;
              const nodeCount = world.nodes?.length || 0;
              const edgeCount = world.edges?.length || 0;
              return (
                <article
                  key={world._id}
                  className="world-tile"
                  onClick={() => router.push(`/worlds/${world._id}`)}
                >
                  <div className="tile-thumb">
                    {world.nodes?.some(n => n.panoramaUrl) ? (
                      <img src={world.nodes.find(n => n.panoramaUrl)?.panoramaUrl} alt={world.name} />
                    ) : (
                      <div className="tile-map">
                        <span />
                        <span />
                        <span />
                      </div>
                    )}
                    <span className="tile-badge">{readyCount}/{Math.max(nodeCount, 1)} ready</span>
                  </div>
                  <div className="tile-content">
                    <h3>{world.name}</h3>
                    <p>{world.description?.split('\n')?.[0] || 'No description added yet.'}</p>
                    <div className="tile-meta">
                      <span>{nodeCount} spaces</span>
                      <span>{edgeCount} links</span>
                      <span>Updated {formatDate(world.updatedAt)}</span>
                    </div>
                    <div className="world-card-actions" onClick={e => e.stopPropagation()}>
                      <button className="btn btn-secondary" onClick={() => router.push(`/worlds/${world._id}`)}>
                        Edit map
                      </button>
                      <button className="btn btn-danger" onClick={() => setShowDelete(world._id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="setup-modal" onClick={e => e.stopPropagation()}>
            <div className="setup-modal-header">
              <div>
                <p className="section-kicker">New world setup</p>
                <h2>{wizardStep === 1 ? 'Name your world' : wizardStep === 2 ? 'Choose the venue type' : 'Plan the first space'}</h2>
              </div>
              <button className="modal-close" onClick={() => setShowCreate(false)} aria-label="Close">x</button>
            </div>
            <div className="wizard-progress">
              {['Name', 'Type', 'First space'].map((label, index) => (
                <span key={label} className={index + 1 < wizardStep ? 'done' : index + 1 === wizardStep ? 'active' : ''}>
                  {label}
                </span>
              ))}
            </div>

            {wizardStep === 1 && (
              <div className="wizard-body">
                <label className="field-label" htmlFor="world-name">World name</label>
                <input
                  id="world-name"
                  className="input input-lg"
                  placeholder="Museum grand tour, office walkthrough, campus map..."
                  value={newWorld.name}
                  onChange={e => setNewWorld(prev => ({ ...prev, name: e.target.value }))}
                  autoFocus
                />
                <label className="field-label" htmlFor="world-description">Short description</label>
                <input
                  id="world-description"
                  className="input"
                  placeholder="What should visitors understand about this place?"
                  value={newWorld.description}
                  onChange={e => setNewWorld(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            )}

            {wizardStep === 2 && (
              <div className="choice-stack">
                {worldTypes.map(type => (
                  <button
                    key={type.id}
                    className={`choice-row ${newWorld.type === type.id ? 'selected' : ''}`}
                    onClick={() => setNewWorld(prev => ({ ...prev, type: type.id }))}
                  >
                    <span className="choice-icon">{type.id.slice(0, 2).toUpperCase()}</span>
                    <span>
                      <strong>{type.label}</strong>
                      <small>{type.description}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {wizardStep === 3 && (
              <div className="choice-grid">
                {firstSpaceOptions.map(option => (
                  <button
                    key={option.id}
                    className={`choice-card ${newWorld.firstSpace === option.id ? 'selected' : ''}`}
                    onClick={() => setNewWorld(prev => ({ ...prev, firstSpace: option.id }))}
                  >
                    <span className="choice-icon">{option.id.slice(0, 2).toUpperCase()}</span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </button>
                ))}
              </div>
            )}

            <div className="modal-actions setup-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => wizardStep === 1 ? setShowCreate(false) : setWizardStep(step => step - 1)}
              >
                {wizardStep === 1 ? 'Cancel' : 'Back'}
              </button>
              <span className="wizard-count">Step {wizardStep} of 3</span>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!canAdvance || creating}
                onClick={() => wizardStep < 3 ? setWizardStep(step => step + 1) : handleCreate()}
              >
                {creating ? 'Creating...' : wizardStep < 3 ? 'Continue' : 'Create world'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDelete && (
        <div className="modal-overlay" onClick={() => setShowDelete(null)}>
          <div className="modal-content confirm-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h2>Delete world?</h2>
            <p>This permanently deletes the world and its images. This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(showDelete)}>Delete forever</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
