"use client";

import { ModeToggle } from "./mode-toggle";
import { HeartPulse } from 'lucide-react';


export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <a className="mr-6 flex items-center space-x-2" href="/">
            <HeartPulse className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">
              AI Risk Profiler
            </span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}