const axios = require('axios');

const WEBPUSHR_SID_URL = 'https://api.webpushr.com/v1/notification/send/sid';
const WEBPUSHR_SEGMENT_URL = 'https://api.webpushr.com/v1/notification/send/segment';

/**
 * Formats a date into Webpushr's required offset-aware format:
 * "YYYY-MM-DD HH:mm ±HH:mm" (e.g. "2020-03-04 13:30 -08:00")
 */
function formatWebpushrSendAt(dateInput) {
  if (!dateInput) return null;
  // If already formatted like "YYYY-MM-DD HH:mm +HH:mm"
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}\s[+-]\d{2}:\d{2}$/.test(dateInput)) {
    return dateInput;
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  const pad = (n) => String(n).padStart(2, '0');
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const HH = pad(d.getHours());
  const mm = pad(d.getMinutes());

  const offsetMinutes = -d.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMinutes);
  const offsetHours = pad(Math.floor(absOffset / 60));
  const offsetMins = pad(absOffset % 60);
  const offsetStr = `${sign}${offsetHours}:${offsetMins}`;

  return `${YYYY}-${MM}-${DD} ${HH}:${mm} ${offsetStr}`;
}

/**
 * Send notification to a single subscriber ID via Webpushr
 * @param {Object} params
 * @param {string} params.sid
 * @param {string} params.title
 * @param {string} params.message
 * @param {string} params.target_url
 * @param {string} [params.icon]
 * @param {string} [params.expire_push]
 * @param {number} [params.auto_hide]
 * @param {string} [params.send_at]
 * @param {Array} [params.action_buttons]
 * @returns {Promise<{success: boolean, statusCode: number, data: any, error?: string, isRetryable: boolean}>}
 */
async function sendWebpushrNotification({
  sid,
  title,
  message,
  target_url,
  icon,
  expire_push,
  auto_hide,
  send_at,
  action_buttons
}) {
  const apiKey = process.env.WEBPUSHR_REST_API_KEY;
  const authToken = process.env.WEBPUSHR_AUTH_TOKEN;

  // Build clean payload according to Webpushr SID specs
  // Note: SID API only supports icon, NOT image parameter.
  const payload = {
    title: String(title).slice(0, 100),
    message: String(message).slice(0, 255),
    target_url: String(target_url).slice(0, 255),
    sid: String(sid).trim()
  };

  if (icon && typeof icon === 'string' && icon.trim() !== '') {
    payload.icon = icon.trim();
  }

  if (expire_push && typeof expire_push === 'string' && expire_push.trim() !== '') {
    payload.expire_push = expire_push.trim();
  }

  if (auto_hide !== undefined && auto_hide !== null) {
    // Webpushr SID API accepts 1 (true) or 0 (false), or boolean
    payload.auto_hide = auto_hide === true || auto_hide === 'true' || auto_hide === 1 ? 1 : 0;
  }

  if (send_at) {
    const formattedSendAt = formatWebpushrSendAt(send_at);
    if (formattedSendAt) {
      payload.send_at = formattedSendAt;
    }
  }

  if (Array.isArray(action_buttons) && action_buttons.length > 0) {
    const validButtons = action_buttons
      .filter(b => b && b.title && b.url)
      .map(b => ({
        title: String(b.title).trim(),
        url: String(b.url).trim()
      }));
    if (validButtons.length > 0) {
      payload.action_buttons = validButtons;
    }
  }

  try {
    const response = await axios.post(WEBPUSHR_SID_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'webpushrKey': apiKey || '',
        'webpushrAuthToken': authToken || ''
      },
      timeout: 15000 // 15 seconds timeout
    });

    // Webpushr returns { status: "success", type: "sid", description: "...", ... } or error
    const isSuccess = response.status >= 200 && response.status < 300 && 
      (response.data?.status === 'success' || !response.data?.status || response.data?.status !== 'error');

    return {
      success: isSuccess,
      statusCode: response.status,
      data: response.data,
      payload,
      isRetryable: false
    };
  } catch (error) {
    const statusCode = error.response ? error.response.status : 0;
    const responseData = error.response ? error.response.data : null;
    const errorMsg = responseData?.description || error.message || 'Unknown Webpushr API Error';

    // HTTP 429 (rate-limit) or 5xx server errors or network timeouts are retryable
    const isRetryable = statusCode === 429 || statusCode >= 500 || error.code === 'ECONNABORTED' || !error.response;

    return {
      success: false,
      statusCode: statusCode,
      data: responseData,
      payload,
      error: errorMsg,
      isRetryable
    };
  }
}

