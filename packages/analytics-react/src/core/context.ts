import { createContext } from 'react';

import type { AnalyticsContextValue } from '../shared/types';

export const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);
