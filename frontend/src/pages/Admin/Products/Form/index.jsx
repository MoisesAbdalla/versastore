import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

import RichTextField from "../../../../components/RichTextField";
import ConfirmDialog from "../../../../components/ConfirmDialog";
import EmptyState from "../../../../components/EmptyState";
import ImagesSection from "./ImagesSection";
import { getProduct, createProduct, updateProduct } from "../../../../services/productService";
import { useProducts } from "../../../../hooks/useProducts";
import { useCategories } from "../../../../hooks/useCategories";
import { useFeedback } from "../../../../contexts/FeedbackContext";
import {
  parseBRLInput,
  centsToInput,
  formatDate,
  maskDateInput,
  parseDateInput,
} from "../../../../utils/format";
import {
  PRODUCT_STATUS,
  PRODUCT_STATUS_LABELS,
  DEFAULT_LOW_STOCK_THRESHOLD,
} from "../../../../constants/product";
import ROUTES from "../../../../constants/routes";
import styles from "./styles.module.css";

const EMPTY_FORM = {
  name: "",
  brand: "",
  tags: "",
  categoryId: "",
  legacyCategory: "",
  description: "",
  images: [],
  priceText: "",
  promoPriceText: "",
  promoStart: "",
  promoEnd: "",
  sku: "",
  stock: "",
  lowStockThreshold: String(DEFAULT_LOW_STOCK_THRESHOLD),
  variations: [],
  status: PRODUCT_STATUS.RASCUNHO,
  destaque: false,
};

function draftKey(id) {
  return `product-draft:${id || "new"}`;
}

// Datas de promoção exibidas e digitadas no formato brasileiro dd/mm/aaaa
// (FR-087) — formatDate já converte Timestamp/Date para esse formato.

function productToForm(product) {
  return {
    name: product.name || "",
    brand: product.brand || "",
    tags: (product.tags || []).join(", "),
    categoryId: product.categoryId || "",
    legacyCategory: product.categoryId ? "" : product.categoryName || product.category || "",
    description: product.description || "",
    images:
      product.images && product.images.length
        ? product.images
        : product.image
          ? [{ url: product.image, isMain: true }]
          : [],
    priceText: centsToInput(product.price),
    promoPriceText: centsToInput(product.promoPrice),
    promoStart: formatDate(product.promoStart),
    promoEnd: formatDate(product.promoEnd),
    sku: product.sku || "",
    stock: product.stock != null ? String(product.stock) : "",
    lowStockThreshold: String(product.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD),
    variations: (product.variations || []).map((variation) => ({
      id: variation.id,
      tamanho: variation.attributes?.tamanho || "",
      cor: variation.attributes?.cor || "",
      sku: variation.sku || "",
      priceText: centsToInput(variation.price),
      stock: variation.stock != null ? String(variation.stock) : "",
    })),
    status: product.status || PRODUCT_STATUS.RASCUNHO,
    destaque: Boolean(product.destaque),
  };
}

function formToProduct(form, categoryName) {
  // Nome resolvido do select de categorias; produto legado sem categoryId
  // mantém o texto antigo até o admin escolher uma categoria real.
  const finalCategoryName = categoryName || form.legacyCategory || "";

  return {
    name: form.name.trim(),
    brand: form.brand.trim(),
    tags: form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    categoryId: form.categoryId || "",
    categoryName: finalCategoryName,
    category: finalCategoryName,
    description: form.description,
    images: form.images,
    price: parseBRLInput(form.priceText),
    promoPrice: parseBRLInput(form.promoPriceText),
    promoStart: parseDateInput(form.promoStart),
    promoEnd: parseDateInput(form.promoEnd, { endOfDay: true }),
    sku: form.sku.trim(),
    stock: form.stock === "" ? null : Number(form.stock),
    lowStockThreshold: Number(form.lowStockThreshold) || DEFAULT_LOW_STOCK_THRESHOLD,
    variations: form.variations.map((variation) => ({
      id: variation.id,
      attributes: { tamanho: variation.tamanho.trim(), cor: variation.cor.trim() },
      sku: variation.sku.trim(),
      price: parseBRLInput(variation.priceText),
      stock: Number(variation.stock) || 0,
    })),
    status: form.status,
    destaque: form.destaque,
  };
}

