'use client';

import { useEffect, useState } from "react";
import snsWebSdk from "@sumsub/websdk";
import axios from "axios";
import { ArrowLeft } from "lucide-react";

interface VerificationScreenProps {
  userId: string;
  countryCode: 'US' | 'Other';
  onClose: () => void;
}

const VerificationScreen = ({ userId, countryCode, onClose }: VerificationScreenProps) => {
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [visible, setVisible] = useState(false); // fade-in / fade-out control

  useEffect(() => {
    // 🔹 Animación de fade-in al montar
    setTimeout(() => setVisible(true), 50);

    const initVerification = async () => {
      try {
        setLoading(true);

        // 🔹 Llamamos al backend para generar el token
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'https://dynastical-xzavier-unsanguinarily.ngrok-free.dev'}/api/verify/start`,
          {
            userId,
            email: "user@example.com",
            phone: "+1234567890",
            country: countryCode === 'US' ? 'US' : 'Other',
          }
        );

        const { token } = response.data;
        console.log("✅ Sumsub token recibido:", token);

        // 🔹 Inicializamos el SDK
        const snsWebSdkInstance = snsWebSdk
          .init(token, () => Promise.resolve(token))
          .withConf({
            lang: "en",
            theme: "dark",
          })
          .withOptions({
            addViewportTag: false,
            adaptIframeHeight: true,
          })
          .on("idCheck.onReady", () => {
            console.log("✅ SDK listo");
            setLoading(false);
          })
          .on("idCheck.onStepCompleted", (payload) => {
            console.log("➡️ Paso completado:", payload);
          })
          .on("idCheck.onFinish", () => {
            console.log("✅ Verificación completada");
            // 🔹 Fade-out antes de cerrar
            setVisible(false);
            setTimeout(() => onClose(), 300);
          })
          .on("idCheck.onError", (error) => {
            console.error("❌ Error en Sumsub:", error);
            alert("Verification failed, please try again.");
            // 🔹 Fade-out en caso de error
            setVisible(false);
            setTimeout(() => onClose(), 300);
          })
          .build();

        snsWebSdkInstance.launch("#sumsub-websdk-container");
        setStarted(true);
      } catch (err) {
        console.error("❌ Error iniciando verificación:", err);
        alert("Failed to start verification. Please try again later.");
        setVisible(false);
        setTimeout(() => onClose(), 300);
      }
    };

    if (userId) initVerification();
  }, [userId, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-white transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* 🔙 Botón para volver */}
      <button
        className={`absolute top-24 left-6 p-2 rounded-full transition hover:bg-gray-800 cursor-pointer`}
        onClick={() => {
            setVisible(false);
            setTimeout(() => onClose(), 300);
        }}
      >
        <ArrowLeft size={24} color="#13E5C0" />
      </button>

      {/* 🧱 Contenedor del SDK */}
      <div
        id="sumsub-websdk-container"
        className={`relative w-full max-w-[480px] h-[600px] rounded-lg overflow-hidden transition-all duration-300 ${
          loading ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
      ></div>

      {/* ⏳ Loader mientras carga el SDK */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300">
          <div className="w-10 h-10 border-4 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-gray-300 text-sm">Loading verification...</p>
        </div>
      )}
    </div>
  );
};

export default VerificationScreen;
