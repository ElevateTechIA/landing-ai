/**
 * Zoom API integration for creating and managing meetings
 */

interface ZoomMeetingSettings {
  host_video: boolean;
  participant_video: boolean;
  join_before_host: boolean;
  mute_upon_entry: boolean;
  watermark: boolean;
  audio: string;
  auto_recording: string;
}

interface ZoomMeetingRequest {
  topic: string;
  type: number;
  start_time: string;
  duration: number;
  timezone: string;
  settings: ZoomMeetingSettings;
}

interface ZoomMeetingResponse {
  id: string;
  join_url: string;
  start_url: string;
  start_time: string;
  duration: number;
  topic: string;
  password?: string;
}

/**
 * Obtener access token de Zoom usando Server-to-Server OAuth
 */
async function getZoomAccessToken(): Promise<string> {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    throw new Error('Zoom credentials not configured');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Zoom OAuth error:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
      accountIdPrefix: accountId?.substring(0, 4) + '...',
      clientIdPrefix: clientId?.substring(0, 4) + '...',
    });
    throw new Error(`Failed to get Zoom access token: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Crear reunión en Zoom
 */
export async function createZoomMeeting(
  topic: string,
  startTime: string,
  duration: number = 60,
  timezone: string = 'America/Mexico_City'
): Promise<ZoomMeetingResponse> {
  try {
    const accessToken = await getZoomAccessToken();
    const userId = 'me'; // 'me' usa el usuario del access token

    const meetingData: ZoomMeetingRequest = {
      topic,
      type: 2, // Scheduled meeting
      start_time: startTime,
      duration,
      timezone,
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        mute_upon_entry: true,
        watermark: false,
        audio: 'both',
        auto_recording: 'cloud',
      },
    };

    const response = await fetch(
      `https://api.zoom.us/v2/users/${userId}/meetings`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(meetingData),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Zoom API error:', errorData);
      throw new Error('Failed to create Zoom meeting');
    }

    const meeting = await response.json();
    return meeting;
  } catch (error) {
    console.error('Error creating Zoom meeting:', error);
    throw error;
  }
}

/**
 * Obtener detalles de una reunión de Zoom
 */
export async function getZoomMeeting(meetingId: string): Promise<ZoomMeetingResponse> {
  try {
    const accessToken = await getZoomAccessToken();

    const response = await fetch(
      `https://api.zoom.us/v2/meetings/${meetingId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get Zoom meeting');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting Zoom meeting:', error);
    throw error;
  }
}

/**
 * Actualizar reunión de Zoom
 */
export async function updateZoomMeeting(
  meetingId: string,
  updates: Partial<ZoomMeetingRequest>
): Promise<void> {
  try {
    const accessToken = await getZoomAccessToken();

    const response = await fetch(
      `https://api.zoom.us/v2/meetings/${meetingId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to update Zoom meeting');
    }
  } catch (error) {
    console.error('Error updating Zoom meeting:', error);
    throw error;
  }
}

/**
 * Eliminar reunión de Zoom
 */
export async function deleteZoomMeeting(meetingId: string): Promise<void> {
  try {
    const accessToken = await getZoomAccessToken();

    const response = await fetch(
      `https://api.zoom.us/v2/meetings/${meetingId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete Zoom meeting');
    }
  } catch (error) {
    console.error('Error deleting Zoom meeting:', error);
    throw error;
  }
}
