/**
 * Provider-neutral webhook boundary. It deliberately refuses to mutate
 * payment state until a concrete provider adapter verifies the signature and
 * normalizes the event. This prevents an unauthenticated public endpoint from
 * becoming a payment-success backdoor.
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  const provider = req.headers.get('x-payment-provider');
  const signature = req.headers.get('x-payment-signature');
  if (!provider || !signature) return Response.json({ success: false, error: 'Missing provider signature' }, { status: 401 });

  // Concrete provider verification must be added here before production use.
  // Never accept a browser-supplied "successful" status as proof of payment.
  return Response.json({
    success: false,
    error: 'Provider adapter not configured; payment state was not changed',
    provider,
  }, { status: 501 });
});
