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
const Universities = React.lazy(() => import("@/app/pages/Universities"));
const Students = React.lazy(() => import("@/app/pages/Students"));
const Modules = React.lazy(() => import("@/app/pages/Modules"));
const Assessments = React.lazy(() => import("@/app/pages/Assessments"));
const AssessmentBuilderPage = React.lazy(() => import("@/app/pages/AssessmentBuilder")); 

const Evaluate = React.lazy(() => import("@/app/pages/Evaluate"));
const ReportsOverview = React.lazy(() => import("@/app/pages/ReportsOverview"));
const Account = React.lazy(() => import("@/app/pages/Account"));
const Login = React.lazy(() => import("@/app/pages/Auth/Login"));
const SetPassword = React.lazy(() => import("@/app/pages/Auth/SetPassword"));
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
      /* ---------------------- AUTH ROUTES ---------------------- */
      {
        path: "/auth",
        element: <AuthLayout />,
        children: [
          {
            element: <GuestOnly />,
            children: [
              { index: true, element: <Navigate to="login" replace /> },
              { path: "login", element: withSuspense(<Login />) },
              { path: "set-password", element: withSuspense(<SetPassword />) },
              // { path: "sign-up", element: withSuspense(<SignUp />) },
            ],
          },
        ],
      },

      /* ---------------------- DASHBOARD ROUTES ---------------------- */
      {
        path: "/",
        element: <AppLayout />,
        children: [
          {
            element: <RequireAuth />,
            children: [
              { index: true, element: withSuspense(<Dashboard />) },
              { path: "assessments", element: withSuspense(<Assessments />) },
              { path: "evaluate", element: withSuspense(<Evaluate />) },
              { path: "account", element: withSuspense(<Account />) },
              { path: "dashboard", element: withSuspense(<Dashboard />) },
              { path: "universities", element: withSuspense(<Universities />) },
              { path: "colleges", element: withSuspense(<Colleges />) },
              { path: "students", element: withSuspense(<Students />) },
              // { path: "modules", element: withSuspense(<Modules />) },
              { path: "reports", element: withSuspense(<ReportsOverview />) },
            ],
          },
        ],
      },

      /* ---------------------- RUNNER / BUILDER LAYOUT ---------------------- */
      {
        path: "/assessment",
        element: <RunnerLayout />, // Assumed to be a clean, full-screen layout
        children: [
          {
            element: <RequireAuth />,
            children: [
              // The Student Runner
              { path: "attempt", element: withSuspense(<AssessmentEngine />) },
              
              // The Admin/Staff Builder
              { path: "builder/new", element: withSuspense(<AssessmentBuilderPage />) },
              { path: "builder/:id", element: withSuspense(<AssessmentBuilderPage />) },
            ],
          },
        ],
      },

      /* ---------------------- FALLBACK ---------------------- */
      { path: "*", element: withSuspense(<NotFound />) },
    ],
  },
]);