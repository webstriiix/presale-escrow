// src/app/not-found.tsx
export default function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        color: "white",
        backgroundColor: "black",
      }}
    >
      <h1 style={{ fontSize: "2rem", fontWeight: "bold" }}>404 – Page not found</h1>
      <p style={{ marginTop: "1rem" }}>Return to the home page.</p>
    </div>
  );
}
