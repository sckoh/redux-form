import React from 'react'
import { Field, FieldArray, reduxForm, getFormValues } from 'redux-form/immutable'
import TextField from 'material-ui/TextField'
import SelectField from 'material-ui/SelectField'
import MenuItem from 'material-ui/MenuItem'
import { RadioButton, RadioButtonGroup } from 'material-ui/RadioButton';
import { Map, List, fromJS } from 'immutable';
import { connect } from 'react-redux';

const FORM_KEY_COMMNAME = 'commName';
const FORM_KEY_EVENT = 'event';
const FORM_KEY_CONDITIONS = 'conditions';
const FORM_KEY_CONDITION_ATTRIBUTE = 'attribute';
const FORM_KEY_CONDITION_OPERATION = 'operation';
const FORM_KEY_CONDITION_VALUE = 'value';
const FORM_KEY_CONDITION_OPERATOR = 'operator';

const attrOptions = {
  'Route A': [
    {
      value: 'maxDist',
      primaryText: 'maxDist',
    },
    {
      value: 'minDist',
      primaryText: 'minDist',
    },
  ],
  'Route B': [
    {
      value: 'maxDist',
      primaryText: 'maxDist',
    },
  ],
  'Route C': [
    {
      value: 'minDist',
      primaryText: 'minDist',
    },
  ],
}

const operationOptions = [
  {
    value: '==',
    primaryText: '==',
  },
  {
    value: '>=',
    primaryText: '>=',
  },
];

const validate = values => {
  const errors = {}
  const required = (value) => value !== undefined && value !== null && value !== '';
  if (!required(values.get(FORM_KEY_COMMNAME))) {
    errors[FORM_KEY_COMMNAME] = 'Field required';
  }
  if (!required(values.get(FORM_KEY_EVENT))) {
    errors[FORM_KEY_EVENT] = 'Field required';
  }
  const conditionsArrayErrors = [];
  values.get(FORM_KEY_CONDITIONS, new List()).forEach((condition, index) => {
    const conditionsErrors = {};
    if (!required(condition.get(FORM_KEY_CONDITION_ATTRIBUTE))) {
      conditionsErrors[FORM_KEY_CONDITION_ATTRIBUTE] = 'Field required';
      conditionsArrayErrors[index] = conditionsErrors;
    }
    if (!required(condition.get(FORM_KEY_CONDITION_OPERATION))) {
      conditionsErrors[FORM_KEY_CONDITION_OPERATION] = 'Field required';
      conditionsArrayErrors[index] = conditionsErrors;
    }
    if (!required(condition.get(FORM_KEY_CONDITION_VALUE))) {
      conditionsErrors[FORM_KEY_CONDITION_VALUE] = 'Field required';
      conditionsArrayErrors[index] = conditionsErrors;
    }
  });
  if (conditionsArrayErrors.length) {
    errors[FORM_KEY_CONDITIONS] = conditionsArrayErrors;
  }
  return errors
}

const renderTextField = ({ input, label, meta: { touched, error }, ...custom }) => (
  <TextField hintText={label}
    floatingLabelText={label}
    errorText={touched && error}
    {...input}
    {...custom}
  />
)

const renderSelectField = ({ input, label, meta: { touched, error }, children, ...custom }) => (
  <SelectField
    floatingLabelText={label}
    errorText={touched && error}
    {...input}
    onChange={(event, index, value) => input.onChange(value)}
    children={children}
    {...custom}/>
)

const renderRadioGroup = ({ input, ...rest }) => (
  <RadioButtonGroup
    {...input}
    {...rest}
    valueSelected={input.value}
    onChange={(event, value) => input.onChange(value)}
  />
)

const renderConditionFields = ({ fields, selectedEvent }) => {
  return (
    <div>
      {fields.map((condition, index, { get }) => {
        const conditionValue = get().get(index) || new Map();
        const attr = conditionValue.get(FORM_KEY_CONDITION_ATTRIBUTE);
        const attrFieldOptions = selectedEvent ? attrOptions[selectedEvent] || [] : [];
        const operationFieldOptions = attr ? operationOptions : [];
        return (
          <div key={index}>
            <div style={{ display: 'flex', flex: '0 0 auto', flexDirection: 'column', background: 'white' }}>
              <Field
                name={`${condition}.${FORM_KEY_CONDITION_ATTRIBUTE}`}
                component={renderSelectField}
                label="Attribute"
                disabled={!selectedEvent}
              >
                {attrFieldOptions.map((attr, index) => (
                  <MenuItem key={index} {...attr} />
                ))}
              </Field>
              <Field
                name={`${condition}.${FORM_KEY_CONDITION_OPERATION}`}
                component={renderSelectField}
                label="Operation"
                disabled={!conditionValue.get(FORM_KEY_CONDITION_ATTRIBUTE)}
              >
                {operationFieldOptions.map((op, index) => (
                  <MenuItem key={index} {...op} />
                ))}
              </Field>
              <Field
                name={`${condition}.${FORM_KEY_CONDITION_VALUE}`}
                component={renderTextField}
                label="Value"
                disabled={!conditionValue.get(FORM_KEY_CONDITION_OPERATION)}
              />
            </div>
            {(fields.length - 1) !== index ?
              <div>
                <Field
                  name={`${condition}.${FORM_KEY_CONDITION_OPERATOR}`}
                  component={renderRadioGroup}
                >
                  <RadioButton value="OR" label="OR" />
                  <RadioButton value="AND" label="AND" />
                </Field>
              </div>
            : null}
            {(fields.length - 1) !== 0 ? <div style={{ display: 'flex', flex: '0 0 auto', flexDirection: 'column' }}>
              <span
                style={{ padding: '1em' }}
                onClick={() => fields.remove(index)}
              >Remove
              </span>
            </div>
            : null}
          </div>
        );
      })}
      <div style={{ margin: '1.5em' }}>
        <span onClick={() => fields.push(new Map({ [FORM_KEY_CONDITION_OPERATOR]: 'AND' }))}>+ New condition</span>
      </div>
    </div>
  );
};

let MaterialUiForm = props => {
  const { handleSubmit, pristine, submitting, formValues } = props
  console.log('selectedEvent', formValues ? formValues.get(FORM_KEY_EVENT) : undefined);

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <Field name={FORM_KEY_COMMNAME} component={renderTextField} label="Title"/>
      </div>
      <div>
        <Field name={FORM_KEY_EVENT} component={renderSelectField} label="Event">
          <MenuItem value={'Route A'} primaryText="Route A"/>
          <MenuItem value={'Route B'} primaryText="Route B"/>
          <MenuItem value={'Route C'} primaryText="Route B"/>
        </Field>
      </div>
      <div>
        <FieldArray
          name={FORM_KEY_CONDITIONS}
          component={renderConditionFields}
          selectedEvent={formValues ? formValues.get(FORM_KEY_EVENT) : null}
          formValues={formValues}
        />
      </div>
      <div>
        <button type="submit" disabled={pristine || submitting}>Submit</button>
      </div>
    </form>
  )
}

MaterialUiForm = reduxForm({
  form: 'MaterialUiForm',  // a unique identifier for this form
  validate,
})(MaterialUiForm)

const mapStateToProps = (state) => ({
  initialValues: fromJS({
    [FORM_KEY_CONDITIONS]: [{
      [FORM_KEY_CONDITION_OPERATOR]: 'AND',
    }],
  }),
  formValues: getFormValues('MaterialUiForm')(state),
});

export default connect(mapStateToProps)(MaterialUiForm)
