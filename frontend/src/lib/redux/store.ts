import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import graphReducer from './slices/graphSlice';

// Create the listener middleware instance
export const listenerMiddleware = createListenerMiddleware();

export const store = configureStore({
  reducer: {
    graph: graphReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(listenerMiddleware.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
