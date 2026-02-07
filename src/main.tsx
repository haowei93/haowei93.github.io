import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Index from './pages';
import NotFound from './pages/404';
import ReactGA from 'react-ga4';
import {
  GOOGLE_ANALYTICS_TRACKING_ID,
  USE_GOOGLE_ANALYTICS,
} from './utils/const';
import '@/styles/index.css';
import { withOptionalGAPageTracking } from './utils/trackRoute';
import HomePage from '@/pages/total';
import LandingPage from '@/pages/home';
import RegisterPage from '@/pages/register';

if (USE_GOOGLE_ANALYTICS) {
  ReactGA.initialize(GOOGLE_ANALYTICS_TRACKING_ID);
}

const routes = createBrowserRouter(
  [
    {
      path: '/',
      element: withOptionalGAPageTracking(<Index />), // Switch root back to Index (our map component) which now handles logic
    },
    {
      path: '/home', // Move LandingPage to explicit path or fallback inside Index
      element: withOptionalGAPageTracking(<LandingPage />),
    },
    {
      path: 'summary',
      element: withOptionalGAPageTracking(<HomePage />),
    },
    {
      path: 'register',
      element: withOptionalGAPageTracking(<RegisterPage />),
    },
    {
      path: 'users/:id',
      element: withOptionalGAPageTracking(<Index />),
    },
    {
      path: 'users/:id/summary',
      element: withOptionalGAPageTracking(<HomePage />),
    },
    {
      path: '*',
      element: withOptionalGAPageTracking(<NotFound />),
    },
  ],
  { basename: import.meta.env.BASE_URL }
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <RouterProvider router={routes} />
    </HelmetProvider>
  </React.StrictMode>
);
