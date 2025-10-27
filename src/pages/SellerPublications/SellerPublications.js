// src/pages/SellerPublications/SellerPublications.js
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/Header/Header";
import ProductCard from "../../components/ProductCard/ProductCard";
import { supabase } from "../../lib/supabaseClient";
import "./SellerPublications.css";

const PLACEHOLDER = "https://placehold.co/600x750?text=Camiseta";

function mapCategoria(cat) {
  if (!cat) return "Club";
  return cat === "Seleccion" ? "Selección" : cat;
}

export default function SellerPublications() {
  const { id } = useParams(); // id === id_usuario
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [seller, setSeller] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        // 1) Cargar usuario (opcional)
        const { data: u, error: eU } = await supabase
          .from("usuario")
          .select("id_usuario,nombre,apellido,email")
          .eq("id_usuario", id)
          .maybeSingle();
        if (eU) throw eU;

        // 2) Cargar publicaciones activas del usuario
        const { data, error } = await supabase
          .from("publicacion")
          .select("*, foto (url, orden_foto)")
          .eq("id_usuario", id)
          .eq("estado", "Activa")
          .order("id_publicacion", { ascending: false });

        if (error) throw error;

        const mapped = (data || []).map((pub) => {
          const primeraFoto = pub.foto && pub.foto.length ? pub.foto[0].url : null;
          return {
            id: pub.id_publicacion,
            nombre: pub.titulo,
            precio: Number(pub.precio) || 0,
            club: pub.club || "",
            pais: "Uruguay",
            categoria: mapCategoria(pub.categoria),
            img: primeraFoto || PLACEHOLDER,
            stock: pub.stock || 0, // ← AGREGAR ESTA LÍNEA
          };
        });

        if (alive) {
          setSeller(u || null);
          setRows(mapped);
        }
      } catch (err) {
        if (alive) setError(err.message || "No se pudieron cargar las publicaciones.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  return (
    <>
      <Header />
      <main className="container seller-pubs">
        <div className="seller-header" style={{ marginBottom: 12 }}>
          <button className="back" onClick={() => navigate(-1)}>← Volver</button>
          <h2 style={{ display: "inline-block", marginLeft: 12 }}>
            {seller ? `Publicaciones de ${seller.nombre || ""} ${seller.apellido || ""}` : "Publicaciones"}
          </h2>
          {seller?.email && <div className="muted" style={{ marginLeft: 12 }}>{seller.email}</div>}
        </div>

        {loading ? (
          <div className="empty">Cargando publicaciones…</div>
        ) : error ? (
          <div className="empty" role="alert">{error}</div>
        ) : rows.length === 0 ? (
          <div className="empty">Este usuario no tiene publicaciones activas.</div>
        ) : (
          <section className="products-grid">
            {rows.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </section>
        )}
      </main>
    </>
  );
}