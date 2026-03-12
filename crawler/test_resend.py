"""Test Resend email sending."""
import os
from dotenv import load_dotenv
load_dotenv('../.env')

import resend

api_key = os.getenv('RESEND_API_KEY')
email_from = os.getenv('EMAIL_FROM')

print(f"API Key: {api_key[:15]}..." if api_key else "NO API KEY!")
print(f"From: {email_from}")

if not api_key:
    print("ERROR: No RESEND_API_KEY found")
    exit(1)

resend.api_key = api_key

try:
    response = resend.Emails.send({
        'from': email_from or 'onboarding@resend.dev',
        'to': ['jeffreymoepi@gmail.com'],
        'subject': 'Procurement Radar - Test Email',
        'html': '<h1>Test Email</h1><p>If you receive this, email sending is working!</p>'
    })
    print(f"SUCCESS! Response: {response}")
except Exception as e:
    print(f"FAILED: {e}")
