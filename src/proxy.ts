import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";

function getRedirectUrl(targetPath: string, req: NextRequest) {
  const url = new URL(targetPath, req.url);
  const proto = req.headers.get("x-forwarded-proto") || "http";
  if (proto === "https" || (!url.hostname.includes("localhost") && !url.hostname.includes("127.0.0.1"))) {
    url.protocol = "https:";
  }
  return url;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Intercept requests for files under /uploads and rewrite internally to our API handler
  if (pathname.startsWith("/uploads/")) {
    const fileSubpath = pathname.substring("/uploads/".length);
    const targetUrl = new URL(`/api/uploads/${fileSubpath}`, req.url);
    return NextResponse.rewrite(targetUrl);
  }

  const token = req.cookies.get("auth_token")?.value;
  if (pathname === "/") {
    if (!token) {
      return NextResponse.redirect(getRedirectUrl("/login", req));
    }
    const payload = await verifyJWT(token);
    if (!payload) {
      const response = NextResponse.redirect(getRedirectUrl("/login", req));
      response.cookies.set({
        name: "auth_token",
        value: "",
        path: "/",
        expires: new Date(0),
      });
      return response;
    }
    return NextResponse.redirect(getRedirectUrl("/dashboard", req));
  }
  const isAuthRoute = pathname === "/login" || pathname === "/forgot-password";
  
  // All dashboard routes are protected
  const isProtectedRoute = 
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/sales") ||
    pathname.startsWith("/accounts") ||
    pathname.startsWith("/hr") ||
    pathname.startsWith("/crm") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/schedule") ||
    pathname.startsWith("/files") ||
    pathname.startsWith("/announcements") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/users") ||
    pathname.startsWith("/tasks") ||
    pathname.startsWith("/complaints");

  if (isProtectedRoute) {
    if (!token) {
      // Redirect to login
      return NextResponse.redirect(getRedirectUrl("/login", req));
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      // Token is expired or invalid, clear and redirect to login
      const response = NextResponse.redirect(getRedirectUrl("/login", req));
      response.cookies.set({
        name: "auth_token",
        value: "",
        path: "/",
        expires: new Date(0),
      });
      return response;
    }

    const { role } = payload;
    const userRoles = (role || "")
      .split(",")
      .map((r: string) => r.trim().toLowerCase())
      .filter(Boolean);

    const isAdmin = userRoles.some((r) =>
      ["admin", "super admin", "superadmin", "management"].includes(r)
    );
    const isHR = userRoles.some((r) =>
      ["hr", "human resources"].includes(r)
    );
    const isAccounts = userRoles.some((r) =>
      ["accountant", "accounts", "accounting", "finance"].includes(r)
    );
    const isSales = userRoles.some((r) =>
      ["sales & marketing department", "sales & marketing", "sales", "marketing"].includes(r)
    );

    // Admins have unrestricted access to all modules
    if (!isAdmin) {
      if (pathname.startsWith("/users")) {
        if (!isHR) {
          return NextResponse.redirect(getRedirectUrl("/dashboard", req));
        }
      }

      if (pathname.startsWith("/performance")) {
        return NextResponse.redirect(getRedirectUrl("/dashboard", req));
      }

      if (pathname.startsWith("/sales")) {
        if (!isSales) {
          return NextResponse.redirect(getRedirectUrl("/dashboard", req));
        }
      }

      if (pathname.startsWith("/crm") || pathname.startsWith("/projects")) {
        if (!isSales) {
          return NextResponse.redirect(getRedirectUrl("/dashboard", req));
        }
      }

      if (pathname.startsWith("/accounts")) {
        if (!isAccounts) {
          return NextResponse.redirect(getRedirectUrl("/dashboard", req));
        }
      }

      if (pathname.startsWith("/hr")) {
        if (!isHR) {
          return NextResponse.redirect(getRedirectUrl("/dashboard", req));
        }
      }

      if (pathname.startsWith("/files") || pathname.startsWith("/announcements")) {
        if (!isHR && !isAccounts && !isSales) {
          return NextResponse.redirect(getRedirectUrl("/dashboard", req));
        }
      }
    }
  }

  if (isAuthRoute && token) {
    const payload = await verifyJWT(token);
    if (payload) {
      // User is already logged in, redirect to dashboard
      return NextResponse.redirect(getRedirectUrl("/dashboard", req));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
