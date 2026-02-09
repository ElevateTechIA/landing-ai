'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

interface WhatsAppMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: unknown;
  messageId?: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  type?: string;
  mediaUrl?: string;
  replyTo?: string;
}

interface WhatsAppConversation {
  id: string;
  phoneNumber: string;
  displayName?: string;
  messages: WhatsAppMessage[];
  language: 'en' | 'es';
  status?: 'open' | 'resolved' | 'archived';
  lastMessageAt: unknown;
  businessPhoneNumberId?: string;
}

interface PhoneNumberOption {
  phoneNumberId: string;
  displayName: string;
  displayPhone: string;
}

interface Snippet {
  id: string;
  name: string;
  content: string;
  shortcut: string;
  category: string;
}

type LifecycleStage = 'new_lead' | 'qualified' | 'proposal' | 'customer' | 'lost';

interface ContactNote {
  id: string;
  content: string;
  createdAt: unknown;
}

interface WhatsAppTag {
  id: string;
  name: string;
  color: string;
}

interface WhatsAppContact {
  id: string;
  phoneNumber: string;
  name: string;
  email?: string;
  tags?: string[];
  lifecycleStage?: LifecycleStage;
  notes?: ContactNote[];
  company?: string;
  importedFrom?: string;
  importedAt: string;
  lastContacted?: string;
  optedOut: boolean;
}

interface BroadcastAnalytics {
  deliveredCount: number;
  readCount: number;
  respondedCount: number;
  deliveryRate: number;
  readRate: number;
  responseRate: number;
}

interface BulkSendJob {
  id: string;
  name?: string;
  status: 'pending' | 'scheduled' | 'processing' | 'completed' | 'failed';
  message: string;
  messageType?: string;
  totalContacts: number;
  sentCount: number;
  failedCount: number;
  scheduledFor?: string;
  audienceFilter?: { tags?: string[]; lifecycleStages?: string[] };
  analytics?: BroadcastAnalytics;
  createdAt: string;
  completedAt?: string;
}

type AutoReplyType = 'welcome' | 'away' | 'keyword';

interface AutoReply {
  id: string;
  type: AutoReplyType;
  name: string;
  enabled: boolean;
  message: string;
  keywords?: string[];
  matchMode?: 'contains' | 'exact';
}

interface BusinessHoursSlot {
  day: number;
  startTime: string;
  endTime: string;
  enabled: boolean;
}

interface AntiBlockingConfig {
  enableTypingIndicator: boolean;
  enableReadReceipts: boolean;
  minReplyDelaySec: number;
  maxReplyDelaySec: number;
  bulkMessageDelaySec: number;
  bulkBatchSize: number;
  bulkBatchPauseSec: number;
}

interface AutomationConfig {
  businessHours: BusinessHoursSlot[];
  autoCloseAfterHours: number;
  timezone: string;
  antiBlocking?: AntiBlockingConfig;
}

interface DailyMessageCount {
  date: string;
  sent: number;
  received: number;
}

interface ConversationMetrics {
  total: number;
  open: number;
  resolved: number;
  archived: number;
  avgMessagesPerConversation: number;
  avgFirstResponseMinutes: number;
}

interface ContactGrowthPoint {
  date: string;
  count: number;
  cumulative: number;
}

interface BroadcastSummary {
  id: string;
  name: string;
  status: string;
  totalContacts: number;
  sentCount: number;
  failedCount: number;
  deliveryRate: number;
  readRate: number;
  responseRate: number;
  createdAt: string;
}

interface AnalyticsData {
  messageVolume: DailyMessageCount[];
  conversationMetrics: ConversationMetrics;
  contactGrowth: ContactGrowthPoint[];
  broadcastPerformance: BroadcastSummary[];
  topMetrics: {
    totalMessages: number;
    totalContacts: number;
    totalBroadcasts: number;
    avgResponseTime: string;
    messagesThisWeek: number;
    newContactsThisWeek: number;
  };
}

type TabType = 'conversations' | 'contacts' | 'bulk-send' | 'automation' | 'analytics';
type MessageType = 'text' | 'reply_buttons' | 'cta_url' | 'location_request' | 'list' | 'template';

interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: string;
  text?: string;
  buttons?: Array<{ type: string; text: string; url?: string }>;
  example?: { body_text?: string[][] };
}

