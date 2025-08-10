import React, { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Route } from '../navigation/AppNavigator';

export type CaptureResult = {
  id: string;
  timestamp: number;
  imageUri: string;
  mode: 'scene' | 'ocr' | 'qa';
  question?: string;
  result: string;
  timings?: { prep?: number; model?: number; total?: number };
  structured?: {
    immediate?: string;
    objects?: string[];
    navigation?: string;
  };
};

type AppState = {
  currentRoute: Route;
  isLoading: boolean;
  error: string | null;
  currentCapture: CaptureResult | null;
  history: CaptureResult[];
  hasCompletedOnboarding: boolean;
};

type AppAction = 
  | { type: 'NAVIGATE'; route: Route }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_CAPTURE_RESULT'; result: CaptureResult }
  | { type: 'ADD_TO_HISTORY'; result: CaptureResult }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'CLEAR_CURRENT_CAPTURE' };

const initialState: AppState = {
  currentRoute: 'landing',
  isLoading: false,
  error: null,
  currentCapture: null,
  history: [],
  hasCompletedOnboarding: false,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'NAVIGATE':
      return { ...state, currentRoute: action.route, error: null };
    case 'SET_LOADING':
      return { ...state, isLoading: action.loading };
    case 'SET_ERROR':
      return { ...state, error: action.error, isLoading: false };
    case 'SET_CAPTURE_RESULT':
      return { ...state, currentCapture: action.result, isLoading: false };
    case 'ADD_TO_HISTORY':
      return { ...state, history: [action.result, ...state.history.slice(0, 49)] };
    case 'COMPLETE_ONBOARDING':
      return { ...state, hasCompletedOnboarding: true };
    case 'CLEAR_CURRENT_CAPTURE':
      return { ...state, currentCapture: null };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load persisted onboarding state
  useEffect(() => {
    (async () => {
      try {
        const done = await AsyncStorage.getItem('nadar.onboarding.v1');
        if (done === '1') {
          dispatch({ type: 'COMPLETE_ONBOARDING' });
          dispatch({ type: 'NAVIGATE', route: 'capture' });
        }
      } catch {}
    })();
  }, []);

  // Persist onboarding completion
  useEffect(() => {
    if (state.hasCompletedOnboarding) {
      AsyncStorage.setItem('nadar.onboarding.v1', '1').catch(() => {});
    }
  }, [state.hasCompletedOnboarding]);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppState must be used within AppProvider');
  return context;
}
