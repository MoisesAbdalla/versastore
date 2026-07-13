import { useCallback, useState } from "react";

// Estado + validação campo a campo para os formulários de auth (feature 007).
// `schema` mapeia cada campo a um validador `(value, values) => erro|null`.
// Erros só aparecem em campos "tocados" (onBlur) ou após uma tentativa de
// submit (validateAll marca todos como tocados).
export function useAuthForm(initialValues, schema) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const runField = useCallback(
    (field, allValues) => {
      const validator = schema[field];
      const error = validator ? validator(allValues[field], allValues) : null;

      setErrors((prev) => ({ ...prev, [field]: error }));

      return error;
    },
    [schema]
  );

  const setField = useCallback(
    (field, value) => {
      setValues((prev) => {
        const next = { ...prev, [field]: value };

        // Revalida em tempo real apenas se o campo já foi tocado.
        setTouched((t) => {
          if (t[field]) {
            const validator = schema[field];
            setErrors((e) => ({ ...e, [field]: validator ? validator(value, next) : null }));
          }

          return t;
        });

        return next;
      });
    },
    [schema]
  );

  const blurField = useCallback(
    (field) => {
      setTouched((t) => ({ ...t, [field]: true }));
      setValues((v) => {
        runField(field, v);
        return v;
      });
    },
    [runField]
  );

  const validateAll = useCallback(() => {
    const allTouched = {};
    const nextErrors = {};
    let ok = true;

    for (const field of Object.keys(schema)) {
      allTouched[field] = true;
      const error = schema[field](values[field], values);
      nextErrors[field] = error;

      if (error) {
        ok = false;
      }
    }

    setTouched(allTouched);
    setErrors(nextErrors);

    return ok;
  }, [schema, values]);

  return { values, errors, touched, setField, blurField, validateAll, setValues };
}
