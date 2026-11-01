import React, { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';
import CaptionList from './CaptionList';
import VideoPlayer from './VideoPlayer';
import StylePanel from './StylePanel';
import EditorToolbar from './EditorToolbar';
import Timeline from './Timeline';

interface EditorProps {
  projectId: string;
  onBack: () => void;
}

export default function Editor({ projectId, onBack }: EditorProps) {
  const { dispatch, notify } = useAppContext();

  useEffect(() => {
    const loadProject = async () => {
      try {
        const project = await api.projects.get(projectId);
        dispatch({ type: 'SET_PROJECT', payload: project });
      } catch (err: any) {
        notify('error', `Failed to load project: ${err.message}`);
        onBack();
      }
    };
    loadProject();
  }, [projectId]);

  return (
    <div className="h-screen flex flex-col bg-surface-100 overflow-hidden font-sans">
      {/* Top Application Bar */}
      <EditorToolbar onBack={onBack} />

      {/* Main 3-Column Editing Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Column: Captions */}
        <div className="w-80 flex-shrink-0 border-r border-border bg-surface-50 overflow-hidden flex flex-col">
          <CaptionList />
        </div>

        {/* Center Column: Video Stage + Bottom Timeline */}
        <div className="flex-1 flex flex-col overflow-hidden bg-surface-100 min-w-0">
          <div className="flex-1 overflow-hidden min-h-0">
            <VideoPlayer />
          </div>
          <Timeline />
        </div>

        {/* Right Column: Properties Inspector */}
        <div className="w-80 flex-shrink-0 border-l border-border bg-surface-50 overflow-hidden flex flex-col">
          <StylePanel />
        </div>
      </div>
    </div>
  );
}
