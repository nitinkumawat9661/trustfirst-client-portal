import { smsConfig, smsReady } from "../../../config/sms"

export class SmsProviderError extends Error {
  constructor(public readonly code = "SMS_PROVIDER_UNAVAILABLE") {
    super(code)
  }
}

type JsonObject = Record<string, unknown>

function asObject(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : null
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : ""
}

function successMessageIdentifier(value: JsonObject) {
  const type = stringValue(value.type).toLowerCase()
  const status = stringValue(value.status).toLowerCase()
  const providerSuccess = type === "success" || status === "success" || value.success === true
  if (!providerSuccess) return ""

  const message = stringValue(value.message)
  if (!message) return ""
  const digits = message.replace(/\D/g, "")
  return digits.length >= 10 && digits.length <= 15 ? message : ""
}

function verifiedIdentifier(payload: unknown) {
  const queue: JsonObject[] = []
  const root = asObject(payload)
  if (!root) return ""
  queue.push(root)

  for (let index = 0; index < queue.length && index < 12; index += 1) {
    const current = queue[index]
    for (const key of ["identifier", "mobile", "phone"]) {
      const value = stringValue(current[key])
      if (value) return value
    }

    // MSG91's live verifyAccessToken response can return the verified mobile
    // directly as `message` when `type` is `success` (for example 91XXXXXXXXXX).
    // Accept that shape only for an explicit success payload and only when the
    // message is phone-like, so arbitrary provider messages are never trusted.
    const messageIdentifier = successMessageIdentifier(current)
    if (messageIdentifier) return messageIdentifier

    for (const key of ["data", "result", "response", "message"]) {
      const child = asObject(current[key])
      if (child) queue.push(child)
    }
  }

  return ""
}

function explicitProviderFailure(payload: unknown) {
  const root = asObject(payload)
  if (!root) return false
  const type = stringValue(root.type).toLowerCase()
  const status = stringValue(root.status).toLowerCase()
  const code = typeof root.code === "number" ? String(root.code) : stringValue(root.code)
  const success = root.success
  return type === "error" || status === "error" || status === "failed" || code === "201" || success === false
}

function providerFailureMeta(payload: unknown) {
  const root = asObject(payload)
  if (!root) return { type: "", code: "", message: "" }
  const rawMessage = stringValue(root.message)
  return {
    type: stringValue(root.type).slice(0, 64),
    code: (typeof root.code === "number" ? String(root.code) : stringValue(root.code)).slice(0, 32),
    message: rawMessage.slice(0, 160)
  }
}

export async function verifyPasswordResetAccessToken(accessToken: string) {
  if (!smsReady() || smsConfig.provider !== "msg91-widget") {
    throw new SmsProviderError("SMS_OTP_UNAVAILABLE")
  }

  const token = accessToken.trim()
  if (token.length < 20 || token.length > 8000) throw new SmsProviderError("INVALID_OTP")

  // MSG91's verifyAccessToken endpoint accepts authkey and access-token in
  // a JSON body. A live VPS probe confirms form-encoded data is ignored by
  // this endpoint, while JSON reaches token validation.
  const response = await fetch("https://control.msg91.com/api/v5/widget/verifyAccessToken", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      authkey: smsConfig.msg91.authKey,
      "access-token": token
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000)
  })

  const payload = await response.json().catch(() => null)
  const identifier = verifiedIdentifier(payload)
  const providerRejected = explicitProviderFailure(payload)

  if (!response.ok || providerRejected || !identifier) {
    console.error("msg91-password-reset-token", {
      status: response.status,
      providerRejected,
      identifierPresent: Boolean(identifier),
      provider: providerFailureMeta(payload)
    })
    throw new SmsProviderError(response.status >= 500 ? "SMS_PROVIDER_UNAVAILABLE" : "INVALID_OTP")
  }

  return { identifier }
}
