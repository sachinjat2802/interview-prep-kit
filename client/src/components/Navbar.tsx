'use client';

import React from 'react';
import { User } from '../lib/types';
import { Sparkles, LogIn, LogOut, Plus, UserCheck } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onOpenAuth: () => void;
  onOpenCreate: () => void;
  onLogout: () => void;
  onGoHome: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenAuth,
  onOpenCreate,
  onLogout,
  onGoHome,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/95 backdrop-blur-xl shadow-sm" role="banner">
      <nav aria-label="Main navigation" className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 font-sans">
        
        {/* Brand */}
        <div className="flex items-center gap-6">
          <button
            onClick={onGoHome}
            aria-label="PrepAI Home"
            className="group flex items-center gap-3 transition-transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 rounded-lg"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white p-0.5 shadow-md">
              <Sparkles className="h-5 w-5 fill-white text-white" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight text-zinc-900">
                  Prep<span className="text-zinc-500">AI</span>
                </span>
                <span className="rounded bg-black text-white px-2 py-0.5 text-xs font-bold">
                  PRO
                </span>
              </div>
              <span className="hidden text-xs text-zinc-500 sm:block font-medium">
                AI Interview Preparation Generator
              </span>
            </div>
          </button>
        </div>

        {/* User actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <button
                onClick={onOpenCreate}
                className="btn-defi-mint flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold uppercase tracking-wide shadow-md"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>New Prep Kit</span>
              </button>

              <div className="hidden items-center gap-2 rounded-xl border border-zinc-300 bg-zinc-100 px-3.5 py-2 text-xs text-zinc-900 font-semibold sm:flex">
                <UserCheck className="h-4 w-4 text-black" />
                <span>{user.name || user.email}</span>
              </div>

              <button
                onClick={onLogout}
                title="Sign Out"
                aria-label="Sign Out"
                className="flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:border-black hover:text-black focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </>
          ) : (
            <button
              onClick={onOpenAuth}
              className="btn-defi-mint flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-extrabold uppercase tracking-wide shadow-md"
            >
              <LogIn className="h-4 w-4 stroke-[2.5]" />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </nav>
    </header>
  );
};
