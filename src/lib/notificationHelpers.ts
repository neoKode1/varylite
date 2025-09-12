// Helper functions for sending common notifications
export async function sendWelcomeEmail(userId: string) {
  return await fetch('/api/send-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      subject: 'Welcome to VaryAI! 🎉',
      message: 'Welcome to VaryAI! You now have access to unlimited AI content generation. Start creating amazing images and videos with our advanced models.',
      type: 'welcome'
    })
  });
}

export async function sendLevelUpEmail(userId: string, newLevel: number) {
  return await fetch('/api/send-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      subject: `🎉 Level Up! You're now Level ${newLevel}`,
      message: `Congratulations! You've reached Level ${newLevel} in VaryAI. You now have access to even more advanced AI models and features. Keep creating amazing content!`,
      type: 'level_up'
    })
  });
}

export async function sendUsageLimitEmail(userId: string, limitType: string) {
  return await fetch('/api/send-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      subject: 'Usage Limit Reached',
      message: `You've reached your ${limitType} usage limit. Upgrade your plan or wait for the limit to reset to continue generating content.`,
      type: 'usage_limit'
    })
  });
}

export async function sendGenerationCompleteEmail(userId: string, contentType: string) {
  return await fetch('/api/send-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      subject: `Your ${contentType} is Ready! 🎨`,
      message: `Your AI-generated ${contentType} has been completed and is ready to view in your gallery.`,
      type: 'generation_complete'
    })
  });
}

export async function sendCustomNotification(userId: string, subject: string, message: string, type?: string) {
  return await fetch('/api/send-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      subject,
      message,
      type: type || 'custom'
    })
  });
}
