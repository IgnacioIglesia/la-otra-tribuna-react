import React, { useEffect, useMemo, useState } from "react";
import Header from "../../components/Header/Header";
import ProductCard from "../../components/ProductCard/ProductCard";
import { supabase } from "../../lib/supabaseClient";
import "./Offers.css";

const PLACEHOLDER = "https://placehold.co/600x750?text=Camiseta";

function daysFrom(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return Infinity;
  const ms = Date.now() - d.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export default function Offers() {
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState([]);

  // filtros UI
  const [club, setClub] = useState("Todos");
  const [pais, setPais] = useState("Todos");
  const [categoria, setCategoria] = useState("Todas");
  const [sort, setSort] = useState("default");
  const [maxPrecio, setMaxPrecio] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Activar sólo permiso_oferta = true; el filtro de >=30 días se hace acá
      const { data, error } = await supabase
        .from("publicacion")
        .select("*, foto (*)")
        .eq("estado", "Activa")
        .eq("permiso_oferta", true);

      if (error) {
        console.error(error);
        setAll([]);
        setLoading(false);
        return;
      }

      const mapped = (data || [])
        .filter((p) => daysFrom(p.fecha_publicacion) >= 30) // ← 30 días
        .map((pub) => {
          const foto = pub.foto?.[0]?.url || PLACEHOLDER;
          const basePrice = Number(pub.precio);
          const offerPrice =
            pub.precio_oferta != null
              ? Number(pub.precio_oferta)
              : Math.round(basePrice * 0.9);

          return {
            id: pub.id_publicacion,
            nombre: pub.titulo,
            club: pub.club || "—",
            pais: "Uruguay",
            categoria: pub.categoria === "Seleccion" ? "Selección" : pub.categoria,
            img: foto,
            // flags para ProductCard
            isOffer: true,
            precio: basePrice,
            precioAnterior: basePrice,
            precio_oferta: offerPrice,
          };
        });

      setAll(mapped);
      const maxP = mapped.length ? Math.max(...mapped.map((p) => p.precioAnterior || p.precio)) : 0;
      setMaxPrecio(maxP);
      setLoading(false);
    })();
  }, []);

  const clubs = useMemo(
    () => ["Todos", ...Array.from(new Set(all.map((p) => p.club)))],
    [all]
  );
  const paises = useMemo(
    () => ["Todos", ...Array.from(new Set(all.map((p) => p.pais)))],
    [all]
  );
  const categorias = useMemo(
    () => ["Todas", ...Array.from(new Set(all.map((p) => p.categoria)))],
    [all]
  );

  const productos = useMemo(() => {
    let list = all.filter(
      (p) =>
        (club === "Todos" || p.club === club) &&
        (pais === "Todos" || p.pais === pais) &&
        (categoria === "Todas" || p.categoria === categoria) &&
        // slider usa precioAnterior (precio base)
        (p.precioAnterior || p.precio) <= (maxPrecio || Infinity)
    );

    switch (sort) {
      case "price-asc":
        list = list.sort((a, b) => (a.precio_oferta ?? a.precio) - (b.precio_oferta ?? b.precio));
        break;
      case "price-desc":
        list = list.sort((a, b) => (b.precio_oferta ?? b.precio) - (a.precio_oferta ?? a.precio));
        break;
      case "name":
        list = list.sort((a, b) => a.nombre.localeCompare(b.nombre));
        break;
      default:
        break;
    }

    return list;
  }, [all, club, pais, categoria, maxPrecio, sort]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="container catalog">
          <p>Cargando ofertas…</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />

      <section
        className="hero hero-offers"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url('/assets/oferta.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="container hero-content">
          <h2 className="hero-subtitle">Los mejores descuentos</h2>
          <p className="hero-desc">Aprovechá nuestras promos por tiempo limitado.</p>
        </div>
      </section>

      <main className="container catalog">
        <div className="catalog-head">
          <h2>Ofertas disponibles</h2>
          <p>Resultados: {productos.length}</p>
        </div>

        <div className="controls">
          <div className="control">
            <label>Ordenar por:</label>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="default">Por defecto</option>
              <option value="price-asc">Precio: menor a mayor</option>
              <option value="price-desc">Precio: mayor a menor</option>
              <option value="name">Nombre (A–Z)</option>
            </select>
          </div>

          <div className="filters-row">
            <select value={club} onChange={(e) => setClub(e.target.value)}>
              {clubs.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>

            <select value={pais} onChange={(e) => setPais(e.target.value)}>
              {paises.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>

            <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {categorias.map((cat) => (
                <option key={cat}>{cat}</option>
              ))}
            </select>

            <div className="price-filter">
              <label>
                Precio máx.:{" "}
                {new Intl.NumberFormat("es-UY", {
                  style: "currency",
                  currency: "UYU",
                  maximumFractionDigits: 0,
                }).format(maxPrecio || 0)}
              </label>
              <input
                type="range"
                min="0"
                max={Math.max(maxPrecio || 0, 0)}
                step="50"
                value={maxPrecio || 0}
                onChange={(e) => setMaxPrecio(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {productos.length === 0 ? (
          <div className="empty">No hay productos en oferta que coincidan con tus filtros.</div>
        ) : (
          <section className="products-grid">
            {productos.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </section>
        )}
      </main>
    </>
  );
}