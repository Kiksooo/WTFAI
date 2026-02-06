import { useState } from 'react';
import { FeedScreen } from '@/components/Feed/FeedScreen';
import { GenerateScreen } from '@/components/Generate/GenerateScreen';
import { ProfileScreen } from '@/components/Profile/ProfileScreen';
import './App.css';

type Screen = 'feed' | 'generate' | 'profile';

export default function App() {
  const [screen, setScreen] = useState<Screen>('feed');

  return (
    <div className="app">
      {screen === 'feed' && (
        <FeedScreen
          onNavigateGenerate={() => setScreen('generate')}
          onNavigateProfile={() => setScreen('profile')}
        />
      )}
      {screen === 'generate' && (
        <GenerateScreen onBack={() => setScreen('feed')} />
      )}
      {screen === 'profile' && (
        <ProfileScreen onBack={() => setScreen('feed')} />
      )}

      <nav className="bottom-nav">
        <button
          type="button"
          className={`nav-btn ${screen === 'feed' ? 'active' : ''}`}
          onClick={() => setScreen('feed')}
          aria-label="Feed"
        >
          🎬
        </button>
        <button
          type="button"
          className={`nav-btn ${screen === 'generate' ? 'active' : ''}`}
          onClick={() => setScreen('generate')}
          aria-label="Create"
        >
          ✨
        </button>
        <button
          type="button"
          className={`nav-btn ${screen === 'profile' ? 'active' : ''}`}
          onClick={() => setScreen('profile')}
          aria-label="Profile"
        >
          👤
        </button>
      </nav>
    </div>
  );
}
