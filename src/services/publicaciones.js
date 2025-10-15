import { supabase } from "../lib/supabaseClient";

const PLACEHOLDER = "https://placehold.co/600x750?text=Camiseta";

/** Normaliza categoría de producto */
function normalizarCategoria(cat) {
  if (!cat) return "Club";
  if (cat === "Seleccion") return "Selección";
  return cat;
}

/** Convierte una fila completa de Supabase a la estructura esperada */
function mapRow(pub) {
  const producto = pub.producto_base || {};
  const fotos = Array.isArray(pub.foto) ? pub.foto : [];
  const primeraFoto = fotos.sort((a, b) => a.orden_foto - b.orden_foto)[0];

  const precio = Number(pub.precio) || 0;
  let precioOferta = pub.precio_oferta ? Number(pub.precio_oferta) : null;

  if (pub.permiso_oferta && !precioOferta) {
    precioOferta = Math.round(precio * 0.9);
  }

  return {
    id: pub.id_publicacion,
    nombre: producto.nombre_public || pub.titulo || "(Sin título)",
    club: pub.club || producto.equipo || "—",
    pais: "Uruguay",
    categoria: normalizarCategoria(pub.categoria),
    precio,
    precio_oferta: precioOferta,
    permiso_oferta: pub.permiso_oferta,
    talle: pub.talle,
    condicion: pub.condicion,
    autenticidad: pub.autenticidad,
    stock: pub.stock,
    descripcion: pub.descripcion,
    fecha_publicacion: pub.fecha_publicacion,
    img: primeraFoto ? primeraFoto.url : PLACEHOLDER,
  };
}

/** Obtiene publicaciones activas con join a producto_base y fotos */
export async function fetchPublicaciones() {
  const { data, error } = await supabase
    .from("publicacion")
    .select(`
      id_publicacion,
      titulo,
      descripcion,
      precio,
      moneda,
      condicion,
      autenticidad,
      categoria,
      talle,
      stock,
      estado,
      club,
      permiso_oferta,
      precio_oferta,
      fecha_publicacion,
      producto_base (
        id_producto,
        nombre_public,
        equipo,
        categoria
      ),
      foto (
        url,
        orden_foto
      )
    `)
    .eq("estado", "Activa")
    .order("fecha_publicacion", { ascending: false });

  if (error) throw error;

  return (data || []).map(mapRow);
}