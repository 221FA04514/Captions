import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import LandingPage from './components/LandingPage';
import Editor from './components/Editor';
import NotificationToasts from './components/NotificationToasts';

type View = { screen: 'landing' } | { screen: 'editor'; projectId: string };

function AppInner() {
  const [view, setView] = useState<View>({ screen: 'landing' });

  const enterEditor = (projectId: string) => {
    setView({ screen: 'editor', projectId });
  };

  const returnToLanding = () => {
    setView({ screen: 'landing' });
  };

  return (
    <>
      {view.screen === 'landing' && (
        <LandingPage onVideoReady={enterEditor} />
      )}
      {view.screen === 'editor' && (
        <Editor projectId={view.projectId} onBack={returnToLanding} />
      )}
      <NotificationToasts />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
