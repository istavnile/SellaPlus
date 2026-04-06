import { Transaction, TransactionItem, Payment } from '@prisma/client';

interface ReceiptData {
  transaction: Transaction & {
    items: TransactionItem[];
    payments: Payment[];
    cashier?: { name: string } | null;
  };
  tenantName: string;
  tenantAddress?: string | null;
  tenantPhone?: string | null;
  receiptHeader?: string | null;
  receiptFooter?: string | null;
  /** Set to true when logo is embedded as CID attachment (cid:receipt_logo) */
  hasLogo?: boolean;
}

function fmtMethod(method: string): string {
  const map: Record<string, string> = {
    CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia',
  };
  return map[method] ?? method;
}

export function generateReceiptHtml(data: ReceiptData): string {
  const { transaction, tenantName, tenantAddress, tenantPhone, receiptHeader, receiptFooter, hasLogo } = data;

  const date = new Date(transaction.createdAt).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

  const currency = 'S/';

  const itemRows = transaction.items.map((item) => `
    <tr>
      <td style="padding:8px 0;font-size:14px;color:#111827;border-bottom:1px solid #f3f4f6;">
        ${item.productName}${item.variantLabel ? ` <span style="color:#6b7280;font-size:12px;">(${item.variantLabel})</span>` : ''}
        <br><span style="font-size:12px;color:#9ca3af;">${Number(item.quantity)} × ${currency}${Number(item.unitPrice).toFixed(2)}</span>
      </td>
      <td style="padding:8px 0;font-size:14px;font-weight:600;color:#111827;text-align:right;border-bottom:1px solid #f3f4f6;white-space:nowrap;">
        ${currency}${Number(item.lineTotal).toFixed(2)}
      </td>
    </tr>
  `).join('');

  const paymentRows = transaction.payments.map((p) => `
    <tr>
      <td style="font-size:13px;color:#6b7280;padding:3px 0;">${p.gatewayName || fmtMethod(p.method)}</td>
      <td style="font-size:13px;color:#6b7280;text-align:right;padding:3px 0;">${currency}${Number(p.amount).toFixed(2)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Recibo</title></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6;padding:32px 16px;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

        <!-- HEADER -->
        <tr>
          <td style="padding:32px 24px;text-align:center;border-bottom:2px dashed #e5e7eb;">
            ${hasLogo
              ? `<img src="cid:receipt_logo" alt="${tenantName}" style="max-width:160px;max-height:80px;width:auto;height:auto;display:block;margin:0 auto 16px;">`
              : ''}
            <p style="margin:0;font-size:20px;font-weight:700;color:#111827;">${tenantName}</p>
            ${tenantAddress ? `<p style="margin:4px 0 0;font-size:13px;color:#9ca3af;">${tenantAddress}</p>` : ''}
            ${tenantPhone ? `<p style="margin:2px 0 0;font-size:13px;color:#9ca3af;">${tenantPhone}</p>` : ''}
            ${receiptHeader ? `<p style="margin:12px 0 0;font-size:13px;color:#6b7280;">${receiptHeader}</p>` : ''}
          </td>
        </tr>

        <!-- TOTAL -->
        <tr>
          <td style="padding:28px 24px;text-align:center;border-bottom:2px dashed #e5e7eb;">
            <p style="margin:0;font-size:52px;font-weight:700;color:#111827;letter-spacing:-1px;">${currency}${Number(transaction.total).toFixed(2)}</p>
            <p style="margin:6px 0 0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;">Total</p>
          </td>
        </tr>

        <!-- META (empleado, TPV) -->
        <tr>
          <td style="padding:16px 24px;border-bottom:2px dashed #e5e7eb;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:13px;color:#6b7280;padding:3px 0;"><strong style="color:#111827;">Empleado:</strong> ${transaction.cashier?.name ?? 'Sistema'}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#6b7280;padding:3px 0;"><strong style="color:#111827;">Nº de operación:</strong> ${transaction.transactionNumber}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#6b7280;padding:3px 0;"><strong style="color:#111827;">Fecha:</strong> ${date}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ITEMS -->
        <tr>
          <td style="padding:20px 24px;border-bottom:2px dashed #e5e7eb;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${itemRows}
            </table>
          </td>
        </tr>

        <!-- TOTALS & PAYMENTS -->
        <tr>
          <td style="padding:20px 24px;background-color:#fafafa;border-bottom:2px dashed #e5e7eb;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td colspan="2" style="padding-bottom:8px;border-bottom:1px solid #e5e7eb;margin-bottom:8px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size:15px;font-weight:700;color:#111827;padding-bottom:8px;">Total</td>
                      <td style="font-size:15px;font-weight:700;color:#111827;text-align:right;padding-bottom:8px;">${currency}${Number(transaction.total).toFixed(2)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr><td colspan="2" style="padding-top:8px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${paymentRows}
                </table>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:24px;text-align:center;">
            <p style="margin:0;font-size:14px;color:#6b7280;">¡Gracias por tu compra!</p>
            ${receiptFooter ? `<p style="margin:8px 0 0;font-size:13px;color:#9ca3af;">${receiptFooter}</p>` : ''}
          </td>
        </tr>

        <!-- BRAND -->
        <tr>
          <td style="padding:12px 24px;text-align:center;background-color:#f9fafb;border-top:1px solid #f3f4f6;">
            <p style="margin:0;font-size:11px;color:#d1d5db;">Powered by <strong style="color:#8b5cf6;">SellaPlus</strong></p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
