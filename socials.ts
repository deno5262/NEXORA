export const SOC: [string, string][] = [['facebook', 'Facebook'], ['instagram', 'Instagram'], ['youtube', 'YouTube'], ['tiktok', 'TikTok'], ['x', 'X'], ['whatsapp', 'WhatsApp'], ['telegram', 'Telegram'], ['website', 'Website']]
export const safeUrl = (u?: string) => (u && /^https:\/\/[^\s]+$/.test(u) ? u : '')
