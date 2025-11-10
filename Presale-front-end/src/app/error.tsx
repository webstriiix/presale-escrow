// src/app/error.tsx
'use client';

export default function GlobalError({ error }: { error: Error }) {
  console.error('App error:', error);
  return (
    <html>
      <body
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "black",
          color: "white",
        }}
      >
        <h2>Something went wrong</h2>
      </body>
    </html>
  );
}
