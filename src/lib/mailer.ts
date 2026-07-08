import nodemailer from 'nodemailer'
import QRCode from 'qrcode'
import { decryptSecret } from './crypto'

interface SendWinnerEmailParams {
  to: string
  winnerName: string | null
  prizeName: string
  partnerName: string
  senderEmail: string
  senderEmailPassword: string // encrypted
  confirmationCode: string // short reference the partner's staff can look up at pickup
  voucherUrl: string // scanning the QR opens this page, showing the voucher
}

// Sends the "you won" notification from the winning partner/agency's own Gmail account.
// Never throws — a failed send must not break the spin/draw flow, so callers should
// still wrap this in try/catch and only log on failure.
export async function sendWinnerEmail({
  to,
  winnerName,
  prizeName,
  partnerName,
  senderEmail,
  senderEmailPassword,
  confirmationCode,
  voucherUrl,
}: SendWinnerEmailParams): Promise<void> {
  const password = decryptSecret(senderEmailPassword)

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: senderEmail,
      pass: password,
    },
  })

  const greeting = winnerName ? `Bonjour ${winnerName}` : 'Bonjour'

  // Scanning the QR opens the winner's own voucher page (name, email, prize, code).
  const qrPngBuffer = await QRCode.toBuffer(voucherUrl, {
    width: 220,
    margin: 1,
    color: { dark: '#241F1C', light: '#FFFFFF' },
  })

  const text = [
    `${greeting},`,
    '',
    `Félicitations, vous avez remporté : ${prizeName}`,
    `Offert par ${partnerName}.`,
    '',
    `Votre code de confirmation : ${confirmationCode}`,
    `Consultez votre bon d'achat ici : ${voucherUrl}`,
    'Présentez ce lien (ou le QR code joint) lors de la remise de votre lot.',
    '',
    partnerName,
  ].join('\n')

  await transporter.sendMail({
    from: `"${partnerName}" <${senderEmail}>`,
    to,
    replyTo: senderEmail,
    subject: `Vous avez gagné : ${prizeName}`,
    text,
    html: `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7; padding:32px 16px; font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #eceff1;">
        <tr>
          <td style="background:#FF6B47; padding:28px 32px; text-align:center;">
            <div style="font-size:32px; line-height:1;">🏆</div>
            <div style="color:#ffffff; font-weight:800; font-size:20px; margin-top:8px;">Félicitations !</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 8px 32px; color:#241f1c; font-size:14px;">
            <p style="margin:0 0 12px 0;">${greeting},</p>
            <p style="margin:0 0 16px 0;">Vous venez de remporter :</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF7ED; border:1px solid #FFE3BF; border-radius:12px;">
              <tr>
                <td style="padding:16px 20px; text-align:center; font-weight:800; font-size:15px; color:#241f1c;">
                  🎁 ${prizeName}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 8px 32px; text-align:center;">
            <img src="cid:winnerqr" width="180" height="180" alt="QR code du bon d'achat" style="display:inline-block; border:1px solid #eceff1; border-radius:12px; padding:8px;" />
            <p style="margin:12px 0 0 0; font-size:12px; color:#6b7280;">Scannez pour voir votre bon d'achat</p>
            <p style="margin:4px 0 0 0; font-size:13px; font-weight:700; letter-spacing:0.5px; color:#241f1c;">${confirmationCode}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 8px 32px; text-align:center;">
            <a href="${voucherUrl}" style="display:inline-block; background:#FF6B47; color:#ffffff; text-decoration:none; font-weight:700; font-size:13px; padding:12px 24px; border-radius:10px;">
              Voir mon bon d'achat
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 28px 32px; text-align:center; font-size:12px; color:#9ca3af;">
            Offert par ${partnerName}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
    attachments: [
      {
        filename: 'qrcode.png',
        content: qrPngBuffer,
        cid: 'winnerqr',
      },
    ],
  })
}
