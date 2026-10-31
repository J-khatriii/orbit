const FormError = ({ message }) => {
  if (!message) {
    return null;
  }

  return (
    <div
      role="alert"
      className="rounded-control bg-clay-50 px-4 py-3 text-sm text-clay-700 ring-1 ring-clay-100"
    >
      {message}
    </div>
  );
};

export default FormError;
