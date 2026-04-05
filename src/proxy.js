import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/worlds(.*)',
  '/api/worlds(.*)',
]);

// Skip Clerk middleware for multipart upload routes to avoid body consumption
const isUploadRoute = (url) =>
  url.includes('/nodes/') && url.includes('/images') ||
  url.includes('/edges/') && url.includes('/images');

export default clerkMiddleware(async (auth, req) => {
  if (isUploadRoute(req.url)) return;
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
