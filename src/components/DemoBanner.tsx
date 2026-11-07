import Link from 'next/link';
import { connection } from 'next/server';

/**
 * Shown on every page when DEMO_MODE=true: says the AI is simulated and where the demo logins are.
 * A server component reading a server-only variable, so nothing is exposed when demo mode is off.
 */
export default async function DemoBanner() {
    // Read the variable per request, not at build time, so one image can run as demo or real
    await connection();
    if (process.env.DEMO_MODE !== 'true') return null;
    return (
        <div data-testid="demo-banner" className="mt-12 w-full bg-black text-nb-yellow text-xs sm:text-sm font-bold px-4 py-2 text-center">
            Demo mode: AI answers are simulated and data may be reset.{' '}
            <Link href="/auth" className="underline">
                Sign in as demo@rivision.app / admin@rivision.app
            </Link>
        </div>
    );
}
