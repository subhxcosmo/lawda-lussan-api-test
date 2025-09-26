// components/AdminLayout.js - Admin layout component
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function AdminLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();

  const menuItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/keys', label: 'API Keys', icon: '🔑' },
    { href: '/admin/users', label: 'Users', icon: '👥' },
    { href: '/admin/login', label: 'Logout', icon: '🚪' }
  ];

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleLogout = async () => {
    // Clear cookies and redirect
    document.cookie = 'admin_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/admin/login');
  };

  return (
    <div className="admin-layout">
      {/* Header */}
      <header className="admin-header">
        <div className="header-content">
          <button className="menu-toggle" onClick={toggleSidebar}>
            ☰
          </button>
          <h1 className="admin-title">Phone Lookup API - Admin Panel</h1>
          <div className="header-actions">
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="admin-container">
        {/* Sidebar */}
        <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <nav className="admin-nav">
            {menuItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                className={`nav-item ${router.pathname === item.href ? 'active' : ''}`}
                onClick={() => setIsSidebarOpen(false)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="admin-main">
          <div className="content-wrapper">
            {children}
          </div>
        </main>
      </div>

      <style jsx>{`
        .admin-layout {
          min-height: 100vh;
          background: #f5f5f5;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .admin-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1rem 0;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .menu-toggle {
          background: none;
          border: none;
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.5rem;
        }

        .admin-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .logout-btn {
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
        }

        .logout-btn:hover {
          background: rgba(255,255,255,0.3);
        }

        .admin-container {
          display: flex;
          min-height: calc(100vh - 80px);
        }

        .admin-sidebar {
          width: 280px;
          background: white;
          border-right: 1px solid #e0e0e0;
          transform: translateX(-100%);
          transition: transform 0.3s ease;
          position: fixed;
          height: calc(100vh - 80px);
          z-index: 99;
          overflow-y: auto;
        }

        .admin-sidebar.open {
          transform: translateX(0);
        }

        .admin-nav {
          padding: 1rem 0;
        }

        .nav-item {
          display: flex;
          align-items: center;
          padding: 0.75rem 1rem;
          color: #666;
          text-decoration: none;
          transition: all 0.2s ease;
          border-left: 3px solid transparent;
        }

        .nav-item:hover {
          background: #f8f9fa;
          color: #333;
        }

        .nav-item.active {
          background: #e3f2fd;
          color: #1976d2;
          border-left-color: #1976d2;
        }

        .nav-icon {
          margin-right: 0.75rem;
          font-size: 1.1rem;
        }

        .admin-main {
          flex: 1;
          padding: 2rem;
          overflow-y: auto;
        }

        .content-wrapper {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
          overflow: hidden;
        }

        @media (min-width: 768px) {
          .admin-sidebar {
            transform: translateX(0);
            position: relative;
          }
          
          .admin-main {
            margin-left: 280px;
          }
        }

        /* Mobile overlay */
        .admin-sidebar.open ~ .admin-main::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0,0,0,0.5);
          z-index: -1;
        }
      `}</style>
    </div>
  );
}
