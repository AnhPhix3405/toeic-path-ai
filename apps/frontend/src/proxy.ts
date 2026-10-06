import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const authRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];

const studentRoutes = [
  "/dashboard",
  "/practice",
  "/exams",
  "/learning-path",
  "/ai-tutor",
  "/results",
  "/competency",
  "/review-schedule",
  "/profile",
];

const teacherRoutes = [
  "/teacher-dashboard",
  "/questions",
  "/question-groups",
  "/content-reviews",
  "/students",
  "/ai-studio",
];

const adminRoutes = [
  "/admin-dashboard",
  "/users",
  "/roles",
  "/audit-logs",
  "/ai-settings",
  "/categories",
];

function isPathMatch(pathname: string, routes: string[]): boolean {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const authToken = request.cookies.get("auth_token")?.value;
  const userRole = request.cookies.get("user_role")?.value;

  const isAuthenticated = Boolean(authToken);
  const isAuthRoute = isPathMatch(pathname, authRoutes);
  const isStudentRoute = isPathMatch(pathname, studentRoutes);
  const isTeacherRoute = isPathMatch(pathname, teacherRoutes);
  const isAdminRoute = isPathMatch(pathname, adminRoutes);
  const isProtectedRoute = isStudentRoute || isTeacherRoute || isAdminRoute;

  // 1. If user is authenticated and visits login/register, redirect to dashboard
  if (isAuthenticated && isAuthRoute) {
    if (userRole === "admin") {
      return NextResponse.redirect(new URL("/admin-dashboard", request.url));
    }
    if (userRole === "teacher") {
      return NextResponse.redirect(new URL("/teacher-dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 2. If user is not authenticated and visits protected route, redirect to login with return url
  if (!isAuthenticated && isProtectedRoute) {
    const returnUrl = encodeURIComponent(`${pathname}${search}`);
    const loginUrl = new URL(`/login?redirect=${returnUrl}`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Role-based access control for authenticated users
  if (isAuthenticated) {
    // Student trying to access teacher or admin routes
    if (userRole === "student" && (isTeacherRoute || isAdminRoute)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    // Teacher trying to access admin routes
    if (userRole === "teacher" && isAdminRoute) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
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
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - images, audio or files with extensions
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
