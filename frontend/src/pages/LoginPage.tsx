import React, { FormEvent, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Role, User } from '../types';
import { BrandLogo } from '../components/BrandLogo';

const roleLabels: Record<Role, string> = {
  ADMIN: 'Program manager',
  CAMPUS_MANAGER: 'Campus manager',
  FACULTY: 'Faculty',
  STUDENT: 'Student',
};

const roleDescriptions: Record<Role, string> = {
  ADMIN: 'Institution-wide overview',
  CAMPUS_MANAGER: 'Campus operations',
  FACULTY: 'Teaching workspace',
  STUDENT: 'Syllabus roadmap',
};

const roleOrder: Role[] = ['FACULTY', 'CAMPUS_MANAGER', 'ADMIN', 'STUDENT'];

export const LoginPage: React.FC = () => {
  const { login, demoUsers, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const demoAccounts = useMemo(() => {
    const roles = new Set<Role>();
    return demoUsers.filter((user) => {
      if (roles.has(user.role)) return false;
      roles.add(user.role);
      return true;
    }).sort((first, second) => roleOrder.indexOf(first.role) - roleOrder.indexOf(second.role));
  }, [demoUsers]);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (user: User) => {
    setSubmitting(true);
    setError(null);
    try {
      await login(user.email, 'mirai123');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to open the demo account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(460px,0.95fr)]">
      <section className="relative hidden min-h-screen overflow-hidden bg-brand-navy px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
        <div className="absolute -right-32 top-20 h-96 w-96 rounded-full border border-white/10" />
        <div className="absolute -right-16 top-36 h-64 w-64 rounded-full border border-white/10" />
        <div className="absolute bottom-24 right-16 h-3 w-3 rounded-full bg-brand-blue shadow-[0_0_28px_8px_rgba(67,97,238,0.45)]" />

        <BrandLogo
          markSize={48}
          inverse
          showTagline
        />

        <div className="relative z-10 max-w-xl pb-8">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-blue-100">
            <span className="h-2 w-2 rounded-full bg-brand-blue" />
            COURSE PROGRESSION PLATFORM
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
            Every class counts.
            <br />
            Every learner moves forward.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-blue-100/75">
            Keep curriculum delivery visible across campuses, catch syllabus risks early, and make
            every teaching session count.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              { value: '4', label: 'campuses' },
              { value: '2', label: 'learning tracks' },
              { value: '<60s', label: 'session logging' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-2xl font-semibold text-white">{item.value}</div>
                <div className="mt-1 text-xs text-blue-100/65">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xs text-blue-100/55">
          <BookOpen className="h-4 w-4" />
          Mirai School of Technology · Academic Progression
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <BrandLogo markSize={44} showTagline />
          </div>

          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-blue">
              Welcome to MSOT
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              Sign in to continue
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Use your institutional account to access your course progression workspace.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-800">Email address</span>
              <span className="relative block">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@mirai.edu.in"
                  className="min-h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10"
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-800">Password</span>
              <span className="relative block">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="min-h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-12 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </span>
            </label>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || loading}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-blue px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-blue-dark focus:outline-none focus:ring-4 focus:ring-brand-blue/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          {demoAccounts.length > 0 && (
            <div className="mt-8 border-t border-slate-100 pt-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Explore a demo workspace</h3>
                <span className="text-xs text-slate-400">Demo password: mirai123</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {demoAccounts.map((account) => (
                  <button
                    key={account.role}
                    type="button"
                    disabled={submitting || loading}
                    onClick={() => handleDemoLogin(account)}
                    className="flex min-h-14 items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-left transition hover:border-brand-blue/40 hover:bg-brand-blue/5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-slate-800">
                        {roleLabels[account.role]}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {roleDescriptions[account.role]}
                      </span>
                    </span>
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-blue" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-slate-400">
            Protected academic workspace · Mirai School of Technology
          </p>
        </div>
      </section>
    </main>
  );
};
