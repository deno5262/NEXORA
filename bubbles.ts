export type Bubble = { id: string; name: string; avatar_url: string | null }
const K = 'nexoraBubbles'
export const getBubbles = (): Bubble[] => { try { return JSON.parse(localStorage.getItem(K) || '[]') } catch { return [] } }
const save = (b: Bubble[]) => { localStorage.setItem(K, JSON.stringify(b)); window.dispatchEvent(new Event('bubbles')) }
export const addBubble = (b: Bubble) => save([b, ...getBubbles().filter(x => x.id !== b.id)].slice(0, 3))
export const removeBubble = (id: string) => save(getBubbles().filter(x => x.id !== id))
