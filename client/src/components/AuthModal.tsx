'use client';

import React, { useState } from 'react';
import { api } from '../lib/api';
import { User } from '../lib/types';
import { X, Lock, Mail, User as UserIcon, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!name.trim()) throw new Error('Name is required');
        const res = await api.register(email, password, name);
        onSuccess(res.user);
      } else {
        const res = await api.login(email, password);
        onSuccess(res.user);
      }
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl text-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <h3 className="text-lg font-bold text-zinc-900">
            {mode === 'login' ? 'Sign In to PrepAI' : 'Create an Account'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-200 hover:text-black"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  required
                  placeholder="Jane Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-black py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-zinc-800 disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span>Processing...</span>
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <div className="relative flex py-1 items-center font-sans">
            <div className="flex-grow border-t border-zinc-200"></div>
            <span className="flex-shrink mx-3 text-xs text-zinc-500 font-semibold uppercase">Or Demo Access</span>
            <div className="flex-grow border-t border-zinc-200"></div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              setError(null);
              setLoading(true);
              try {
                const demoEmail = 'candidate@example.com';
                const demoPass = 'password123';
                try {
                  const res = await api.login(demoEmail, demoPass);
                  onSuccess(res.user);
                } catch {
                  const res = await api.register(demoEmail, demoPass, 'Demo Candidate');
                  onSuccess(res.user);
                }
                onClose();
              } catch (err: unknown) {
                setError((err as Error).message || 'Quick start failed');
              } finally {
                setLoading(false);
              }
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-zinc-50 py-2.5 text-xs font-bold text-zinc-900 hover:bg-zinc-100 transition-all font-sans"
          >
            <Sparkles className="h-3.5 w-3.5 text-black" />
            <span>One-Click Quick Start (Demo Account)</span>
          </button>
        </form>

        {/* Footer toggle */}
        <div className="border-t border-zinc-200 bg-zinc-50 px-6 py-3 text-center text-xs text-zinc-600">
          {mode === 'login' ? (
            <p>
              Don&apos;t have an account?{' '}
              <button
                onClick={() => { setMode('register'); setError(null); }}
                className="font-medium text-black hover:underline"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                onClick={() => { setMode('login'); setError(null); }}
                className="font-medium text-black hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
