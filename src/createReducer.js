import {
  ARRAY_INSERT,
  ARRAY_MOVE,
  ARRAY_POP,
  ARRAY_PUSH,
  ARRAY_REMOVE,
  ARRAY_REMOVE_ALL,
  ARRAY_SHIFT,
  ARRAY_SPLICE,
  ARRAY_SWAP,
  ARRAY_UNSHIFT,
  AUTOFILL,
  BLUR,
  CHANGE,
  CLEAR_ASYNC_ERROR,
  CLEAR_SUBMIT,
  CLEAR_SUBMIT_ERRORS,
  DESTROY,
  FOCUS,
  INITIALIZE,
  prefix,
  REGISTER_FIELD,
  RESET,
  SET_SUBMIT_FAILED,
  SET_SUBMIT_SUCCEEDED,
  START_ASYNC_VALIDATION,
  START_SUBMIT,
  STOP_ASYNC_VALIDATION,
  STOP_SUBMIT,
  SUBMIT,
  TOUCH,
  UNREGISTER_FIELD,
  UNTOUCH,
  UPDATE_SYNC_ERRORS,
  UPDATE_SYNC_WARNINGS
} from "./actionTypes";
import createDeleteInWithCleanUp from "./deleteInWithCleanUp";
import plain from "./structure/plain";

const isReduxFormAction = action =>
  action &&
  action.type &&
  action.type.length > prefix.length &&
  action.type.substring(0, prefix.length) === prefix;

function isObject(item) {
  return typeof item === "object" && !Array.isArray(item) && item !== null;
}

