// Itens fixos do menu da loja. As categorias são anexadas dinamicamente pelo
// Navbar a partir da coleção `categories` (feature 005) — antes havia links
// mortos (/male, /female, /accessories) para rotas inexistentes.
const navigation = [
  {
    id: 1,
    title: "Home",
    path: "/",
  },
  {
    id: 2,
    title: "Produtos",
    path: "/products",
  },
];

export default navigation;
