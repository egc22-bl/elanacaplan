export const STUDIO_EMAIL = 'info@attitudesdance.com';

export function createMailer({ fetchImpl = globalThis.fetch, env = process.env } = {}) {
  return {
    async send(message) {
      const allow = env.ATTITUDES_ALLOW_EMAIL === 'true'
        && env.NODE_ENV !== 'test'
        && Boolean(env.RESEND_API_KEY)
        && Boolean(env.STUDIO_EMAIL_FROM);
      if (!allow) return { delivered: false, suppressed: true };

      const response = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.STUDIO_EMAIL_FROM,
          to: [STUDIO_EMAIL],
          subject: message.subject,
          text: message.text,
        }),
      });
      if (!response.ok) return { delivered: false, suppressed: false };
      return { delivered: true, suppressed: false };
    },
  };
}
