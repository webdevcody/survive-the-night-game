import type { Route } from "./+types/.well-known.$";

// Resource route that handles .well-known paths (like Chrome DevTools requests)
export async function loader({ request }: Route.LoaderArgs) {
  // Return a 404 response for .well-known paths
  throw new Response(null, { status: 404 });
}