function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { toastSuccess, toastError } = useFeedback();
  const { removeProduct, duplicate } = useProducts();
  const { flat: categoryOptions } = useCategories();

  const [form, setForm] = useState(EMPTY_FORM);
  const [loaded, setLoaded] = useState(!isEdit);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftAvailable, setDraftAvailable] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const skipDraftRef = useRef(true);

  const setField = useCallback((field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const setImages = useCallback((updater) => {
    setForm((current) => ({
      ...current,
      images: typeof updater === "function" ? updater(current.images) : updater,
    }));
  }, []);

  // Carga inicial (edição) + detecção de rascunho automático salvo.
  useEffect(() => {
    const saved = localStorage.getItem(draftKey(id));

    if (saved) {
      try {
        setDraftAvailable(JSON.parse(saved));
      } catch {
        localStorage.removeItem(draftKey(id));
      }
    }

    if (!isEdit) {
      return;
    }

    getProduct(id)
      .then((product) => {
        if (!product) {
          setNotFound(true);
          return;
        }

        setForm(productToForm(product));
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoaded(true));
  }, [id, isEdit]);

  // Rascunho automático (research R-12): debounce de 1s no localStorage.
  // Imagens entram como URLs já enviadas; arquivos em upload não persistem.
  useEffect(() => {
    if (!loaded) {
      return;
    }

    if (skipDraftRef.current) {
      skipDraftRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      localStorage.setItem(draftKey(id), JSON.stringify(form));
    }, 1000);

    return () => clearTimeout(timer);
  }, [form, id, loaded]);

  function restoreDraft() {
    skipDraftRef.current = false;
    setForm(draftAvailable);
    setDraftAvailable(null);
  }

  function discardDraft() {
    localStorage.removeItem(draftKey(id));
    setDraftAvailable(null);
  }

  async function handleSave() {
    for (const [field, label] of [
      ["promoStart", "início da promoção"],
      ["promoEnd", "fim da promoção"],
    ]) {
      if (form[field] && !parseDateInput(form[field])) {
        toastError(`Data de ${label} inválida. Use o formato dd/mm/aaaa.`);
        return;
      }
    }

    setSaving(true);

    try {
      const selectedCategory = categoryOptions.find((option) => option.id === form.categoryId);
      const product = formToProduct(form, selectedCategory?.name);

      if (isEdit) {
        await updateProduct(id, product);
        toastSuccess("Produto atualizado com sucesso.");
      } else {
        await createProduct(product);
        toastSuccess("Produto cadastrado com sucesso.");
      }

      localStorage.removeItem(draftKey(id));
      navigate(-1);
    } catch (error) {
      toastError(error.message || "Erro ao salvar o produto.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDuplicate() {
    const newId = await duplicate(id);

    if (newId) {
      navigate(`${ROUTES.ADMIN_PRODUCTS}/${newId}`);
    }
  }

  async function handleDelete() {
    const ok = await removeProduct(id);

    setConfirmDelete(false);

    if (ok) {
      localStorage.removeItem(draftKey(id));
      navigate(ROUTES.ADMIN_PRODUCTS);
    }
  }

  const variationRows = useMemo(() => form.variations, [form.variations]);

  function addVariation() {
    setField("variations", [
      ...form.variations,
      {
        id: `var-${Date.now()}-${form.variations.length}`,
        tamanho: "",
        cor: "",
        sku: "",
        priceText: "",
        stock: "",
      },
    ]);
  }

  function updateVariation(index, field, value) {
    setField(
      "variations",
      form.variations.map((variation, i) =>
        i === index ? { ...variation, [field]: value } : variation
      )
    );
  }

  function removeVariation(index) {
    setField("variations", form.variations.filter((_, i) => i !== index));
  }

  if (notFound) {
    return (
      <EmptyState
        title="Produto não encontrado"
        description="O produto pode ter sido excluído."
        actionLabel="Voltar aos produtos"
        actionTo={ROUTES.ADMIN_PRODUCTS}
      />
    );
  }

  if (!loaded) {
    return <p className={styles.loading}>Carregando…</p>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{isEdit ? "Editar produto" : "Novo produto"}</h1>

        {isEdit && (
          <div className={styles.headerActions}>
            <Button size="small" startIcon={<ContentCopyIcon />} onClick={handleDuplicate}>
              Duplicar
            </Button>

            <Button
              size="small"
              color="error"
              startIcon={<DeleteOutlineOutlinedIcon />}
              onClick={() => setConfirmDelete(true)}
            >
              Excluir
            </Button>
          </div>
        )}
      </div>

      {draftAvailable && (
        <div className={styles.draftBanner} role="status">
          <span>Há um rascunho não salvo deste formulário. Deseja restaurá-lo?</span>

          <Button size="small" variant="contained" onClick={restoreDraft}>
            Restaurar
          </Button>

          <Button size="small" onClick={discardDraft}>
            Descartar
          </Button>
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Informações básicas</h2>

        <TextField
          fullWidth
          label="Nome do produto"
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
          margin="dense"
        />

        <div className={styles.row}>
          <TextField
            label="Marca"
            value={form.brand}
            onChange={(e) => setField("brand", e.target.value)}
            margin="dense"
            className={styles.rowField}
            helperText=" "
          />

          <TextField
            select
            label="Categoria"
            value={form.categoryId}
            onChange={(e) => setField("categoryId", e.target.value)}
            margin="dense"
            className={styles.rowField}
            helperText={
              form.legacyCategory && !form.categoryId
                ? `Categoria antiga: "${form.legacyCategory}" — escolha uma categoria real`
                : " "
            }
          >
            <MenuItem value="">Sem categoria</MenuItem>
            {categoryOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Tags (separadas por vírgula)"
            value={form.tags}
            onChange={(e) => setField("tags", e.target.value)}
            margin="dense"
            className={styles.rowField}
            helperText=" "
          />
        </div>

        <RichTextField
          label="Descrição"
          value={form.description}
          onChange={(value) => setField("description", value)}
          placeholder="Descreva o produto…"
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Imagens</h2>
        <ImagesSection images={form.images} onChange={setImages} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Preço e promoção</h2>

        <div className={styles.row}>
          <TextField
            label="Preço (R$)"
            value={form.priceText}
            onChange={(e) => setField("priceText", e.target.value)}
            margin="dense"
            className={styles.rowField}
          />

          <TextField
            label="Preço promocional (R$)"
            value={form.promoPriceText}
            onChange={(e) => setField("promoPriceText", e.target.value)}
            margin="dense"
            className={styles.rowField}
          />

          <TextField
            label="Início da promoção"
            value={form.promoStart}
            onChange={(e) => setField("promoStart", maskDateInput(e.target.value))}
            margin="dense"
            className={styles.rowField}
            placeholder="dd/mm/aaaa"
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { inputMode: "numeric" } }}
          />

          <TextField
            label="Fim da promoção"
            value={form.promoEnd}
            onChange={(e) => setField("promoEnd", maskDateInput(e.target.value))}
            margin="dense"
            className={styles.rowField}
            placeholder="dd/mm/aaaa"
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { inputMode: "numeric" } }}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Estoque</h2>

        <div className={styles.row}>
          <TextField
            label="SKU"
            value={form.sku}
            onChange={(e) => setField("sku", e.target.value)}
            margin="dense"
            className={styles.rowField}
            helperText="Código único no catálogo"
          />

          <TextField
            type="number"
            label="Quantidade em estoque"
            value={form.stock}
            onChange={(e) => setField("stock", e.target.value)}
            margin="dense"
            className={styles.rowField}
            disabled={form.variations.length > 0}
            helperText={form.variations.length > 0 ? "Com variações, o estoque é por variação" : " "}
          />

          <TextField
            type="number"
            label="Alerta de estoque baixo"
            value={form.lowStockThreshold}
            onChange={(e) => setField("lowStockThreshold", e.target.value)}
            margin="dense"
            className={styles.rowField}
            helperText="Avisar quando o estoque atingir este valor"
          />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Variações</h2>

          <Button size="small" startIcon={<AddIcon />} onClick={addVariation}>
            Adicionar variação
          </Button>
        </div>

        {variationRows.length === 0 ? (
          <p className={styles.hint}>
            Produto sem variações usa o estoque geral acima. Adicione variações para
            tamanhos/cores com estoque e SKU próprios.
          </p>
        ) : (
          variationRows.map((variation, index) => (
            <div key={variation.id} className={styles.variationRow}>
              <TextField
                size="small"
                label="Tamanho"
                value={variation.tamanho}
                onChange={(e) => updateVariation(index, "tamanho", e.target.value)}
                className={styles.variationField}
              />

              <TextField
                size="small"
                label="Cor"
                value={variation.cor}
                onChange={(e) => updateVariation(index, "cor", e.target.value)}
                className={styles.variationField}
              />

              <TextField
                size="small"
                label="SKU da variação"
                value={variation.sku}
                onChange={(e) => updateVariation(index, "sku", e.target.value)}
                className={styles.variationField}
              />

              <TextField
                size="small"
                label="Preço (opcional)"
                value={variation.priceText}
                onChange={(e) => updateVariation(index, "priceText", e.target.value)}
                className={styles.variationField}
                helperText="Vazio herda o preço do produto"
              />

              <TextField
                size="small"
                type="number"
                label="Estoque"
                value={variation.stock}
                onChange={(e) => updateVariation(index, "stock", e.target.value)}
                className={styles.variationField}
              />

              <IconButton
                onClick={() => removeVariation(index)}
                aria-label="Remover variação"
              >
                <DeleteOutlineOutlinedIcon />
              </IconButton>
            </div>
          ))
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Status</h2>

        <div className={styles.row}>
          <TextField
            select
            label="Status"
            value={form.status}
            onChange={(e) => setField("status", e.target.value)}
            margin="dense"
            className={styles.rowField}
            helperText="Publicar (ativo) exige nome, preço, imagem e estoque"
          >
            {Object.values(PRODUCT_STATUS).map((status) => (
              <MenuItem key={status} value={status}>
                {PRODUCT_STATUS_LABELS[status]}
              </MenuItem>
            ))}
          </TextField>

          <FormControlLabel
            control={
              <Checkbox
                checked={form.destaque}
                onChange={(e) => setField("destaque", e.target.checked)}
              />
            }
            label="Marcar como produto em destaque"
          />
        </div>
      </section>

      <div className={styles.footer}>
        <Button onClick={() => navigate(-1)} disabled={saving}>
          Cancelar
        </Button>

        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Salvar produto"}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir produto"
        message="Produtos com pedidos são excluídos logicamente (histórico preservado); os demais, definitivamente. Esta ação não pode ser desfeita."
        destructive
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}

export default ProductFormPage;
