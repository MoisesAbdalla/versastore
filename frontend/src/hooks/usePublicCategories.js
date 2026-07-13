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

  // Subcategorias (filhas) de uma raiz, pelo slug da raiz.
  function subcategoriesOf(rootSlug) {
    const root = tree.find((c) => c.slug === rootSlug);

    return root ? root.children || [] : [];
  }

  // Resolve os categoryIds do filtro hierárquico (FR-003):
  // - sub válida sob a raiz → só a filha;
  // - raiz sozinha → a raiz + todas as filhas (agregado);
  // - nada → sem filtro.
  function resolveCategoryIds(rootSlug, subSlug) {
    if (!rootSlug) {
      return [];
    }

    const root = tree.find((c) => c.slug === rootSlug);

    if (!root) {
      return [];
    }

    if (subSlug) {
      const child = (root.children || []).find((c) => c.slug === subSlug);

      if (child) {
        return [child.id];
      }
      // sub inexistente sob a raiz → cai para o agregado da raiz.
    }

    return [root.id, ...(root.children || []).map((c) => c.id)];
  }

  return {
    tree,
    roots: tree,
    flat,
    idBySlug,
    bySlug,
    slugById,
    subcategoriesOf,
    resolveCategoryIds,
    loading,
  };
}
