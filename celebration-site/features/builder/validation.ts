import { validation } from "../../config/validation"
import { errorMessages } from "../../lib/domain/content"
import { digitsOnly } from "../../lib/validation/text"
import type { CheckoutData } from "./types"

export function validateCheckoutDetails(checkout: CheckoutData) {
  if (checkout.customerName.trim().length < validation.name.min) return errorMessages.DETAILS_CUSTOMER_NAME_REQUIRED

  const phone = digitsOnly(checkout.phone)
  if (phone.length < validation.phone.minDigits || phone.length > validation.phone.maxDigits) {
    return errorMessages.DETAILS_PHONE_INVALID
  }

  if (checkout.receiverName.trim().length < validation.name.min) return errorMessages.DETAILS_RECEIVER_NAME_REQUIRED
  if (!checkout.requiredDate.trim()) return errorMessages.DETAILS_REQUIRED_DATE_REQUIRED
  if (digitsOnly(checkout.pincode).length !== validation.pincodeDigits) return errorMessages.DETAILS_PINCODE_INVALID
  if (checkout.address.trim().length < validation.address.min) return errorMessages.DETAILS_ADDRESS_REQUIRED

  return ""
}

export function validatePaymentReference(value: string) {
  const reference = value.trim()
  const validLength = reference.length >= validation.paymentReference.min && reference.length <= validation.paymentReference.max
  const validCharacters = /^[0-9A-Za-z-]+$/.test(reference)
  return validLength && validCharacters ? "" : errorMessages.INVALID_PAYMENT_REFERENCE
}
