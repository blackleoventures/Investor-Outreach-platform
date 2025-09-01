Backend Email + AI Integration

Environment variables required:

- EMAIL_PROVIDER=sendgrid
- SENDGRID_API_KEY=your_key
- EMAIL_FROM_DEFAULT=no-reply@yourdomain.com
- BASE_URL=https://your-backend.example.com
- GEMINI_API_KEY=optional_for_ai
- MANGODB_URI=mongodb_connection

Routes:
- POST /email/send
- GET /email/track?messageId=&email=
- GET /email/click?messageId=&url=
- POST /email/webhook (SendGrid Event Webhook)
- POST /email/inbound (Inbound Parse)
- GET/POST /email/unsubscribe
- GET /investors
- GET /match/:companyId/scored
- POST /ai/optimize-subject
- POST /ai/draft-reply

**New Features:**

**Follow-up Automation:**
- POST /follow-up - Create follow-up sequence
- GET /follow-up/company/:companyId - Get company sequences
- POST /follow-up/:id/execute - Execute sequence
- GET /follow-up/:id/stats - Get sequence statistics

**Email Template Library:**
- GET /email-templates - Get all templates
- POST /email-templates - Create custom template
- GET /email-templates/categories - Get template categories
- GET /email-templates/tones - Get template tones

**Weekly Progress Reports:**
- POST /weekly-progress/generate - Generate weekly report
- POST /weekly-progress/:reportId/send - Send progress email
- GET /weekly-progress/company/:companyId - Get company reports

**Deck Activity Tracking:**
- POST /deck-activity/view - Track deck view
- POST /deck-activity/download - Track deck download
- POST /deck-activity/share - Track deck share
- GET /deck-activity/analytics/:companyId - Get analytics
- GET /deck-activity/realtime/:companyId - Get real-time activity

**AI Q&A Bot:**
- POST /deck-qa/ask - Ask question about deck
- GET /deck-qa/history/:companyId/:deckId - Get Q&A history
- POST /deck-qa/:qaId/rate - Rate answer helpfulness
- GET /deck-qa/suggested/:companyId/:deckId - Get suggested questions
- GET /deck-qa/analytics/:companyId - Get Q&A analytics

Configure SendGrid:
- Add Event Webhook → https://your-backend.example.com/email/webhook
- Add Inbound Parse (optional) → https://your-backend.example.com/email/inbound
- Verify domain (SPF, DKIM)

