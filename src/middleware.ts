import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes and static files
  if (
    pathname === "/" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Only protect dashboard routes
  if (pathname.startsWith("/dashboard")) {
    const userRole = request.cookies.get("userRole")?.value;

   // console.log("Middleware - Path:", pathname, "Role:", userRole);

    if (!userRole) {
      // console.log("No role found, allowing access (will check on client side)");
      return NextResponse.next();
    }

    // Client restrictions
    if (userRole === "client") {
      // Client can ONLY access /dashboard/submit-information
      // Block access to main dashboard
      if (pathname === "/dashboard") {
        // console.log(
         //   "Client blocked from main dashboard - Redirecting to submit-information"
        // );
        const url = new URL("/dashboard/submit-information", request.url);
        return NextResponse.redirect(url);
      }

      // Allow submit-information
      const isSubmitInfo =
        pathname === "/dashboard/submit-information" ||
        pathname.startsWith("/dashboard/submit-information/");

      if (!isSubmitInfo) {
        // console.log(
        //   "Client blocked from:",
        //   pathname,
        //   "- Redirecting to submit-information"
        // );
        const url = new URL("/dashboard/submit-information", request.url);
        return NextResponse.redirect(url);
      }
    }

    // Subadmin cannot access account-management
    if (userRole === "subadmin") {
      if (
        pathname === "/dashboard/account-management" ||
        pathname.startsWith("/dashboard/account-management/")
      ) {
      // console.log("Subadmin blocked from account-management");
        const url = new URL("/dashboard", request.url);
        return NextResponse.redirect(url);
      }
    }

    // Admin can access everything
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)"],
};
