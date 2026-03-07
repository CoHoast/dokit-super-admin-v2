'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Upload, Server, Cloud, Mail, Webhook, FolderUp, Box, HardDrive,
  Plus, Settings, Trash2, Play, Pause, RefreshCw, CheckCircle, XCircle,
  Clock, AlertCircle, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';

interface IntakeSource {
  id: number;
  client_id: number;
  workflow_key: string;
  source_type: string;
  name: string;
  description: string | null;
  config: Record<string, unknown>;
  schedule: string | null;
  schedule_cron: string | null;
  enabled: boolean;
  last_poll_at: string | null;
  last_poll_status: string | null;
  last_poll_message: string | null;
  last_poll_files_count: number;
  source_type_name: string;
  source_type_description: string;
  source_type_icon: string;
  supports_schedule: boolean;
  supports_test: boolean;
}

interface SourceType {
  type_key: string;
  name: string;
  description: string;
  icon: string;
  config_schema: {
    fields: {
      key: string;
      label: string;
      type: string;
      required?: boolean;
      default?: unknown;
      options?: string[];
      readonly?: boolean;
    }[];
  };
  supports_schedule: boolean;
  supports_test: boolean;
}

interface IntakeSourcesManagerProps {
  clientId: number;
  workflowKey: string;
  workflowName: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  upload: Upload,
  'folder-up': FolderUp,
  server: Server,
  cloud: Cloud,
  mail: Mail,
  webhook: Webhook,
  box: Box,
  'hard-drive': HardDrive,
};

const scheduleOptions = [
  { value: '', label: 'No Schedule (Manual Only)' },
  { value: 'every_5m', label: 'Every 5 minutes' },
  { value: 'every_15m', label: 'Every 15 minutes' },
  { value: 'every_30m', label: 'Every 30 minutes' },
  { value: 'hourly', label: 'Every hour' },
  { value: 'every_4h', label: 'Every 4 hours' },
  { value: 'daily', label: 'Once daily (midnight)' },
  { value: 'daily_9am', label: 'Once daily (9 AM)' },
];

