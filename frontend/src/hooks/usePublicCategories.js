import { useEffect, useState } from "react";

import { listCategories } from "../services/categoryService";

// Categorias são públicas (rule de leitura aberta). Cache de módulo: o filtro
// do catálogo e o useCatalog compartilham uma única leitura por carregamento.
let cachedPromise = null;

function loadOnce() {
  if (!cachedPromise) {
    cachedPromise = listCategories().catch(() => {
      cachedPromise = null;
      return [];
    });
  }

  return cachedPromise;
}

// Achata a árvore em uma lista com {id, name, slug, parentId} e um índice
// slug→id (a URL usa slug; as consultas usam categoryId).
function flatten(tree) {
  const flat = [];

  for (const root of tree) {
    flat.push({ id: root.id, name: root.name, slug: root.slug, parentId: null });

    for (const child of root.children || []) {
      flat.push({ id: child.id, name: child.name, slug: child.slug, parentId: root.id });
    }
  }

  return flat;
}

export function usePublicCategories() {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    loadOnce().then((data) => {
      if (!cancelled) {
        setTree(data);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const flat = flatten(tree);
  const idBySlug = Object.fromEntries(flat.map((c) => [c.slug, c.id]));
  const bySlug = Object.fromEntries(flat.map((c) => [c.slug, c]));
  const slugById = Object.fromEntries(flat.map((c) => [c.id, c.slug]));

  return { tree, flat, idBySlug, bySlug, slugById, loading };
}
