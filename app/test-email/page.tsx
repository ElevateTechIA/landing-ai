'use client';

import { useState } from 'react';

export default function TestEmailPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  // Initialize with a date in Eastern Time
  const getDefaultDateTime = () => {
    const now = new Date();
    now.setDate(now.getDate() + 1); // Tomorrow
    now.setHours(14, 0, 0, 0); // 2 PM
    // Format for datetime-local input (YYYY-MM-DDTHH:mm)
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [formData, setFormData] = useState({
    clientEmail: 'cesarvega.col@gmail.com',
    clientName: 'César Vega',
    clientPhone: '305 322 0270',
    clientCompany: 'Mi Empresa',
    purpose: 'Consultoría de desarrollo web y aplicaciones móviles',
    meetingDateTime: getDefaultDateTime(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      // Convert datetime-local to ISO with Eastern Time offset
      const isoDateTime = formData.meetingDateTime + ':00-05:00'; // Add seconds and ET offset

      const response = await fetch('/api/voice-chat/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          meetingDateTime: isoDateTime,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Prueba de Emails y SMS
          </h1>
          <p className="text-gray-600 mb-8">
            Envía emails y SMS/WhatsApp de prueba para verificar que todo funcione correctamente
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email del Cliente
              </label>
              <input
                type="email"
                value={formData.clientEmail}
                onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Cliente
              </label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono
              </label>
              <input
                type="text"
                value={formData.clientPhone}
                onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Empresa
              </label>
              <input
                type="text"
                value={formData.clientCompany}
                onChange={(e) => setFormData({ ...formData, clientCompany: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Propósito
              </label>
              <textarea
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha y Hora de la Reunión (Eastern Time)
              </label>
              <input
                type="datetime-local"
                value={formData.meetingDateTime}
                onChange={(e) => setFormData({
                  ...formData,
                  meetingDateTime: e.target.value
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-900 mb-2">
                  <strong>⏰ Zona Horaria:</strong> Eastern Time (ET)
                </p>
                <p className="text-xs text-blue-700 mb-2">
                  Selecciona la fecha y hora que será enviada al calendario
                </p>
                <p className="text-xs text-green-700">
                  💡 El sistema automáticamente agregará el offset de timezone (-05:00)
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enviando...' : '📧📱 Enviar Emails y SMS de Prueba'}
            </button>
          </form>

          {result && (
            <div className={`mt-8 p-6 rounded-lg ${result.success ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
              <h3 className={`text-lg font-semibold mb-3 ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                {result.success ? '✅ Éxito' : '❌ Error'}
              </h3>
              <pre className="text-sm overflow-auto bg-white text-gray-900 p-4 rounded border border-gray-200">
                {JSON.stringify(result, null, 2)}
              </pre>

              {result.success && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-gray-700">
                    <strong>Emails enviados:</strong>
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    <li>Host (elevatetechagency@gmail.com): {result.data.emailsSent.hostEmail ? '✅' : '❌'}</li>
                    <li>Cliente ({formData.clientEmail}): {result.data.emailsSent.clientEmail ? '✅' : '❌'}</li>
                  </ul>
                  <p className="text-sm text-gray-700 mt-3">
                    <strong>SMS/WhatsApp enviado:</strong>
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    <li>
                      {formData.clientPhone}: {result.data.smsSent ? `✅ via ${result.data.smsChannel || 'sms'}` : '❌ No enviado'}
                    </li>
                  </ul>
                  {result.data.googleEventId && (
                    <p className="text-sm text-green-700 mt-2">
                      ✅ Evento de Google Calendar creado: {result.data.googleEventId}
                    </p>
                  )}
                  {!result.data.googleEventId && (
                    <p className="text-sm text-yellow-700 mt-2">
                      ⚠️ No se creó evento en Google Calendar (verifica logs)
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            📋 Instrucciones
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Completa el formulario con los datos de prueba</li>
            <li>Haz clic en "Enviar Emails y SMS de Prueba"</li>
            <li>Verifica tu bandeja de entrada en ambos emails</li>
            <li>Verifica que llegue el SMS/WhatsApp al teléfono</li>
            <li>Verifica el calendario de Google (elevatetechagency@gmail.com)</li>
            <li>Si todo funciona, el sistema está listo para usar en producción</li>
          </ol>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Nota:</strong> Esta página crea Zoom meetings y eventos de Google Calendar reales.
              Los emails se envían vía SMTP y los SMS vía Twilio usando las credenciales configuradas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
