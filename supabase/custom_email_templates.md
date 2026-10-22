# GrocerySync Custom Brevo SMTP & Email Templates Guide

This guide contains everything you need to connect your **Brevo SMTP** to Supabase and customize your email templates so they have **GrocerySync branding with NO mention of Supabase**.

---

## 🛠️ Step 1: Configure Custom SMTP in Supabase

1. Open your **[Supabase Dashboard](https://supabase.com/dashboard)**.
2. Select your project: **`wntwhnprhmvqrhutziyt`**.
3. In the left navigation, go to **Project Settings** (gear icon at bottom-left) $\rightarrow$ **Authentication** $\rightarrow$ scroll down to **SMTP Settings** (or go to **Authentication** $\rightarrow$ **Email Templates / SMTP** depending on dashboard version).
4. Turn **ON** the toggle: **Enable Custom SMTP**.
5. Fill in the following fields:

| Setting | Value to Enter |
|---|---|
| **Sender Email** | `naveenofficial210@gmail.com` *(your verified Brevo sender)* |
| **Sender Name** | `GrocerySync` |
| **Host** | `smtp-relay.brevo.com` |
| **Port** | `587` |
| **Minimum Interval Between Emails** | `60` *(or `0`)* |
| **Username** | `bf73c8001@smtp-brevo.com` |
| **Password** | `xkeysib-680847... (Your Brevo API Key)` |

6. Click **Save Changes** at the bottom.

> [!NOTE]
> If Brevo prompts you about authorized IP addresses, make sure your IP or authorized IPs are active in [Brevo Security Settings](https://app.brevo.com/security/authorised_ips).

---

## ✉️ Step 2: Custom "Confirm Signup" (Create Account) Template

In Supabase Dashboard $\rightarrow$ **Authentication** $\rightarrow$ **Email Templates** $\rightarrow$ select **Confirm signup**:

### Subject:
```
Confirm your GrocerySync account 🛒
```

### Body (HTML):
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Account</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #18181b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 20px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); overflow: hidden; border: 1px solid #e4e4e7;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px 30px; text-align: center;">
              <div style="font-size: 36px; line-height: 1; margin-bottom: 8px;">🛒</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">GrocerySync</h1>
              <p style="margin: 6px 0 0 0; color: #d1fae5; font-size: 13px; font-weight: 500;">Shared grocery lists for homes & groups</p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="margin: 0 0 12px 0; color: #09090b; font-size: 18px; font-weight: 700;">Welcome aboard! 👋</h2>
              <p style="margin: 0 0 20px 0; color: #52525b; font-size: 14px; line-height: 1.6;">
                Thank you for creating an account with <strong>GrocerySync</strong>. Please verify your email address to activate your account and start sharing grocery lists with your group.
              </p>

              <!-- Action Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; background-color: #10b981; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35);">
                  Verify Email Address →
                </a>
              </div>

              <p style="margin: 25px 0 0 0; color: #71717a; font-size: 12px; line-height: 1.5; border-top: 1px solid #f4f4f5; padding-top: 18px;">
                If the button above does not work, copy and paste this link into your browser:<br>
                <a href="{{ .ConfirmationURL }}" style="color: #059669; word-break: break-all; font-size: 11px;">{{ .ConfirmationURL }}</a>
              </p>

              <p style="margin: 15px 0 0 0; color: #a1a1aa; font-size: 11px;">
                If you did not request this account creation, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 18px 30px; text-align: center; border-top: 1px solid #f4f4f5;">
              <p style="margin: 0; color: #a1a1aa; font-size: 11px;">
                © 2026 GrocerySync · Smart collaborative grocery lists
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

## 🔑 Step 3: Custom "Reset Password" Template

In Supabase Dashboard $\rightarrow$ **Authentication** $\rightarrow$ **Email Templates** $\rightarrow$ select **Reset password**:

### Subject:
```
Reset your GrocerySync password 🔐
```

### Body (HTML):
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #18181b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 20px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); overflow: hidden; border: 1px solid #e4e4e7;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px 30px; text-align: center;">
              <div style="font-size: 36px; line-height: 1; margin-bottom: 8px;">🔐</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">GrocerySync</h1>
              <p style="margin: 6px 0 0 0; color: #d1fae5; font-size: 13px; font-weight: 500;">Security & Password Reset</p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="margin: 0 0 12px 0; color: #09090b; font-size: 18px; font-weight: 700;">Password Reset Request</h2>
              <p style="margin: 0 0 20px 0; color: #52525b; font-size: 14px; line-height: 1.6;">
                We received a request to reset the password for your <strong>GrocerySync</strong> account. Tap the button below to choose a new password.
              </p>

              <!-- Action Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; background-color: #10b981; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35);">
                  Reset Password Now →
                </a>
              </div>

              <p style="margin: 25px 0 0 0; color: #71717a; font-size: 12px; line-height: 1.5; border-top: 1px solid #f4f4f5; padding-top: 18px;">
                If the button above does not work, copy and paste this link into your browser:<br>
                <a href="{{ .ConfirmationURL }}" style="color: #059669; word-break: break-all; font-size: 11px;">{{ .ConfirmationURL }}</a>
              </p>

              <div style="margin: 20px 0 0 0; padding: 12px 14px; background-color: #fffbeb; border-radius: 10px; border: 1px solid #fef3c7;">
                <p style="margin: 0; color: #92400e; font-size: 11px; line-height: 1.5;">
                  <strong>Note:</strong> For your security, this password reset link is only valid for a limited time. If you did not make this request, you can safely ignore this email and your password will remain unchanged.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 18px 30px; text-align: center; border-top: 1px solid #f4f4f5;">
              <p style="margin: 0; color: #a1a1aa; font-size: 11px;">
                © 2026 GrocerySync · Smart collaborative grocery lists
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
