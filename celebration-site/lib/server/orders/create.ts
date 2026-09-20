import type { PoolClient } from "pg"
import { createHash, randomUUID } from "node:crypto"
import { orderEvents } from "../../../config/order-events"
import { orderConfig } from "../../../config/order"
import { securityConfig } from "../../../config/security"
import { validation } from "../../../config/validation"
import type { NormalizedOrder } from "../../domain/order"
import { createTrackingToken, trackingTokenHash } from "../../security/tokens"
import { transaction } from "../db"
import { createPublicOrderId } from "../order-id"
import { appendOrderEvent } from "./events"

async function insertOrder(client: PoolClient, input: NormalizedOrder, customerAccountId: string) {
  const internalId = randomUUID()
  const publicId = createPublicOrderId()
  const trackingToken = createTrackingToken(input.idempotencyKey)
  const trackingHash = trackingTokenHash(trackingToken)
  const expiresAt = new Date(Date.now() + validation.trackingTokenTtlSeconds * 1000)
  const paymentReferenceHash = createHash(securityConfig.hashAlgorithm).update(input.paymentReference).digest("hex")

  const inserted = await client.query<{ id: string }>(
    `INSERT INTO orders (
      id, public_id, idempotency_key, tracking_token_hash, tracking_expires_at,
      tier_id, tier_name, amount_paise, selected_product_ids,
      required_date, occasion, customer_name, phone, receiver_name,
      address, city, state, pincode, gift_message,
      payment_reference, payment_reference_hash, payment_status,
      status, policy_version, customer_account_id
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25
    )
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id`,
    [
      internalId,
      publicId,
      input.idempotencyKey,
      trackingHash,
      expiresAt,
      input.tierId,
      input.tierName,
      input.amountPaise,
      input.selectedProductIds,
      input.requiredDate,
      input.occasion,
      input.customerName,
      input.phone,
      input.receiverName,
      input.address,
      input.city,
      input.state,
      input.pincode,
      input.message,
      input.paymentReference,
      paymentReferenceHash,
      orderConfig.initialPaymentStatus,
      orderConfig.initialStatus,
      input.policyVersion,
      customerAccountId
    ]
  )

  if (!inserted.rowCount) {
    const existing = await client.query<{ public_id: string; customer_account_id: string | null }>(
      `SELECT public_id, customer_account_id FROM orders WHERE idempotency_key = $1`,
      [input.idempotencyKey]
    )
    if (!existing.rows[0]) throw new Error("IDEMPOTENCY_LOOKUP_FAILED")
    if (existing.rows[0].customer_account_id !== customerAccountId) throw new Error("IDEMPOTENCY_OWNER_MISMATCH")
    return { publicId: existing.rows[0].public_id, trackingToken }
  }

  await appendOrderEvent(client, internalId, orderEvents.created, { status: orderConfig.initialStatus, customerAccountId })
  return { publicId, trackingToken }
}

export function createOrder(input: NormalizedOrder, customerAccountId: string) {
  return transaction((client) => insertOrder(client, input, customerAccountId))
}
