# MiniBlog

A small blog application built with React, TypeScript, and Vite. Posts, authors, and comments are fetched from JSONPlaceholder. User-created posts and sign-in state are stored in the browser's `localStorage`.

## Run the app

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal. Create a production build with `npm run build`.

## Demo account

- Username: `admin`
- Password: `123456`

## Features

- Search posts by title.
- Story detail pages with comments.
- Loading states, error messages, and retry action.
- Sign in and sign out; only signed-in users can write posts.
- Form validation; new posts are stored in `localStorage`.
- A 404 page for unknown routes.
