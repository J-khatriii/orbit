import { useState } from "react";
import { fieldErrorsOf } from "../../lib/api.js";

// Holds one form's values and messages, so each screen only describes its fields.
//   handleChange(name)            -> an onChange handler for that field
//   handleSubmit(validate, run)   -> an onSubmit handler
//     validate(values) returns { field: message }; an empty object means "go ahead"
//     run(values, { onError }) is usually a mutation's `mutate` function
//     codeFields maps a server error code to a field, e.g. { EMAIL_TAKEN: "email" }
export const useAuthForm = (initialValues) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");

  const handleChange = (name) => {
    return (event) => {
      const { value } = event.target;

      setValues((current) => {
        return { ...current, [name]: value };
      });

      setErrors((current) => {
        return { ...current, [name]: undefined };
      });
    };
  };

  const handleSubmit = (validate, run, codeFields = {}) => {
    return (event) => {
      event.preventDefault();
      setFormError("");

      const problems = validate(values);

      setErrors(problems);
      if (Object.keys(problems).length > 0) {
        return;
      }

      run(values, {
        onError: (error) => {
          const fields = fieldErrorsOf(error);
          const codeField = codeFields[error.code];

          if (Object.keys(fields).length > 0) {
            setErrors(fields);
          } else if (codeField) {
            setErrors({ [codeField]: error.message });
          } else {
            setFormError(error.message);
          }
        },
      });
    };
  };

  return { values, errors, formError, handleChange, handleSubmit };
};
