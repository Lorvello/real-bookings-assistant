import React, { useEffect } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  auth: { user: { id: 'user-1', email: 'member@example.com' }, loading: false } as {
    user: { id: string; email: string } | null;
    loading: boolean;
  },
  role: {
    isAccountOwner: false,
    accountOwnerId: 'owner-1',
    loading: false,
    error: null as Error | null,
    retry: vi.fn(),
  },
  invoke: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => state.auth }));
vi.mock('@/hooks/useAccountRole', () => ({ useAccountRole: () => state.role }));

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

const OwnerProtectedRoute = ProtectedRoute as React.ComponentType<{
  children: React.ReactNode;
  requireAccountOwner?: boolean;
}>;

const InvokingChild = () => {
  useEffect(() => {
    state.invoke('stripe-connect-login');
  }, []);
  return <div>owner billing content</div>;
};

const renderRoute = () =>
  render(
    <MemoryRouter initialEntries={['/stripe/go']}>
      <Routes>
        <Route
          path="/stripe/go"
          element={(
            <OwnerProtectedRoute requireAccountOwner>
              <InvokingChild />
            </OwnerProtectedRoute>
          )}
        />
        <Route path="/dashboard" element={<div>dashboard destination</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('ProtectedRoute', () => {
  beforeEach(() => {
    state.auth = { user: { id: 'user-1', email: 'member@example.com' }, loading: false };
    state.role = {
      isAccountOwner: false,
      accountOwnerId: 'owner-1',
      loading: false,
      error: null,
      retry: vi.fn(),
    };
    state.invoke.mockClear();
  });

  it('announces an accessible loading state while authentication resolves', () => {
    state.auth = { user: null, loading: true };
    renderRoute();

    expect(screen.getByRole('status')).toHaveTextContent(/checking your session/i);
  });

  it('keeps owner-only children unmounted while the account role resolves', () => {
    state.role = { ...state.role, loading: true };
    renderRoute();

    expect(screen.getByRole('status')).toHaveTextContent(/checking account access/i);
    expect(state.invoke).not.toHaveBeenCalled();
  });

  it.each(['editor', 'viewer'])('redirects a scoped %s before any owner function can be invoked', () => {
    renderRoute();

    expect(screen.getByText('dashboard destination')).toBeInTheDocument();
    expect(state.invoke).not.toHaveBeenCalled();
  });

  it('renders the owner-only child after ownership is confirmed', () => {
    state.role = {
      ...state.role,
      isAccountOwner: true,
      accountOwnerId: 'user-1',
    };

    renderRoute();

    expect(screen.getByText('owner billing content')).toBeInTheDocument();
    expect(state.invoke).toHaveBeenCalledTimes(1);
  });

  it('fails closed on a role-query error and exposes retry', () => {
    const retry = vi.fn();
    state.role = { ...state.role, error: new Error('role query failed'), retry };
    renderRoute();

    expect(screen.getByRole('alert')).toHaveTextContent(/could not verify account access/i);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(state.invoke).not.toHaveBeenCalled();
  });
});