export default function IntakeSourcesManager({ clientId, workflowKey, workflowName }: IntakeSourcesManagerProps) {
  const [sources, setSources] = useState<IntakeSource[]>([]);
  const [sourceTypes, setSourceTypes] = useState<SourceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSource, setEditingSource] = useState<IntakeSource | null>(null);
  const [expandedSource, setExpandedSource] = useState<number | null>(null);
  const [testingSource, setTestingSource] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch(`/api/db/intake-sources?clientId=${clientId}&workflowKey=${workflowKey}`);
      const data = await res.json();
      if (data.success) {
        setSources(data.sources);
      }
    } catch (err) {
      console.error('Failed to fetch sources:', err);
    }
  }, [clientId, workflowKey]);

  const fetchSourceTypes = useCallback(async () => {
    try {
      const res = await fetch('/api/db/intake-sources/types');
      const data = await res.json();
      if (data.success) {
        setSourceTypes(data.types);
      }
    } catch (err) {
      console.error('Failed to fetch source types:', err);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchSources(), fetchSourceTypes()]).finally(() => setLoading(false));
  }, [fetchSources, fetchSourceTypes]);

  const handleToggleSource = async (source: IntakeSource) => {
    try {
      const res = await fetch(`/api/db/intake-sources/${source.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !source.enabled })
      });
      if (res.ok) {
        fetchSources();
      }
    } catch (err) {
      console.error('Failed to toggle source:', err);
    }
  };

  const handleDeleteSource = async (source: IntakeSource) => {
    if (!confirm(`Are you sure you want to delete "${source.name}"? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/db/intake-sources/${source.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSources();
      }
    } catch (err) {
      console.error('Failed to delete source:', err);
    }
  };

  const handleTestConnection = async (source: IntakeSource) => {
    setTestingSource(source.id);
    try {
      const res = await fetch(`/api/db/intake-sources/${source.id}/test`, { method: 'POST' });
      const data = await res.json();
      alert(data.success ? `✅ ${data.message}` : `❌ ${data.message || data.error}`);
      fetchSources();
    } catch (err) {
      alert('Test failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setTestingSource(null);
    }
  };

  const getStatusBadge = (source: IntakeSource) => {
    if (!source.last_poll_status) {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">Never Run</span>;
    }
    const statusColors: Record<string, string> = {
      success: 'bg-green-100 text-green-700',
      test_success: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      test_failed: 'bg-red-100 text-red-700',
      running: 'bg-blue-100 text-blue-700',
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${statusColors[source.last_poll_status] || 'bg-gray-100 text-gray-600'}`}>
        {source.last_poll_status.replace('_', ' ')}
      </span>
    );
  };

  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Server;
    return <IconComponent className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg border border-gray-200">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-6 h-6 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-violet-600" />
              Intake Sources
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Configure how documents are ingested for {workflowName}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Source
          </button>
        </div>
      </div>

      {/* Sources List */}
      <div className="divide-y divide-gray-100">
        {sources.length === 0 ? (
          <div className="p-8 text-center">
            <Upload className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No intake sources configured</p>
            <p className="text-sm text-gray-400 mt-1">Add a source to start receiving documents</p>
          </div>
        ) : (
          sources.map(source => (
            <div key={source.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${source.enabled ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-400'}`}>
                    {getIcon(source.source_type_icon)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{source.name}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                        {source.source_type_name}
                      </span>
                      {getStatusBadge(source)}
                    </div>
                    {source.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{source.description}</p>
                    )}
                    {source.schedule && (
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {scheduleOptions.find(s => s.value === source.schedule)?.label || source.schedule}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {source.supports_test && (
                    <button
                      onClick={() => handleTestConnection(source)}
                      disabled={testingSource === source.id}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Test Connection"
                    >
                      {testingSource === source.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setExpandedSource(expandedSource === source.id ? null : source.id)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Configure"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleSource(source)}
                    className={`p-2 rounded-lg transition-colors ${
                      source.enabled 
                        ? 'text-green-600 hover:bg-green-50' 
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={source.enabled ? 'Disable' : 'Enable'}
                  >
                    {source.enabled ? <CheckCircle className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDeleteSource(source)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expanded Config View */}
              {expandedSource === source.id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Source Type:</span>
                      <span className="ml-2 text-gray-900">{source.source_type_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Last Run:</span>
                      <span className="ml-2 text-gray-900">
                        {source.last_poll_at 
                          ? new Date(source.last_poll_at).toLocaleString()
                          : 'Never'}
                      </span>
                    </div>
                    {source.last_poll_message && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Last Message:</span>
                        <span className="ml-2 text-gray-900">{source.last_poll_message}</span>
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="text-gray-500">Configuration:</span>
                      <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-xs overflow-x-auto">
                        {JSON.stringify(source.config, null, 2)}
                      </pre>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => setEditingSource(source)}
                      className="px-3 py-1.5 text-sm text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                    >
                      Edit Configuration
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Source Modal */}
      {showAddModal && (
        <AddSourceModal
          clientId={clientId}
          workflowKey={workflowKey}
          sourceTypes={sourceTypes}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchSources();
          }}
        />
      )}

      {/* Edit Source Modal */}
      {editingSource && (
        <EditSourceModal
          source={editingSource}
          sourceTypes={sourceTypes}
          onClose={() => setEditingSource(null)}
          onSuccess={() => {
            setEditingSource(null);
            fetchSources();
          }}
        />
      )}
    </div>
  );
}

// Add Source Modal Component
function AddSourceModal({
  clientId,
  workflowKey,
  sourceTypes,
  onClose,
  onSuccess
}: {
  clientId: number;
  workflowKey: string;
  sourceTypes: SourceType[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<'select' | 'configure'>('select');
  const [selectedType, setSelectedType] = useState<SourceType | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [schedule, setSchedule] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectType = (type: SourceType) => {
    setSelectedType(type);
    // Initialize form data with defaults
    const defaults: Record<string, unknown> = {};
    type.config_schema.fields.forEach(field => {
      if (field.default !== undefined) {
        defaults[field.key] = field.default;
      }
    });
    setFormData(defaults);
    setName(`${type.name} - ${workflowKey}`);
    setStep('configure');
  };

  const handleSave = async () => {
    if (!selectedType || !name) return;
    
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/db/intake-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          workflow_key: workflowKey,
          source_type: selectedType.type_key,
          name,
          description: description || null,
          config: formData,
          schedule: schedule || null,
          enabled: true
        })
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || 'Failed to create source');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create source');
    } finally {
      setSaving(false);
    }
  };

  const renderConfigField = (field: { key: string; label: string; type: string; required?: boolean; options?: string[]; readonly?: boolean }) => {
    const value = formData[field.key] ?? '';

    switch (field.type) {
      case 'select':
        return (
          <select
            value={value as string}
            onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            required={field.required}
          >
            <option value="">Select...</option>
            {field.options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case 'boolean':
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value as boolean}
              onChange={e => setFormData({ ...formData, [field.key]: e.target.checked })}
              className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500"
            />
            <span className="text-sm text-gray-600">Enable</span>
          </label>
        );
      case 'number':
        return (
          <input
            type="number"
            value={value as number}
            onChange={e => setFormData({ ...formData, [field.key]: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            required={field.required}
          />
        );
      case 'password':
        return (
          <input
            type="password"
            value={value as string}
            onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            required={field.required}
            readOnly={field.readonly}
          />
        );
      case 'textarea':
        return (
          <textarea
            value={value as string}
            onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            rows={4}
            required={field.required}
            readOnly={field.readonly}
          />
        );
      case 'array':
        return (
          <input
            type="text"
            value={Array.isArray(value) ? value.join(', ') : ''}
            onChange={e => setFormData({ ...formData, [field.key]: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            placeholder="Enter comma-separated values"
          />
        );
      default:
        return (
          <input
            type="text"
            value={value as string}
            onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            required={field.required}
            readOnly={field.readonly}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {step === 'select' ? 'Add Intake Source' : `Configure ${selectedType?.name}`}
          </h2>
        </div>

        <div className="p-6">
          {step === 'select' ? (
            <div className="grid grid-cols-2 gap-4">
              {sourceTypes.map(type => {
                const IconComponent = iconMap[type.icon] || Server;
                return (
                  <button
                    key={type.type_key}
                    onClick={() => handleSelectType(type)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-violet-300 hover:bg-violet-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-violet-100 rounded-lg text-violet-600">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-gray-900">{type.name}</span>
                    </div>
                    <p className="text-sm text-gray-500">{type.description}</p>
                  </button>
                );
              })}
            </div>
          ) : selectedType && (
            <div className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  placeholder="Optional description"
                />
              </div>

              {selectedType.supports_schedule && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Schedule
                  </label>
                  <select
                    value={schedule}
                    onChange={e => setSchedule(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  >
                    {scheduleOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedType.config_schema.fields.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">Configuration</h4>
                  <div className="space-y-4">
                    {selectedType.config_schema.fields.map(field => (
                      <div key={field.key}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label} {field.required && '*'}
                        </label>
                        {renderConfigField(field)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-between">
          {step === 'configure' && (
            <button
              onClick={() => setStep('select')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            {step === 'configure' && (
              <button
                onClick={handleSave}
                disabled={saving || !name}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Source'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Edit Source Modal (simplified version)
function EditSourceModal({
  source,
  sourceTypes,
  onClose,
  onSuccess
}: {
  source: IntakeSource;
  sourceTypes: SourceType[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const sourceType = sourceTypes.find(t => t.type_key === source.source_type);
  const [formData, setFormData] = useState<Record<string, unknown>>(source.config);
  const [name, setName] = useState(source.name);
  const [description, setDescription] = useState(source.description || '');
  const [schedule, setSchedule] = useState(source.schedule || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/db/intake-sources/${source.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          config: formData,
          schedule: schedule || null
        })
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || 'Failed to update source');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update source');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit {source.name}</h2>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {sourceType?.supports_schedule && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Schedule</label>
              <select
                value={schedule}
                onChange={e => setSchedule(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
              >
                {scheduleOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Configuration (JSON)</label>
            <textarea
              value={JSON.stringify(formData, null, 2)}
              onChange={e => {
                try {
                  setFormData(JSON.parse(e.target.value));
                } catch {}
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 font-mono text-sm"
              rows={8}
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-900">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
