import { createRoot } from "react-dom/client";

/**
 * Dashboard sungguhan (daftar key/status, usage per key-provider-model) BELUM
 * diimplementasikan -- ini walking skeleton Step 8 (§12.1), baru dikerjakan
 * setelah Step 0-7 selesai. Komponen di bawah ini nyata (benar-benar render,
 * bisa di-build & dijalankan), tapi isinya jujur soal status: bukan dashboard
 * dengan data karangan.
 *
 * Lihat packages/web/CLAUDE.md untuk scope Step 8.
 */
function App() {
  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem" }}>
      <h1>Free AI Gateway</h1>
      <p>
        Dashboard belum diimplementasikan (walking skeleton Step 8). Cek{" "}
        <code>docs/walking-skeleton-checklist.md</code> untuk progres saat ini.
      </p>
    </main>
  );
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("Element #root tidak ditemukan di index.html");
}
createRoot(container).render(<App />);
