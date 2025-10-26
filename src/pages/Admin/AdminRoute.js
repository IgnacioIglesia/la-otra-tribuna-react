// src/routes/AdminRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

function useAdminAuth() {
  const [ready, setReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAdmin() {
      try {
        // 1) Verificar sesión
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;

        if (!user) {
          if (mounted) {
            setIsAuthed(false);
            setIsAdmin(false);
            setReady(true);
          }
          return;
        }

        setIsAuthed(true);

        // 2) Verificar si es admin
        const { data: userData, error } = await supabase
          .from("usuario")
          .select("rol, esta_baneado")
          .eq("id_auth", user.id)
          .single();

        if (error) {
          console.error("Error verificando rol:", error);
          if (mounted) {
            setIsAdmin(false);
            setReady(true);
          }
          return;
        }

        if (mounted) {
          setIsAdmin(userData?.rol === "admin" && !userData?.esta_baneado);
          setReady(true);
        }
      } catch (err) {
        console.error("Error en checkAdmin:", err);
        if (mounted) {
          setIsAuthed(false);
          setIsAdmin(false);
          setReady(true);
        }
      }
    }

    checkAdmin();

    // 3) Escuchar cambios de sesión
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      checkAdmin();
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  return { ready, isAuthed, isAdmin };
}

export default function AdminRoute() {
  const { ready, isAuthed, isAdmin } = useAdminAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh" 
      }}>
        <div>Verificando permisos...</div>
      </div>
    );
  }

  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}