import { configureStore } from '@reduxjs/toolkit';
import scoreReducer from './scoreSlice';

export const store = configureStore({
  reducer: {
    score: scoreReducer,
  },
});

// Type cho useSelector, useDispatch
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
