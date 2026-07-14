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
import AttributeEditor from "./AttributeEditor";
import {
  attributesFromProduct,
  variationsToForm,
  formVariationsToProduct,
  conflictsForRemoval,
  valueInUse,
  applyAttributeRemoval,
  newVariationId,
  normalizeAttributeValue,
  generateCombinations,
  remapAttributeName,
} from "./variationForm";
import { validateVariations } from "../../../../utils/variationValidation";
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
  attributes: [],
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
    // Atributos do produto (ou derivados das variações legadas) + variações
    // com valores num mapa por atributo (feature 008).
    attributes: attributesFromProduct(product),
    variations: variationsToForm(product.variations),
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
    // Atributos ordenados (nome + valores) e variações chaveadas por eles,
    // reusando o id de cada variação (R-2: id estável).
    attributes: (form.attributes || [])
      .map((attr) => ({
        name: (attr.name || "").trim(),
        values: (attr.values || []).map((value) => value.trim()).filter(Boolean),
      }))
      .filter((attr) => attr.name),
    variations: formVariationsToProduct(
      form.variations,
      (form.attributes || []).map((attr) => (attr.name || "").trim()).filter(Boolean)
    ),
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

    const selectedCategory = categoryOptions.find((option) => option.id === form.categoryId);
    const product = formToProduct(form, selectedCategory?.name);

    // Bloqueia salvar variações inconsistentes (FR-006): vazio, duplicado ou
    // conjunto divergente. O botão só prossegue com tudo válido.
    const consistency = validateVariations(product);

    if (!consistency.ok) {
      setVariationError(consistency.issues.join(" "));
      toastError("Corrija as variações antes de salvar.");
      return;
    }

    setVariationError(null);
    setSaving(true);

    try {

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
  const attributeNames = useMemo(
    () => (form.attributes || []).map((attr) => (attr.name || "").trim()).filter(Boolean),
    [form.attributes]
  );

  // Conflito de fusão pendente (remoção de atributo que colapsa variações — FR-008a).
  const [mergeConflict, setMergeConflict] = useState(null); // { attrName, nextNames, conflicts, resolutions }
  const [variationError, setVariationError] = useState(null);

  // ---- Atributos ------------------------------------------------------------
  function setAttributes(next) {
    setForm((current) => ({ ...current, attributes: next }));
  }

  function addAttribute() {
    setAttributes([...(form.attributes || []), { name: "", values: [] }]);
  }

  function renameAttribute(index, name) {
    const oldName = form.attributes[index]?.name || "";

    // Remapeia a chave nas variações junto — senão os valores escolhidos
    // ficariam órfãos sob o nome antigo (ex.: renomear "tamanho" → "Tamanho").
    setForm((current) => ({
      ...current,
      attributes: current.attributes.map((attr, i) => (i === index ? { ...attr, name } : attr)),
      variations: remapAttributeName(current.variations, oldName, name),
    }));
  }

  function addValue(index, value) {
    // Normaliza a caixa na entrada ("preto"/"AZUL"/"gg" → "Preto"/"Azul"/"GG")
    // p/ a loja não exibir valores visualmente inconsistentes.
    const normalized = normalizeAttributeValue(value);

    if (!normalized) {
      return;
    }

    setAttributes(
      form.attributes.map((attr, i) =>
        i === index && !(attr.values || []).includes(normalized)
          ? { ...attr, values: [...(attr.values || []), normalized] }
          : attr
      )
    );
  }

  function moveValue(index, valueIndex, dir) {
    const target = valueIndex + dir;

    setAttributes(
      form.attributes.map((attr, i) => {
        if (i !== index) return attr;

        const values = [...attr.values];

        if (target < 0 || target >= values.length) return attr;

        [values[valueIndex], values[target]] = [values[target], values[valueIndex]];

        return { ...attr, values };
      })
    );
  }

  function removeValue(index, value) {
    const attrName = (form.attributes[index]?.name || "").trim();

    // Bloqueia remover valor em uso por alguma variação (FR-008a).
    if (attrName && valueInUse(form.variations, attrName, value)) {
      toastError(`Há variações usando "${value}". Remova ou altere essas variações antes.`);
      return;
    }

    setAttributes(
      form.attributes.map((attr, i) =>
        i === index ? { ...attr, values: attr.values.filter((v) => v !== value) } : attr
      )
    );
  }

  function removeAttribute(index) {
    const attrName = (form.attributes[index]?.name || "").trim();
    const nextAttributes = form.attributes.filter((_, i) => i !== index);
    const nextNames = nextAttributes.map((attr) => (attr.name || "").trim()).filter(Boolean);

    const conflicts = attrName ? conflictsForRemoval(form.variations, nextNames) : [];

    if (conflicts.length > 0) {
      // Abre o passo de resolução (default: manter a primeira de cada grupo).
      setMergeConflict({
        attrName,
        nextAttributes,
        nextNames,
        conflicts,
        resolutions: Object.fromEntries(
          conflicts.map((group) => [group.combination, { mode: "keep", keepId: group.variationIds[0] }])
        ),
      });
      return;
    }

    // Sem conflito: remove o atributo e a chave dele das variações.
    setForm((current) => ({
      ...current,
      attributes: nextAttributes,
      variations: applyAttributeRemoval(current.variations, attrName, nextNames),
    }));
  }

  function confirmMergeConflict() {
    const { attrName, nextAttributes, nextNames, resolutions } = mergeConflict;

    setForm((current) => ({
      ...current,
      attributes: nextAttributes,
      variations: applyAttributeRemoval(current.variations, attrName, nextNames, resolutions),
    }));
    setMergeConflict(null);
  }

  function setConflictResolution(combination, patch) {
    setMergeConflict((current) => ({
      ...current,
      resolutions: {
        ...current.resolutions,
        [combination]: { ...current.resolutions[combination], ...patch },
      },
    }));
  }

  // ---- Variações ------------------------------------------------------------
  function addVariation() {
    setField("variations", [
      ...form.variations,
      { id: newVariationId(), values: {}, sku: "", priceText: "", stock: "" },
    ]);
  }

  // Produto cartesiano dos valores declarados (ex.: 4 tamanhos × 3 cores = 12
  // linhas de uma vez); linhas existentes ficam intactas (id estável) e o
  // lojista apaga as combinações que não existem.
  function generateAllCombinations() {
    setField("variations", generateCombinations(form.attributes, form.variations));
  }

  function updateVariationField(index, field, value) {
    setField(
      "variations",
      form.variations.map((variation, i) =>
        i === index ? { ...variation, [field]: value } : variation
      )
    );
  }

  function updateVariationValue(index, attrName, value) {
    setField(
      "variations",
      form.variations.map((variation, i) =>
        i === index ? { ...variation, values: { ...variation.values, [attrName]: value } } : variation
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
        <h2 className={styles.sectionTitle}>Variações</h2>

        <AttributeEditor
          attributes={form.attributes}
          onAddAttribute={addAttribute}
          onRenameAttribute={renameAttribute}
          onRemoveAttribute={removeAttribute}
          onAddValue={addValue}
          onMoveValue={moveValue}
          onRemoveValue={removeValue}
        />

        <div className={styles.sectionHeader}>
          <span className={styles.subLabel}>
            {attributeNames.length
              ? `Combinações (${attributeNames.join(" × ")})`
              : "Adicione atributos acima para criar variações"}
          </span>

          <div className={styles.variationActions}>
            <Button
              size="small"
              variant="outlined"
              onClick={generateAllCombinations}
              disabled={
                attributeNames.length === 0 ||
                form.attributes.some((attr) => attr.name.trim() && !(attr.values || []).length)
              }
            >
              Gerar combinações
            </Button>

            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={addVariation}
              disabled={attributeNames.length === 0}
            >
              Adicionar variação
            </Button>
          </div>
        </div>

        {variationError && (
          <p className={styles.variationError} role="alert">
            {variationError}
          </p>
        )}

        {variationRows.length === 0 ? (
          <p className={styles.hint}>
            Produto sem variações usa o estoque geral acima.
          </p>
        ) : (
          variationRows.map((variation, index) => (
            <div key={variation.id} className={styles.variationRow}>
              {attributeNames.map((name) => (
                <TextField
                  key={name}
                  select
                  size="small"
                  label={name}
                  value={variation.values?.[name] || ""}
                  onChange={(e) => updateVariationValue(index, name, e.target.value)}
                  className={styles.variationField}
                >
                  {(form.attributes.find((attr) => attr.name.trim() === name)?.values || []).map(
                    (value) => (
                      <MenuItem key={value} value={value}>
                        {value}
                      </MenuItem>
                    )
                  )}
                </TextField>
              ))}

              <TextField
                size="small"
                label="SKU da variação"
                value={variation.sku}
                onChange={(e) => updateVariationField(index, "sku", e.target.value)}
                className={styles.variationField}
              />

              <TextField
                size="small"
                label="Preço (opcional)"
                value={variation.priceText}
                onChange={(e) => updateVariationField(index, "priceText", e.target.value)}
                className={styles.variationField}
                helperText="Vazio herda o preço do produto"
              />

              <TextField
                size="small"
                type="number"
                label="Estoque"
                value={variation.stock}
                onChange={(e) => updateVariationField(index, "stock", e.target.value)}
                className={styles.variationField}
              />

              <IconButton onClick={() => removeVariation(index)} aria-label="Remover variação">
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

      <ConfirmDialog
        open={Boolean(mergeConflict)}
        title="Resolver variações duplicadas"
        message={
          mergeConflict
            ? `Remover "${mergeConflict.attrName}" faz variações diferentes virarem a mesma combinação. Escolha o que manter em cada caso:`
            : ""
        }
        confirmLabel="Aplicar"
        onConfirm={confirmMergeConflict}
        onClose={() => setMergeConflict(null)}
      >
        {mergeConflict?.conflicts.map((group) => {
          const resolution = mergeConflict.resolutions[group.combination];

          return (
            <div key={group.combination} className={styles.conflictGroup}>
              <p className={styles.conflictTitle}>Combinação “{group.combination}”</p>

              {group.variationIds.map((variationId) => {
                const row = form.variations.find((variation) => variation.id === variationId);

                return (
                  <FormControlLabel
                    key={variationId}
                    control={
                      <Checkbox
                        checked={resolution.mode === "keep" && resolution.keepId === variationId}
                        onChange={() =>
                          setConflictResolution(group.combination, { mode: "keep", keepId: variationId })
                        }
                      />
                    }
                    label={`Manter esta (estoque ${row?.stock || 0}${row?.sku ? `, SKU ${row.sku}` : ""})`}
                  />
                );
              })}

              <FormControlLabel
                control={
                  <Checkbox
                    checked={resolution.mode === "sum"}
                    onChange={() =>
                      setConflictResolution(group.combination, {
                        mode: "sum",
                        keepId: group.variationIds[0],
                      })
                    }
                  />
                }
                label="Somar os estoques numa única variação"
              />
            </div>
          );
        })}
      </ConfirmDialog>
    </div>
  );
}

export default ProductFormPage;
