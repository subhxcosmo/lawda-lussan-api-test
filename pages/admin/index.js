// pages/admin/index.js - Admin dashboard
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import AdminLayout from '../../components/AdminLayout';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalKeys: 0,
    activeKeys: 0,
    pausedKeys: 0,
    expiredKeys: 0,
    totalRequests: 0,
    todayRequests: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Get keys stats
      const keysResponse = await axios.get('/api/admin/keys?limit=1');
      const allKeysResponse = await axios.get('/api/admin/keys?limit=1000');
      
      // Get usage stats
      const usageResponse = await axios.get('/api/admin/usage-stats');

      const keys = allKeysResponse.data.data;
      const today = new Date().toISOString().split('T')[0];

      setStats({
        totalKeys: keys.length,
        activeKeys: keys.filter(k => k.status === 'active').length,
        pausedKeys: keys.filter(k => k.status === 'paused').length,
        expiredKeys: keys.filter(k => k.status === 'expired').length,
        totalRequests: usageResponse.data.total_requests || 0,
        todayRequests: usageResponse.data.today_requests || 0
      });

    } catch (err) {
      setError('Failed to load dashboard stats');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, change, color = 'blue', icon }) => (
    <div className={`stat-card ${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <h3 className="stat-value">{value}</h3>
        <p className="stat-title">{title}</p>
        {change && (
          <span className={`stat-change ${change > 0 ? 'positive' : 'negative'}`}>
            {change > 0 ? '↑' : '↓'} {Math.abs(change)}%
          </span>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="dashboard-loading">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="dashboard">
        {error && (
          <div className="error-banner">
            <span>⚠️</span> {error}
            <button onClick={fetchDashboardStats} className="retry-btn">Retry</button>
          </div>
        )}

        <div className="page-header">
          <h1>Dashboard</h1>
          <p className="page-subtitle">
            Welcome back! Here's what's happening with your API service.
          </p>
        </div>

        <div className="stats-grid">
          <StatCard
            title="Total API Keys"
            value={stats.totalKeys}
            icon="🔑"
            color="blue"
          />
          
          <StatCard
            title="Active Keys"
            value={stats.activeKeys}
            change={2}
            icon="✅"
            color="green"
          />
          
          <StatCard
            title="Paused Keys"
            value={stats.pausedKeys}
            change={-1}
            icon="⏸️"
            color="yellow"
          />
          
          <StatCard
            title="Expired Keys"
            value={stats.expiredKeys}
            change={1}
            icon="❌"
            color="red"
          />
        </div>

        <div className="metrics-grid">
          <div className="metric-card">
            <h3>Total Requests</h3>
            <div className="metric-value">{stats.totalRequests.toLocaleString()}</div>
            <p className="metric-description">All time API requests</p>
          </div>

          <div className="metric-card">
            <h3>Today's Requests</h3>
            <div className="metric-value">{stats.todayRequests.toLocaleString()}</div>
            <p className="metric-description">Requests in the last 24 hours</p>
          </div>

          <div className="metric-card">
            <h3>Average Response Time</h3>
            <div className="metric-value">247ms</div>
            <p className="metric-description">Average API response time</p>
          </div>

          <div className="metric-card">
            <h3>Uptime</h3>
            <div className="metric-value">99.9%</div>
            <p className="metric-description">Service availability</p>
          </div>
        </div>

        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            <button 
              onClick={() => router.push('/admin/keys')}
              className="action-btn primary"
            >
              Manage API Keys
            </button>
            
            <button 
              onClick={() => router.push('/admin/users')}
              className="action-btn secondary"
            >
              Manage Users
            </button>
            
            <button 
              onClick={() => onAction('generateReport')}
              className="action-btn secondary"
            >
              Generate Report
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .dashboard {
          padding: 0 0 2rem 0;
        }

        .error-banner {
          background: #fed7d7;
          color: #c53030;
          padding: 1rem;
          border-radius: 6px;
          border-left: 4px solid #fc8181;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .retry-btn {
          margin-left: auto;
          background: #c53030;
          color: white;
          border: none;
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .page-header h1 {
          font-size: 2rem;
          font-weight: 700;
          color: #2d3748;
          margin: 0 0 0.5rem 0;
        }

        .page-subtitle {
          color: #718096;
          font-size: 1.1rem;
          margin: 0;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
          display: flex;
          align-items: center;
          gap: 1rem;
          border-top: 4px solid;
          transition: transform 0.2s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
        }

        .stat-card.blue { border-top-color: #4299e1; }
        .stat-card.green { border-top-color: #48bb78; }
        .stat-card.yellow { border-top-color: #ed8936; }
        .stat-card.red { border-top-color: #f56565; }

        .stat-icon {
          font-size: 2rem;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: rgba(102, 126, 234, 0.1);
          flex-shrink: 0;
        }

        .stat-content h3 {
          font-size: 2rem;
          font-weight: 700;
          color: #2d3748;
          margin: 0 0 0.25rem 0;
        }

        .stat-content p {
          color: #718096;
          margin: 0 0 0.5rem 0;
          font-size: 0.9rem;
        }

        .stat-change {
          font-size: 0.8rem;
          font-weight: 500;
        }

        .stat-change.positive { color: #48bb78; }
        .stat-change.negative { color: #f56565; }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .metric-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }

        .metric-card h3 {
          color: #718096;
          margin: 0 0 0.5rem 0;
          font-size: 0.9rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .metric-value {
          font-size: 2.5rem;
          font-weight: 700;
          color: #2d3748;
          margin: 0;
          line-height: 1;
        }

        .metric-description {
          color: #a0aec0;
          margin: 0.5rem 0 0 0;
          font-size: 0.85rem;
        }

        .quick-actions {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }

        .quick-actions h2 {
          color: #2d3748;
          margin: 0 0 1.5rem 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .action-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .action-btn {
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .action-btn.primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .action-btn.primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 15px -3px rgba(102, 126, 234, 0.4);
        }

        .action-btn.secondary {
          background: #f7fafc;
          color: #4a5568;
          border: 1px solid #e2e8f0;
        }

        .action-btn.secondary:hover {
          background: #edf2f7;
          transform: translateY(-1px);
        }

        .dashboard-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 400px;
          color: #718096;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e2e8f0;
          border-top: 4px solid #4299e1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .stats-grid,
          .metrics-grid {
            grid-template-columns: 1fr;
          }
          
          .action-buttons {
            flex-direction: column;
          }
          
          .action-btn {
            width: 100%;
          }
        }
      `}</style>
    </AdminLayout>
  );
}
