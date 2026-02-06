'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface WhatsAppMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: unknown;
}

interface WhatsAppConversation {
  id: string;
  phoneNumber: string;
  displayName?: string;
  messages: WhatsAppMessage[];
  language: 'en' | 'es';
  lastMessageAt: unknown;
}

interface WhatsAppContact {
  id: string;
  phoneNumber: string;
  name: string;
  email?: string;
  tags?: string[];
  importedFrom?: string;
  importedAt: string;
  lastContacted?: string;
  optedOut: boolean;
}

interface BulkSendJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message: string;
  messageType?: string;
  totalContacts: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  completedAt?: string;
}

type TabType = 'conversations' | 'contacts' | 'bulk-send';
type MessageType = 'text' | 'reply_buttons' | 'cta_url' | 'location_request' | 'list';

interface ButtonConfig {
  id: string;
  title: string;
}

interface ListRowConfig {
  id: string;
  title: string;
  description: string;
}

interface ListSectionConfig {
  title: string;
  rows: ListRowConfig[];
}

export default function WhatsAppMessagesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('conversations');
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [bulkJobs, setBulkJobs] = useState<BulkSendJob[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Contacts tab state
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Manual add contact form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactTags, setNewContactTags] = useState('');
  const [addingContact, setAddingContact] = useState(false);
  const [importingFromConversations, setImportingFromConversations] = useState(false);

  // Bulk send state
  const [bulkMessage, setBulkMessage] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [sendToAll, setSendToAll] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // Message type state
  const [messageType, setMessageType] = useState<MessageType>('text');
  const [headerText, setHeaderText] = useState('');
  const [footerText, setFooterText] = useState('');
  // Reply buttons state
  const [buttons, setButtons] = useState<ButtonConfig[]>([{ id: 'btn_1', title: '' }]);
  // CTA URL state
  const [ctaButtonText, setCtaButtonText] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  // List state
  const [listButtonText, setListButtonText] = useState('');
  const [listSections, setListSections] = useState<ListSectionConfig[]>([
    { title: '', rows: [{ id: 'row_1', title: '', description: '' }] }
  ]);

  // Fetch data based on active tab
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'conversations') {
        const res = await fetch('/api/whatsapp/conversations');
        const data = await res.json();
        if (data.success) {
          setConversations(data.conversations);
        }
      } else if (activeTab === 'contacts') {
        const res = await fetch('/api/whatsapp/contacts');
        const data = await res.json();
        if (data.success) {
          setContacts(data.contacts);
        }
      } else if (activeTab === 'bulk-send') {
        const [contactsRes, jobsRes] = await Promise.all([
          fetch('/api/whatsapp/contacts'),
          fetch('/api/whatsapp/bulk-send'),
        ]);
        const contactsData = await contactsRes.json();
        const jobsData = await jobsRes.json();
        if (contactsData.success) {
          setContacts(contactsData.contacts);
        }
        if (jobsData.success) {
          setBulkJobs(jobsData.jobs);
        }
      }
    } catch (err) {
      setError('Failed to fetch data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll for job status
  useEffect(() => {
    if (!currentJobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/whatsapp/bulk-send?jobId=${currentJobId}`);
        const data = await res.json();
        if (data.success && data.job) {
          setBulkJobs((prev) => {
            const index = prev.findIndex((j) => j.id === currentJobId);
            if (index >= 0) {
              const updated = [...prev];
              updated[index] = data.job;
              return updated;
            }
            return [data.job, ...prev];
          });

          if (data.job.status === 'completed' || data.job.status === 'failed') {
            setCurrentJobId(null);
            setSending(false);
          }
        }
      } catch (err) {
        console.error('Failed to poll job status:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [currentJobId]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/whatsapp/contacts', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setUploadResult({
          imported: data.imported,
          skipped: data.skipped,
          errors: data.errors || [],
        });
        // Wait a moment for Firestore to sync, then refresh
        await new Promise(resolve => setTimeout(resolve, 500));
        await fetchData(); // Refresh contacts
      } else {
        setError(data.error || 'Failed to import contacts');
      }
    } catch (err) {
      setError('Failed to upload file');
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle contact deletion
  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      const res = await fetch(`/api/whatsapp/contacts?id=${contactId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        setContacts((prev) => prev.filter((c) => c.id !== contactId));
      } else {
        setError(data.error || 'Failed to delete contact');
      }
    } catch (err) {
      setError('Failed to delete contact');
      console.error(err);
    }
  };

  // Handle manual contact addition
  const handleAddContact = async () => {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      setError('Name and phone number are required');
      return;
    }

    setAddingContact(true);
    setError(null);

    try {
      const res = await fetch('/api/whatsapp/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newContactName.trim(),
          phoneNumber: newContactPhone.trim(),
          email: newContactEmail.trim() || undefined,
          tags: newContactTags.trim() ? newContactTags.split(',').map(t => t.trim()) : [],
        }),
      });
      const data = await res.json();

      if (data.success) {
        setNewContactName('');
        setNewContactPhone('');
        setNewContactEmail('');
        setNewContactTags('');
        setShowAddForm(false);
        // Wait a moment for Firestore to sync, then refresh
        await new Promise(resolve => setTimeout(resolve, 500));
        await fetchData(); // Refresh contacts
      } else {
        setError(data.error || 'Failed to add contact');
      }
    } catch (err) {
      setError('Failed to add contact');
      console.error(err);
    } finally {
      setAddingContact(false);
    }
  };

  // Handle import from conversations
  const handleImportFromConversations = async () => {
    setImportingFromConversations(true);
    setError(null);

    try {
      const res = await fetch('/api/whatsapp/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importFromConversations: true }),
      });
      const data = await res.json();

      if (data.success) {
        setUploadResult({
          imported: data.imported,
          skipped: 0,
          errors: [],
        });
        // Wait a moment for Firestore to sync, then refresh
        await new Promise(resolve => setTimeout(resolve, 500));
        await fetchData(); // Refresh contacts
      } else {
        setError(data.error || 'Failed to import from conversations');
      }
    } catch (err) {
      setError('Failed to import from conversations');
      console.error(err);
    } finally {
      setImportingFromConversations(false);
    }
  };

  // Reset message form
  const resetMessageForm = () => {
    setBulkMessage('');
    setHeaderText('');
    setFooterText('');
    setButtons([{ id: 'btn_1', title: '' }]);
    setCtaButtonText('');
    setCtaUrl('');
    setListButtonText('');
    setListSections([{ title: '', rows: [{ id: 'row_1', title: '', description: '' }] }]);
    setSelectedContacts([]);
    setSendToAll(false);
  };

  // Handle bulk send
  const handleBulkSend = async () => {
    if (!bulkMessage.trim()) {
      setError('Please enter a message');
      return;
    }

    if (!sendToAll && selectedContacts.length === 0) {
      setError('Please select contacts or choose "Send to all"');
      return;
    }

    // Validate based on message type
    if (messageType === 'reply_buttons') {
      const validButtons = buttons.filter(b => b.title.trim());
      if (validButtons.length === 0) {
        setError('Please add at least one button');
        return;
      }
    }

    if (messageType === 'cta_url') {
      if (!ctaButtonText.trim() || !ctaUrl.trim()) {
        setError('Please enter button text and URL');
        return;
      }
    }

    if (messageType === 'list') {
      if (!listButtonText.trim()) {
        setError('Please enter list button text');
        return;
      }
      const validSections = listSections.filter(s => s.title.trim() && s.rows.some(r => r.title.trim()));
      if (validSections.length === 0) {
        setError('Please add at least one section with items');
        return;
      }
    }

    setSending(true);
    setError(null);

    try {
      // Build message payload based on type
      const messagePayload: Record<string, unknown> = {
        type: messageType,
        bodyText: bulkMessage,
      };

      if (headerText.trim()) messagePayload.headerText = headerText;
      if (footerText.trim()) messagePayload.footerText = footerText;

      if (messageType === 'reply_buttons') {
        messagePayload.buttons = buttons
          .filter(b => b.title.trim())
          .map((b, i) => ({ id: b.id || `btn_${i + 1}`, title: b.title.substring(0, 20) }));
      }

      if (messageType === 'cta_url') {
        messagePayload.buttonText = ctaButtonText;
        messagePayload.url = ctaUrl;
      }

      if (messageType === 'list') {
        messagePayload.listButtonText = listButtonText;
        messagePayload.sections = listSections
          .filter(s => s.title.trim() && s.rows.some(r => r.title.trim()))
          .map(s => ({
            title: s.title,
            rows: s.rows.filter(r => r.title.trim()).map((r, i) => ({
              id: r.id || `row_${i + 1}`,
              title: r.title.substring(0, 24),
              description: r.description || undefined,
            })),
          }));
      }

      const res = await fetch('/api/whatsapp/bulk-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messagePayload,
          contactIds: sendToAll ? undefined : selectedContacts,
          sendToAll,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setCurrentJobId(data.jobId);
        resetMessageForm();
      } else {
        setError(data.error || 'Failed to start bulk send');
        setSending(false);
      }
    } catch (err) {
      setError('Failed to start bulk send');
      setSending(false);
      console.error(err);
    }
  };

  // Format phone number for display
  const formatPhone = (phone: string) => {
    if (phone.startsWith('+1') && phone.length === 12) {
      return `(${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8)}`;
    }
    return phone;
  };

  // Format date for display (handles Firestore Timestamp objects and strings)
  const formatDate = (dateVal: unknown) => {
    let date: Date;
    if (dateVal && typeof dateVal === 'object' && '_seconds' in (dateVal as Record<string, unknown>)) {
      date = new Date((dateVal as { _seconds: number })._seconds * 1000);
    } else if (dateVal && typeof dateVal === 'object' && 'seconds' in (dateVal as Record<string, unknown>)) {
      date = new Date((dateVal as { seconds: number }).seconds * 1000);
    } else {
      date = new Date(dateVal as string);
    }
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Messages</h1>
          <p className="text-sm text-gray-500 mt-1">Manage conversations, contacts, and bulk messaging</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'conversations' as TabType, label: 'Conversations', icon: '💬' },
              { id: 'contacts' as TabType, label: 'Contacts', icon: '👥' },
              { id: 'bulk-send' as TabType, label: 'Bulk Send', icon: '📤' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-4 text-red-500 hover:text-red-700">
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500" />
          </div>
        ) : (
          <>
            {/* Conversations Tab */}
            {activeTab === 'conversations' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Conversation List */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="p-4 border-b border-gray-200">
                    <h2 className="font-semibold text-gray-900">Recent Conversations</h2>
                  </div>
                  <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                    {conversations.length === 0 ? (
                      <p className="p-4 text-gray-500 text-center">No conversations yet</p>
                    ) : (
                      conversations.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => setSelectedConversation(conv)}
                          className={`w-full p-4 text-left hover:bg-gray-50 ${
                            selectedConversation?.id === conv.id ? 'bg-green-50' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">
                                {conv.displayName || formatPhone(conv.phoneNumber)}
                              </p>
                              <p className="text-sm text-gray-500">{formatPhone(conv.phoneNumber)}</p>
                            </div>
                            <span className="text-xs text-gray-400">
                              {formatDate(conv.lastMessageAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 truncate mt-1">
                            {conv.messages[conv.messages.length - 1]?.content || 'No messages'}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Message Thread */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
                  {selectedConversation ? (
                    <>
                      <div className="p-4 border-b border-gray-200 bg-green-50">
                        <h2 className="font-semibold text-gray-900">
                          {selectedConversation.displayName || formatPhone(selectedConversation.phoneNumber)}
                        </h2>
                        <p className="text-sm text-gray-500">
                          {formatPhone(selectedConversation.phoneNumber)} • {selectedConversation.language.toUpperCase()}
                        </p>
                      </div>
                      <div className="p-4 h-[500px] overflow-y-auto space-y-4">
                        {selectedConversation.messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                                msg.role === 'user'
                                  ? 'bg-gray-100 text-gray-900'
                                  : 'bg-green-500 text-white'
                              }`}
                            >
                              <p className="text-sm">{msg.content}</p>
                              <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-gray-400' : 'text-green-100'}`}>
                                {formatDate(msg.timestamp)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-[500px] text-gray-500">
                      Select a conversation to view messages
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contacts Tab */}
            {activeTab === 'contacts' && (
              <div className="space-y-6">
                {/* Add/Import Section */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="font-semibold text-gray-900">Add Contacts</h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                      >
                        {showAddForm ? 'Cancel' : '+ Add Contact'}
                      </button>
                      <button
                        onClick={handleImportFromConversations}
                        disabled={importingFromConversations}
                        className={`px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm ${
                          importingFromConversations ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {importingFromConversations ? 'Importing...' : '📥 Import from Conversations'}
                      </button>
                    </div>
                  </div>

                  {/* Manual Add Contact Form */}
                  {showAddForm && (
                    <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <h3 className="font-medium text-gray-800 mb-3">New Contact</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name *
                          </label>
                          <input
                            type="text"
                            value={newContactName}
                            onChange={(e) => setNewContactName(e.target.value)}
                            placeholder="John Doe"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 placeholder:text-gray-400"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Number *
                          </label>
                          <input
                            type="tel"
                            value={newContactPhone}
                            onChange={(e) => setNewContactPhone(e.target.value)}
                            placeholder="+1 555 123 4567"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 placeholder:text-gray-400"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email (optional)
                          </label>
                          <input
                            type="email"
                            value={newContactEmail}
                            onChange={(e) => setNewContactEmail(e.target.value)}
                            placeholder="john@example.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 placeholder:text-gray-400"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tags (optional, comma-separated)
                          </label>
                          <input
                            type="text"
                            value={newContactTags}
                            onChange={(e) => setNewContactTags(e.target.value)}
                            placeholder="lead, vip, customer"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 placeholder:text-gray-400"
                          />
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={handleAddContact}
                          disabled={addingContact || !newContactName.trim() || !newContactPhone.trim()}
                          className={`px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors ${
                            addingContact || !newContactName.trim() || !newContactPhone.trim()
                              ? 'opacity-50 cursor-not-allowed'
                              : ''
                          }`}
                        >
                          {addingContact ? 'Adding...' : 'Add Contact'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Excel Upload Section */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h3 className="font-medium text-gray-800 mb-3">Import from Excel/CSV</h3>
                    <div className="flex items-center gap-4">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className={`cursor-pointer px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors ${
                          uploading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {uploading ? 'Uploading...' : 'Upload Excel/CSV'}
                      </label>
                      <span className="text-sm text-gray-500">
                        Supported formats: .xlsx, .xls, .csv
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Required columns: phone (or telefono, numero), name (or nombre)
                    </p>
                    <p className="text-sm text-gray-500">
                      Optional columns: email (or correo), tags (or grupo)
                    </p>
                  </div>

                  {uploadResult && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-700">
                        Imported: {uploadResult.imported} contacts
                        {uploadResult.skipped > 0 && ` • Skipped: ${uploadResult.skipped}`}
                      </p>
                      {uploadResult.errors.length > 0 && (
                        <details className="mt-2">
                          <summary className="text-sm text-orange-600 cursor-pointer">
                            {uploadResult.errors.length} warnings
                          </summary>
                          <ul className="text-sm text-orange-600 mt-1 list-disc list-inside">
                            {uploadResult.errors.slice(0, 10).map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  )}
                </div>

                {/* Contacts List */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="font-semibold text-gray-900">Contact Directory ({contacts.length})</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tags</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Imported</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {contacts.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                              No contacts yet. Import an Excel or CSV file to get started.
                            </td>
                          </tr>
                        ) : (
                          contacts.map((contact) => (
                            <tr key={contact.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {contact.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatPhone(contact.phoneNumber)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {contact.email || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {contact.tags?.join(', ') || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(contact.importedAt)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <button
                                  onClick={() => handleDeleteContact(contact.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Bulk Send Tab */}
            {activeTab === 'bulk-send' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Compose Section */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="font-semibold text-gray-900 mb-4">Compose Bulk Message</h2>

                  <div className="space-y-4">
                    {/* Message Type Selector */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Message Type
                      </label>
                      <select
                        value={messageType}
                        onChange={(e) => setMessageType(e.target.value as MessageType)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                      >
                        <option value="text">📝 Text Message</option>
                        <option value="reply_buttons">🔘 Reply Buttons (up to 3)</option>
                        <option value="cta_url">🔗 CTA URL Button</option>
                        <option value="location_request">📍 Location Request</option>
                        <option value="list">📋 Interactive List</option>
                      </select>
                    </div>

                    {/* Message Body */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Message Body
                      </label>
                      <textarea
                        value={bulkMessage}
                        onChange={(e) => setBulkMessage(e.target.value)}
                        placeholder="Enter your message... Use {{name}} to personalize"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-gray-900 placeholder:text-gray-400"
                        rows={3}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Use {'{{name}}'} to include the contact&apos;s name
                      </p>
                    </div>

                    {/* Header & Footer (for buttons and list types) */}
                    {(messageType === 'reply_buttons' || messageType === 'cta_url' || messageType === 'list') && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Header (optional)
                          </label>
                          <input
                            type="text"
                            value={headerText}
                            onChange={(e) => setHeaderText(e.target.value)}
                            placeholder="Header text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm text-gray-900 placeholder:text-gray-400"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Footer (optional)
                          </label>
                          <input
                            type="text"
                            value={footerText}
                            onChange={(e) => setFooterText(e.target.value)}
                            placeholder="Footer text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm text-gray-900 placeholder:text-gray-400"
                          />
                        </div>
                      </div>
                    )}

                    {/* Reply Buttons Config */}
                    {messageType === 'reply_buttons' && (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Buttons (max 3, 20 chars each)
                        </label>
                        {buttons.map((button, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="text"
                              value={button.title}
                              onChange={(e) => {
                                const newButtons = [...buttons];
                                newButtons[index].title = e.target.value;
                                setButtons(newButtons);
                              }}
                              placeholder={`Button ${index + 1} text`}
                              maxLength={20}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm text-gray-900 placeholder:text-gray-400"
                            />
                            {buttons.length > 1 && (
                              <button
                                onClick={() => setButtons(buttons.filter((_, i) => i !== index))}
                                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                        {buttons.length < 3 && (
                          <button
                            onClick={() => setButtons([...buttons, { id: `btn_${buttons.length + 1}`, title: '' }])}
                            className="text-sm text-green-600 hover:text-green-700"
                          >
                            + Add Button
                          </button>
                        )}
                      </div>
                    )}

                    {/* CTA URL Config */}
                    {messageType === 'cta_url' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Button Text (max 20 chars)
                          </label>
                          <input
                            type="text"
                            value={ctaButtonText}
                            onChange={(e) => setCtaButtonText(e.target.value)}
                            placeholder="e.g., Visit Website"
                            maxLength={20}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm text-gray-900 placeholder:text-gray-400"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            URL
                          </label>
                          <input
                            type="url"
                            value={ctaUrl}
                            onChange={(e) => setCtaUrl(e.target.value)}
                            placeholder="https://example.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm text-gray-900 placeholder:text-gray-400"
                          />
                        </div>
                      </div>
                    )}

                    {/* Interactive List Config */}
                    {messageType === 'list' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            List Button Text
                          </label>
                          <input
                            type="text"
                            value={listButtonText}
                            onChange={(e) => setListButtonText(e.target.value)}
                            placeholder="e.g., View Options"
                            maxLength={20}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm text-gray-900 placeholder:text-gray-400"
                          />
                        </div>

                        {listSections.map((section, sIndex) => (
                          <div key={sIndex} className="border border-gray-200 rounded-lg p-3 space-y-2">
                            <div className="flex gap-2 items-center">
                              <input
                                type="text"
                                value={section.title}
                                onChange={(e) => {
                                  const newSections = [...listSections];
                                  newSections[sIndex].title = e.target.value;
                                  setListSections(newSections);
                                }}
                                placeholder="Section title"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm font-medium text-gray-900 placeholder:text-gray-400"
                              />
                              {listSections.length > 1 && (
                                <button
                                  onClick={() => setListSections(listSections.filter((_, i) => i !== sIndex))}
                                  className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                                >
                                  Remove
                                </button>
                              )}
                            </div>

                            {section.rows.map((row, rIndex) => (
                              <div key={rIndex} className="flex gap-2 ml-4">
                                <input
                                  type="text"
                                  value={row.title}
                                  onChange={(e) => {
                                    const newSections = [...listSections];
                                    newSections[sIndex].rows[rIndex].title = e.target.value;
                                    setListSections(newSections);
                                  }}
                                  placeholder="Item title (24 chars)"
                                  maxLength={24}
                                  className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm text-gray-900 placeholder:text-gray-400"
                                />
                                <input
                                  type="text"
                                  value={row.description}
                                  onChange={(e) => {
                                    const newSections = [...listSections];
                                    newSections[sIndex].rows[rIndex].description = e.target.value;
                                    setListSections(newSections);
                                  }}
                                  placeholder="Description"
                                  className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm text-gray-900 placeholder:text-gray-400"
                                />
                                {section.rows.length > 1 && (
                                  <button
                                    onClick={() => {
                                      const newSections = [...listSections];
                                      newSections[sIndex].rows = section.rows.filter((_, i) => i !== rIndex);
                                      setListSections(newSections);
                                    }}
                                    className="text-red-500 text-sm"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))}

                            {section.rows.length < 10 && (
                              <button
                                onClick={() => {
                                  const newSections = [...listSections];
                                  newSections[sIndex].rows.push({
                                    id: `row_${section.rows.length + 1}`,
                                    title: '',
                                    description: ''
                                  });
                                  setListSections(newSections);
                                }}
                                className="text-xs text-green-600 hover:text-green-700 ml-4"
                              >
                                + Add Item
                              </button>
                            )}
                          </div>
                        ))}

                        <button
                          onClick={() => setListSections([
                            ...listSections,
                            { title: '', rows: [{ id: 'row_1', title: '', description: '' }] }
                          ])}
                          className="text-sm text-green-600 hover:text-green-700"
                        >
                          + Add Section
                        </button>
                      </div>
                    )}

                    {/* Location Request Info */}
                    {messageType === 'location_request' && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-700">
                          📍 This will send a message asking the user to share their location.
                          They can tap to share their current location.
                        </p>
                      </div>
                    )}

                    {/* Recipients */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Recipients
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={sendToAll}
                            onChange={(e) => {
                              setSendToAll(e.target.checked);
                              if (e.target.checked) setSelectedContacts([]);
                            }}
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            Send to all contacts ({contacts.filter((c) => !c.optedOut).length})
                          </span>
                        </label>
                      </div>

                      {!sendToAll && (
                        <div className="mt-3 max-h-32 overflow-y-auto border border-gray-200 rounded-lg">
                          {contacts.filter((c) => !c.optedOut).map((contact) => (
                            <label
                              key={contact.id}
                              className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedContacts.includes(contact.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedContacts([...selectedContacts, contact.id]);
                                  } else {
                                    setSelectedContacts(selectedContacts.filter((id) => id !== contact.id));
                                  }
                                }}
                                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">
                                {contact.name} ({formatPhone(contact.phoneNumber)})
                              </span>
                            </label>
                          ))}
                        </div>
                      )}

                      {!sendToAll && selectedContacts.length > 0 && (
                        <p className="text-sm text-gray-500 mt-2">
                          Selected: {selectedContacts.length} contacts
                        </p>
                      )}
                    </div>

                    <button
                      onClick={handleBulkSend}
                      disabled={sending || !bulkMessage.trim() || (!sendToAll && selectedContacts.length === 0)}
                      className={`w-full px-4 py-3 rounded-lg font-medium text-white transition-colors ${
                        sending || !bulkMessage.trim() || (!sendToAll && selectedContacts.length === 0)
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-green-500 hover:bg-green-600'
                      }`}
                    >
                      {sending ? 'Sending...' : 'Send Bulk Message'}
                    </button>
                  </div>
                </div>

                {/* Job History */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="p-4 border-b border-gray-200">
                    <h2 className="font-semibold text-gray-900">Bulk Send History</h2>
                  </div>
                  <div className="divide-y divide-gray-200 max-h-[500px] overflow-y-auto">
                    {bulkJobs.length === 0 ? (
                      <p className="p-4 text-gray-500 text-center">No bulk sends yet</p>
                    ) : (
                      bulkJobs.map((job) => (
                        <div key={job.id} className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                  {job.messageType === 'reply_buttons' ? '🔘 Buttons' :
                                   job.messageType === 'cta_url' ? '🔗 CTA' :
                                   job.messageType === 'location_request' ? '📍 Location' :
                                   job.messageType === 'list' ? '📋 List' : '📝 Text'}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-gray-900 truncate max-w-[200px] mt-1">
                                {job.message.substring(0, 50)}...
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(job.createdAt)}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                job.status === 'completed'
                                  ? 'bg-green-100 text-green-700'
                                  : job.status === 'processing'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : job.status === 'failed'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {job.status}
                            </span>
                          </div>
                          <div className="mt-2">
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-green-600">Sent: {job.sentCount}</span>
                              <span className="text-red-600">Failed: {job.failedCount}</span>
                              <span className="text-gray-500">Total: {job.totalContacts}</span>
                            </div>
                            {job.status === 'processing' && (
                              <div className="mt-2 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full transition-all"
                                  style={{
                                    width: `${((job.sentCount + job.failedCount) / job.totalContacts) * 100}%`,
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
