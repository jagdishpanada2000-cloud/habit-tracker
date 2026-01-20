
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react';

export const AuthOverlay = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [session, setSession] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                toast.success('Check your email to confirm your account!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                toast.success('Signed in successfully');
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                }
            });
            if (error) throw error;
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGuestLogin = async () => {
        setLoading(true);
        try {
            // Attempt anonymous sign in first if enabled
            const { data, error } = await supabase.auth.signInAnonymously();

            if (error) {
                // If anon is disabled, fallback to a dummy demo account or throw
                console.warn("Anonymous login failed (likely disabled), suggesting signup.");
                toast.info("Guest mode unavailable. Please sign up.");
            } else {
                toast.success("Welcome, Guest!");
            }
        } catch (e: any) {
            toast.error(e.message || "Guest login failed");
        } finally {
            setLoading(false);
        }
    }

    if (session) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md space-y-8 glass-card p-8 animate-slide-up">
                <div className="text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Lock className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">Welcome to Habit Focus</h2>
                    <p className="text-sm text-muted-foreground mt-2">
                        Sign in to sync your habits and AI insights across devices.
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="email"
                                type="email"
                                placeholder="hello@example.com"
                                className="pl-9"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <ArrowRight className="w-4 h-4 mr-2" />
                        )}
                        {isSignUp ? 'Create Account' : 'Sign In'}
                    </Button>
                </form>

                <div className="space-y-4 text-center">
                    <button
                        type="button"
                        className="text-sm text-primary hover:underline hover:text-primary/80"
                        onClick={() => setIsSignUp(!isSignUp)}
                    >
                        {isSignUp
                            ? 'Already have an account? Sign In'
                            : "Don't have an account? Sign Up"}
                    </button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                        </div>
                    </div>

                    <div className="flex flex-col space-y-2">
                        <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={loading}>
                            <svg className="w-5 h-5 mr-2" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                            </svg>
                            Google
                        </Button>
                        <Button variant="outline" className="w-full" onClick={handleGuestLogin} disabled={loading}>
                            Guest Access (Anonymous)
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
