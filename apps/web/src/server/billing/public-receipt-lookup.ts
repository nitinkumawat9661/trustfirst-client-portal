import {
  CommercialDocumentStatus,
  CommercialDocumentType,
  type PrismaClient,
} from "@trustfirst/database";
import { MANGALAM_TENANT_SLUG } from "../domain/host-routing";

export type PublicReceiptLookupResult = {
  amountCents: number;
  currency: string;
  invoiceNumber: string;
  invoiceStatus: string;
  invoiceTitle: string;
  paidAmountCents: number;
  paymentMode: string;
  paymentReference: string | null;
  receiptNumber: string;
  receivedAt: Date;
  totalAmountCents: number;
};

export async function findPublicMangalamReceipt(
  prisma: PrismaClient,
  rawDocumentNumber: string,
): Promise<PublicReceiptLookupResult | null> {
  const documentNumber = rawDocumentNumber.trim();

  if (!documentNumber) {
    return null;
  }

  const receipt = await prisma.commercialDocument.findFirst({
    select: {
      documentNumber: true,
      receiptPayments: {
        orderBy: {
          receivedAt: "desc",
        },
        select: {
          amountCents: true,
          mode: true,
          receivedAt: true,
          reference: true,
          invoice: {
            select: {
              currency: true,
              invoiceNumber: true,
              paidAmountCents: true,
              status: true,
              title: true,
              totalAmountCents: true,
            },
          },
        },
        take: 1,
      },
    },
    where: {
      documentNumber,
      status: CommercialDocumentStatus.APPROVED,
      tenant: {
        slug: MANGALAM_TENANT_SLUG,
      },
      type: CommercialDocumentType.RECEIPT,
    },
  });

  const payment = receipt?.receiptPayments[0];

  if (!receipt || !payment) {
    return null;
  }

  return {
    amountCents: payment.amountCents,
    currency: payment.invoice.currency,
    invoiceNumber: payment.invoice.invoiceNumber,
    invoiceStatus: payment.invoice.status,
    invoiceTitle: payment.invoice.title,
    paidAmountCents: payment.invoice.paidAmountCents,
    paymentMode: payment.mode,
    paymentReference: payment.reference,
    receiptNumber: receipt.documentNumber,
    receivedAt: payment.receivedAt,
    totalAmountCents: payment.invoice.totalAmountCents,
  };
}