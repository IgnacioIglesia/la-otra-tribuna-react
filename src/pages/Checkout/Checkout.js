import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header/Header";
import { useCart } from "../../components/Cart/CartContext";
import { supabase } from "../../lib/supabaseClient";
import AddressBookModal from "./components/AddressBookModal.jsx";
import "./Checkout.css";

const money = (n) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(n || 0);

// ===== Helpers tarjeta =====
const onlyDigits = (s) => (s || "").replace(/\D+/g, "");
const luhnValid = (num) => {
  const arr = num.split("").reverse().map((x) => parseInt(x, 10));
  const sum = arr.reduce((acc, n, i) => {
    if (i % 2 === 1) {
      let d = n * 2;
      if (d > 9) d -= 9;
      return acc + d;
    }
    return acc + n;
  }, 0);
  return sum % 10 === 0;
};
const formatCardNumber = (v) =>
  onlyDigits(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ").trim();
const formatExp = (v) => {
  const d = onlyDigits(v).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
};

export default function Checkout() {
  const navigate = useNavigate();
  const { items, total, clear } = useCart();

  const [email, setEmail] = useState("");
  const [usuario, setUsuario] = useState(null);

  // direcciones
  const [addresses, setAddresses] = useState([]); // todas las direcciones del usuario
  const [selected, setSelected] = useState(null); // dirección elegida para envío
  const [addressOpen, setAddressOpen] = useState(false);

  const [loading, setLoading] = useState(true);

  // métodos de pago
  const [method, setMethod] = useState("card"); // "card" | "transfer"
  const [card, setCard] = useState({ name: "", number: "", exp: "", cvc: "" });

  const totalFinal = useMemo(() => total, [total]);

  // ===== Carga de sesión, usuario y direcciones =====
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await supabase.auth.getSession();
        const sess = data?.session;
        if (!sess) {
          const backTo = encodeURIComponent("/checkout");
          navigate(`/login?return=${backTo}`, { replace: true });
          return;
        }
        setEmail(sess.user?.email || "");

        // usuario
        const { data: u, error: uErr } = await supabase
          .from("usuario")
          .select("id_usuario, nombre, apellido, email")
          .eq("email", sess.user?.email)
          .maybeSingle();
        if (uErr) throw uErr;
        setUsuario(u || null);

        if (u?.id_usuario) {
          await fetchAddresses(u.id_usuario);
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  async function fetchAddresses(id_usuario) {
    // Obtenemos todas las direcciones (la default primero)
    const { data: list, error } = await supabase
      .from("direccion")
      .select(
        "id_direccion, pais, departamento, ciudad, calle, numero, cp, is_default, created_at"
      )
      .eq("id_usuario", id_usuario)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      setAddresses([]);
      setSelected(null);
      return;
    }
    setAddresses(list || []);
    setSelected((list || [])[0] || null);
  }

  // ===== Tarjeta =====
  const onChangeCard = (key) => (e) => {
    let v = e.target.value;
    if (key === "number") v = formatCardNumber(v);
    if (key === "exp") v = formatExp(v);
    if (key === "cvc") v = onlyDigits(v).slice(0, 4);
    setCard((c) => ({ ...c, [key]: v }));
  };

  const validateCard = () => {
    if (!card.name.trim()) return "Completá el nombre del titular.";
    const digits = onlyDigits(card.number);
    if (digits.length < 13 || digits.length > 19 || !luhnValid(digits)) {
      return "Número de tarjeta inválido.";
    }
    if (!/^\d{2}\/\d{2}$/.test(card.exp)) return "Vencimiento inválido (MM/AA).";
    const [mm, yy] = card.exp.split("/").map((x) => parseInt(x, 10));
    if (mm < 1 || mm > 12) return "Mes de vencimiento inválido.";

    // usar yy para chequear vencimiento real
    const now = new Date();
    const curYY = now.getFullYear() % 100;
    const curMM = now.getMonth() + 1;
    if (yy < curYY || (yy === curYY && mm < curMM)) {
      return "La tarjeta está vencida.";
    }

    if (!/^\d{3,4}$/.test(card.cvc)) return "CVC inválido.";
    return null;
  };

  // ===== Confirmar =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) {
      alert("Tu carrito está vacío.");
      return;
    }
    if (!selected) {
      alert("Seleccioná una dirección de entrega.");
      return;
    }
    if (method === "card") {
      const err = validateCard();
      if (err) {
        alert(err);
        return;
      }
    }
    // Aquí podrías insertar el pedido en Supabase (pedido + items + id_direccion seleccionado)
    alert("¡Gracias! Tu pedido fue creado correctamente.");
    clear();
    navigate("/", { replace: true });
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="container" style={{ padding: "48px 0" }}>
          Cargando…
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="container checkout">
        <h1 className="ck-title">Finalizar compra</h1>

        <form className="ck-grid" onSubmit={handleSubmit}>
          {/* Columna izquierda */}
          <section className="ck-col">
            {/* Datos del comprador */}
            <div className="ck-card">
              <h2 className="ck-h2">Datos del comprador</h2>
              <div className="ck-row">
                <div className="ck-field">
                  <label htmlFor="ck-email">Email</label>
                  <input id="ck-email" value={email} readOnly />
                </div>
                <div className="ck-field">
                  <label htmlFor="ck-name">Nombre</label>
                  <input
                    id="ck-name"
                    value={
                      (usuario?.nombre || "") +
                      (usuario?.apellido ? " " + usuario.apellido : "")
                    }
                    readOnly
                  />
                </div>
              </div>
            </div>

            {/* Dirección de entrega (con botón Cambiar) */}
            <div className="ck-card">
              <div className="ck-card-head">
                <h2 className="ck-h2">Dirección de entrega</h2>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setAddressOpen(true)}
                >
                  Cambiar
                </button>
              </div>

              {selected ? (
                <>
                  <div className="addr-line">
                    {selected.calle}
                    {selected.numero ? ` ${selected.numero}` : ""},{" "}
                    {selected.ciudad}, {selected.departamento}
                  </div>
                  <div className="muted">
                    {selected.cp ? `CP ${selected.cp} · ` : ""}
                    {selected.pais}
                    {selected.is_default ? " · Principal" : ""}
                  </div>
                </>
              ) : (
                <div className="muted">
                  No encontramos una dirección. Agregá una para continuar.
                </div>
              )}
            </div>

            {/* Método de pago */}
            <div className="ck-card">
              <h2 className="ck-h2">Método de pago</h2>

              <div className="ck-pay-list">
                {/* TARJETA */}
                <div className={`pay-item ${method === "card" ? "open" : ""}`}>
                  <label className="pay-head">
                    <input
                      type="radio"
                      name="payment"
                      value="card"
                      checked={method === "card"}
                      onChange={() => setMethod("card")}
                    />
                    <span>Tarjeta de crédito / débito</span>
                    <span className="pay-icons" aria-hidden>
                      💳
                    </span>
                  </label>

                  {method === "card" && (
                    <div className="pay-body">
                      <div className="ck-field">
                        <label htmlFor="cc-name">Nombre del titular</label>
                        <input
                          id="cc-name"
                          type="text"
                          placeholder="Como aparece en la tarjeta"
                          value={card.name}
                          onChange={onChangeCard("name")}
                          autoComplete="cc-name"
                          required
                        />
                      </div>

                      <div className="ck-field">
                        <label htmlFor="cc-number">Número de tarjeta</label>
                        <input
                          id="cc-number"
                          type="text"
                          placeholder="4242 4242 4242 4242"
                          value={card.number}
                          onChange={onChangeCard("number")}
                          inputMode="numeric"
                          autoComplete="cc-number"
                          maxLength={23}
                          required
                        />
                      </div>

                      <div className="ck-row">
                        <div className="ck-field">
                          <label htmlFor="cc-exp">Vencimiento (MM/AA)</label>
                          <input
                            id="cc-exp"
                            type="text"
                            placeholder="MM/AA"
                            value={card.exp}
                            onChange={onChangeCard("exp")}
                            inputMode="numeric"
                            autoComplete="cc-exp"
                            maxLength={5}
                            required
                          />
                        </div>
                        <div className="ck-field">
                          <label htmlFor="cc-cvc">CVC</label>
                          <input
                            id="cc-cvc"
                            type="text"
                            placeholder="CVC"
                            value={card.cvc}
                            onChange={onChangeCard("cvc")}
                            inputMode="numeric"
                            autoComplete="cc-csc"
                            maxLength={4}
                            required
                          />
                        </div>
                      </div>

                      <p className="muted xs">
                        Tus datos se envían de forma segura. No almacenamos la
                        tarjeta en nuestros servidores.
                      </p>
                    </div>
                  )}
                </div>

                {/* TRANSFERENCIA */}
                <div className={`pay-item ${method === "transfer" ? "open" : ""}`}>
                  <label className="pay-head">
                    <input
                      type="radio"
                      name="payment"
                      value="transfer"
                      checked={method === "transfer"}
                      onChange={() => setMethod("transfer")}
                    />
                    <span>Transferencia bancaria</span>
                    <span className="pay-icons" aria-hidden>
                      🏦
                    </span>
                  </label>

                  {method === "transfer" && (
                    <div className="pay-body">
                      <div className="bank-box">
                        <div>Banco: BROU</div>
                        <div>Cuenta: 00123456789</div>
                        <div>Titular: La Otra Tribuna</div>
                        <div>Referencia: tu email ({email})</div>
                      </div>
                      <p className="muted xs">
                        Confirmaremos tu pago dentro de 24 h hábiles luego de
                        recibir la transferencia.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Columna derecha */}
          <aside className="ck-aside">
            <div className="ck-card">
              <h2 className="ck-h3">Resumen</h2>
              <ul className="mini-cart">
                {items.map((it) => (
                  <li key={it.id} className="mini-item">
                    <img src={it.img} alt={it.nombre} />
                    <div className="mi-info">
                      <div className="mi-name" title={it.nombre}>
                        {it.nombre}
                      </div>
                      <div className="mi-sub">
                        x{it.qty} · {it.categoria}
                      </div>
                    </div>
                    <div className="mi-price">{money(it.precio * it.qty)}</div>
                  </li>
                ))}
              </ul>

              <div className="ck-totals">
                <div>
                  <span>Total</span>
                  <strong>{money(totalFinal)}</strong>
                </div>
              </div>

              <button type="submit" className="ck-submit">
                Pagar pedido
              </button>

              <button
                type="button"
                className="ck-back"
                onClick={() => navigate(-1)}
              >
                Volver
              </button>
            </div>
          </aside>
        </form>
      </main>

      {/* MODAL DE DIRECCIONES */}
      {usuario?.id_usuario && (
        <AddressBookModal
          open={addressOpen}
          onClose={() => setAddressOpen(false)}
          idUsuario={usuario.id_usuario}
          addresses={addresses}
          selectedId={selected?.id_direccion || null}
          onChangeSelected={(addr) => setSelected(addr)}
          onRefresh={() => fetchAddresses(usuario.id_usuario)}
        />
      )}
    </>
  );
}