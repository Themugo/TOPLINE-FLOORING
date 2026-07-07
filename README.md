# Topline Flooring & Waterproofing

A professional e-commerce platform for flooring and waterproofing services in Nairobi, Kenya.

## Features

- **Product Catalog**: Browse services and materials with categories
- **Shopping Cart**: Add items, manage quantities, checkout
- **Order Management**: Track orders and status updates
- **Admin Dashboard**: Manage products, categories, orders, and customers
- **Responsive Design**: Works on all device sizes

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS v4
- **State Management**: TanStack Query v5
- **Routing**: Wouter
- **UI Components**: Radix UI primitives
- **Backend**: Supabase (PostgreSQL, Auth)
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Environment Variables

Create a `.env` file with:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Admin Access

- Username: `admin`
- Password: `admin123`

## License

All rights reserved. Topline Flooring and Waterproofing.

## Deployment

### Vercel Deployment

1. Push code to GitHub repository
2. Import project in Vercel
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

### Environment Setup

Copy `.env.example` to `.env` and fill in your Supabase credentials.

## Security

- Never commit `.env` file
- Change default admin credentials immediately after deployment
- Enable Supabase Row Level Security (RLS) policies (see `SUPABASE_RLS_POLICIES.md`)
- Use HTTPS in production
- Regularly update dependencies
- Default admin password after migration: `ToplineSecure2024!` (CHANGE IMMEDIATELY)
