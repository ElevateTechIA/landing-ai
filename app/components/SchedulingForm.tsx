'use client';

import { useState } from 'react';

interface SchedulingFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  language: string;
}

export default function SchedulingForm({ onSubmit, onCancel, language }: SchedulingFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    challenge: '',
    objectives: '',
    expectations: '',
    budget: '',
    timeline: '',
    selectedSlot: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/calendar/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        onSubmit(data);
      } else {
        alert('Error al agendar la reunión');
      }
    } catch (error) {
      console.error('Error scheduling:', error);
      alert('Error al agendar la reunión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      es: {
        title: 'Agendar Reunión',
        name: 'Nombre',
        email: 'Email',
        phone: 'Teléfono',
        company: 'Empresa',
        challenge: 'Cuéntanos tu desafío',
        objectives: 'Objetivos',
        expectations: 'Expectativas',
        budget: 'Presupuesto estimado',
        timeline: 'Timeline deseado',
        selectDate: 'Selecciona fecha y hora',
        submit: 'Agendar Reunión',
        cancel: 'Cancelar',
        submitting: 'Agendando...'
      },
      en: {
        title: 'Schedule Meeting',
        name: 'Name',
        email: 'Email',
        phone: 'Phone',
        company: 'Company',
        challenge: 'Tell us your challenge',
        objectives: 'Objectives',
        expectations: 'Expectations',
        budget: 'Estimated budget',
        timeline: 'Desired timeline',
        selectDate: 'Select date and time',
        submit: 'Schedule Meeting',
        cancel: 'Cancel',
        submitting: 'Scheduling...'
      }
    };
    return translations[language]?.[key] || translations.en[key];
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-lg max-w-md mx-auto">
      <h3 className="text-xl font-bold mb-4">{t('title')}</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder={t('name')}
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          required
          className="w-full px-4 py-2 border rounded-lg"
        />
        
        <input
          type="email"
          placeholder={t('email')}
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          required
          className="w-full px-4 py-2 border rounded-lg"
        />
        
        <input
          type="tel"
          placeholder={t('phone')}
          value={formData.phone}
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
          required
          className="w-full px-4 py-2 border rounded-lg"
        />
        
        <input
          type="text"
          placeholder={t('company')}
          value={formData.company}
          onChange={(e) => setFormData({...formData, company: e.target.value})}
          required
          className="w-full px-4 py-2 border rounded-lg"
        />
        
        <textarea
          placeholder={t('challenge')}
          value={formData.challenge}
          onChange={(e) => setFormData({...formData, challenge: e.target.value})}
          required
          rows={3}
          className="w-full px-4 py-2 border rounded-lg"
        />
        
        <input
          type="text"
          placeholder={t('budget')}
          value={formData.budget}
          onChange={(e) => setFormData({...formData, budget: e.target.value})}
          className="w-full px-4 py-2 border rounded-lg"
        />
        
        <input
          type="datetime-local"
          placeholder={t('selectDate')}
          value={formData.selectedSlot}
          onChange={(e) => setFormData({...formData, selectedSlot: e.target.value})}
          required
          min={new Date().toISOString().slice(0, 16)}
          className="w-full px-4 py-2 border rounded-lg"
        />
        
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isSubmitting ? t('submitting') : t('submit')}
          </button>
          
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {t('cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
