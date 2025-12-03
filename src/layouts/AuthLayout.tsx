import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
            <img
              src="/image/logo.jpg"   // <-- update path if needed
              alt="Launchpad logo"
              className="size-10 object-contain rounded-md"
            />
          <div className=" rounded-md">
          </div>
          Launchpad
        </a>
        <Outlet />
      </div>
    </div>
  );
}
