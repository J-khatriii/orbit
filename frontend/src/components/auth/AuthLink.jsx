import { Link } from "react-router";

const AuthLink = ({ to, children }) => {
  return (
    <Link to={to} className="font-medium text-brand-700 hover:underline">
      {children}
    </Link>
  );
};

export default AuthLink;