interface MessageTemplate {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components: TemplateComponent[];
}

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

  // Multi-phone number state
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumberOption[]>([]);
  const [activePhoneNumberId, setActivePhoneNumberId] = useState<string>('');

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

  // CRM state (Phase 2)
  const [selectedContact, setSelectedContact] = useState<WhatsAppContact | null>(null);
  const [contactSearch, setContactSearch] = useState('');
  const [contactLifecycleFilter, setContactLifecycleFilter] = useState<LifecycleStage | ''>('');
  const [contactTagFilter, setContactTagFilter] = useState('');
  const [tags, setTags] = useState<WhatsAppTag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  // Bulk send state
  const [bulkMessage, setBulkMessage] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [sendToAll, setSendToAll] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // Broadcast scheduling state (Phase 3)
  const [broadcastName, setBroadcastName] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [useAudienceFilter, setUseAudienceFilter] = useState(false);
  const [audienceTagFilter, setAudienceTagFilter] = useState<string[]>([]);
  const [audienceLifecycleFilter, setAudienceLifecycleFilter] = useState<string[]>([]);
  const [selectedJobDetail, setSelectedJobDetail] = useState<BulkSendJob | null>(null);

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

  // Inbox composer state
  const [composerText, setComposerText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [showSnippets, setShowSnippets] = useState(false);
  const [snippetFilter, setSnippetFilter] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionMessageId, setReactionMessageId] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<WhatsAppMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  // Snippet management state
  const [showSnippetManager, setShowSnippetManager] = useState(false);
  const [newSnippetName, setNewSnippetName] = useState('');
  const [newSnippetContent, setNewSnippetContent] = useState('');
  const [newSnippetShortcut, setNewSnippetShortcut] = useState('');
  const [newSnippetCategory, setNewSnippetCategory] = useState('general');

  // Template state
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({});
  // Bulk send template state
  const [bulkSelectedTemplate, setBulkSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [bulkTemplateParams, setBulkTemplateParams] = useState<Record<string, string>>({});

  // Automation state (Phase 4)
  const [autoReplies, setAutoReplies] = useState<AutoReply[]>([]);
  const [automationConfig, setAutomationConfig] = useState<AutomationConfig>({
    businessHours: [
      { day: 0, startTime: '09:00', endTime: '17:00', enabled: false },
      { day: 1, startTime: '09:00', endTime: '17:00', enabled: true },
      { day: 2, startTime: '09:00', endTime: '17:00', enabled: true },
      { day: 3, startTime: '09:00', endTime: '17:00', enabled: true },
      { day: 4, startTime: '09:00', endTime: '17:00', enabled: true },
      { day: 5, startTime: '09:00', endTime: '17:00', enabled: true },
      { day: 6, startTime: '09:00', endTime: '17:00', enabled: false },
    ],
    autoCloseAfterHours: 24,
    timezone: 'America/New_York',
    antiBlocking: {
      enableTypingIndicator: true,
      enableReadReceipts: true,
      minReplyDelaySec: 1,
      maxReplyDelaySec: 5,
      bulkMessageDelaySec: 2,
      bulkBatchSize: 50,
      bulkBatchPauseSec: 45,
    },
  });
  const [newAutoReplyType, setNewAutoReplyType] = useState<AutoReplyType>('keyword');
  const [newAutoReplyName, setNewAutoReplyName] = useState('');
  const [newAutoReplyMessage, setNewAutoReplyMessage] = useState('');
  const [newAutoReplyKeywords, setNewAutoReplyKeywords] = useState('');
  const [newAutoReplyMatchMode, setNewAutoReplyMatchMode] = useState<'contains' | 'exact'>('contains');
  const [savingAutomation, setSavingAutomation] = useState(false);
  const [conversationStatusFilter, setConversationStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');

  // Analytics state (Phase 5)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  // Fetch phone numbers on mount
  useEffect(() => {
    const fetchPhoneNumbers = async () => {
      try {
        const res = await fetch('/api/whatsapp/phone-numbers');
        const data = await res.json();
        if (data.success && data.phoneNumbers.length > 0) {
          setPhoneNumbers(data.phoneNumbers);
          setActivePhoneNumberId(data.phoneNumbers[0].phoneNumberId);
        }
      } catch (err) {
        console.error('Failed to fetch phone numbers:', err);
      }
    };
    fetchPhoneNumbers();
  }, []);

  // Fetch data based on active tab
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'conversations') {
        const params = activePhoneNumberId ? `?phoneNumberId=${activePhoneNumberId}` : '';
        const res = await fetch(`/api/whatsapp/conversations${params}`);
        const data = await res.json();
        if (data.success) {
          setConversations(data.conversations);
        }
      } else if (activeTab === 'contacts') {
        const [contactsRes, tagsRes] = await Promise.all([
          fetch('/api/whatsapp/contacts'),
          fetch('/api/whatsapp/contacts/tags'),
        ]);
        const contactsData = await contactsRes.json();
        const tagsData = await tagsRes.json();
        if (contactsData.success) {
          setContacts(contactsData.contacts);
        }
        if (tagsData.success) {
          setTags(tagsData.tags);
        }
      } else if (activeTab === 'bulk-send') {
        const [contactsRes, jobsRes, tagsRes] = await Promise.all([
          fetch('/api/whatsapp/contacts'),
          fetch('/api/whatsapp/bulk-send'),
          fetch('/api/whatsapp/contacts/tags'),
        ]);
        const contactsData = await contactsRes.json();
        const jobsData = await jobsRes.json();
        const tagsData = await tagsRes.json();
        if (contactsData.success) {
          setContacts(contactsData.contacts);
        }
        if (jobsData.success) {
          setBulkJobs(jobsData.jobs);
        }
        if (tagsData.success) {
          setTags(tagsData.tags);
        }
      } else if (activeTab === 'automation') {
        const [autoRepliesRes, configRes] = await Promise.all([
          fetch('/api/whatsapp/auto-replies'),
          fetch('/api/whatsapp/automation-config'),
        ]);
        const autoRepliesData = await autoRepliesRes.json();
        const configData = await configRes.json();
        if (autoRepliesData.success) {
          setAutoReplies(autoRepliesData.autoReplies);
        }
        if (configData.success && configData.config) {
          setAutomationConfig(configData.config);
        }
      } else if (activeTab === 'analytics') {
        const res = await fetch('/api/whatsapp/analytics');
        const data = await res.json();
        if (data.success) {
          setAnalyticsData(data.analytics);
        }
      }
    } catch (err) {
      setError('Failed to fetch data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, activePhoneNumberId]);

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
    setBroadcastName('');
    setScheduleEnabled(false);
    setScheduledDate('');
    setScheduledTime('');
    setUseAudienceFilter(false);
    setAudienceTagFilter([]);
    setAudienceLifecycleFilter([]);
  };

  // Compute audience count for audience filter preview
  const getAudienceCount = () => {
    if (!useAudienceFilter) return 0;
    let filtered = contacts.filter(c => !c.optedOut);
    if (audienceTagFilter.length > 0) {
      filtered = filtered.filter(c => c.tags && c.tags.some(t => audienceTagFilter.includes(t)));
    }
    if (audienceLifecycleFilter.length > 0) {
      filtered = filtered.filter(c => c.lifecycleStage && audienceLifecycleFilter.includes(c.lifecycleStage));
    }
    return filtered.length;
  };

  // Handle bulk send
  const handleBulkSend = async () => {
    if (messageType === 'template') {
      if (!bulkSelectedTemplate) {
        setError('Please select a template');
        return;
      }
      if (!allTemplateParamsFilled(bulkSelectedTemplate, bulkTemplateParams)) {
        setError('Please fill in all template parameters');
        return;
      }
    } else if (!bulkMessage.trim()) {
      setError('Please enter a message');
      return;
    }

    // Validate recipients
    const hasAudienceFilter = useAudienceFilter && (audienceTagFilter.length > 0 || audienceLifecycleFilter.length > 0);
    if (!sendToAll && selectedContacts.length === 0 && !hasAudienceFilter) {
      setError('Please select contacts, set audience filters, or choose "Send to all"');
      return;
    }

    // Validate schedule
    if (scheduleEnabled) {
      if (!scheduledDate || !scheduledTime) {
        setError('Please select a date and time for scheduling');
        return;
      }
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      if (scheduledDateTime <= new Date()) {
        setError('Scheduled time must be in the future');
        return;
      }
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

      if (messageType === 'template' && bulkSelectedTemplate) {
        messagePayload.templateName = bulkSelectedTemplate.name;
        messagePayload.languageCode = bulkSelectedTemplate.language;
        const tplComponents = buildTemplateComponents(bulkSelectedTemplate, bulkTemplateParams);
        if (tplComponents.length > 0) {
          messagePayload.templateComponents = tplComponents;
        }
      }

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

      // Build request body
      const requestBody: Record<string, unknown> = {
        messagePayload,
        name: broadcastName.trim() || undefined,
        phoneNumberId: activePhoneNumberId || undefined,
      };

      // Add scheduling if enabled
      if (scheduleEnabled && scheduledDate && scheduledTime) {
        requestBody.scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      }

      // Add audience filter or contact selection
      if (hasAudienceFilter) {
        requestBody.audienceFilter = {
          tags: audienceTagFilter.length > 0 ? audienceTagFilter : undefined,
          lifecycleStages: audienceLifecycleFilter.length > 0 ? audienceLifecycleFilter : undefined,
          excludeOptedOut: true,
        };
      } else {
        requestBody.contactIds = sendToAll ? undefined : selectedContacts;
        requestBody.sendToAll = sendToAll;
      }

      const res = await fetch('/api/whatsapp/bulk-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();

      if (data.success) {
        if (data.scheduledFor) {
          // Scheduled broadcast - no need to poll
          setSending(false);
          await fetchData();
        } else {
          setCurrentJobId(data.jobId);
        }
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

  // =============================================
  // CRM Functions (Phase 2)
  // =============================================

  const lifecycleStages: { value: LifecycleStage; label: string; color: string }[] = [
    { value: 'new_lead', label: 'New Lead', color: 'bg-blue-100 text-blue-800' },
    { value: 'qualified', label: 'Qualified', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'proposal', label: 'Proposal', color: 'bg-purple-100 text-purple-800' },
    { value: 'customer', label: 'Customer', color: 'bg-green-100 text-green-800' },
    { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-800' },
  ];

  const tagColors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

  const getLifecycleStyle = (stage?: LifecycleStage) => {
    return lifecycleStages.find(s => s.value === stage)?.color || 'bg-gray-100 text-gray-800';
  };

  const getLifecycleLabel = (stage?: LifecycleStage) => {
    return lifecycleStages.find(s => s.value === stage)?.label || 'No Stage';
  };

  // Filter contacts based on search and filters
  const filteredContacts = contacts.filter(c => {
    const matchesSearch = !contactSearch ||
      c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.phoneNumber.includes(contactSearch) ||
      c.email?.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.company?.toLowerCase().includes(contactSearch.toLowerCase());
    const matchesLifecycle = !contactLifecycleFilter || c.lifecycleStage === contactLifecycleFilter;
    const matchesTag = !contactTagFilter || c.tags?.includes(contactTagFilter);
    return matchesSearch && matchesLifecycle && matchesTag;
  });

  // Update contact field
  const handleUpdateContact = async (contactId: string, updates: Record<string, unknown>) => {
    setSavingContact(true);
    try {
      const res = await fetch(`/api/whatsapp/contacts/${contactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success && data.contact) {
        setContacts(prev => prev.map(c => c.id === contactId ? data.contact : c));
        setSelectedContact(data.contact);
      } else {
        setError(data.error || 'Failed to update contact');
      }
    } catch (err) {
      setError('Failed to update contact');
      console.error(err);
    } finally {
      setSavingContact(false);
    }
  };

  // Add note to contact
  const handleAddNote = async () => {
    if (!selectedContact || !newNoteContent.trim()) return;
    try {
      const res = await fetch(`/api/whatsapp/contacts/${selectedContact.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_note', content: newNoteContent.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewNoteContent('');
        // Refresh contact
        const contactRes = await fetch(`/api/whatsapp/contacts/${selectedContact.id}`);
        const contactData = await contactRes.json();
        if (contactData.success) {
          setSelectedContact(contactData.contact);
          setContacts(prev => prev.map(c => c.id === selectedContact.id ? contactData.contact : c));
        }
      }
    } catch (err) {
      console.error('Failed to add note:', err);
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    if (!selectedContact) return;
    try {
      await fetch(`/api/whatsapp/contacts/${selectedContact.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_note', noteId }),
      });
      // Refresh contact
      const contactRes = await fetch(`/api/whatsapp/contacts/${selectedContact.id}`);
      const contactData = await contactRes.json();
      if (contactData.success) {
        setSelectedContact(contactData.contact);
        setContacts(prev => prev.map(c => c.id === selectedContact.id ? contactData.contact : c));
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  // Create tag
  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const res = await fetch('/api/whatsapp/contacts/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      });
      const data = await res.json();
      if (data.success) {
        setNewTagName('');
        // Refresh tags
        const tagsRes = await fetch('/api/whatsapp/contacts/tags');
        const tagsData = await tagsRes.json();
        if (tagsData.success) setTags(tagsData.tags);
      }
    } catch (err) {
      console.error('Failed to create tag:', err);
    }
  };

  // Delete tag
  const handleDeleteTag = async (tagId: string) => {
    try {
      await fetch(`/api/whatsapp/contacts/tags?id=${tagId}`, { method: 'DELETE' });
      setTags(prev => prev.filter(t => t.id !== tagId));
    } catch (err) {
      console.error('Failed to delete tag:', err);
    }
  };

  // Toggle tag on contact
  const handleToggleContactTag = async (contactId: string, tagName: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;
    const currentTags = contact.tags || [];
    const newTags = currentTags.includes(tagName)
      ? currentTags.filter(t => t !== tagName)
      : [...currentTags, tagName];
    await handleUpdateContact(contactId, { tags: newTags });
  };

  // =============================================
  // Inbox Functions (Phase 1)
  // =============================================

  // Fetch snippets
  const fetchSnippets = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/snippets');
      const data = await res.json();
      if (data.success) {
        setSnippets(data.snippets);
      }
    } catch (err) {
      console.error('Failed to fetch snippets:', err);
    }
  }, []);

  useEffect(() => {
    fetchSnippets();
  }, [fetchSnippets]);

  // Fetch message templates
  const fetchTemplates = useCallback(async () => {
    try {
      const params = activePhoneNumberId ? `?phoneNumberId=${activePhoneNumberId}` : '';
      const res = await fetch(`/api/whatsapp/templates${params}`);
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  }, [activePhoneNumberId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Helper: extract body/header text and parameter placeholders from a template
  const getTemplateBody = (template: MessageTemplate): string => {
    const bodyComp = template.components.find(c => c.type === 'BODY');
    return bodyComp?.text || '';
  };

  const getTemplateHeaderText = (template: MessageTemplate): string => {
    const headerComp = template.components.find(c => c.type === 'HEADER' && c.format === 'TEXT');
    return headerComp?.text || '';
  };

  // Detect media header (IMAGE, VIDEO, DOCUMENT)
  const getTemplateMediaHeader = (template: MessageTemplate): string | null => {
    const headerComp = template.components.find(c => c.type === 'HEADER');
    if (headerComp?.format && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComp.format)) {
      return headerComp.format.toLowerCase(); // 'image', 'video', 'document'
    }
    return null;
  };

  const getParamCountFromText = (text: string): number => {
    const matches = text.match(/\{\{\d+\}\}/g);
    return matches ? matches.length : 0;
  };

  // Detect button URL parameters (buttons with {{1}} in their URL)
  const getTemplateButtonUrlParams = (template: MessageTemplate): Array<{ index: number; text: string }> => {
    const buttonsComp = template.components.find(c => c.type === 'BUTTONS');
    if (!buttonsComp?.buttons) return [];
    const params: Array<{ index: number; text: string }> = [];
    buttonsComp.buttons.forEach((btn, idx) => {
      if (btn.url && /\{\{\d+\}\}/.test(btn.url)) {
        params.push({ index: idx, text: btn.text });
      }
    });
    return params;
  };

  const getTemplateParamCount = (template: MessageTemplate): number => {
    const mediaHeader = getTemplateMediaHeader(template);
    return getParamCountFromText(getTemplateBody(template))
      + getParamCountFromText(getTemplateHeaderText(template))
      + getTemplateButtonUrlParams(template).length
      + (mediaHeader ? 1 : 0);
  };

  const getTemplateParamFields = (template: MessageTemplate): Array<{ key: string; label: string; placeholder: string }> => {
    const fields: Array<{ key: string; label: string; placeholder: string }> = [];
    // Media header (IMAGE/VIDEO/DOCUMENT)
    const mediaHeader = getTemplateMediaHeader(template);
    if (mediaHeader) {
      fields.push({
        key: 'header_media',
        label: `Header ${mediaHeader.toUpperCase()} URL`,
        placeholder: `https://example.com/your-${mediaHeader}.${mediaHeader === 'image' ? 'jpg' : mediaHeader === 'video' ? 'mp4' : 'pdf'}`,
      });
    }
    // Text header params
    const headerCount = getParamCountFromText(getTemplateHeaderText(template));
    for (let i = 1; i <= headerCount; i++) {
      fields.push({ key: `header_${i}`, label: `Header {{${i}}}`, placeholder: `Header parameter ${i}` });
    }
    // Body params
    const bodyCount = getParamCountFromText(getTemplateBody(template));
    for (let i = 1; i <= bodyCount; i++) {
      fields.push({ key: `body_${i}`, label: `Body {{${i}}}`, placeholder: `Parameter ${i}` });
    }
    // Button URL params
    const buttonParams = getTemplateButtonUrlParams(template);
    for (const bp of buttonParams) {
      fields.push({ key: `button_${bp.index}`, label: `Button "${bp.text}" URL suffix`, placeholder: `URL value for ${bp.text}` });
    }
    return fields;
  };

  const allTemplateParamsFilled = (template: MessageTemplate, params: Record<string, string>): boolean => {
    const fields = getTemplateParamFields(template);
    if (fields.length === 0) return true;
    return fields.every(f => (params[f.key] || '').trim().length > 0);
  };

  // Build components array for the WhatsApp Cloud API from filled-in template params
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const buildTemplateComponents = (
    template: MessageTemplate,
    params: Record<string, string>
  ): any[] => {
    const components: any[] = [];

    // Media header (IMAGE/VIDEO/DOCUMENT)
    const mediaHeader = getTemplateMediaHeader(template);
    if (mediaHeader && params['header_media']) {
      const mediaParam: Record<string, unknown> = { type: mediaHeader };
      mediaParam[mediaHeader] = { link: params['header_media'] };
      components.push({ type: 'header', parameters: [mediaParam] });
    }

    // Text header params
    const headerCount = getParamCountFromText(getTemplateHeaderText(template));
    if (headerCount > 0) {
      const parameters = [];
      for (let i = 1; i <= headerCount; i++) {
        parameters.push({ type: 'text', text: params[`header_${i}`] || '' });
      }
      components.push({ type: 'header', parameters });
    }

    // Body params
    const bodyCount = getParamCountFromText(getTemplateBody(template));
    if (bodyCount > 0) {
      const parameters = [];
      for (let i = 1; i <= bodyCount; i++) {
        parameters.push({ type: 'text', text: params[`body_${i}`] || '' });
      }
      components.push({ type: 'body', parameters });
    }

    // Button URL parameters (dynamic URL suffix)
    const buttonParams = getTemplateButtonUrlParams(template);
    for (const bp of buttonParams) {
      components.push({
        type: 'button',
        sub_type: 'url',
        index: String(bp.index),
        parameters: [{ type: 'text', text: params[`button_${bp.index}`] || '' }],
      });
    }

    return components;
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // Handle selecting a template in the inbox composer
  const handleSelectTemplate = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setTemplateParams({});
    setShowTemplatePicker(false);
  };

  // Send template message from inbox composer
  const handleSendTemplate = async () => {
    if (!selectedTemplate || !selectedConversation) return;
    if (!allTemplateParamsFilled(selectedTemplate, templateParams)) {
      setError('Please fill in all template parameters');
      return;
    }

    setSendingMessage(true);
    setError(null);

    try {
      const components = buildTemplateComponents(selectedTemplate, templateParams);
      const res = await fetch('/api/whatsapp/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedConversation.phoneNumber,
          type: 'template',
          templateName: selectedTemplate.name,
          languageCode: selectedTemplate.language,
          components: components.length > 0 ? components : undefined,
          phoneNumberId: activePhoneNumberId || undefined,
        }),
      });
      const data = await res.json();

      if (data.success) {
        const paramValues = Object.values(templateParams).filter(Boolean);
        const contentPreview = paramValues.length > 0
          ? `[Template: ${selectedTemplate.name}] ${paramValues.join(', ')}`
          : `[Template: ${selectedTemplate.name}]`;
        const newMessage: WhatsAppMessage = {
          id: data.messageId || `sent_${Date.now()}`,
          role: 'assistant',
          content: contentPreview,
          timestamp: new Date().toISOString(),
          messageId: data.messageId,
          status: 'sent',
          type: 'template',
        };
        setSelectedConversation(prev => {
          if (!prev) return prev;
          return { ...prev, messages: [...prev.messages, newMessage] };
        });
        setConversations(prev => prev.map(c => {
          if (c.id === selectedConversation.id) {
            return { ...c, messages: [...c.messages, newMessage], lastMessageAt: new Date().toISOString() };
          }
          return c;
        }));
        setSelectedTemplate(null);
        setTemplateParams({});
        setTimeout(scrollToBottom, 100);
      } else {
        setError(data.error || 'Failed to send template');
      }
    } catch (err) {
      setError('Failed to send template');
      console.error(err);
    } finally {
      setSendingMessage(false);
    }
  };

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      scrollToBottom();
    }
  }, [selectedConversation, scrollToBottom]);

  // Send message from inbox composer
  const handleSendMessage = async () => {
    if (!composerText.trim() || !selectedConversation || sendingMessage) return;

    setSendingMessage(true);
    setError(null);

    try {
      const res = await fetch('/api/whatsapp/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedConversation.phoneNumber,
          type: 'text',
          text: composerText,
          replyToMessageId: replyToMessage?.messageId || undefined,
          phoneNumberId: activePhoneNumberId || undefined,
        }),
      });
      const data = await res.json();

      if (data.success) {
        // Add message to local state
        const newMessage: WhatsAppMessage = {
          id: data.messageId || `sent_${Date.now()}`,
          role: 'assistant',
          content: composerText,
          timestamp: new Date().toISOString(),
          messageId: data.messageId,
          status: 'sent',
          replyTo: replyToMessage?.messageId,
        };
        setSelectedConversation(prev => {
          if (!prev) return prev;
          return { ...prev, messages: [...prev.messages, newMessage] };
        });
        setConversations(prev => prev.map(c => {
          if (c.id === selectedConversation.id) {
            return { ...c, messages: [...c.messages, newMessage], lastMessageAt: new Date().toISOString() };
          }
          return c;
        }));
        setComposerText('');
        setReplyToMessage(null);
        setTimeout(scrollToBottom, 100);
      } else {
        setError(data.error || 'Failed to send message');
      }
    } catch (err) {
      setError('Failed to send message');
      console.error(err);
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle reaction
  const handleReaction = async (messageId: string, emoji: string) => {
    if (!selectedConversation) return;

    try {
      await fetch('/api/whatsapp/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedConversation.phoneNumber,
          type: 'reaction',
          messageId,
          emoji,
          phoneNumberId: activePhoneNumberId || undefined,
        }),
      });
      setReactionMessageId(null);
    } catch (err) {
      console.error('Failed to send reaction:', err);
    }
  };

  // Handle composer text change (detect "/" for snippets)
  const handleComposerChange = (text: string) => {
    setComposerText(text);

    // Detect "/" at start of text or after space
    if (text.startsWith('/') || text.includes(' /')) {
      const slashIndex = text.lastIndexOf('/');
      const filter = text.substring(slashIndex + 1);
      setSnippetFilter(filter);
      setShowSnippets(true);
    } else {
      setShowSnippets(false);
    }
  };

  // Insert snippet into composer
  const insertSnippet = (snippet: Snippet) => {
    // Replace the /command with snippet content
    const slashIndex = composerText.lastIndexOf('/');
    const before = slashIndex > 0 ? composerText.substring(0, slashIndex) : '';
    setComposerText(before + snippet.content);
    setShowSnippets(false);
    composerRef.current?.focus();
  };

  // Save new snippet
  const handleSaveSnippet = async () => {
    if (!newSnippetName.trim() || !newSnippetContent.trim()) return;

    try {
      const res = await fetch('/api/whatsapp/snippets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSnippetName,
          content: newSnippetContent,
          shortcut: newSnippetShortcut,
          category: newSnippetCategory,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewSnippetName('');
        setNewSnippetContent('');
        setNewSnippetShortcut('');
        setNewSnippetCategory('general');
        setShowSnippetManager(false);
        fetchSnippets();
      }
    } catch (err) {
      console.error('Failed to save snippet:', err);
    }
  };

  // Delete snippet
  const handleDeleteSnippet = async (snippetId: string) => {
    try {
      await fetch(`/api/whatsapp/snippets?id=${snippetId}`, { method: 'DELETE' });
      fetchSnippets();
    } catch (err) {
      console.error('Failed to delete snippet:', err);
    }
  };

  // Common emojis for reactions
  const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

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

  // =============================================
  // Automation Functions (Phase 4)
  // =============================================

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const handleCreateAutoReply = async () => {
    if (!newAutoReplyName.trim() || !newAutoReplyMessage.trim()) {
      setError('Name and message are required');
      return;
    }
    if (newAutoReplyType === 'keyword' && !newAutoReplyKeywords.trim()) {
      setError('Keywords are required for keyword triggers');
      return;
    }

    setSavingAutomation(true);
    try {
      const res = await fetch('/api/whatsapp/auto-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newAutoReplyType,
          name: newAutoReplyName.trim(),
          message: newAutoReplyMessage.trim(),
          enabled: true,
          ...(newAutoReplyType === 'keyword' && {
            keywords: newAutoReplyKeywords.split(',').map(k => k.trim()).filter(Boolean),
            matchMode: newAutoReplyMatchMode,
          }),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewAutoReplyName('');
        setNewAutoReplyMessage('');
        setNewAutoReplyKeywords('');
        await fetchData();
      } else {
        setError(data.error || 'Failed to create auto-reply');
      }
    } catch {
      setError('Failed to create auto-reply');
    } finally {
      setSavingAutomation(false);
    }
  };

  const handleToggleAutoReply = async (id: string, enabled: boolean) => {
    try {
      await fetch('/api/whatsapp/auto-replies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled }),
      });
      setAutoReplies(prev => prev.map(r => r.id === id ? { ...r, enabled } : r));
    } catch {
      setError('Failed to update auto-reply');
    }
  };

  const handleDeleteAutoReply = async (id: string) => {
    if (!confirm('Delete this auto-reply rule?')) return;
    try {
      await fetch(`/api/whatsapp/auto-replies?id=${id}`, { method: 'DELETE' });
      setAutoReplies(prev => prev.filter(r => r.id !== id));
    } catch {
      setError('Failed to delete auto-reply');
    }
  };

  const handleSaveBusinessHours = async () => {
    setSavingAutomation(true);
    try {
      const res = await fetch('/api/whatsapp/automation-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(automationConfig),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to save business hours');
      }
    } catch {
      setError('Failed to save business hours');
    } finally {
      setSavingAutomation(false);
    }
  };

  const handleUpdateConversationStatus = async (convId: string, status: 'open' | 'resolved') => {
    try {
      const res = await fetch('/api/whatsapp/conversations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convId, status }),
      });
      const data = await res.json();
      if (data.success) {
        setConversations(prev => prev.map(c => c.id === convId ? { ...c, status } : c));
        if (selectedConversation?.id === convId) {
          setSelectedConversation({ ...selectedConversation, status });
        }
      }
    } catch {
      setError('Failed to update conversation status');
    }
  };

  const filteredConversations = conversationStatusFilter === 'all'
    ? conversations
    : conversations.filter(c => (c.status || 'open') === conversationStatusFilter);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">WhatsApp Messages</h1>
              <p className="text-sm text-gray-500 mt-1">Manage conversations, contacts, and bulk messaging</p>
            </div>
            {phoneNumbers.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Phone:</span>
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                  {phoneNumbers.map((pn) => (
                    <button
                      key={pn.phoneNumberId}
                      onClick={() => {
                        setActivePhoneNumberId(pn.phoneNumberId);
                        setSelectedConversation(null);
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        activePhoneNumberId === pn.phoneNumberId
                          ? 'bg-green-500 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {pn.displayName || pn.displayPhone}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'conversations' as TabType, label: 'Conversations', icon: '💬' },
              { id: 'contacts' as TabType, label: 'Contacts', icon: '👥' },
              { id: 'bulk-send' as TabType, label: 'Broadcast', icon: '📤' },
              { id: 'automation' as TabType, label: 'Automation', icon: '⚡' },
              { id: 'analytics' as TabType, label: 'Analytics', icon: '📊' },
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
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="font-semibold text-gray-900">Conversations</h2>
                    </div>
                    <div className="flex gap-1">
                      {(['all', 'open', 'resolved'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => setConversationStatusFilter(s)}
                          className={`px-2.5 py-1 text-xs rounded-full ${conversationStatusFilter === s ? 'bg-green-100 text-green-700 font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                          {s === 'all' ? `All (${conversations.length})` : s === 'open' ? `Open (${conversations.filter(c => (c.status || 'open') === 'open').length})` : `Resolved (${conversations.filter(c => c.status === 'resolved').length})`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                    {filteredConversations.length === 0 ? (
                      <p className="p-4 text-gray-500 text-center text-sm">No conversations</p>
                    ) : (
                      filteredConversations.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => setSelectedConversation(conv)}
                          className={`w-full p-4 text-left hover:bg-gray-50 ${
                            selectedConversation?.id === conv.id ? 'bg-green-50' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${(conv.status || 'open') === 'open' ? 'bg-green-500' : conv.status === 'resolved' ? 'bg-gray-400' : 'bg-gray-300'}`} />
                              <div>
                                <p className="font-medium text-gray-900">
                                  {conv.displayName || formatPhone(conv.phoneNumber)}
                                </p>
                                <p className="text-sm text-gray-500">{formatPhone(conv.phoneNumber)}</p>
                              </div>
                            </div>
                            <span className="text-xs text-gray-400">
                              {formatDate(conv.lastMessageAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 truncate mt-1 ml-4">
                            {conv.messages[conv.messages.length - 1]?.content || 'No messages'}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Message Thread + Composer */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>
                  {selectedConversation ? (
                    <>
                      {/* Conversation Header */}
                      <div className="p-4 border-b border-gray-200 bg-green-50 flex justify-between items-center">
                        <div>
                          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                            {selectedConversation.displayName || formatPhone(selectedConversation.phoneNumber)}
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${(selectedConversation.status || 'open') === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {(selectedConversation.status || 'open')}
                            </span>
                          </h2>
                          <p className="text-sm text-gray-500">
                            {formatPhone(selectedConversation.phoneNumber)} • {selectedConversation.language.toUpperCase()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateConversationStatus(
                              selectedConversation.id,
                              (selectedConversation.status || 'open') === 'open' ? 'resolved' : 'open'
                            )}
                            className={`px-3 py-1.5 text-xs rounded-lg border ${
                              (selectedConversation.status || 'open') === 'open'
                                ? 'bg-white border-green-300 text-green-700 hover:bg-green-50'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {(selectedConversation.status || 'open') === 'open' ? 'Resolve' : 'Reopen'}
                          </button>
                          <button
                            onClick={() => setShowSnippetManager(!showSnippetManager)}
                            className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                            title="Manage Quick Replies"
                          >
                            Snippets
                          </button>
                        </div>
                      </div>

                      {/* Snippet Manager (collapsible) */}
                      {showSnippetManager && (
                        <div className="border-b border-gray-200 p-4 bg-gray-50 space-y-3">
                          <h3 className="text-sm font-medium text-gray-700">Quick Replies (Snippets)</h3>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={newSnippetName}
                              onChange={(e) => setNewSnippetName(e.target.value)}
                              placeholder="Name"
                              className="px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 placeholder:text-gray-400"
                            />
                            <input
                              type="text"
                              value={newSnippetShortcut}
                              onChange={(e) => setNewSnippetShortcut(e.target.value)}
                              placeholder="Shortcut (e.g. greeting)"
                              className="px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 placeholder:text-gray-400"
                            />
                          </div>
                          <textarea
                            value={newSnippetContent}
                            onChange={(e) => setNewSnippetContent(e.target.value)}
                            placeholder="Snippet content..."
                            rows={2}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 placeholder:text-gray-400"
                          />
                          <div className="flex justify-between items-center">
                            <select
                              value={newSnippetCategory}
                              onChange={(e) => setNewSnippetCategory(e.target.value)}
                              className="px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900"
                            >
                              <option value="general">General</option>
                              <option value="sales">Sales</option>
                              <option value="support">Support</option>
                              <option value="greeting">Greeting</option>
                            </select>
                            <button
                              onClick={handleSaveSnippet}
                              disabled={!newSnippetName.trim() || !newSnippetContent.trim()}
                              className="px-3 py-1.5 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:opacity-50"
                            >
                              Save Snippet
                            </button>
                          </div>

                          {/* Existing snippets */}
                          {snippets.length > 0 && (
                            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                              {snippets.map((s) => (
                                <div key={s.id} className="flex justify-between items-center bg-white p-2 rounded border text-sm">
                                  <div>
                                    <span className="font-medium text-gray-900">{s.name}</span>
                                    {s.shortcut && <span className="ml-2 text-gray-400">/{s.shortcut}</span>}
                                    <p className="text-gray-500 text-xs truncate max-w-[300px]">{s.content}</p>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteSnippet(s.id)}
                                    className="text-red-500 hover:text-red-700 text-xs ml-2"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Messages Area */}
                      <div className="flex-1 min-h-0 p-4 overflow-y-auto space-y-3">
                        {selectedConversation.messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'} group`}
                          >
                            <div className="relative">
                              {/* Reply indicator */}
                              {msg.replyTo && (
                                <div className="text-xs text-gray-400 mb-1 pl-2 border-l-2 border-gray-300">
                                  Replying to a message
                                </div>
                              )}
                              <div
                                className={`max-w-[70%] min-w-[120px] rounded-lg px-4 py-2 ${
                                  msg.role === 'user'
                                    ? 'bg-gray-100 text-gray-900'
                                    : 'bg-green-500 text-white'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                <div className={`flex items-center gap-1 mt-1 ${msg.role === 'user' ? 'text-gray-400' : 'text-green-100'}`}>
                                  <span className="text-xs">{formatDate(msg.timestamp)}</span>
                                  {/* Message status indicators */}
                                  {msg.role === 'assistant' && msg.status && (
                                    <span className="text-xs" title={msg.status}>
                                      {msg.status === 'sent' && '✓'}
                                      {msg.status === 'delivered' && '✓✓'}
                                      {msg.status === 'read' && <span className="text-blue-300">✓✓</span>}
                                      {msg.status === 'failed' && <span className="text-red-300">✕</span>}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Action buttons (show on hover) */}
                              {msg.role === 'user' && (
                                <div className="absolute -right-16 top-0 hidden group-hover:flex gap-1">
                                  {/* Reply button */}
                                  <button
                                    onClick={() => {
                                      setReplyToMessage(msg);
                                      composerRef.current?.focus();
                                    }}
                                    className="p-1 bg-white border rounded shadow-sm hover:bg-gray-50 text-xs"
                                    title="Reply"
                                  >
                                    ↩
                                  </button>
                                  {/* Reaction button */}
                                  <button
                                    onClick={() => setReactionMessageId(reactionMessageId === msg.messageId ? null : (msg.messageId || null))}
                                    className="p-1 bg-white border rounded shadow-sm hover:bg-gray-50 text-xs"
                                    title="React"
                                  >
                                    😀
                                  </button>
                                </div>
                              )}

                              {/* Emoji reaction picker */}
                              {reactionMessageId === msg.messageId && (
                                <div className="absolute -right-2 -bottom-8 flex gap-1 bg-white border rounded-full shadow-lg px-2 py-1 z-10">
                                  {reactionEmojis.map((emoji) => (
                                    <button
                                      key={emoji}
                                      onClick={() => handleReaction(msg.messageId || msg.id, emoji)}
                                      className="hover:scale-125 transition-transform text-sm"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Reply-to indicator */}
                      {replyToMessage && (
                        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                          <div className="text-sm text-gray-600">
                            <span className="text-gray-400">Replying to:</span>{' '}
                            <span className="italic">{replyToMessage.content.substring(0, 60)}...</span>
                          </div>
                          <button
                            onClick={() => setReplyToMessage(null)}
                            className="text-gray-400 hover:text-gray-600 text-sm"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      {/* Snippet suggestions dropdown */}
                      {showSnippets && (
                        <div className="border-t border-gray-200 bg-white max-h-32 overflow-y-auto">
                          {snippets
                            .filter(s =>
                              !snippetFilter ||
                              s.name.toLowerCase().includes(snippetFilter.toLowerCase()) ||
                              s.shortcut.toLowerCase().includes(snippetFilter.toLowerCase())
                            )
                            .map((snippet) => (
                              <button
                                key={snippet.id}
                                onClick={() => insertSnippet(snippet)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100"
                              >
                                <span className="text-sm font-medium text-gray-900">{snippet.name}</span>
                                {snippet.shortcut && (
                                  <span className="ml-2 text-xs text-gray-400">/{snippet.shortcut}</span>
                                )}
                                <p className="text-xs text-gray-500 truncate">{snippet.content}</p>
                              </button>
                            ))}
                          {snippets.filter(s =>
                            !snippetFilter ||
                            s.name.toLowerCase().includes(snippetFilter.toLowerCase()) ||
                            s.shortcut.toLowerCase().includes(snippetFilter.toLowerCase())
                          ).length === 0 && (
                            <p className="px-4 py-2 text-sm text-gray-400">No snippets found</p>
                          )}
                        </div>
                      )}

                      {/* Template Picker Panel */}
                      {showTemplatePicker && (
                        <div className="border-t border-gray-200 bg-white max-h-60 overflow-y-auto">
                          <div className="px-3 py-2 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
                            <span className="text-sm font-medium text-gray-700">Message Templates</span>
                            <button onClick={() => setShowTemplatePicker(false)} className="text-gray-400 hover:text-gray-600 text-sm">Close</button>
                          </div>
                          {templates.length === 0 ? (
                            <p className="px-4 py-3 text-sm text-gray-400">No approved templates found. Check WHATSAPP_BUSINESS_ACCOUNT_ID in your env.</p>
                          ) : (
                            templates.map((tpl) => (
                              <button
                                key={tpl.id}
                                onClick={() => handleSelectTemplate(tpl)}
                                className="w-full text-left px-4 py-2 hover:bg-green-50 border-b border-gray-50"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-800">{tpl.name}</span>
                                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{tpl.language}</span>
                                  <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">{tpl.category}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5 truncate">{getTemplateBody(tpl) || 'No body text'}</p>
                              </button>
                            ))
                          )}
                        </div>
                      )}

                      {/* Selected Template Preview & Parameter Inputs */}
                      {selectedTemplate && (
                        <div className="border-t border-gray-200 bg-green-50 p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="text-sm font-medium text-green-800">Template: {selectedTemplate.name}</span>
                              <span className="ml-2 text-xs text-green-600">({selectedTemplate.language})</span>
                            </div>
                            <button onClick={() => { setSelectedTemplate(null); setTemplateParams({}); }} className="text-xs text-red-500 hover:text-red-700">Cancel</button>
                          </div>
                          <div className="text-sm text-gray-700 bg-white rounded p-2 mb-2 border border-green-200">
                            {getTemplateMediaHeader(selectedTemplate) && (
                              <p className="text-xs text-purple-600 font-medium mb-1">
                                [{getTemplateMediaHeader(selectedTemplate)?.toUpperCase()} header]
                              </p>
                            )}
                            {getTemplateHeaderText(selectedTemplate) && (
                              <p className="text-gray-500 italic mb-1">{getTemplateHeaderText(selectedTemplate)}</p>
                            )}
                            <p>{getTemplateBody(selectedTemplate)}</p>
                            {selectedTemplate.components.find(c => c.type === 'BUTTONS')?.buttons?.map((btn, i) => (
                              <span key={i} className="inline-block mt-1 mr-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
                                {btn.text} {btn.url && /\{\{\d+\}\}/.test(btn.url) ? '(dynamic URL)' : ''}
                              </span>
                            ))}
                          </div>
                          {getTemplateParamFields(selectedTemplate).length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-green-700">Fill in parameters:</p>
                              {getTemplateParamFields(selectedTemplate).map(field => (
                                <div key={field.key}>
                                  <label className="text-xs text-gray-500 mb-0.5 block">{field.label}</label>
                                  <input
                                    type="text"
                                    placeholder={field.placeholder}
                                    value={templateParams[field.key] || ''}
                                    onChange={(e) => setTemplateParams(prev => ({ ...prev, [field.key]: e.target.value }))}
                                    className="w-full px-3 py-1.5 text-sm border border-green-200 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          <button
                            onClick={handleSendTemplate}
                            disabled={sendingMessage || !allTemplateParamsFilled(selectedTemplate, templateParams)}
                            className="mt-2 w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium text-sm disabled:bg-gray-400"
                          >
                            {sendingMessage ? 'Sending...' : 'Send Template'}
                          </button>
                        </div>
                      )}

                      {/* Message Composer */}
                      {!selectedTemplate && (
                        <div className="border-t border-gray-200 p-3 bg-gray-50">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                              title="Send a template message"
                              className={`px-3 py-2 rounded-lg self-end text-sm font-medium border ${
                                showTemplatePicker
                                  ? 'bg-green-100 border-green-300 text-green-700'
                                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              Tpl
                            </button>
                            <textarea
                              ref={composerRef}
                              value={composerText}
                              onChange={(e) => handleComposerChange(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendMessage();
                                }
                              }}
                              placeholder="Type a message... (/ for quick replies)"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-sm text-gray-900 placeholder:text-gray-400"
                              rows={2}
                            />
                            <button
                              onClick={handleSendMessage}
                              disabled={!composerText.trim() || sendingMessage}
                              className={`px-4 py-2 rounded-lg font-medium text-white self-end ${
                                !composerText.trim() || sendingMessage
                                  ? 'bg-gray-400 cursor-not-allowed'
                                  : 'bg-green-500 hover:bg-green-600'
                              }`}
                            >
                              {sendingMessage ? '...' : 'Send'}
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Press Enter to send, Shift+Enter for new line. Type / for quick replies. Click Tpl for templates.
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center flex-1 text-gray-500">
                      <div className="text-center">
                        <p className="text-lg mb-2">Select a conversation</p>
                        <p className="text-sm">Choose a conversation from the left to start messaging</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contacts Tab */}
            {activeTab === 'contacts' && (
              <div className="space-y-4">
                {/* Top Bar: Search + Filters + Actions */}
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex flex-wrap gap-3 items-center">
                    {/* Search */}
                    <div className="flex-1 min-w-[200px]">
                      <input
                        type="text"
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                        placeholder="Search by name, phone, email, company..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 placeholder:text-gray-400"
                      />
                    </div>
                    {/* Lifecycle Filter */}
                    <select
                      value={contactLifecycleFilter}
                      onChange={(e) => setContactLifecycleFilter(e.target.value as LifecycleStage | '')}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700"
                    >
                      <option value="">All Stages</option>
                      {lifecycleStages.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    {/* Tag Filter */}
                    <select
                      value={contactTagFilter}
                      onChange={(e) => setContactTagFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700"
                    >
                      <option value="">All Tags</option>
                      {tags.map(t => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                      {/* Also show tags from contacts that aren't managed tags */}
                      {Array.from(new Set(contacts.flatMap(c => c.tags || []))).filter(t => !tags.some(mt => mt.name === t)).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    {/* Action Buttons */}
                    <button
                      onClick={() => setShowAddForm(!showAddForm)}
                      className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                    >
                      {showAddForm ? 'Cancel' : '+ Add'}
                    </button>
                    <button
                      onClick={handleImportFromConversations}
                      disabled={importingFromConversations}
                      className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm disabled:opacity-50"
                    >
                      {importingFromConversations ? 'Importing...' : 'Import Chats'}
                    </button>
                    <div>
                      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" id="file-upload" />
                      <label htmlFor="file-upload" className={`cursor-pointer px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm inline-block ${uploading ? 'opacity-50' : ''}`}>
                        {uploading ? 'Uploading...' : 'Upload CSV'}
                      </label>
                    </div>
                  </div>

                  {/* Results info */}
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                    <span>{filteredContacts.length} of {contacts.length} contacts</span>
                    {(contactSearch || contactLifecycleFilter || contactTagFilter) && (
                      <button
                        onClick={() => { setContactSearch(''); setContactLifecycleFilter(''); setContactTagFilter(''); }}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>

                  {/* Add Contact Form (collapsible) */}
                  {showAddForm && (
                    <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <h3 className="font-medium text-gray-800 mb-3 text-sm">New Contact</h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <input type="text" value={newContactName} onChange={(e) => setNewContactName(e.target.value)} placeholder="Name *" className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400" />
                        <input type="tel" value={newContactPhone} onChange={(e) => setNewContactPhone(e.target.value)} placeholder="Phone * (+1...)" className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400" />
                        <input type="email" value={newContactEmail} onChange={(e) => setNewContactEmail(e.target.value)} placeholder="Email" className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400" />
                        <input type="text" value={newContactTags} onChange={(e) => setNewContactTags(e.target.value)} placeholder="Tags (comma-sep)" className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400" />
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button onClick={handleAddContact} disabled={addingContact || !newContactName.trim() || !newContactPhone.trim()} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm disabled:opacity-50">
                          {addingContact ? 'Adding...' : 'Add Contact'}
                        </button>
                      </div>
                    </div>
                  )}

                  {uploadResult && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                      <p className="text-green-700">
                        Imported: {uploadResult.imported} contacts
                        {uploadResult.skipped > 0 && ` | Skipped: ${uploadResult.skipped}`}
                      </p>
                      {uploadResult.errors.length > 0 && (
                        <details className="mt-1">
                          <summary className="text-orange-600 cursor-pointer">{uploadResult.errors.length} warnings</summary>
                          <ul className="text-orange-600 mt-1 list-disc list-inside">
                            {uploadResult.errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                          </ul>
                        </details>
                      )}
                    </div>
                  )}
                </div>

                {/* Main Content: Contact Table + Detail Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Contact Table */}
                  <div className={`${selectedContact ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white rounded-lg shadow overflow-hidden`}>
                    <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tags</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredContacts.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">
                                {contacts.length === 0 ? 'No contacts yet. Add or import contacts to get started.' : 'No contacts match your search/filters.'}
                              </td>
                            </tr>
                          ) : (
                            filteredContacts.map((contact) => (
                              <tr
                                key={contact.id}
                                onClick={() => setSelectedContact(contact)}
                                className={`hover:bg-gray-50 cursor-pointer ${selectedContact?.id === contact.id ? 'bg-blue-50' : ''}`}
                              >
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                                  {contact.email && <div className="text-xs text-gray-400">{contact.email}</div>}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {formatPhone(contact.phoneNumber)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getLifecycleStyle(contact.lifecycleStage)}`}>
                                    {getLifecycleLabel(contact.lifecycleStage)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex flex-wrap gap-1">
                                    {(contact.tags || []).slice(0, 3).map(tag => {
                                      const managedTag = tags.find(t => t.name === tag);
                                      return (
                                        <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: managedTag ? managedTag.color + '20' : '#E5E7EB', color: managedTag ? managedTag.color : '#6B7280' }}>
                                          {tag}
                                        </span>
                                      );
                                    })}
                                    {(contact.tags?.length || 0) > 3 && (
                                      <span className="text-xs text-gray-400">+{(contact.tags?.length || 0) - 3}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {contact.company || '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteContact(contact.id); }}
                                    className="text-red-500 hover:text-red-700 text-xs"
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

                  {/* Contact Detail Panel (slide-in) */}
                  {selectedContact && (
                    <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 340px)' }}>
                      {/* Detail Header */}
                      <div className="p-4 border-b border-gray-200 bg-blue-50 flex justify-between items-start">
                        <div>
                          <h2 className="font-semibold text-gray-900">{selectedContact.name}</h2>
                          <p className="text-sm text-gray-500">{formatPhone(selectedContact.phoneNumber)}</p>
                          {selectedContact.email && <p className="text-sm text-gray-500">{selectedContact.email}</p>}
                        </div>
                        <button onClick={() => setSelectedContact(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
                      </div>

                      {/* Detail Content (scrollable) */}
                      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                        {/* Lifecycle Stage */}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Lifecycle Stage</label>
                          <select
                            value={selectedContact.lifecycleStage || ''}
                            onChange={(e) => handleUpdateContact(selectedContact.id, { lifecycleStage: e.target.value || null })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                          >
                            <option value="">No Stage</option>
                            {lifecycleStages.map(s => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Company */}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Company</label>
                          <input
                            type="text"
                            defaultValue={selectedContact.company || ''}
                            onBlur={(e) => {
                              if (e.target.value !== (selectedContact.company || '')) {
                                handleUpdateContact(selectedContact.id, { company: e.target.value });
                              }
                            }}
                            placeholder="Company name"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400"
                          />
                        </div>

                        {/* Email */}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Email</label>
                          <input
                            type="email"
                            defaultValue={selectedContact.email || ''}
                            onBlur={(e) => {
                              if (e.target.value !== (selectedContact.email || '')) {
                                handleUpdateContact(selectedContact.id, { email: e.target.value });
                              }
                            }}
                            placeholder="email@example.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400"
                          />
                        </div>

                        {/* Tags */}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Tags</label>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {(selectedContact.tags || []).map(tag => {
                              const managedTag = tags.find(t => t.name === tag);
                              return (
                                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: managedTag ? managedTag.color + '20' : '#E5E7EB', color: managedTag ? managedTag.color : '#6B7280' }}>
                                  {tag}
                                  <button onClick={() => handleToggleContactTag(selectedContact.id, tag)} className="hover:opacity-70">✕</button>
                                </span>
                              );
                            })}
                          </div>
                          {/* Add tag from managed tags */}
                          {tags.filter(t => !(selectedContact.tags || []).includes(t.name)).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {tags.filter(t => !(selectedContact.tags || []).includes(t.name)).map(tag => (
                                <button
                                  key={tag.id}
                                  onClick={() => handleToggleContactTag(selectedContact.id, tag.name)}
                                  className="px-2 py-0.5 rounded-full text-xs border border-dashed border-gray-300 hover:border-gray-500 text-gray-500 hover:text-gray-700"
                                >
                                  + {tag.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Tag Manager */}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Manage Tags</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newTagName}
                              onChange={(e) => setNewTagName(e.target.value)}
                              placeholder="New tag name"
                              className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 placeholder:text-gray-400"
                              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTag(); }}
                            />
                            <input
                              type="color"
                              value={newTagColor}
                              onChange={(e) => setNewTagColor(e.target.value)}
                              className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                              title="Tag color"
                            />
                            <button
                              onClick={handleCreateTag}
                              disabled={!newTagName.trim()}
                              className="px-2 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                            >
                              Add
                            </button>
                          </div>
                          {tags.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {tags.map(tag => (
                                <div key={tag.id} className="flex justify-between items-center text-xs">
                                  <span className="flex items-center gap-1">
                                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: tag.color }} />
                                    {tag.name}
                                  </span>
                                  <button onClick={() => handleDeleteTag(tag.id)} className="text-red-400 hover:text-red-600">Delete</button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Notes */}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Notes</label>
                          <div className="flex gap-2 mb-2">
                            <textarea
                              value={newNoteContent}
                              onChange={(e) => setNewNoteContent(e.target.value)}
                              placeholder="Add a note..."
                              rows={2}
                              className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 placeholder:text-gray-400 resize-none"
                            />
                            <button
                              onClick={handleAddNote}
                              disabled={!newNoteContent.trim()}
                              className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50 self-end"
                            >
                              Add
                            </button>
                          </div>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {(selectedContact.notes || []).slice().reverse().map(note => (
                              <div key={note.id} className="bg-gray-50 rounded p-2 text-sm">
                                <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
                                <div className="flex justify-between items-center mt-1">
                                  <span className="text-xs text-gray-400">{formatDate(note.createdAt)}</span>
                                  <button onClick={() => handleDeleteNote(note.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                                </div>
                              </div>
                            ))}
                            {(!selectedContact.notes || selectedContact.notes.length === 0) && (
                              <p className="text-xs text-gray-400">No notes yet</p>
                            )}
                          </div>
                        </div>

                        {/* Contact Info */}
                        <div className="border-t border-gray-200 pt-3 text-xs text-gray-400 space-y-1">
                          <p>Source: {selectedContact.importedFrom || 'Unknown'}</p>
                          <p>Created: {formatDate(selectedContact.importedAt)}</p>
                          {selectedContact.lastContacted && <p>Last contacted: {formatDate(selectedContact.lastContacted)}</p>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bulk Send / Broadcast Tab */}
            {activeTab === 'bulk-send' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Compose Section */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
                  <h2 className="font-semibold text-gray-900 mb-4">Create Broadcast</h2>

                  <div className="space-y-4">
                    {/* Campaign Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Campaign Name (optional)
                      </label>
                      <input
                        type="text"
                        value={broadcastName}
                        onChange={(e) => setBroadcastName(e.target.value)}
                        placeholder="e.g., January Promo, Follow-up Campaign"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Message Config */}
                      <div className="space-y-4">
                        {/* Message Type Selector */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Message Type
                          </label>
                          <select
                            value={messageType}
                            onChange={(e) => setMessageType(e.target.value as MessageType)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                          >
                            <option value="text">Text Message</option>
                            <option value="template">Message Template</option>
                            <option value="reply_buttons">Reply Buttons (up to 3)</option>
                            <option value="cta_url">CTA URL Button</option>
                            <option value="location_request">Location Request</option>
                            <option value="list">Interactive List</option>
                          </select>
                        </div>

                        {/* Template Selector (when message type is template) */}
                        {messageType === 'template' ? (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Select Template
                              </label>
                              <select
                                value={bulkSelectedTemplate?.name || ''}
                                onChange={(e) => {
                                  const tpl = templates.find(t => t.name === e.target.value) || null;
                                  setBulkSelectedTemplate(tpl);
                                  setBulkTemplateParams({});
                                  if (tpl) setBulkMessage(`[Template: ${tpl.name}]`);
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                              >
                                <option value="">-- Choose a template --</option>
                                {templates.map(tpl => (
                                  <option key={tpl.id} value={tpl.name}>
                                    {tpl.name} ({tpl.language}) - {tpl.category}
                                  </option>
                                ))}
                              </select>
                            </div>
                            {bulkSelectedTemplate && (
                              <>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                  {getTemplateMediaHeader(bulkSelectedTemplate) && (
                                    <p className="text-xs text-purple-600 font-medium mb-1">[{getTemplateMediaHeader(bulkSelectedTemplate)?.toUpperCase()} header]</p>
                                  )}
                                  {getTemplateHeaderText(bulkSelectedTemplate) && (
                                    <p className="text-sm text-gray-500 italic mb-1">{getTemplateHeaderText(bulkSelectedTemplate)}</p>
                                  )}
                                  <p className="text-sm text-gray-700">{getTemplateBody(bulkSelectedTemplate)}</p>
                                </div>
                                {getTemplateParamFields(bulkSelectedTemplate).length > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-xs font-medium text-gray-700">Template parameters:</p>
                                    {getTemplateParamFields(bulkSelectedTemplate).map(field => (
                                      <div key={field.key}>
                                        <label className="text-xs text-gray-500 mb-0.5 block">{field.label} {field.key === 'body_1' ? '(use {{name}} for contact name)' : ''}</label>
                                        <input
                                          type="text"
                                          placeholder={field.key === 'body_1' ? '{{name}}' : field.placeholder}
                                          value={bulkTemplateParams[field.key] || ''}
                                          onChange={(e) => setBulkTemplateParams(prev => ({ ...prev, [field.key]: e.target.value }))}
                                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 text-gray-900 placeholder:text-gray-400"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ) : (
                          <>
                            {/* Message Body */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                          </>
                        )}

                        {/* Header & Footer */}
                        {(messageType === 'reply_buttons' || messageType === 'cta_url' || messageType === 'list') && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Header (optional)</label>
                              <input type="text" value={headerText} onChange={(e) => setHeaderText(e.target.value)} placeholder="Header text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Footer (optional)</label>
                              <input type="text" value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="Footer text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400" />
                            </div>
                          </div>
                        )}

                        {/* Reply Buttons Config */}
                        {messageType === 'reply_buttons' && (
                          <div className="space-y-2">
                            <label className="block text-xs font-medium text-gray-700">Buttons (max 3, 20 chars)</label>
                            {buttons.map((button, index) => (
                              <div key={index} className="flex gap-2">
                                <input type="text" value={button.title} onChange={(e) => { const nb = [...buttons]; nb[index].title = e.target.value; setButtons(nb); }} placeholder={`Button ${index + 1}`} maxLength={20} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400" />
                                {buttons.length > 1 && <button onClick={() => setButtons(buttons.filter((_, i) => i !== index))} className="px-2 text-red-600 hover:bg-red-50 rounded">✕</button>}
                              </div>
                            ))}
                            {buttons.length < 3 && <button onClick={() => setButtons([...buttons, { id: `btn_${buttons.length + 1}`, title: '' }])} className="text-sm text-green-600 hover:text-green-700">+ Add Button</button>}
                          </div>
                        )}

                        {/* CTA URL Config */}
                        {messageType === 'cta_url' && (
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Button Text (max 20)</label>
                              <input type="text" value={ctaButtonText} onChange={(e) => setCtaButtonText(e.target.value)} placeholder="e.g., Visit Website" maxLength={20} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">URL</label>
                              <input type="url" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://example.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400" />
                            </div>
                          </div>
                        )}

                        {/* Interactive List Config */}
                        {messageType === 'list' && (
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">List Button Text</label>
                              <input type="text" value={listButtonText} onChange={(e) => setListButtonText(e.target.value)} placeholder="e.g., View Options" maxLength={20} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400" />
                            </div>
                            {listSections.map((section, sIndex) => (
                              <div key={sIndex} className="border border-gray-200 rounded-lg p-3 space-y-2">
                                <div className="flex gap-2 items-center">
                                  <input type="text" value={section.title} onChange={(e) => { const ns = [...listSections]; ns[sIndex].title = e.target.value; setListSections(ns); }} placeholder="Section title" className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm font-medium text-gray-900 placeholder:text-gray-400" />
                                  {listSections.length > 1 && <button onClick={() => setListSections(listSections.filter((_, i) => i !== sIndex))} className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs">Remove</button>}
                                </div>
                                {section.rows.map((row, rIndex) => (
                                  <div key={rIndex} className="flex gap-2 ml-4">
                                    <input type="text" value={row.title} onChange={(e) => { const ns = [...listSections]; ns[sIndex].rows[rIndex].title = e.target.value; setListSections(ns); }} placeholder="Item (24 chars)" maxLength={24} className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm text-gray-900 placeholder:text-gray-400" />
                                    <input type="text" value={row.description} onChange={(e) => { const ns = [...listSections]; ns[sIndex].rows[rIndex].description = e.target.value; setListSections(ns); }} placeholder="Description" className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm text-gray-900 placeholder:text-gray-400" />
                                    {section.rows.length > 1 && <button onClick={() => { const ns = [...listSections]; ns[sIndex].rows = section.rows.filter((_, i) => i !== rIndex); setListSections(ns); }} className="text-red-500 text-sm">✕</button>}
                                  </div>
                                ))}
                                {section.rows.length < 10 && <button onClick={() => { const ns = [...listSections]; ns[sIndex].rows.push({ id: `row_${section.rows.length + 1}`, title: '', description: '' }); setListSections(ns); }} className="text-xs text-green-600 ml-4">+ Add Item</button>}
                              </div>
                            ))}
                            <button onClick={() => setListSections([...listSections, { title: '', rows: [{ id: 'row_1', title: '', description: '' }] }])} className="text-sm text-green-600 hover:text-green-700">+ Add Section</button>
                          </div>
                        )}

                        {messageType === 'location_request' && (
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="text-sm text-blue-700">This will send a message asking the user to share their location.</p>
                          </div>
                        )}
                      </div>

                      {/* Right: Audience + Scheduling */}
                      <div className="space-y-4">
                        {/* Schedule Toggle */}
                        <div className="border border-gray-200 rounded-lg p-4">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={scheduleEnabled}
                              onChange={(e) => setScheduleEnabled(e.target.checked)}
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700">Schedule for later</span>
                          </label>
                          {scheduleEnabled && (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Date</label>
                                <input
                                  type="date"
                                  value={scheduledDate}
                                  onChange={(e) => setScheduledDate(e.target.value)}
                                  min={new Date().toISOString().split('T')[0]}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Time</label>
                                <input
                                  type="time"
                                  value={scheduledTime}
                                  onChange={(e) => setScheduledTime(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Audience Selection */}
                        <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                          <p className="text-sm font-medium text-gray-700">Audience</p>

                          {/* Audience mode toggle */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setUseAudienceFilter(false); setSendToAll(true); setSelectedContacts([]); }}
                              className={`flex-1 px-3 py-1.5 text-xs rounded-lg border ${!useAudienceFilter && sendToAll ? 'bg-green-50 border-green-300 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                              All ({contacts.filter(c => !c.optedOut).length})
                            </button>
                            <button
                              onClick={() => { setUseAudienceFilter(true); setSendToAll(false); setSelectedContacts([]); }}
                              className={`flex-1 px-3 py-1.5 text-xs rounded-lg border ${useAudienceFilter ? 'bg-green-50 border-green-300 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                              By Filter
                            </button>
                            <button
                              onClick={() => { setUseAudienceFilter(false); setSendToAll(false); }}
                              className={`flex-1 px-3 py-1.5 text-xs rounded-lg border ${!useAudienceFilter && !sendToAll ? 'bg-green-50 border-green-300 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                              Manual
                            </button>
                          </div>

                          {/* Audience filter mode */}
                          {useAudienceFilter && (
                            <div className="space-y-3">
                              {/* Filter by tags */}
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Filter by Tags</label>
                                <div className="flex flex-wrap gap-1.5">
                                  {tags.map(tag => (
                                    <button
                                      key={tag.id}
                                      onClick={() => {
                                        setAudienceTagFilter(prev =>
                                          prev.includes(tag.name) ? prev.filter(t => t !== tag.name) : [...prev, tag.name]
                                        );
                                      }}
                                      className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                                        audienceTagFilter.includes(tag.name)
                                          ? 'text-white border-transparent'
                                          : 'text-gray-600 border-gray-200 hover:border-gray-400'
                                      }`}
                                      style={audienceTagFilter.includes(tag.name) ? { backgroundColor: tag.color } : {}}
                                    >
                                      {tag.name}
                                    </button>
                                  ))}
                                  {tags.length === 0 && <span className="text-xs text-gray-400">No tags created yet</span>}
                                </div>
                              </div>

                              {/* Filter by lifecycle */}
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Filter by Lifecycle</label>
                                <div className="flex flex-wrap gap-1.5">
                                  {lifecycleStages.map(stage => (
                                    <button
                                      key={stage.value}
                                      onClick={() => {
                                        setAudienceLifecycleFilter(prev =>
                                          prev.includes(stage.value) ? prev.filter(s => s !== stage.value) : [...prev, stage.value]
                                        );
                                      }}
                                      className={`px-2 py-0.5 rounded-full text-xs ${
                                        audienceLifecycleFilter.includes(stage.value)
                                          ? stage.color + ' font-medium'
                                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                      }`}
                                    >
                                      {stage.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Audience preview */}
                              <div className="bg-gray-50 rounded-lg px-3 py-2">
                                <p className="text-sm text-gray-700">
                                  Matched: <span className="font-semibold text-green-600">{getAudienceCount()}</span> contacts
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Manual selection mode */}
                          {!useAudienceFilter && !sendToAll && (
                            <div>
                              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg">
                                {contacts.filter(c => !c.optedOut).map((contact) => (
                                  <label key={contact.id} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={selectedContacts.includes(contact.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) setSelectedContacts([...selectedContacts, contact.id]);
                                        else setSelectedContacts(selectedContacts.filter(id => id !== contact.id));
                                      }}
                                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                    />
                                    <span className="ml-2 text-xs text-gray-700">{contact.name} ({formatPhone(contact.phoneNumber)})</span>
                                  </label>
                                ))}
                              </div>
                              {selectedContacts.length > 0 && (
                                <p className="text-xs text-gray-500 mt-1">Selected: {selectedContacts.length}</p>
                              )}
                            </div>
                          )}

                          {/* All contacts mode - just show count */}
                          {!useAudienceFilter && sendToAll && (
                            <div className="bg-green-50 rounded-lg px-3 py-2">
                              <p className="text-sm text-green-700">
                                Sending to all <span className="font-semibold">{contacts.filter(c => !c.optedOut).length}</span> eligible contacts
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Send Button */}
                    <button
                      onClick={handleBulkSend}
                      disabled={sending || !bulkMessage.trim() || (!sendToAll && selectedContacts.length === 0 && !useAudienceFilter)}
                      className={`w-full px-4 py-3 rounded-lg font-medium text-white transition-colors ${
                        sending || !bulkMessage.trim() || (!sendToAll && selectedContacts.length === 0 && !useAudienceFilter)
                          ? 'bg-gray-400 cursor-not-allowed'
                          : scheduleEnabled ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'
                      }`}
                    >
                      {sending ? 'Processing...' : scheduleEnabled ? `Schedule Broadcast${scheduledDate ? ` for ${scheduledDate} ${scheduledTime}` : ''}` : 'Send Broadcast Now'}
                    </button>
                  </div>
                </div>

                {/* Right Column: Job History + Analytics */}
                <div className="space-y-6">
                  {/* Broadcast History */}
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-4 border-b border-gray-200">
                      <h2 className="font-semibold text-gray-900">Broadcast History</h2>
                    </div>
                    <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                      {bulkJobs.length === 0 ? (
                        <p className="p-4 text-gray-500 text-center text-sm">No broadcasts yet</p>
                      ) : (
                        bulkJobs.map((job) => (
                          <div
                            key={job.id}
                            className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedJobDetail?.id === job.id ? 'bg-green-50' : ''}`}
                            onClick={() => setSelectedJobDetail(selectedJobDetail?.id === job.id ? null : job)}
                          >
                            <div className="flex justify-between items-start">
                              <div className="min-w-0 flex-1">
                                {job.name && (
                                  <p className="text-sm font-semibold text-gray-900 truncate">{job.name}</p>
                                )}
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                                    {job.messageType === 'reply_buttons' ? 'Buttons' :
                                     job.messageType === 'cta_url' ? 'CTA' :
                                     job.messageType === 'location_request' ? 'Location' :
                                     job.messageType === 'list' ? 'List' : 'Text'}
                                  </span>
                                  {job.scheduledFor && (
                                    <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                                      Scheduled
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 truncate mt-1">
                                  {job.message.substring(0, 40)}{job.message.length > 40 ? '...' : ''}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {formatDate(job.createdAt)}
                                </p>
                              </div>
                              <span className={`ml-2 shrink-0 px-2 py-0.5 text-xs rounded-full ${
                                job.status === 'completed' ? 'bg-green-100 text-green-700' :
                                job.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                                job.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                                job.status === 'failed' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {job.status}
                              </span>
                            </div>

                            {/* Progress bar */}
                            {job.status === 'processing' && (
                              <div className="mt-2 bg-gray-200 rounded-full h-1.5">
                                <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${((job.sentCount + job.failedCount) / job.totalContacts) * 100}%` }} />
                              </div>
                            )}

                            {/* Quick stats */}
                            <div className="flex items-center gap-3 text-xs mt-2">
                              <span className="text-green-600">Sent: {job.sentCount}</span>
                              <span className="text-red-600">Failed: {job.failedCount}</span>
                              <span className="text-gray-400">/ {job.totalContacts}</span>
                            </div>

                            {/* Scheduled time */}
                            {job.status === 'scheduled' && job.scheduledFor && (
                              <p className="text-xs text-blue-600 mt-1">
                                Scheduled: {formatDate(job.scheduledFor)}
                              </p>
                            )}

                            {/* Expanded detail / Analytics */}
                            {selectedJobDetail?.id === job.id && (
                              <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                                {/* Analytics */}
                                {job.analytics && (job.analytics.deliveredCount > 0 || job.status === 'completed') && (
                                  <div>
                                    <p className="text-xs font-medium text-gray-700 mb-2">Analytics</p>
                                    <div className="grid grid-cols-3 gap-2">
                                      <div className="bg-blue-50 rounded-lg p-2 text-center">
                                        <p className="text-lg font-bold text-blue-700">{job.analytics.deliveryRate}%</p>
                                        <p className="text-xs text-blue-600">Delivered</p>
                                      </div>
                                      <div className="bg-green-50 rounded-lg p-2 text-center">
                                        <p className="text-lg font-bold text-green-700">{job.analytics.readRate}%</p>
                                        <p className="text-xs text-green-600">Read</p>
                                      </div>
                                      <div className="bg-purple-50 rounded-lg p-2 text-center">
                                        <p className="text-lg font-bold text-purple-700">{job.analytics.responseRate}%</p>
                                        <p className="text-xs text-purple-600">Responded</p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Audience info */}
                                {job.audienceFilter && (
                                  <div>
                                    <p className="text-xs font-medium text-gray-700 mb-1">Audience Filter</p>
                                    <div className="flex flex-wrap gap-1">
                                      {job.audienceFilter.tags?.map(tag => (
                                        <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{tag}</span>
                                      ))}
                                      {job.audienceFilter.lifecycleStages?.map(stage => (
                                        <span key={stage} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{stage}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Delivery funnel */}
                                <div>
                                  <p className="text-xs font-medium text-gray-700 mb-1">Delivery Funnel</p>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-500 w-16">Sent</span>
                                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                                        <div className="bg-green-500 h-2 rounded-full" style={{ width: job.totalContacts > 0 ? `${(job.sentCount / job.totalContacts) * 100}%` : '0%' }} />
                                      </div>
                                      <span className="text-xs text-gray-600 w-8 text-right">{job.sentCount}</span>
                                    </div>
                                    {job.analytics && (
                                      <>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-gray-500 w-16">Delivered</span>
                                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: job.sentCount > 0 ? `${(job.analytics.deliveredCount / job.sentCount) * 100}%` : '0%' }} />
                                          </div>
                                          <span className="text-xs text-gray-600 w-8 text-right">{job.analytics.deliveredCount}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-gray-500 w-16">Read</span>
                                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                                            <div className="bg-green-500 h-2 rounded-full" style={{ width: job.sentCount > 0 ? `${(job.analytics.readCount / job.sentCount) * 100}%` : '0%' }} />
                                          </div>
                                          <span className="text-xs text-gray-600 w-8 text-right">{job.analytics.readCount}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-gray-500 w-16">Replied</span>
                                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                                            <div className="bg-purple-500 h-2 rounded-full" style={{ width: job.sentCount > 0 ? `${(job.analytics.respondedCount / job.sentCount) * 100}%` : '0%' }} />
                                          </div>
                                          <span className="text-xs text-gray-600 w-8 text-right">{job.analytics.respondedCount}</span>
                                        </div>
                                      </>
                                    )}
                                    {job.failedCount > 0 && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500 w-16">Failed</span>
                                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                                          <div className="bg-red-500 h-2 rounded-full" style={{ width: job.totalContacts > 0 ? `${(job.failedCount / job.totalContacts) * 100}%` : '0%' }} />
                                        </div>
                                        <span className="text-xs text-gray-600 w-8 text-right">{job.failedCount}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {job.completedAt && (
                                  <p className="text-xs text-gray-400">Completed: {formatDate(job.completedAt)}</p>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Automation Tab */}
            {activeTab === 'automation' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Auto-Reply Rules */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Create Auto-Reply */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="font-semibold text-gray-900 mb-4">Create Auto-Reply Rule</h2>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                          <select
                            value={newAutoReplyType}
                            onChange={(e) => setNewAutoReplyType(e.target.value as AutoReplyType)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                          >
                            <option value="welcome">Welcome Message</option>
                            <option value="away">Away Message</option>
                            <option value="keyword">Keyword Trigger</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                          <input
                            type="text"
                            value={newAutoReplyName}
                            onChange={(e) => setNewAutoReplyName(e.target.value)}
                            placeholder="e.g., Business hours greeting"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Auto-Reply Message
                        </label>
                        <textarea
                          value={newAutoReplyMessage}
                          onChange={(e) => setNewAutoReplyMessage(e.target.value)}
                          placeholder="Enter the auto-reply message... Use {{name}} for contact name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 resize-none"
                          rows={3}
                        />
                      </div>

                      {newAutoReplyType === 'keyword' && (
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Keywords (comma-separated)</label>
                            <input
                              type="text"
                              value={newAutoReplyKeywords}
                              onChange={(e) => setNewAutoReplyKeywords(e.target.value)}
                              placeholder="e.g., pricing, price, cost, how much"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Match Mode</label>
                            <select
                              value={newAutoReplyMatchMode}
                              onChange={(e) => setNewAutoReplyMatchMode(e.target.value as 'contains' | 'exact')}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                            >
                              <option value="contains">Contains</option>
                              <option value="exact">Exact Match</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {newAutoReplyType === 'welcome' && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-xs text-blue-700">Sent automatically when a new contact messages for the first time.</p>
                        </div>
                      )}

                      {newAutoReplyType === 'away' && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-xs text-blue-700">Sent automatically when messages are received outside business hours. Configure business hours in the panel on the right.</p>
                        </div>
                      )}

                      <button
                        onClick={handleCreateAutoReply}
                        disabled={savingAutomation || !newAutoReplyName.trim() || !newAutoReplyMessage.trim()}
                        className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
                          savingAutomation || !newAutoReplyName.trim() || !newAutoReplyMessage.trim()
                            ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'
                        }`}
                      >
                        {savingAutomation ? 'Creating...' : 'Create Auto-Reply'}
                      </button>
                    </div>
                  </div>

                  {/* Existing Auto-Reply Rules */}
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-4 border-b border-gray-200">
                      <h2 className="font-semibold text-gray-900">Active Rules ({autoReplies.length})</h2>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {autoReplies.length === 0 ? (
                        <p className="p-6 text-gray-500 text-center text-sm">No auto-reply rules yet. Create one above to get started.</p>
                      ) : (
                        autoReplies.map((rule) => (
                          <div key={rule.id} className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                                    rule.type === 'welcome' ? 'bg-green-100 text-green-700' :
                                    rule.type === 'away' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-blue-100 text-blue-700'
                                  }`}>
                                    {rule.type === 'welcome' ? 'Welcome' : rule.type === 'away' ? 'Away' : 'Keyword'}
                                  </span>
                                  <span className="font-medium text-gray-900 text-sm">{rule.name}</span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1 truncate">{rule.message}</p>
                                {rule.type === 'keyword' && rule.keywords && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {rule.keywords.map((kw, i) => (
                                      <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{kw}</span>
                                    ))}
                                    <span className="text-xs text-gray-400">({rule.matchMode || 'contains'})</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <button
                                  onClick={() => handleToggleAutoReply(rule.id, !rule.enabled)}
                                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${rule.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                                >
                                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${rule.enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} style={{ transform: rule.enabled ? 'translateX(18px)' : 'translateX(2px)' }} />
                                </button>
                                <button
                                  onClick={() => handleDeleteAutoReply(rule.id)}
                                  className="text-red-400 hover:text-red-600 text-sm"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Business Hours */}
                <div className="space-y-6">
                  {/* Business Hours Configuration */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="font-semibold text-gray-900 mb-4">Business Hours</h2>
                    <p className="text-xs text-gray-500 mb-4">Away messages will be sent outside these hours.</p>

                    <div className="space-y-2">
                      {automationConfig.businessHours.map((slot, index) => (
                        <div key={slot.day} className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 w-20">
                            <input
                              type="checkbox"
                              checked={slot.enabled}
                              onChange={(e) => {
                                const updated = [...automationConfig.businessHours];
                                updated[index] = { ...slot, enabled: e.target.checked };
                                setAutomationConfig({ ...automationConfig, businessHours: updated });
                              }}
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-xs text-gray-700">{dayNames[slot.day].slice(0, 3)}</span>
                          </label>
                          {slot.enabled && (
                            <div className="flex items-center gap-1 flex-1">
                              <input
                                type="time"
                                value={slot.startTime}
                                onChange={(e) => {
                                  const updated = [...automationConfig.businessHours];
                                  updated[index] = { ...slot, startTime: e.target.value };
                                  setAutomationConfig({ ...automationConfig, businessHours: updated });
                                }}
                                className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-900"
                              />
                              <span className="text-xs text-gray-400">to</span>
                              <input
                                type="time"
                                value={slot.endTime}
                                onChange={(e) => {
                                  const updated = [...automationConfig.businessHours];
                                  updated[index] = { ...slot, endTime: e.target.value };
                                  setAutomationConfig({ ...automationConfig, businessHours: updated });
                                }}
                                className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-900"
                              />
                            </div>
                          )}
                          {!slot.enabled && (
                            <span className="text-xs text-gray-400 flex-1">Closed</span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Timezone</label>
                        <select
                          value={automationConfig.timezone}
                          onChange={(e) => setAutomationConfig({ ...automationConfig, timezone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                        >
                          <option value="America/New_York">Eastern (ET)</option>
                          <option value="America/Chicago">Central (CT)</option>
                          <option value="America/Denver">Mountain (MT)</option>
                          <option value="America/Los_Angeles">Pacific (PT)</option>
                          <option value="UTC">UTC</option>
                          <option value="Europe/London">London (GMT)</option>
                          <option value="Europe/Madrid">Madrid (CET)</option>
                          <option value="America/Mexico_City">Mexico City (CST)</option>
                          <option value="America/Bogota">Bogota (COT)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Auto-close conversations after (hours)</label>
                        <input
                          type="number"
                          value={automationConfig.autoCloseAfterHours}
                          onChange={(e) => setAutomationConfig({ ...automationConfig, autoCloseAfterHours: parseInt(e.target.value) || 24 })}
                          min={1}
                          max={168}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                        />
                      </div>

                      <button
                        onClick={handleSaveBusinessHours}
                        disabled={savingAutomation}
                        className={`w-full px-4 py-2 rounded-lg text-sm font-medium text-white ${savingAutomation ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'}`}
                      >
                        {savingAutomation ? 'Saving...' : 'Save Business Hours'}
                      </button>
                    </div>
                  </div>

                  {/* How It Works */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="font-semibold text-gray-900 mb-3">How It Works</h2>
                    <div className="space-y-3 text-xs text-gray-600">
                      <div className="flex gap-2">
                        <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded shrink-0">Welcome</span>
                        <p>Sent once when a new contact messages for the first time.</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded shrink-0">Away</span>
                        <p>Sent when messages arrive outside business hours.</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded shrink-0">Keyword</span>
                        <p>Triggered when a message contains (or exactly matches) specified keywords.</p>
                      </div>
                      <hr className="border-gray-200" />
                      <p className="text-gray-500">Auto-replies are checked before the AI chatbot. If no auto-reply matches, the AI handles the message normally.</p>
                      <p className="text-gray-500">Use <code className="bg-gray-100 px-1 rounded">{'{{name}}'}</code> in messages to insert the contact&apos;s name.</p>
                    </div>
                  </div>

                  {/* Anti-Blocking Protection */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="font-semibold text-gray-900 mb-1">Anti-Blocking Protection</h2>
                    <p className="text-xs text-gray-500 mb-4">Simulate human-like behavior to avoid WhatsApp account restrictions.</p>

                    <div className="space-y-4">
                      {/* Toggles */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Typing Indicator</p>
                          <p className="text-xs text-gray-400">Show &quot;typing...&quot; before replying</p>
                        </div>
                        <button
                          onClick={() => setAutomationConfig({
                            ...automationConfig,
                            antiBlocking: { ...automationConfig.antiBlocking!, enableTypingIndicator: !automationConfig.antiBlocking?.enableTypingIndicator },
                          })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${automationConfig.antiBlocking?.enableTypingIndicator ? 'bg-green-500' : 'bg-gray-300'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${automationConfig.antiBlocking?.enableTypingIndicator ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Read Receipts</p>
                          <p className="text-xs text-gray-400">Mark messages as read before replying</p>
                        </div>
                        <button
                          onClick={() => setAutomationConfig({
                            ...automationConfig,
                            antiBlocking: { ...automationConfig.antiBlocking!, enableReadReceipts: !automationConfig.antiBlocking?.enableReadReceipts },
                          })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${automationConfig.antiBlocking?.enableReadReceipts ? 'bg-green-500' : 'bg-gray-300'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${automationConfig.antiBlocking?.enableReadReceipts ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>

                      <hr className="border-gray-200" />

                      {/* Reply Delay */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Reply Delay (seconds)</p>
                        <p className="text-xs text-gray-400 mb-2">Random delay before sending AI/auto-reply responses</p>
                        <div className="flex gap-2 items-center">
                          <div className="flex-1">
                            <label className="text-xs text-gray-500">Min</label>
                            <input
                              type="number"
                              min={0}
                              max={30}
                              value={automationConfig.antiBlocking?.minReplyDelaySec ?? 1}
                              onChange={(e) => setAutomationConfig({
                                ...automationConfig,
                                antiBlocking: { ...automationConfig.antiBlocking!, minReplyDelaySec: parseInt(e.target.value) || 0 },
                              })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                            />
                          </div>
                          <span className="text-gray-400 mt-4">-</span>
                          <div className="flex-1">
                            <label className="text-xs text-gray-500">Max</label>
                            <input
                              type="number"
                              min={1}
                              max={60}
                              value={automationConfig.antiBlocking?.maxReplyDelaySec ?? 5}
                              onChange={(e) => setAutomationConfig({
                                ...automationConfig,
                                antiBlocking: { ...automationConfig.antiBlocking!, maxReplyDelaySec: parseInt(e.target.value) || 1 },
                              })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                            />
                          </div>
                        </div>
                      </div>

                      <hr className="border-gray-200" />

                      {/* Bulk Send Settings */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Bulk Send Pacing</p>
                        <p className="text-xs text-gray-400 mb-2">Control how fast broadcast messages are sent</p>
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs text-gray-500">Delay between messages (sec)</label>
                            <input
                              type="number"
                              min={1}
                              max={30}
                              value={automationConfig.antiBlocking?.bulkMessageDelaySec ?? 2}
                              onChange={(e) => setAutomationConfig({
                                ...automationConfig,
                                antiBlocking: { ...automationConfig.antiBlocking!, bulkMessageDelaySec: parseInt(e.target.value) || 1 },
                              })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Batch size (pause after N messages)</label>
                            <input
                              type="number"
                              min={10}
                              max={200}
                              value={automationConfig.antiBlocking?.bulkBatchSize ?? 50}
                              onChange={(e) => setAutomationConfig({
                                ...automationConfig,
                                antiBlocking: { ...automationConfig.antiBlocking!, bulkBatchSize: parseInt(e.target.value) || 10 },
                              })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Batch pause duration (sec)</label>
                            <input
                              type="number"
                              min={10}
                              max={120}
                              value={automationConfig.antiBlocking?.bulkBatchPauseSec ?? 45}
                              onChange={(e) => setAutomationConfig({
                                ...automationConfig,
                                antiBlocking: { ...automationConfig.antiBlocking!, bulkBatchPauseSec: parseInt(e.target.value) || 10 },
                              })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleSaveBusinessHours}
                        disabled={savingAutomation}
                        className={`w-full px-4 py-2 rounded-lg text-sm font-medium text-white ${savingAutomation ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'}`}
                      >
                        {savingAutomation ? 'Saving...' : 'Save Anti-Blocking Settings'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && analyticsData && (
              <div className="space-y-6">
                {/* Top Metrics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { label: 'Total Messages', value: analyticsData.topMetrics.totalMessages.toLocaleString(), sub: `${analyticsData.topMetrics.messagesThisWeek} this week`, color: 'bg-blue-50 text-blue-700' },
                    { label: 'Total Contacts', value: analyticsData.topMetrics.totalContacts.toLocaleString(), sub: `${analyticsData.topMetrics.newContactsThisWeek} new this week`, color: 'bg-green-50 text-green-700' },
                    { label: 'Conversations', value: analyticsData.conversationMetrics.total.toLocaleString(), sub: `${analyticsData.conversationMetrics.open} open`, color: 'bg-purple-50 text-purple-700' },
                    { label: 'Avg Response', value: analyticsData.topMetrics.avgResponseTime, sub: 'first response', color: 'bg-yellow-50 text-yellow-700' },
                    { label: 'Broadcasts', value: analyticsData.topMetrics.totalBroadcasts.toLocaleString(), sub: 'completed', color: 'bg-orange-50 text-orange-700' },
                    { label: 'Resolution', value: `${analyticsData.conversationMetrics.total > 0 ? Math.round((analyticsData.conversationMetrics.resolved / analyticsData.conversationMetrics.total) * 100) : 0}%`, sub: `${analyticsData.conversationMetrics.resolved} resolved`, color: 'bg-teal-50 text-teal-700' },
                  ].map((metric) => (
                    <div key={metric.label} className={`rounded-lg p-4 ${metric.color}`}>
                      <p className="text-xs font-medium opacity-75">{metric.label}</p>
                      <p className="text-2xl font-bold mt-1">{metric.value}</p>
                      <p className="text-xs opacity-60 mt-1">{metric.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Charts Row 1: Message Volume + Conversation Status */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Message Volume Chart */}
                  <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
                    <h2 className="font-semibold text-gray-900 mb-4">Message Volume (Last 30 Days)</h2>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analyticsData.messageVolume}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(d) => {
                            const date = new Date(String(d) + 'T00:00:00');
                            return `${date.getMonth() + 1}/${date.getDate()}`;
                          }}
                          interval={4}
                        />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          labelFormatter={(d) => {
                            const date = new Date(String(d) + 'T00:00:00');
                            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                          }}
                        />
                        <Legend />
                        <Bar dataKey="received" name="Received" fill="#3B82F6" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="sent" name="Sent" fill="#10B981" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Conversation Status Pie */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="font-semibold text-gray-900 mb-4">Conversation Status</h2>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Open', value: analyticsData.conversationMetrics.open },
                            { name: 'Resolved', value: analyticsData.conversationMetrics.resolved },
                            { name: 'Archived', value: analyticsData.conversationMetrics.archived },
                          ].filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                        >
                          {[
                            { name: 'Open', value: analyticsData.conversationMetrics.open },
                            { name: 'Resolved', value: analyticsData.conversationMetrics.resolved },
                            { name: 'Archived', value: analyticsData.conversationMetrics.archived },
                          ].filter(d => d.value > 0).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={['#3B82F6', '#10B981', '#9CA3AF'][index]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 flex justify-center gap-4 text-xs text-gray-600">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />Open</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" />Resolved</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-400 inline-block" />Archived</span>
                    </div>
                  </div>
                </div>

                {/* Charts Row 2: Contact Growth + Conversation Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Contact Growth Chart */}
                  <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
                    <h2 className="font-semibold text-gray-900 mb-4">Contact Growth (Last 30 Days)</h2>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analyticsData.contactGrowth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(d) => {
                            const date = new Date(String(d) + 'T00:00:00');
                            return `${date.getMonth() + 1}/${date.getDate()}`;
                          }}
                          interval={4}
                        />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          labelFormatter={(d) => {
                            const date = new Date(String(d) + 'T00:00:00');
                            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                          }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="cumulative" name="Total Contacts" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="count" name="New Contacts" stroke="#F59E0B" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Conversation Detail Stats */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="font-semibold text-gray-900 mb-4">Conversation Insights</h2>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Avg Messages/Conv</span>
                        <span className="text-lg font-bold text-gray-900">{analyticsData.conversationMetrics.avgMessagesPerConversation}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Avg First Response</span>
                        <span className="text-lg font-bold text-gray-900">{analyticsData.topMetrics.avgResponseTime}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Open Conversations</span>
                        <span className="text-lg font-bold text-blue-600">{analyticsData.conversationMetrics.open}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Resolved</span>
                        <span className="text-lg font-bold text-green-600">{analyticsData.conversationMetrics.resolved}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Messages This Week</span>
                        <span className="text-lg font-bold text-gray-900">{analyticsData.topMetrics.messagesThisWeek}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">New Contacts This Week</span>
                        <span className="text-lg font-bold text-gray-900">{analyticsData.topMetrics.newContactsThisWeek}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Broadcast Performance Table */}
                {analyticsData.broadcastPerformance.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="font-semibold text-gray-900 mb-4">Broadcast Performance</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-2 font-medium text-gray-600">Campaign</th>
                            <th className="text-center py-3 px-2 font-medium text-gray-600">Sent</th>
                            <th className="text-center py-3 px-2 font-medium text-gray-600">Failed</th>
                            <th className="text-center py-3 px-2 font-medium text-gray-600">Delivery Rate</th>
                            <th className="text-center py-3 px-2 font-medium text-gray-600">Read Rate</th>
                            <th className="text-center py-3 px-2 font-medium text-gray-600">Response Rate</th>
                            <th className="text-right py-3 px-2 font-medium text-gray-600">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analyticsData.broadcastPerformance.map((b) => (
                            <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-2 font-medium text-gray-900">{b.name}</td>
                              <td className="py-3 px-2 text-center text-green-600">{b.sentCount}/{b.totalContacts}</td>
                              <td className="py-3 px-2 text-center text-red-600">{b.failedCount}</td>
                              <td className="py-3 px-2 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${b.deliveryRate >= 90 ? 'bg-green-100 text-green-700' : b.deliveryRate >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                  {b.deliveryRate}%
                                </span>
                              </td>
                              <td className="py-3 px-2 text-center">
                                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                  {b.readRate}%
                                </span>
                              </td>
                              <td className="py-3 px-2 text-center">
                                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                  {b.responseRate}%
                                </span>
                              </td>
                              <td className="py-3 px-2 text-right text-gray-500">
                                {new Date(b.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'analytics' && !analyticsData && !loading && (
              <div className="flex justify-center items-center h-64 text-gray-500">
                No analytics data available yet. Start conversations and send messages to see insights.
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
