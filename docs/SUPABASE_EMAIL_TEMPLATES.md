# Supabase Email Templates for Procurement Radar SA

## Setup Instructions

1. Go to your Supabase Dashboard → Authentication → Email Templates
2. For each template below, copy the HTML into the corresponding template section
3. Make sure to enable "Custom SMTP" for production emails (Settings → Auth → SMTP Settings)

---

## 1. Confirm Signup (OTP Code)

**Subject:** `Your Procurement Radar SA verification code: {{ .Token }}`

**Message Body (HTML):**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px 40px; text-align: center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: rgba(255,255,255,0.2); border-radius: 12px; padding: 12px;">
                    <img src="https://api.iconify.design/lucide:radar.svg?color=white" alt="Radar" width="28" height="28" style="display: block;">
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="color: #ffffff; font-size: 20px; font-weight: 700;">Procurement Radar SA</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #18181b; text-align: center;">
                Verify your email address
              </h1>
              <p style="margin: 0 0 32px; font-size: 15px; line-height: 24px; color: #52525b; text-align: center;">
                Thanks for signing up! Enter this verification code to complete your registration:
              </p>
              
              <!-- OTP Code Box -->
              <div style="background-color: #f4f4f5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
                <p style="margin: 0 0 8px; font-size: 13px; color: #71717a; text-transform: uppercase; letter-spacing: 1px;">
                  Your verification code
                </p>
                <p style="margin: 0; font-size: 36px; font-weight: 700; color: #2563eb; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                  {{ .Token }}
                </p>
              </div>
              
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #71717a; text-align: center;">
                This code will expire in <strong>1 hour</strong>.
              </p>
              
              <p style="margin: 0; font-size: 14px; line-height: 22px; color: #71717a; text-align: center;">
                If you didn't create an account with Procurement Radar SA, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <hr style="margin: 0; border: none; border-top: 1px solid #e4e4e7;">
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 32px;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #a1a1aa; text-align: center;">
                This email was sent by Procurement Radar SA
              </p>
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                South Africa's Premier Government Tender Monitoring Platform
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Magic Link / Confirm Email (Alternative)

**Subject:** `Confirm your Procurement Radar SA account`

**Message Body (HTML):**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm your account</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px 40px; text-align: center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: rgba(255,255,255,0.2); border-radius: 12px; padding: 12px;">
                    <img src="https://api.iconify.design/lucide:radar.svg?color=white" alt="Radar" width="28" height="28" style="display: block;">
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="color: #ffffff; font-size: 20px; font-weight: 700;">Procurement Radar SA</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #18181b; text-align: center;">
                Welcome to Procurement Radar SA!
              </h1>
              <p style="margin: 0 0 32px; font-size: 15px; line-height: 24px; color: #52525b; text-align: center;">
                Click the button below to confirm your email address and activate your account.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 32px;">
                <tr>
                  <td style="background-color: #2563eb; border-radius: 8px;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      Confirm Email Address
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #71717a; text-align: center;">
                This link will expire in <strong>24 hours</strong>.
              </p>
              
              <p style="margin: 0 0 24px; font-size: 13px; line-height: 20px; color: #a1a1aa; text-align: center;">
                Or copy and paste this URL into your browser:
              </p>
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #2563eb; text-align: center; word-break: break-all;">
                {{ .ConfirmationURL }}
              </p>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <hr style="margin: 0; border: none; border-top: 1px solid #e4e4e7;">
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 32px;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #a1a1aa; text-align: center;">
                If you didn't create an account, please ignore this email.
              </p>
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                © 2024 Procurement Radar SA. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 3. Password Reset

**Subject:** `Reset your Procurement Radar SA password`

**Message Body (HTML):**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px 40px; text-align: center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: rgba(255,255,255,0.2); border-radius: 12px; padding: 12px;">
                    <img src="https://api.iconify.design/lucide:radar.svg?color=white" alt="Radar" width="28" height="28" style="display: block;">
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="color: #ffffff; font-size: 20px; font-weight: 700;">Procurement Radar SA</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; background-color: #fef3c7; border-radius: 50%; padding: 16px;">
                  <img src="https://api.iconify.design/lucide:key-round.svg?color=%23d97706" alt="Key" width="32" height="32" style="display: block;">
                </div>
              </div>
              
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #18181b; text-align: center;">
                Reset your password
              </h1>
              <p style="margin: 0 0 32px; font-size: 15px; line-height: 24px; color: #52525b; text-align: center;">
                We received a request to reset your password. Click the button below to choose a new password.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 32px;">
                <tr>
                  <td style="background-color: #2563eb; border-radius: 8px;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #71717a; text-align: center;">
                This link will expire in <strong>1 hour</strong>.
              </p>
              
              <div style="background-color: #fef2f2; border-radius: 8px; padding: 16px; margin-top: 24px;">
                <p style="margin: 0; font-size: 13px; line-height: 20px; color: #991b1b; text-align: center;">
                  ⚠️ If you didn't request this password reset, please ignore this email or contact support if you're concerned about your account security.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <hr style="margin: 0; border: none; border-top: 1px solid #e4e4e7;">
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 32px;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #a1a1aa; text-align: center;">
                This email was sent by Procurement Radar SA
              </p>
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                © 2024 Procurement Radar SA. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 4. Invite User

