import { useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Skeleton from "@mui/material/Skeleton";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import SubdirectoryArrowRightIcon from "@mui/icons-material/SubdirectoryArrowRight";

import ConfirmDialog from "../../../components/ConfirmDialog";
import EmptyState from "../../../components/EmptyState";
import { useCategories } from "../../../hooks/useCategories";
import { uploadImageWithRetry } from "../../../services/cloudinaryService";
import { useFeedback } from "../../../contexts/FeedbackContext";
import { slugify } from "../../../utils/slugify";
import styles from "./styles.module.css";

const EMPTY_CATEGORY = { name: "", slug: "", description: "", image: "", parentId: "" };

function CategoryRow({ category, depth, onEdit, onDelete, onAddChild }) {
  return (
    <li className={styles.row} style={{ paddingLeft: depth * 28 }}>
      {depth > 0 && <SubdirectoryArrowRightIcon fontSize="small" className={styles.childIcon} />}

      {category.image ? (
        <img className={styles.thumb} src={category.image} alt={category.name} />
      ) : (
        <span className={styles.thumbFallback} aria-hidden="true" />
      )}

      <div className={styles.rowInfo}>
        <span className={styles.rowName}>{category.name}</span>
        <span className={styles.rowSlug}>/{category.slug}</span>
      </div>

      <div className={styles.rowActions}>
        {depth === 0 && (
          <Button size="small" startIcon={<AddIcon />} onClick={() => onAddChild(category)}>
            Subcategoria
          </Button>
        )}

        <IconButton size="small" onClick={() => onEdit(category)} aria-label={`Editar ${category.name}`}>
          <EditOutlinedIcon fontSize="small" />
        </IconButton>

        <IconButton size="small" onClick={() => onDelete(category)} aria-label={`Excluir ${category.name}`}>
          <DeleteOutlineOutlinedIcon fontSize="small" />
        </IconButton>
      </div>
    </li>
  );
}

function CategoriesPage() {
  const { tree, flat, loading, error, refresh, create, update, remove, move } = useCategories();
  const { toastError } = useFeedback();

  const [dialog, setDialog] = useState(null); // { mode: "create" | "edit", id? }
  const [form, setForm] = useState(EMPTY_CATEGORY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState(null); // categoria alvo do ConfirmDialog
  const [moveTarget, setMoveTarget] = useState(""); // destino no fluxo de mover
  const [moveDialogFor, setMoveDialogFor] = useState(null);

  function openCreate(parent = null) {
    setForm({ ...EMPTY_CATEGORY, parentId: parent ? parent.id : "" });
    setSlugTouched(false);
    setDialog({ mode: "create" });
  }

  function openEdit(category) {
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      image: category.image || "",
      parentId: category.parentId || "",
    });
    setSlugTouched(true);
    setDialog({ mode: "edit", id: category.id });
  }

  function setName(name) {
    setForm((current) => ({
      ...current,
      name,
      slug: slugTouched ? current.slug : slugify(name),
    }));
  }

  async function handleImageFile(file) {
    if (!file) {
      return;
    }

    setUploading(true);

    try {
      const url = await uploadImageWithRetry(file);
      setForm((current) => ({ ...current, image: url }));
    } catch (uploadError) {
      toastError(uploadError.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);

    const payload = {
      name: form.name,
      slug: form.slug,
      description: form.description,
      image: form.image,
      parentId: form.parentId || null,
    };

    const ok =
      dialog.mode === "create" ? await create(payload) : await update(dialog.id, payload);

    setSaving(false);

    if (ok) {
      setDialog(null);
    }
  }

  async function handleDelete() {
    const category = deleting;

    setDeleting(null);

    const result = await remove(category.id);

    if (!result.ok && result.code === "categoria-com-produtos") {
      setMoveTarget("");
      setMoveDialogFor(category);
    }
  }

  async function handleMoveAndDelete() {
    const category = moveDialogFor;

    if (!moveTarget) {
      return;
    }

    const moved = await move(category.id, moveTarget);

    if (moved) {
      setMoveDialogFor(null);
      await remove(category.id);
    }
  }

  const rootOptions = flat.filter((c) => !c.parentId && c.id !== dialog?.id);
  const moveOptions = flat.filter((c) => c.id !== moveDialogFor?.id);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Categorias</h1>

        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openCreate()}>
          Nova categoria
        </Button>
      </div>

      {error ? (
        <div className={styles.errorState} role="alert">
          <p>Não foi possível carregar as categorias. Verifique sua conexão.</p>
          <Button variant="outlined" onClick={refresh}>
            Tentar novamente
          </Button>
        </div>
      ) : loading ? (
        <ul className={styles.list}>
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className={styles.row}>
              <Skeleton variant="rectangular" width={40} height={40} />
              <Skeleton width="40%" />
            </li>
          ))}
        </ul>
      ) : tree.length === 0 ? (
        <EmptyState
          title="Nenhuma categoria criada"
          description="Crie sua primeira categoria para organizar o catálogo da loja."
        />
      ) : (
        <ul className={styles.list}>
          {tree.map((root) => (
            <div key={root.id}>
              <CategoryRow
                category={root}
                depth={0}
                onEdit={openEdit}
                onDelete={setDeleting}
                onAddChild={openCreate}
              />

              {(root.children || []).map((child) => (
                <CategoryRow
                  key={child.id}
                  category={child}
                  depth={1}
                  onEdit={openEdit}
                  onDelete={setDeleting}
                  onAddChild={() => {}}
                />
              ))}
            </div>
          ))}
        </ul>
      )}

      <Dialog open={dialog !== null} onClose={() => setDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          {dialog?.mode === "create" ? "Nova categoria" : "Editar categoria"}
        </DialogTitle>

        <DialogContent className={styles.dialogContent}>
          <TextField
            autoFocus
            fullWidth
            label="Nome"
            value={form.name}
            onChange={(e) => setName(e.target.value)}
            margin="dense"
          />

          <TextField
            fullWidth
            label="Slug"
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true);
              setForm((current) => ({ ...current, slug: e.target.value }));
            }}
            margin="dense"
            helperText="Identificador na URL da loja (gerado do nome; editável)"
          />

          <TextField
            fullWidth
            label="Descrição (opcional)"
            value={form.description}
            onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
            margin="dense"
            multiline
            rows={2}
          />

          <TextField
            select
            fullWidth
            label="Categoria pai (opcional)"
            value={form.parentId}
            onChange={(e) => setForm((current) => ({ ...current, parentId: e.target.value }))}
            margin="dense"
            helperText="Deixe vazio para categoria raiz (máximo de 2 níveis)"
          >
            <MenuItem value="">Nenhuma (categoria raiz)</MenuItem>
            {rootOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.name}
              </MenuItem>
            ))}
          </TextField>

          <div className={styles.imageField}>
            {form.image && <img className={styles.imagePreview} src={form.image} alt="Categoria" />}

            <Button component="label" variant="outlined" size="small" disabled={uploading}>
              {uploading ? "Enviando…" : form.image ? "Trocar imagem" : "Imagem (opcional)"}
              <input
                type="file"
                hidden
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleImageFile(e.target.files[0])}
              />
            </Button>
          </div>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDialog(null)} disabled={saving}>
            Cancelar
          </Button>

          <Button variant="contained" onClick={handleSave} disabled={saving || uploading}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        title="Excluir categoria"
        message={`Excluir a categoria "${deleting?.name}"? Se houver produtos nela, você poderá movê-los antes.`}
        destructive
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />

      <Dialog open={moveDialogFor !== null} onClose={() => setMoveDialogFor(null)} fullWidth maxWidth="xs">
        <DialogTitle>Mover produtos antes de excluir</DialogTitle>

        <DialogContent className={styles.dialogContent}>
          <p className={styles.moveHint}>
            A categoria "{moveDialogFor?.name}" possui produtos. Escolha para onde movê-los;
            em seguida a categoria será excluída.
          </p>

          <TextField
            select
            fullWidth
            label="Mover produtos para"
            value={moveTarget}
            onChange={(e) => setMoveTarget(e.target.value)}
            margin="dense"
          >
            {moveOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setMoveDialogFor(null)}>Cancelar</Button>

          <Button variant="contained" color="error" disabled={!moveTarget} onClick={handleMoveAndDelete}>
            Mover e excluir
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default CategoriesPage;