/**
 * Send notification to Webpushr Segment(s)
 * @param {Object} params
 * @param {Array<number|string>} params.segment - Array of Segment IDs
 * @param {string} params.title
 * @param {string} params.message
 * @param {string} params.target_url
 * @param {string} [params.name]
 * @param {string} [params.icon]
 * @param {string} [params.image]
 * @param {string} [params.expire_push]
 * @param {boolean|number} [params.auto_hide]
 * @param {string} [params.send_at]
 * @param {Array} [params.action_buttons]
 */
async function sendWebpushrSegmentNotification({
  segment,
  title,
  message,
  target_url,
  name,
  icon,
  image,
  expire_push,
  auto_hide,
  send_at,
  action_buttons
}) {
  const apiKey = process.env.WEBPUSHR_REST_API_KEY;
  const authToken = process.env.WEBPUSHR_AUTH_TOKEN;

  const segmentArray = (Array.isArray(segment) ? segment : [segment])
    .map(s => {
      const num = Number(s);
      return !isNaN(num) ? num : String(s).trim();
    })
    .filter(s => s !== '' && s !== 0);

  const payload = {
    title: String(title).slice(0, 100),
    message: String(message).slice(0, 255),
    target_url: String(target_url).slice(0, 255),
    segment: segmentArray
  };

  if (name && typeof name === 'string' && name.trim() !== '') {
    payload.name = name.trim();
  }

  if (icon && typeof icon === 'string' && icon.trim() !== '') {
    payload.icon = icon.trim();
  }

  if (image && typeof image === 'string' && image.trim() !== '') {
    payload.image = image.trim();
  }

  if (expire_push && typeof expire_push === 'string' && expire_push.trim() !== '') {
    payload.expire_push = expire_push.trim();
  }

  if (auto_hide !== undefined && auto_hide !== null) {
    payload.auto_hide = auto_hide === true || auto_hide === 'true' || auto_hide === 1 ? 1 : 0;
  }

  if (send_at) {
    const formattedSendAt = formatWebpushrSendAt(send_at);
    if (formattedSendAt) {
      payload.send_at = formattedSendAt;
    }
  }

  if (Array.isArray(action_buttons) && action_buttons.length > 0) {
    const validButtons = action_buttons
      .filter(b => b && b.title && b.url)
      .map(b => ({
        title: String(b.title).trim(),
        url: String(b.url).trim()
      }));
    if (validButtons.length > 0) {
      payload.action_buttons = validButtons;
    }
  }

  try {
    const response = await axios.post(WEBPUSHR_SEGMENT_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'webpushrKey': apiKey || '',
        'webpushrAuthToken': authToken || ''
      },
      timeout: 15000
    });

    const isSuccess = response.status >= 200 && response.status < 300 &&
      (response.data?.status === 'success' || !response.data?.status || response.data?.status !== 'error');

    return {
      success: isSuccess,
      statusCode: response.status,
      data: response.data,
      payload
    };
  } catch (error) {
    const statusCode = error.response ? error.response.status : 0;
    const responseData = error.response ? error.response.data : null;
    const errorMsg = responseData?.description || error.message || 'Unknown Webpushr Segment Error';

    return {
      success: false,
      statusCode,
      data: responseData,
      payload,
      error: errorMsg
    };
  }
}

module.exports = {
  sendWebpushrNotification,
  sendWebpushrSegmentNotification
};