**Subject:** `You've been invited to Procurement Radar SA`

**Message Body (HTML):**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px 40px; text-align: center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: rgba(255,255,255,0.2); border-radius: 12px; padding: 12px;">
                    <img src="https://api.iconify.design/lucide:radar.svg?color=white" alt="Radar" width="28" height="28" style="display: block;">
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="color: #ffffff; font-size: 20px; font-weight: 700;">Procurement Radar SA</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; background-color: #dbeafe; border-radius: 50%; padding: 16px;">
                  <img src="https://api.iconify.design/lucide:user-plus.svg?color=%232563eb" alt="Invite" width="32" height="32" style="display: block;">
                </div>
              </div>
              
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #18181b; text-align: center;">
                You're invited!
              </h1>
              <p style="margin: 0 0 32px; font-size: 15px; line-height: 24px; color: #52525b; text-align: center;">
                You've been invited to join Procurement Radar SA, South Africa's premier government tender monitoring platform.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 32px;">
                <tr>
                  <td style="background-color: #2563eb; border-radius: 8px;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Features -->
              <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #18181b;">What you'll get access to:</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
                  <tr>
                    <td style="padding: 4px 0; font-size: 13px; color: #52525b;">✓ Real-time tender alerts</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; font-size: 13px; color: #52525b;">✓ AI-powered categorization</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; font-size: 13px; color: #52525b;">✓ Government portal monitoring</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; font-size: 13px; color: #52525b;">✓ Daily digest summaries</td>
                  </tr>
                </table>
              </div>
              
              <p style="margin: 0; font-size: 14px; line-height: 22px; color: #71717a; text-align: center;">
                This invitation will expire in <strong>7 days</strong>.
              </p>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <hr style="margin: 0; border: none; border-top: 1px solid #e4e4e7;">
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 32px;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #a1a1aa; text-align: center;">
                If you weren't expecting this invitation, you can ignore this email.
              </p>
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                © 2024 Procurement Radar SA. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 5. Email Change Confirmation

**Subject:** `Confirm your new email for Procurement Radar SA`

**Message Body (HTML):**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm email change</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px 40px; text-align: center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: rgba(255,255,255,0.2); border-radius: 12px; padding: 12px;">
                    <img src="https://api.iconify.design/lucide:radar.svg?color=white" alt="Radar" width="28" height="28" style="display: block;">
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="color: #ffffff; font-size: 20px; font-weight: 700;">Procurement Radar SA</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; background-color: #dcfce7; border-radius: 50%; padding: 16px;">
                  <img src="https://api.iconify.design/lucide:mail-check.svg?color=%2316a34a" alt="Email" width="32" height="32" style="display: block;">
                </div>
              </div>
              
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #18181b; text-align: center;">
                Confirm your new email
              </h1>
              <p style="margin: 0 0 32px; font-size: 15px; line-height: 24px; color: #52525b; text-align: center;">
                Click the button below to confirm your new email address for your Procurement Radar SA account.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 32px;">
                <tr>
                  <td style="background-color: #2563eb; border-radius: 8px;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      Confirm New Email
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; font-size: 14px; line-height: 22px; color: #71717a; text-align: center;">
                This link will expire in <strong>24 hours</strong>.
              </p>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <hr style="margin: 0; border: none; border-top: 1px solid #e4e4e7;">
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 32px;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #a1a1aa; text-align: center;">
                If you didn't request this change, please ignore this email or contact support.
              </p>
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                © 2024 Procurement Radar SA. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Supabase Auth Settings

To enable OTP (6-digit code) verification, go to **Authentication → Settings** and configure:

1. **Enable email confirmations**: ON
2. **Secure email change**: ON  
3. **Double confirm email changes**: ON

### For OTP Codes (instead of magic links):

In **Authentication → Email Templates → Confirm signup**, change the template type to use `{{ .Token }}` variable which gives you the 6-digit OTP code.

### SMTP Configuration (Recommended for Production)

Go to **Settings → Auth → SMTP Settings** and configure your email provider:

- **Resend**: `smtp.resend.com`, Port 465, Use your API key
- **SendGrid**: `smtp.sendgrid.net`, Port 587
- **Mailgun**: `smtp.mailgun.org`, Port 587
- **Custom SMTP**: Your own mail server

This ensures better deliverability and allows sending from your own domain (e.g., `noreply@procurementradar.co.za`).
