'use client';

import { useUser, UserButton, useClerk } from '@clerk/nextjs';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  Globe, Folder, LogOut, MessageSquare, 
  Moon, Sun, ChevronDown, ChevronRight, Hexagon,
  History, Sparkles
} from 'lucide-react';
import Link from 'next/link';

export default function Sidebar() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const pathname = usePathname();
  
  const [worlds, setWorlds] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [theme, setTheme] = useState('dark');
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    // Load theme from localStorage on mount
    const savedTheme = localStorage.getItem('xrplot-theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  useEffect(() => {
    // Only fetch if authenticated
    if (isLoaded && user) {
      fetchData();
    }
  }, [isLoaded, user]);

  const fetchData = async () => {
    try {
      const [worldsRes, foldersRes] = await Promise.all([
        fetch('/api/worlds'),
        fetch('/api/folders')
      ]);
      
      if (worldsRes.ok) setWorlds(await worldsRes.json());
      if (foldersRes.ok) setFolders(await foldersRes.json());
    } catch (err) {
      console.error('Failed to fetch data for sidebar:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('xrplot-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const rootFolders = folders.filter(f => !f.parentId);
  const rootWorlds = worlds.filter(w => !w.isPredictionWorld && !w.folderId);
  const predictionWorlds = worlds.filter(w => w.isPredictionWorld);

  if (!isLoaded || (!user && !signingOut)) return null;

  return (
    <div className="app-sidebar">
      <div className="sidebar-header" onClick={() => router.push('/dashboard')}>
        <Hexagon size={28} className="brand-icon" strokeWidth={2.5} />
        <span className="brand-text">XRPlot</span>
      </div>

      <div className="sidebar-content">
        {/* Main Navigation */}
        <div className="sidebar-section">
          <Link href="/dashboard" className={`sidebar-item ${pathname === '/dashboard' ? 'active' : ''}`}>
            <Globe size={18} />
            <span>Dashboard</span>
          </Link>
          <Link href="/chat" className={`sidebar-item chat-item ${pathname === '/chat' ? 'active' : ''}`}>
            <Sparkles size={18} />
            <span>Agentic AI Chat</span>
          </Link>
          <Link href="/prediction" className={`sidebar-item ${pathname === '/prediction' ? 'active' : ''}`}>
            <History size={18} />
            <span>Decade 2.0</span>
          </Link>
        </div>

        {/* Folders & Worlds Navigation */}
        <div className="sidebar-section scrollable">
          <h3 className="section-title">Your Content</h3>
          
          {loading ? (
            <div style={{ padding: '0 16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading...</div>
          ) : (
            <div className="tree-nav">
              {/* Folders */}
              {rootFolders.map(folder => (
                <div key={folder._id} className="tree-node">
                  <div 
                    className="tree-item"
                    onClick={() => toggleFolder(folder._id)}
                  >
                    {expandedFolders[folder._id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <Folder size={16} className="text-violet" />
                    <span>{folder.name}</span>
                  </div>
                  
                  {expandedFolders[folder._id] && (
                    <div className="tree-children">
                      {/* Note: This is a shallow implementation. Could be recursive for deep folders. */}
                      {worlds.filter(w => w.folderId === folder._id).map(w => (
                        <Link 
                          key={w._id} 
                          href={`/worlds/${w._id}`}
                          className={`tree-item sub-item ${pathname === `/worlds/${w._id}` ? 'active' : ''}`}
                        >
                          <Globe size={14} />
                          <span className="truncate">{w.name}</span>
                        </Link>
                      ))}
                      {worlds.filter(w => w.folderId === folder._id).length === 0 && (
                        <div className="empty-sub">Empty</div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Root Worlds */}
              {rootWorlds.length > 0 && (
                <div className="root-worlds-list">
                  {rootWorlds.map(w => (
                    <Link 
                      key={w._id} 
                      href={`/worlds/${w._id}`}
                      className={`tree-item ${pathname === `/worlds/${w._id}` ? 'active' : ''}`}
                    >
                      <Globe size={16} />
                      <span className="truncate">{w.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="user-profile">
          <UserButton afterSignOutUrl="/sign-in" appearance={{
            elements: { userButtonAvatarBox: 'w-8 h-8' }
          }} />
          <div className="user-info">
            <span className="user-name truncate">{user.fullName || user.username || 'User'}</span>
            <span className="user-email truncate">{user.primaryEmailAddress?.emailAddress}</span>
          </div>
        </div>

        <div className="sidebar-actions">
          <button className="icon-btn" onClick={toggleTheme} title="Toggle Theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="icon-btn" onClick={async () => { 
            try { 
              await signOut(); 
              router.push('/sign-in');
            } catch (err) { 
              console.error('Sign out failed:', err);
              router.push('/sign-in'); 
            } 
          }} title="Sign Out">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
