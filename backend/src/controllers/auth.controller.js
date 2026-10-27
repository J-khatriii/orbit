import * as authService from "../services/auth.service.js";

export const signup = async (req, res) => {
  const result = await authService.signup(req.validated.body);

  res.status(201).json(result);
};
