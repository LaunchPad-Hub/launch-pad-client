import * as React from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import AuthProvider from "@/context/AuthContext";
import RequireAuth from "@/components/RequireAuth";
import GuestOnly from "@/components/GuestOnly";

import AppLayout from "@/layouts/AppLayout";
import AuthLayout from "@/layouts/AuthLayout";
import RunnerLayout from "@/layouts/RunnerLayout";

// Lazy pages
const Dashboard = React.lazy(() => import("@/app/pages/Dashboard"));
const Colleges = React.lazy(() => import("@/app/pages/Colleges"));
const Students = React.lazy(() => import("@/app/pages/Students"));
const Modules = React.lazy(() => import("@/app/pages/Modules"));
const Assessments = React.lazy(() => import("@/app/pages/Assessments"));
const Evaluate = React.lazy(() => import("@/app/pages/Evaluate"));
const ReportsOverview = React.lazy(() => import("@/app/pages/ReportsOverview"));
const Account = React.lazy(() => import("@/app/pages/Account"));
const Login = React.lazy(() => import("@/app/pages/Auth/Login"));
const SignUp = React.lazy(() => import("@/app/pages/Auth/SignUp"));
const NotFound = React.lazy(() => import("@/app/pages/NotFound"));
const AssessmentEngine = React.lazy(() => import("@/app/pages/AssessmentEngine"));

function withSuspense(node: React.ReactNode) {
  return <React.Suspense fallback={null}>{node}</React.Suspense>;
}

function Providers() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

export const router = createBrowserRouter([
  {
    element: <Providers />,
    children: [
      /* ---------------------- AUTH ROUTES ON /auth ---------------------- */
      {
        path: "/auth",
        element: <AuthLayout />,
        children: [
          {
            element: <GuestOnly />,
            children: [
              { index: true, element: <Navigate to="login" replace /> },
              { path: "login", element: withSuspense(<Login />) },
              { path: "sign-up", element: withSuspense(<SignUp />) },
            ],
          },
        ],
      },

      /* ---------------------- APP ROUTES ON / (authenticated) ---------------------- */
      {
        path: "/",
        element: <AppLayout />,
        children: [
          {
            element: <RequireAuth />,
            children: [
              // Neutral default page
              { index: true, element: withSuspense(<Dashboard />) },

              // Common
              { path: "assessments", element: withSuspense(<Assessments />) },
              { path: "evaluate", element: withSuspense(<Evaluate />) },
              { path: "account", element: withSuspense(<Account />) },

              // Admin (links hidden by role in sidebar)
              { path: "dashboard", element: withSuspense(<Dashboard />) },
              { path: "colleges", element: withSuspense(<Colleges />) },
              { path: "students", element: withSuspense(<Students />) },
              { path: "modules", element: withSuspense(<Modules />) },
              { path: "reports/overview", element: withSuspense(<ReportsOverview />) },
            ],
          },
        ],
      },

      /* ---------------------- RUNNER LAYOUT ---------------------- */
      {
        path: "/assessment",
        element: <RunnerLayout />,
        children: [
          {
            element: <RequireAuth />,
            children: [
              // Point the runner route to the engine
              { path: "attempt", element: withSuspense(<AssessmentEngine />) },
            ],
          },
        ],
      },

      /* ---------------------- FALLBACK ---------------------- */
      { path: "*", element: withSuspense(<NotFound />) },
    ],
  },
]);
