// src/routes/ProtectedRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

function useAuth() {
  const [ready, setReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;

    // 1) chequeo rápido por localStorage (para no parpadear)
    const saved = localStorage.getItem("user");
    if (saved) setIsAuthed(true);

    // 2) chequeo real con Supabase
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setIsAuthed(!!data?.session?.user);
      setReady(true);
    });

    // 3) escucha cambios de sesión
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, session) => {
      if (!mounted) return;
      setIsAuthed(!!session?.user);
      setReady(true);
      if (session?.user) {
        localStorage.setItem("user", JSON.stringify(session.user));
      } else {
        localStorage.removeItem("user");
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  return { ready, isAuthed };
}

export default function ProtectedRoute() {
  const { ready, isAuthed } = useAuth();
  const location = useLocation();

  if (!ready) return null; // o un spinner si querés

  if (!isAuthed) {
    // te llevo a /login y guardo de dónde venías
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}