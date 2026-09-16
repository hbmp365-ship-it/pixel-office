import { OfficeRoom } from './OfficeRoom'

export { OfficeRoom }

export interface Env {
  ASSETS: Fetcher
  OFFICE_ROOM: DurableObjectNamespace
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/ws') {
      // One Durable Object per office; `?room=` allows separate floors later.
      const roomKey = (url.searchParams.get('room') || 'main').slice(0, 64)
      const stub = env.OFFICE_ROOM.get(env.OFFICE_ROOM.idFromName(roomKey))
      return stub.fetch(request)
    }

    // Anything else is a static asset. Unmatched paths fall back to the SPA
    // entry point so a refresh on a deep link still boots the app.
    const asset = await env.ASSETS.fetch(request)
    if (asset.status !== 404) return asset
    return env.ASSETS.fetch(new Request(new URL('/', url).toString(), request))
  },
} satisfies ExportedHandler<Env>
