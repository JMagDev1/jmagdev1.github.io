# EmailJS Setup Guide

This guide will help you set up EmailJS to send emails from your contact form without needing a server.

## Step 1: Create EmailJS Account

1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Click "Sign Up" and create a free account
3. Verify your email address

## Step 2: Set Up Email Service

1. In your EmailJS dashboard, go to "Email Services"
2. Click "Add New Service"
3. Choose your email provider (Gmail, Outlook, etc.)
4. Connect your email account and grant permissions
5. Note down your **Service ID** (something like `service_xxxxx`)

## Step 3: Create Email Template

1. Go to "Email Templates" in your dashboard
2. Click "Create New Template"
3. Set up your template with these variables:
   - **To Email**: Your email address where you want to receive messages
   - **From Name**: `{{from_name}}`
   - **From Email**: `{{from_email}}`
   - **Subject**: `{{subject}}`
   - **Message/Body**:
     ```
     New contact form submission:

     From: {{from_name}} ({{from_email}})

     Subject: {{subject}}

     Message:
     {{message}}
     ```
4. Save the template and note down your **Template ID** (something like `template_xxxxx`)

## Step 4: Get Your Public Key

1. Go to "Account" in your dashboard
2. Find your **Public Key** (something like `xxxxxxxxxxxxxx`)

## Step 5: Update Your Code

1. Open `js/script.js`
2. Replace `YOUR_PUBLIC_KEY` with your actual public key
3. Replace `YOUR_SERVICE_ID` with your service ID
4. Replace `YOUR_TEMPLATE_ID` with your template ID

## Step 6: Test the Contact Form

1. Open your website
2. Fill out the contact form including the math problem
3. Submit the form
4. Check your email to confirm messages are being received

## Security Notes

- Your public key is safe to include in client-side code
- EmailJS handles the email sending server-side
- The math CAPTCHA prevents automated spam
- All form data is sent securely through EmailJS

## Troubleshooting

- **Emails not sending**: Check your EmailJS dashboard for error messages
- **CAPTCHA not working**: Make sure the math problem is solved correctly
- **Template issues**: Verify all template variables match the JavaScript code

## Free Tier Limits

EmailJS free tier allows:
- 200 emails per month
- 1 email service
- Basic templates

For higher limits, consider upgrading to a paid plan.