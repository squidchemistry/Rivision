'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brain, Layers, Sparkles, User, LogOut, LogIn, CreditCard, Settings, BookOpen } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

const authenticatedLinks = [
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/topics', label: 'Topics', icon: Layers },
    { href: '/daily', label: 'Revise', icon: Brain },
    { href: '/generate', label: 'Generate', icon: Sparkles },
    { href: '/mydata', label: 'My Data', icon: BookOpen },
    { href: '/payment', label: 'Payment', icon: CreditCard },
];

const publicLinks = [
    { href: '/pricing', label: 'Pricing', icon: CreditCard },
];

export default function Navbar() {
    const pathname = usePathname();
    const { data: session } = useSession();

    return (
        <nav className="fixed top-0 left-0 w-full z-50 nb-nav">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
                <Link href="/" className="flex items-center gap-2.5 group shrink-0">
                    <div className="w-8 h-8 bg-black flex items-center justify-center transition-transform group-hover:-rotate-6">
                        <Brain className="w-4 h-4 text-nb-yellow" />
                    </div>
                    <span className="hidden sm:inline font-black text-lg text-black tracking-tight font-[family-name:var(--font-outfit)]">
                        Rivision<span className="text-nb-coral">.</span>
                    </span>
                </Link>

                <div className="flex items-center gap-0.5 sm:gap-1 min-w-0 overflow-x-auto">
                    {/* Always show pricing link */}
                    <Link
                        href="/pricing"
                        className={`relative shrink-0 px-2 sm:px-2.5 py-1.5 text-sm font-bold transition-all flex items-center gap-1.5 ${
                            pathname === '/pricing'
                                ? 'text-nb-yellow bg-black border-2 border-black'
                                : 'text-black border-2 border-transparent hover:border-black'
                        }`}
                    >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span className="hidden lg:inline">Pricing</span>
                    </Link>

                    {/* Show authenticated links only if logged in */}
                    {session && authenticatedLinks.map(({ href, label, icon: Icon }) => {
                        const active = pathname === href || (href !== '/' && pathname.startsWith(href));
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`relative shrink-0 px-2 sm:px-2.5 py-1.5 text-sm font-bold transition-all flex items-center gap-1.5 ${active
                                        ? 'text-nb-yellow bg-black border-2 border-black'
                                        : 'text-black border-2 border-transparent hover:border-black'
                                    }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                <span className="hidden lg:inline">{label}</span>
                            </Link>
                        );
                    })}

                    {/* Show admin panel link if user is admin */}
                    {session?.user?.role === 'admin' && (
                        <Link
                            href="/admin"
                            className={`relative shrink-0 px-2 sm:px-2.5 py-1.5 text-sm font-bold transition-all flex items-center gap-1.5 ${
                                pathname === '/admin'
                                    ? 'text-nb-yellow bg-black border-2 border-black'
                                    : 'text-black border-2 border-transparent hover:border-black'
                            }`}
                        >
                            <Settings className="w-3.5 h-3.5" />
                            <span className="hidden lg:inline">Admin</span>
                        </Link>
                    )}
                    
                    {session ? (
                        <button
                            onClick={() => signOut()}
                            className="relative shrink-0 px-2 sm:px-2.5 py-1.5 text-sm font-bold transition-all flex items-center gap-1.5 text-black border-2 border-transparent hover:bg-nb-coral hover:border-black"
                            title="Sign Out"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span className="hidden lg:inline">Logout</span>
                        </button>
                    ) : (
                        <Link
                            href="/auth"
                            className="relative shrink-0 px-2 sm:px-2.5 py-1.5 text-sm font-bold transition-all flex items-center gap-1.5 text-black border-2 border-black bg-nb-lime hover:-translate-y-0.5"
                            title="Sign In"
                        >
                            <LogIn className="w-3.5 h-3.5" />
                            <span className="hidden lg:inline">Login</span>
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
}
