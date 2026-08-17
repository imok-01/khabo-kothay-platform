import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, LogIn } from 'lucide-react';
import type { Role } from '../domain/auth';
import { useAuth } from '../context/AuthContext';

interface RequireRoleProps {
  roles: Role[];
  children: ReactNode;
}

/**
 * Route-level role guard. The check is mirrored in the data layer (store
 * functions take an owning user id) so hiding UI is never the only boundary.
 */
export default function RequireRole({ roles, children }: RequireRoleProps) {
  const { session, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <main className="section">
        <div className="section__inner">
          <div className="access-denied">
            <ShieldAlert size={40} aria-hidden="true" />
            <h1>Sign in to continue</h1>
            <p>This area is only available to signed-in accounts.</p>
            <Link to="/login" className="btn btn--primary">
              <LogIn size={15} aria-hidden="true" /> Sign in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!session || !roles.includes(session.role)) {
    return (
      <main className="section">
        <div className="section__inner">
          <div className="access-denied">
            <ShieldAlert size={40} aria-hidden="true" />
            <h1>Not authorised</h1>
            <p>Your account doesn't have access to this area.</p>
            <Link to="/" className="btn btn--primary">Back to home</Link>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
