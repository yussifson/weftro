import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { serve as inngestServe } from "npm:inngest@3/deno";
import { inngest } from "./client.ts";
import { functions } from "./functions/index.ts";

const handler = inngestServe({
  client: inngest,
  functions,
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }
  return await handler(req);
});
