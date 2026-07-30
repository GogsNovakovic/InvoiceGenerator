import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refreshing the auth token. Do not add code between `createServerClient` and
  // `getUser()` — a mistake here makes sessions randomly log out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The caller gets the user alongside the response so route protection costs
  // no extra round trip. If it returns a different response, it must copy the
  // cookies over first:
  // myResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  return { response: supabaseResponse, user };
};
