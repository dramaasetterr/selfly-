import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("Missing required environment variable: RESEND_API_KEY");
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM = "Chiavi <notifications@chiavi.com>";

/* ------------------------------------------------------------------ */
/*  Shared HTML wrapper                                                */
/* ------------------------------------------------------------------ */
function wrap(body: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background-color:#FAF8F5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF8F5;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1B2A4A;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:700;color:#C9A96E;letter-spacing:1px;">Chiavi</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #E8E0D4;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#8A8A8A;">
                &copy; 2026 Chiavi. All rights reserved.
              </p>
              <p style="margin:0;font-size:12px;color:#8A8A8A;">
                <a href="https://chiavi.com/privacy" style="color:#C9A96E;text-decoration:none;">Privacy Policy</a>
                &nbsp;&middot;&nbsp;
                <a href="https://chiavi.com/terms" style="color:#C9A96E;text-decoration:none;">Terms of Service</a>
                &nbsp;&middot;&nbsp;
                <a href="https://chiavi.com/unsubscribe" style="color:#C9A96E;text-decoration:none;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

/* ------------------------------------------------------------------ */
/*  Utility: gold CTA button                                           */
/* ------------------------------------------------------------------ */
function ctaButton(label: string, href: string): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 0;">
  <tr>
    <td style="background-color:#C9A96E;border-radius:8px;">
      <a href="${href}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#1B2A4A;text-decoration:none;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
        ${label}
      </a>
    </td>
  </tr>
</table>`;
}

/* ------------------------------------------------------------------ */
/*  Welcome Email                                                      */
/* ------------------------------------------------------------------ */
export async function sendWelcomeEmail(to: string, name: string) {
  const firstName = name.split(" ")[0] || "there";
  const html = wrap(`
    <h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1B2A4A;">
      Welcome to Chiavi, ${firstName}!
    </h2>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3D4F6F;">
      You've taken the first step toward selling your home on your own terms — and keeping
      thousands more at closing. Here's how to get started:
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0;">
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #F0EBE3;">
          <strong style="color:#C9A96E;font-size:16px;">1.</strong>
          <span style="margin-left:8px;font-size:15px;color:#1B2A4A;">Get your AI pricing analysis</span>
          <p style="margin:4px 0 0 26px;font-size:13px;color:#6B7A94;">Enter your property details and receive a data-driven price recommendation in seconds.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #F0EBE3;">
          <strong style="color:#C9A96E;font-size:16px;">2.</strong>
          <span style="margin-left:8px;font-size:15px;color:#1B2A4A;">Create your listing</span>
          <p style="margin:4px 0 0 26px;font-size:13px;color:#6B7A94;">Our AI writes a compelling description, and we'll guide you through photos and prep.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;">
          <strong style="color:#C9A96E;font-size:16px;">3.</strong>
          <span style="margin-left:8px;font-size:15px;color:#1B2A4A;">Manage showings & offers</span>
          <p style="margin:4px 0 0 26px;font-size:13px;color:#6B7A94;">Schedule showings, receive offers, and use our Offer Analyzer to pick the best deal.</p>
        </td>
      </tr>
    </table>
    ${ctaButton("Go to Your Dashboard", "https://chiavi.com/dashboard")}
    <p style="margin:28px 0 0;font-size:13px;color:#8A8A8A;text-align:center;">
      Questions? Reply to this email or reach us at support@chiavi.com.
    </p>
  `);

  return getResend().emails.send({
    from: FROM,
    to,
    subject: `Welcome to Chiavi, ${firstName}!`,
    html,
  });
}

/* ------------------------------------------------------------------ */
/*  New Offer Email                                                    */
/* ------------------------------------------------------------------ */
export async function sendNewOfferEmail(
  to: string,
  sellerName: string,
  buyerName: string,
  offerPrice: number,
  address: string,
) {
  const firstName = sellerName.split(" ")[0] || "there";
  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(offerPrice);

  const html = wrap(`
    <h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1B2A4A;">
      New Offer Received!
    </h2>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3D4F6F;">
      Hi ${firstName}, great news — you've received a new offer on your property.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#FAF8F5;border-radius:8px;border:1px solid #E8E0D4;">
      <tr>
        <td style="padding:24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding:8px 0;">
                <span style="font-size:13px;color:#6B7A94;">Property</span><br/>
                <span style="font-size:15px;font-weight:600;color:#1B2A4A;">${address}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-top:1px solid #E8E0D4;">
                <span style="font-size:13px;color:#6B7A94;">Offer From</span><br/>
                <span style="font-size:15px;font-weight:600;color:#1B2A4A;">${buyerName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-top:1px solid #E8E0D4;">
                <span style="font-size:13px;color:#6B7A94;">Offer Amount</span><br/>
                <span style="font-size:22px;font-weight:700;color:#C9A96E;font-family:Georgia,'Times New Roman',serif;">${formattedPrice}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    ${ctaButton("Review This Offer", "https://chiavi.com/dashboard")}
    <p style="margin:28px 0 0;font-size:13px;color:#8A8A8A;text-align:center;">
      Log in to view full offer details, run the Offer Analyzer, and respond.
    </p>
  `);

  return getResend().emails.send({
    from: FROM,
    to,
    subject: `New offer on ${address}: ${formattedPrice}`,
    html,
  });
}

/* ------------------------------------------------------------------ */
/*  New Message Email                                                  */
/* ------------------------------------------------------------------ */
export async function sendNewMessageEmail(
  to: string,
  sellerName: string,
  senderName: string,
  address: string,
) {
  const firstName = sellerName.split(" ")[0] || "there";

  const html = wrap(`
    <h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1B2A4A;">
      New Message
    </h2>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3D4F6F;">
      Hi ${firstName}, you have a new message from <strong>${senderName}</strong>
      regarding your listing at <strong>${address}</strong>.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#FAF8F5;border-radius:8px;border:1px solid #E8E0D4;">
      <tr>
        <td style="padding:20px;text-align:center;">
          <p style="margin:0;font-size:14px;color:#6B7A94;">
            Log in to read and reply to this message.
          </p>
        </td>
      </tr>
    </table>
    ${ctaButton("View Message", "https://chiavi.com/dashboard")}
    <p style="margin:28px 0 0;font-size:13px;color:#8A8A8A;text-align:center;">
      Quick responses lead to faster sales. Don't keep them waiting!
    </p>
  `);

  return getResend().emails.send({
    from: FROM,
    to,
    subject: `New message from ${senderName} about ${address}`,
    html,
  });
}

/* ------------------------------------------------------------------ */
/*  Listing Published Email                                            */
/* ------------------------------------------------------------------ */
export async function sendListingPublishedEmail(
  to: string,
  name: string,
  address: string,
) {
  const firstName = name.split(" ")[0] || "there";

  const html = wrap(`
    <h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1B2A4A;">
      Your Listing Is Live!
    </h2>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3D4F6F;">
      Congratulations, ${firstName}! Your property at <strong>${address}</strong>
      is now published and visible to potential buyers.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#FAF8F5;border-radius:8px;border:1px solid #E8E0D4;">
      <tr>
        <td style="padding:24px;">
          <h3 style="margin:0 0 12px;font-size:16px;color:#1B2A4A;font-family:Georgia,'Times New Roman',serif;">What's next?</h3>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding:8px 0;">
                <span style="color:#C9A96E;font-weight:700;">&#10003;</span>
                <span style="margin-left:8px;font-size:14px;color:#3D4F6F;">Share your listing on social media and with friends</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;">
                <span style="color:#C9A96E;font-weight:700;">&#10003;</span>
                <span style="margin-left:8px;font-size:14px;color:#3D4F6F;">Follow our syndication guide to post on Zillow and Realtor.com</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;">
                <span style="color:#C9A96E;font-weight:700;">&#10003;</span>
                <span style="margin-left:8px;font-size:14px;color:#3D4F6F;">Set up your showing schedule so buyers can book visits</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;">
                <span style="color:#C9A96E;font-weight:700;">&#10003;</span>
                <span style="margin-left:8px;font-size:14px;color:#3D4F6F;">Keep an eye on your dashboard for offers and messages</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    ${ctaButton("View Your Listing", "https://chiavi.com/dashboard")}
    <p style="margin:28px 0 0;font-size:13px;color:#8A8A8A;text-align:center;">
      We'll notify you when you receive inquiries, showing requests, or offers.
    </p>
  `);

  return getResend().emails.send({
    from: FROM,
    to,
    subject: `Your listing at ${address} is now live!`,
    html,
  });
}
