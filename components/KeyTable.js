// components/KeyTable.js - API Keys management table
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function KeyTable({ keys, loading, onAction }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredKeys = keys.filter(key => {
    const matchesStatus = filterStatus === 'all' || key.status === filterStatus;
    const matchesSearch = key.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         key.key_preview.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         key.api_key.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return '✅';
      case 'paused': return '⏸️';
      case 'expired': return '❌';
      default: return '⭕';
    }
  };

  const formatRemainingTime = (remainingTime) => {
    if (!remainingTime) return 'Never expires';
    return `${remainingTime.days}d ${remainingTime.hours}h`;
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-100 text-red-800';
    if (percentage >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  if (loading) {
    return (
      <div className="table-placeholder">
        <div className="loading-animation">Loading API Keys...</div>
      </div>
    );
  }

  return (
    <div className="key-table-container">
      {/* Filters */}
      <div className="table-controls">
        <div className="filter-section">
          <label>Status:</label>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        
        <div className="search-section">
          <input
            type="text"
            placeholder="Search by username or key..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <button 
          onClick={() => onAction('createKey')}
          className="create-key-btn"
        >
          + Create New Key
        </button>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="keys-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>API Key</th>
              <th>User</th>
              <th>Created</th>
              <th>Expires</th>
              <th>Status</th>
              <th>Usage</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredKeys.length === 0 ? (
              <tr>
                <td colSpan="8" className="no-data">
                  {searchTerm ? 'No keys match your search.' : 'No API keys found. Create your first key!'}
                </td>
              </tr>
            ) : (
              filteredKeys.map((key) => (
                <tr key={key.id} className={key.status === 'expired' ? 'expired-row' : ''}>
                  <td className="id-cell">{key.id}</td>
                  <td className="key-cell">
                    <code>{key.key_preview}</code>
                    {key.is_over_limit && <span className="over-limit">⚠️</span>}
                  </td>
                  <td className="user-cell">{key.username}</td>
                  <td className="date-cell">
                    {new Date(key.created_at).toLocaleDateString()}
                  </td>
                  <td className="expires-cell">
                    {key.remaining_time ? formatRemainingTime(key.remaining_time) : 'Never'}
                  </td>
                  <td className="status-cell">
                    <span className={`status-badge ${getStatusColor(key.status)}`}>
                      {getStatusIcon(key.status)} {key.status}
                    </span>
                  </td>
                  <td className="usage-cell">
                    <div className="usage-bar">
                      <div 
                        className={`usage-fill ${getUsageColor(key.usage_percentage)}`}
                        style={{ width: `${key.usage_percentage}%` }}
                      ></div>
                      <span className="usage-text">
                        {key.daily_used}/{key.daily_limit} ({key.usage_percentage}%)
                      </span>
                    </div>
                  </td>
                  <td className="actions-cell">
                    <div className="action-buttons">
                      {key.status === 'active' && (
                        <button 
                          onClick={() => onAction('pauseKey', key.id)}
                          className="action-btn pause-btn"
                          title="Pause Key"
                        >
                          ⏸️
                        </button>
                      )}
                      {key.status === 'paused' && (
                        <button 
                          onClick={() => onAction('resumeKey', key.id)}
                          className="action-btn resume-btn"
                          title="Resume Key"
                        >
                          ▶️
                        </button>
                      )}
                      <button 
                        onClick={() => onAction('revokeKey', key.id)}
                        className="action-btn revoke-btn"
                        title="Revoke Key"
                      >
                        ❌
                      </button>
                      <button 
                        onClick={() => onAction('viewDetails', key.id)}
                        className="action-btn details-btn"
                        title="View Details"
                      >
                        ℹ️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .key-table-container {
          padding: 1.5rem;
        }

        .table-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .filter-section, .search-section {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .filter-select, .search-input {
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 0.9rem;
        }

        .search-input {
          min-width: 250px;
        }

        .create-key-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: transform 0.2s ease;
        }

        .create-key-btn:hover {
          transform: translateY(-1px);
        }

        .table-wrapper {
          overflow-x: auto;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .keys-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          min-width: 800px;
        }

        .keys-table th {
          background: #f8f9fa;
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          color: #333;
          border-bottom: 2px solid #e9ecef;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .keys-table td {
          padding: 1rem;
          border-bottom: 1px solid #e9ecef;
          vertical-align: middle;
        }

        .keys-table tr:hover {
          background: #f8f9fa;
        }

        .expired-row {
          opacity: 0.6;
          background: #fff5f5 !important;
        }

        .id-cell {
          font-family: monospace;
          font-size: 0.9rem;
          width: 80px;
        }

        .key-cell code {
          background: #e9ecef;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.85rem;
          font-family: monospace;
        }

        .over-limit {
          margin-left: 0.5rem;
          animation: pulse 2s infinite;
        }

        .user-cell {
          font-weight: 500;
          color: #2c3e50;
        }

        .date-cell {
          font-size: 0.9rem;
          color: #7f8c8d;
        }

        .expires-cell {
          font-weight: 500;
        }

        .status-cell .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }

        .usage-cell {
          min-width: 150px;
        }

        .usage-bar {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .usage-fill {
          height: 6px;
          border-radius: 3px;
          transition: width 0.3s ease;
          background: #e9ecef;
        }

        .usage-text {
          font-size: 0.8rem;
          color: #666;
          text-align: center;
        }

        .actions-cell {
          white-space: nowrap;
        }

        .action-buttons {
          display: flex;
          gap: 0.25rem;
        }

        .action-btn {
          background: none;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 0.25rem;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s ease;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .action-btn:hover {
          border-color: #999;
          transform: scale(1.05);
        }

        .pause-btn:hover {
          border-color: #f39c12;
          color: #f39c12;
        }

        .resume-btn:hover {
          border-color: #27ae60;
          color: #27ae60;
        }

        .revoke-btn:hover {
          border-color: #e74c3c;
          color: #e74c3c;
        }

        .details-btn:hover {
          border-color: #3498db;
          color: #3498db;
        }

        .no-data {
          text-align: center !important;
          padding: 3rem !important;
          color: #7f8c8d;
          font-style: italic;
        }

        .table-placeholder {
          padding: 3rem;
          text-align: center;
          color: #7f8c8d;
        }

        .loading-animation {
          display: inline-block;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @media (max-width: 768px) {
          .table-controls {
            flex-direction: column;
            align-items: stretch;
          }
          
          .search-input {
            min-width: auto;
          }
          
          .keys-table {
            font-size: 0.85rem;
          }
          
          .keys-table th,
          .keys-table td {
            padding: 0.75rem 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}
