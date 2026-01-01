export interface MojangProfileProperty {
    name: string
    value: string
    signature?: string
}

export interface MojangProfile {
    id: string
    name: string
    properties: MojangProfileProperty[]
    profileActions?: string[]
}

export interface MojangProfileError {
    error?: string
    errorMessage?: string
}

export type MojangProfileResult =
    | { ok: true; data: MojangProfile }
    | { ok: false; errorMessage: string }

export async function getMojangProfile(
    uuid: string
): Promise<MojangProfileResult> {
    try {
        const res = await fetch(
            `https://sessionserver.mojang.com/session/minecraft/profile/${uuid}?unsigned=true`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            }
        )

        const data = await res.json() as MojangProfile & MojangProfileError

        // Mojang 接口的“业务错误”是 200 + errorMessage
        if (!res.ok || data.errorMessage) {
            return {
                ok: false,
                errorMessage:
                    data.errorMessage || `HTTP ${res.status}`
            }
        }

        return {
            ok: true,
            data
        }
    } catch (err: any) {
        return {
            ok: false,
            errorMessage: err?.message || 'Network error'
        }
    }
}