const createReducer = structure => {
  const {
    deepEqual,
    empty,
    getIn,
    setIn,
    deleteIn,
    fromJS,
    keys,
    size,
    splice
  } = structure;
  const deleteInWithCleanUp = createDeleteInWithCleanUp(structure);
  const doSplice = (state, key, field, index, removeNum, value, force) => {
    const existing = getIn(state, `${key}.${field}`);
    return existing || force
      ? setIn(
          state,
          `${key}.${field}`,
          splice(existing, index, removeNum, value)
        )
      : state;
  };
  const doPlainSplice = (state, key, field, index, removeNum, value, force) => {
    const slice = getIn(state, key);
    const existing = plain.getIn(slice, field);
    return existing || force
      ? setIn(
          state,
          key,
          plain.setIn(
            slice,
            field,
            plain.splice(existing, index, removeNum, value)
          )
        )
      : state;
  };
  const rootKeys = ["values", "fields", "submitErrors", "asyncErrors"];
  const arraySplice = (state, field, index, removeNum, value) => {
    let result = state;
    const nonValuesValue = value != null ? empty : undefined;
    result = doSplice(result, "values", field, index, removeNum, value, true);
    result = doSplice(
      result,
      "fields",
      field,
      index,
      removeNum,
      nonValuesValue
    );
    result = doPlainSplice(
      result,
      "syncErrors",
      field,
      index,
      removeNum,
      undefined
    );
    result = doPlainSplice(
      result,
      "syncWarnings",
      field,
      index,
      removeNum,
      undefined
    );
    result = doSplice(
      result,
      "submitErrors",
      field,
      index,
      removeNum,
      undefined
    );
    result = doSplice(
      result,
      "asyncErrors",
      field,
      index,
      removeNum,
      undefined
    );
    return result;
  };

  const behaviors = {
    [ARRAY_INSERT](state, { meta: { field, index }, payload }) {
      return arraySplice(state, field, index, 0, payload);
    },
    [ARRAY_MOVE](state, { meta: { field, from, to } }) {
      const array = getIn(state, `values.${field}`);
      const length = array ? size(array) : 0;
      let result = state;
      if (length) {
        rootKeys.forEach(key => {
          const path = `${key}.${field}`;
          if (getIn(result, path)) {
            const value = getIn(result, `${path}[${from}]`);
            result = setIn(result, path, splice(getIn(result, path), from, 1)); // remove
            result = setIn(
              result,
              path,
              splice(getIn(result, path), to, 0, value)
            ); // insert
          }
        });
      }
      return result;
    },
    [ARRAY_POP](state, { meta: { field } }) {
      const array = getIn(state, `values.${field}`);
      const length = array ? size(array) : 0;
      return length ? arraySplice(state, field, length - 1, 1) : state;
    },
    [ARRAY_PUSH](state, { meta: { field }, payload }) {
      const array = getIn(state, `values.${field}`);
      const length = array ? size(array) : 0;
      return arraySplice(state, field, length, 0, payload);
    },
    [ARRAY_REMOVE](state, { meta: { field, index } }) {
      return arraySplice(state, field, index, 1);
    },
    [ARRAY_REMOVE_ALL](state, { meta: { field } }) {
      const array = getIn(state, `values.${field}`);
      const length = array ? size(array) : 0;
      return length ? arraySplice(state, field, 0, length) : state;
    },
    [ARRAY_SHIFT](state, { meta: { field } }) {
      return arraySplice(state, field, 0, 1);
    },
    [ARRAY_SPLICE](state, { meta: { field, index, removeNum }, payload }) {
      return arraySplice(state, field, index, removeNum, payload);
    },
    [ARRAY_SWAP](state, { meta: { field, indexA, indexB } }) {
      let result = state;
      rootKeys.forEach(key => {
        const valueA = getIn(result, `${key}.${field}[${indexA}]`);
        const valueB = getIn(result, `${key}.${field}[${indexB}]`);
        if (valueA !== undefined || valueB !== undefined) {
          result = setIn(result, `${key}.${field}[${indexA}]`, valueB);
          result = setIn(result, `${key}.${field}[${indexB}]`, valueA);
        }
      });
      return result;
    },
    [ARRAY_UNSHIFT](state, { meta: { field }, payload }) {
      return arraySplice(state, field, 0, 0, payload);
    },
    [AUTOFILL](state, { meta: { field }, payload }) {
      let result = state;
      result = deleteInWithCleanUp(result, `asyncErrors.${field}`);
      result = deleteInWithCleanUp(result, `submitErrors.${field}`);
      result = setIn(result, `fields.${field}.autofilled`, true);
      result = setIn(result, `values.${field}`, payload);
      return result;
    },
    [BLUR](state, { meta: { field, touch }, payload }) {
      let result = state;
      const initial = getIn(result, `initial.${field}`);
      if (initial === undefined && payload === "") {
        result = deleteInWithCleanUp(result, `values.${field}`);
      } else if (payload !== undefined) {
        result = setIn(result, `values.${field}`, payload);
      }
      if (field === getIn(result, "active")) {
        result = deleteIn(result, "active");
      }
      result = deleteIn(result, `fields.${field}.active`);
      if (touch) {
        result = setIn(result, `fields.${field}.touched`, true);
        result = setIn(result, "anyTouched", true);
      }
      return result;
    },
    [CHANGE](
      state,
      { meta: { field, touch, persistentSubmitErrors }, payload }
    ) {
      let result = state;
      const initial = getIn(result, `initial.${field}`);
      if (initial === undefined && payload === "") {
        result = deleteInWithCleanUp(result, `values.${field}`);
      } else if (payload !== undefined) {
        result = setIn(result, `values.${field}`, payload);
      }
      result = deleteInWithCleanUp(result, `asyncErrors.${field}`);
      if (!persistentSubmitErrors) {
        result = deleteInWithCleanUp(result, `submitErrors.${field}`);
      }
      result = deleteInWithCleanUp(result, `fields.${field}.autofilled`);
      if (touch) {
        result = setIn(result, `fields.${field}.touched`, true);
        result = setIn(result, "anyTouched", true);
      }
      return result;
    },
    [CLEAR_SUBMIT](state) {
      return deleteIn(state, "triggerSubmit");
    },
    [CLEAR_SUBMIT_ERRORS](state) {
      return deleteInWithCleanUp(state, "submitErrors");
    },
    [CLEAR_ASYNC_ERROR](state, { meta: { field } }) {
      return deleteIn(state, `asyncErrors.${field}`);
    },
    [FOCUS](state, { meta: { field } }) {
      let result = state;
      const previouslyActive = getIn(state, "active");
      result = deleteIn(result, `fields.${previouslyActive}.active`);
      result = setIn(result, `fields.${field}.visited`, true);
      result = setIn(result, `fields.${field}.active`, true);
      result = setIn(result, "active", field);
      return result;
    },
    [INITIALIZE](state, { payload, meta: { keepDirty, keepSubmitSucceeded } }) {
      const mapData = fromJS(payload);
      let result = empty; // clean all field state

      // persist old warnings, they will get recalculated if the new form values are different from the old values
      const warning = getIn(state, "warning");
      if (warning) {
        result = setIn(result, "warning", warning);
      }
      const syncWarnings = getIn(state, "syncWarnings");
      if (syncWarnings) {
        result = setIn(result, "syncWarnings", syncWarnings);
      }

      // persist old errors, they will get recalculated if the new form values are different from the old values
      const error = getIn(state, "error");
      if (error) {
        result = setIn(result, "error", error);
      }
      const syncErrors = getIn(state, "syncErrors");
      if (syncErrors) {
        result = setIn(result, "syncErrors", syncErrors);
      }

      const registeredFields = getIn(state, "registeredFields");
      if (registeredFields) {
        result = setIn(result, "registeredFields", registeredFields);
      }

      const previousValues = getIn(state, "values");
      const previousInitialValues = getIn(state, "initial");
      const newInitialValues = mapData;

      let newValues = previousValues;

      if (keepDirty && registeredFields) {
        if (!deepEqual(newInitialValues, previousInitialValues)) {
          //
          // Keep the value of dirty fields while updating the value of
          // pristine fields. This way, apps can reinitialize forms while
          // avoiding stomping on user edits.
          //
          // Note 1: The initialize action replaces all initial values
          // regardless of keepDirty.
          //
          // Note 2: When a field is dirty, keepDirty is enabled, and the field
          // value is the same as the new initial value for the field, the
          // initialize action causes the field to become pristine. That effect
          // is what we want.
          //
          keys(registeredFields).forEach(name => {
            const previousInitialValue = getIn(previousInitialValues, name);
            const previousValue = getIn(previousValues, name);

            if (deepEqual(previousValue, previousInitialValue)) {
              // Overwrite the old pristine value with the new pristine value
              const newInitialValue = getIn(newInitialValues, name);
              newValues = setIn(newValues, name, newInitialValue);
            }
          });

          var setNewValues = function(
            initialValues,
            previousInitialValues,
            prename
          ) {
            keys(initialValues).forEach(function(name) {
              var previousInitialValue = getIn(previousInitialValues, name);
              var newInitialValue = getIn(initialValues, name);
              var setName = prename ? `${prename}.${name}` : name;
              if (typeof previousInitialValue === "undefined") {
                // Add new values at the root level.
                newValues = setIn(newValues, setName, newInitialValue);
              } else if (isObject(newInitialValue)) {
                setNewValues(newInitialValue, previousInitialValue, setName);
              }
            });
          };

          setNewValues(newInitialValues, previousInitialValues);

          // keys(newInitialValues).forEach(name => {
          //   const previousInitialValue = getIn(previousInitialValues, name)
          //   if (typeof previousInitialValue === 'undefined') {
          //     // Add new values at the root level.
          //     const newInitialValue = getIn(newInitialValues, name)
          //     newValues = setIn(newValues, name, newInitialValue)
          //   }
          // })
        }
      } else {
        newValues = newInitialValues;
      }

      if (keepSubmitSucceeded && getIn(state, "submitSucceeded")) {
        result = setIn(result, "submitSucceeded", true);
      }
      result = setIn(result, "values", newValues);
      result = setIn(result, "initial", newInitialValues);
      return result;
    },
    [REGISTER_FIELD](state, { payload: { name, type } }) {
      const key = `registeredFields['${name}']`;
      let field = getIn(state, key);
      if (field) {
        const count = getIn(field, "count") + 1;
        field = setIn(field, "count", count);
      } else {
        field = fromJS({ name, type, count: 1 });
      }
      return setIn(state, key, field);
    },
    [RESET](state) {
      let result = empty;
      const registeredFields = getIn(state, "registeredFields");
      if (registeredFields) {
        result = setIn(result, "registeredFields", registeredFields);
      }
      const values = getIn(state, "initial");
      if (values) {
        result = setIn(result, "values", values);
        result = setIn(result, "initial", values);
      }
      return result;
    },
    [SUBMIT](state) {
      return setIn(state, "triggerSubmit", true);
    },
    [START_ASYNC_VALIDATION](state, { meta: { field } }) {
      return setIn(state, "asyncValidating", field || true);
    },
    [START_SUBMIT](state) {
      return setIn(state, "submitting", true);
    },
    [STOP_ASYNC_VALIDATION](state, { payload }) {
      let result = state;
      result = deleteIn(result, "asyncValidating");
      if (payload && Object.keys(payload).length) {
        const { _error, ...fieldErrors } = payload;
        if (_error) {
          result = setIn(result, "error", _error);
        }
        if (Object.keys(fieldErrors).length) {
          result = setIn(result, "asyncErrors", fromJS(fieldErrors));
        } else {
          result = deleteIn(result, "asyncErrors");
        }
      } else {
        result = deleteIn(result, "error");
        result = deleteIn(result, "asyncErrors");
      }
      return result;
    },
    [STOP_SUBMIT](state, { payload }) {
      let result = state;
      result = deleteIn(result, "submitting");
      result = deleteIn(result, "submitFailed");
      result = deleteIn(result, "submitSucceeded");
      if (payload && Object.keys(payload).length) {
        const { _error, ...fieldErrors } = payload;
        if (_error) {
          result = setIn(result, "error", _error);
        } else {
          result = deleteIn(result, "error");
        }
        if (Object.keys(fieldErrors).length) {
          result = setIn(result, "submitErrors", fromJS(fieldErrors));
        } else {
          result = deleteIn(result, "submitErrors");
        }
        result = setIn(result, "submitFailed", true);
      } else {
        result = setIn(result, "submitSucceeded", true);
        result = deleteIn(result, "error");
        result = deleteIn(result, "submitErrors");
      }
      return result;
    },
    [SET_SUBMIT_FAILED](state, { meta: { fields } }) {
      let result = state;
      result = setIn(result, "submitFailed", true);
      result = deleteIn(result, "submitSucceeded");
      result = deleteIn(result, "submitting");
      fields.forEach(
        field => (result = setIn(result, `fields.${field}.touched`, true))
      );
      if (fields.length) {
        result = setIn(result, "anyTouched", true);
      }
      return result;
    },
    [SET_SUBMIT_SUCCEEDED](state) {
      let result = state;
      result = deleteIn(result, "submitFailed");
      result = setIn(result, "submitSucceeded", true);
      return result;
    },
    [TOUCH](state, { meta: { fields } }) {
      let result = state;
      fields.forEach(
        field => (result = setIn(result, `fields.${field}.touched`, true))
      );
      result = setIn(result, "anyTouched", true);
      return result;
    },
    [UNREGISTER_FIELD](state, { payload: { name, destroyOnUnmount } }) {
      let result = state;
      const key = `registeredFields['${name}']`;
      let field = getIn(result, key);
      if (!field) {
        return result;
      }

      const count = getIn(field, "count") - 1;
      if (count <= 0 && destroyOnUnmount) {
        // Note: Cannot use deleteWithCleanUp here because of the flat nature of registeredFields
        result = deleteIn(result, key);
        if (deepEqual(getIn(result, "registeredFields"), empty)) {
          result = deleteIn(result, "registeredFields");
        }
      } else {
        field = setIn(field, "count", count);
        result = setIn(result, key, field);
      }
      if (destroyOnUnmount) {
        result = deleteInWithCleanUp(result, `syncErrors.${name}`);
        result = deleteInWithCleanUp(result, `submitErrors.${name}`);
        result = deleteInWithCleanUp(result, `asyncErrors.${name}`);
        result = deleteInWithCleanUp(result, `syncWarnings.${name}`);
      }
      return result;
    },
    [UNTOUCH](state, { meta: { fields } }) {
      let result = state;
      fields.forEach(
        field => (result = deleteIn(result, `fields.${field}.touched`))
      );
      const anyTouched = keys(getIn(result, "registeredFields")).some(key =>
        getIn(result, `fields.${key}.touched`)
      );
      result = anyTouched
        ? setIn(result, "anyTouched", true)
        : deleteIn(result, "anyTouched");
      return result;
    },
    [UPDATE_SYNC_ERRORS](state, { payload: { syncErrors, error } }) {
      let result = state;
      if (error) {
        result = setIn(result, "error", error);
        result = setIn(result, "syncError", true);
      } else {
        result = deleteIn(result, "error");
        result = deleteIn(result, "syncError");
      }
      if (Object.keys(syncErrors).length) {
        result = setIn(result, "syncErrors", syncErrors);
      } else {
        result = deleteIn(result, "syncErrors");
      }
      return result;
    },
    [UPDATE_SYNC_WARNINGS](state, { payload: { syncWarnings, warning } }) {
      let result = state;
      if (warning) {
        result = setIn(result, "warning", warning);
      } else {
        result = deleteIn(result, "warning");
      }
      if (Object.keys(syncWarnings).length) {
        result = setIn(result, "syncWarnings", syncWarnings);
      } else {
        result = deleteIn(result, "syncWarnings");
      }
      return result;
    }
  };

  const reducer = (state = empty, action) => {
    const behavior = behaviors[action.type];
    return behavior ? behavior(state, action) : state;
  };

  const byForm = reducer => (state = empty, action = {}) => {
    const form = action && action.meta && action.meta.form;
    if (!form || !isReduxFormAction(action)) {
      return state;
    }
    if (action.type === DESTROY) {
      return action.meta.form.reduce(
        (result, form) => deleteInWithCleanUp(result, form),
        state
      );
    }
    const formState = getIn(state, form);
    const result = reducer(formState, action);
    return result === formState ? state : setIn(state, form, result);
  };

  /**
   * Adds additional functionality to the reducer
   */
  function decorate(target) {
    target.plugin = function plugin(reducers) {
      // use 'function' keyword to enable 'this'
      return decorate((state = empty, action = {}) =>
        Object.keys(reducers).reduce((accumulator, key) => {
          const previousState = getIn(accumulator, key);
          const nextState = reducers[key](
            previousState,
            action,
            getIn(state, key)
          );
          return nextState === previousState
            ? accumulator
            : setIn(accumulator, key, nextState);
        }, this(state, action))
      );
    };

    return target;
  }

  return decorate(byForm(reducer));
};

export default createReducer;
