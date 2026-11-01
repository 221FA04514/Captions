import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { ProjectData, CaptionCue, SubtitleStyle, VideoMetadata, ExportJob, StylingScope } from '../types';
import { DEFAULT_STYLE, SUBTITLE_PRESETS } from '../types';
import { v4 as uuidv4 } from 'uuid';

// ----- State -----
export interface AppState {
  project: ProjectData | null;
  projectDirty: boolean;
  currentTime: number;       // video playback position in seconds
  seekTarget: number | null; // requested seek timestamp
  activeCueId: string | null;
  stylingScope: StylingScope; // 'all' | 'selected'
  exportJob: ExportJob | null;
  isExporting: boolean;
  notifications: Notification[];
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

const initialState: AppState = {
  project: null,
  projectDirty: false,
  currentTime: 0,
  seekTarget: null,
  activeCueId: null,
  stylingScope: 'all',
  exportJob: null,
  isExporting: false,
  notifications: [],
};

// ----- Actions -----
type Action =
  | { type: 'SET_PROJECT'; payload: ProjectData }
  | { type: 'UPDATE_VIDEO'; payload: VideoMetadata }
  | { type: 'SET_CAPTIONS'; payload: CaptionCue[] }
  | { type: 'ADD_CAPTION'; payload: CaptionCue }
  | { type: 'UPDATE_CAPTION'; payload: CaptionCue }
  | { type: 'DELETE_CAPTION'; payload: string }
  | { type: 'APPLY_OFFSET'; payload: number }
  | { type: 'SET_STYLE'; payload: SubtitleStyle }
  | { type: 'UPDATE_SELECTED_CUE_STYLE'; payload: Partial<SubtitleStyle> }
  | { type: 'SET_STYLING_SCOPE'; payload: StylingScope }
  | { type: 'SET_CURRENT_TIME'; payload: number }
  | { type: 'SEEK_TO'; payload: number }
  | { type: 'CLEAR_SEEK_TARGET' }
  | { type: 'SET_ACTIVE_CUE'; payload: string | null }
  | { type: 'SET_EXPORT_JOB'; payload: ExportJob | null }
  | { type: 'SET_IS_EXPORTING'; payload: boolean }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'MARK_SAVED' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_PROJECT':
      return { ...state, project: action.payload, projectDirty: false };

    case 'UPDATE_VIDEO':
      if (!state.project) return state;
      return {
        ...state,
        project: { ...state.project, video: action.payload },
        projectDirty: true,
      };

    case 'SET_CAPTIONS': {
      if (!state.project) return state;
      const sorted = [...action.payload].sort((a, b) => a.startTime - b.startTime);
      return {
        ...state,
        project: { ...state.project, captions: sorted },
        projectDirty: true,
      };
    }

    case 'ADD_CAPTION': {
      if (!state.project) return state;
      const sorted = [...state.project.captions, action.payload].sort((a, b) => a.startTime - b.startTime);
      return {
        ...state,
        project: { ...state.project, captions: sorted },
        activeCueId: action.payload.id,
        projectDirty: true,
      };
    }

    case 'UPDATE_CAPTION': {
      if (!state.project) return state;
      const updated = state.project.captions.map((c) =>
        c.id === action.payload.id ? action.payload : c
      );
      const sorted = updated.sort((a, b) => a.startTime - b.startTime);
      return {
        ...state,
        project: { ...state.project, captions: sorted },
        projectDirty: true,
      };
    }

    case 'DELETE_CAPTION': {
      if (!state.project) return state;
      const filtered = state.project.captions.filter((c) => c.id !== action.payload);
      return {
        ...state,
        project: { ...state.project, captions: filtered },
        activeCueId: state.activeCueId === action.payload ? null : state.activeCueId,
        projectDirty: true,
      };
    }

    case 'APPLY_OFFSET': {
      if (!state.project) return state;
      const offset = action.payload;
      const cues = state.project.captions.map((cue) => {
        const duration = Math.max(0.1, cue.endTime - cue.startTime);
        const newStart = Math.max(0, Math.round((cue.startTime + offset) * 1000) / 1000);
        return { ...cue, startTime: newStart, endTime: Math.round((newStart + duration) * 1000) / 1000 };
      });
      return {
        ...state,
        project: { ...state.project, captions: cues },
        projectDirty: true,
      };
    }

    case 'SET_STYLE': {
      if (!state.project) return state;
      // When applying to ALL, we update project.style AND clear individual cue style overrides so all captions inherit the new style
      const clearedOverrides = state.project.captions.map((c) => ({
        ...c,
        styleOverride: undefined,
      }));
      return {
        ...state,
        project: {
          ...state.project,
          style: action.payload,
          captions: clearedOverrides,
        },
        projectDirty: true,
      };
    }

    case 'UPDATE_SELECTED_CUE_STYLE': {
      if (!state.project || !state.activeCueId) return state;
      const updated = state.project.captions.map((c) => {
        if (c.id === state.activeCueId) {
          return {
            ...c,
            styleOverride: {
              ...(c.styleOverride || {}),
              ...action.payload,
            },
          };
        }
        return c;
      });
      return {
        ...state,
        project: { ...state.project, captions: updated },
        projectDirty: true,
      };
    }

    case 'SET_STYLING_SCOPE':
      return { ...state, stylingScope: action.payload };

    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload };

    case 'SEEK_TO':
      return { ...state, currentTime: action.payload, seekTarget: action.payload };

    case 'CLEAR_SEEK_TARGET':
      return { ...state, seekTarget: null };

    case 'SET_ACTIVE_CUE':
      return { ...state, activeCueId: action.payload };

    case 'SET_EXPORT_JOB':
      return { ...state, exportJob: action.payload };

    case 'SET_IS_EXPORTING':
      return { ...state, isExporting: action.payload };

    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [...state.notifications, action.payload] };

    case 'REMOVE_NOTIFICATION':
      return { ...state, notifications: state.notifications.filter((n) => n.id !== action.payload) };

    case 'MARK_SAVED':
      return { ...state, projectDirty: false };

    default:
      return state;
  }
}

// ----- Context -----
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  notify: (type: Notification['type'], message: string) => void;
  dismissNotification: (id: string) => void;
  seekTo: (time: number) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const notify = useCallback((type: Notification['type'], message: string) => {
    const id = uuidv4();
    dispatch({ type: 'ADD_NOTIFICATION', payload: { id, type, message } });
    setTimeout(() => dispatch({ type: 'REMOVE_NOTIFICATION', payload: id }), 5000);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  }, []);

  const seekTo = useCallback((time: number) => {
    dispatch({ type: 'SEEK_TO', payload: Math.max(0, time) });
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch, notify, dismissNotification, seekTo }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
}

export function useActiveCue(): CaptionCue | null {
  const { state } = useAppContext();
  if (!state.project || !state.activeCueId) return null;
  return state.project.captions.find((c) => c.id === state.activeCueId) ?? null;
}

export function buildNewCue(afterTime: number): CaptionCue {
  return {
    id: uuidv4(),
    index: 0,
    startTime: Math.round(afterTime * 1000) / 1000,
    endTime: Math.round((afterTime + 3) * 1000) / 1000,
    text: '',
  };
}
