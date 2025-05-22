# RevisePDF

A powerful PDF manipulation application with internationalization support.

## Features

- PDF compression, merging, splitting, and conversion
- Internationalization support for 8 languages
- User authentication with email/password and Google OAuth
- Tiered subscription model (Free, Basic, Premium)
- Responsive design

## Tech Stack

- Next.js 15.3.2
- React 19
- TypeScript
- Tailwind CSS
- Supabase (Authentication, Database, Storage)
- i18next for internationalization
- PDF.js and PDF-lib for PDF manipulation
- Deployed on Heroku

## Supported Languages

- English (UK)
- Portuguese (Brazil)
- Hindi (India)
- Russian
- Korean
- Vietnamese
- German
- Spanish (Mexico)

## Getting Started

### Prerequisites

- Node.js 20.x
- npm 10.x
- Supabase account

### Installation

1. Clone the repository:

```bash
git clone https://github.com/Calum-Kerr/revisepdf-front.git
cd revisepdf-front
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Heroku Deployment

1. Create a new Heroku app:

```bash
heroku create revisepdf
```

2. Add the Heroku remote:

```bash
heroku git:remote -a revisepdf
```

3. Set environment variables:

```bash
heroku config:set NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
heroku config:set NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
heroku config:set NEXT_PUBLIC_APP_URL=https://your-app-name.herokuapp.com
```

4. Deploy to Heroku:

```bash
git push heroku main
```

## Subscription Tiers

- **Free**: 5MB file size limit, basic features
- **Basic**: $4.99/month, 20MB file size limit, advanced features
- **Premium**: $9.99/month, 100MB file size limit, premium features and priority support

## License

This project is licensed under the MIT License - see the LICENSE file for details.
